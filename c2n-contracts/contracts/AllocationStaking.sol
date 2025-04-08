//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/ISalesFactory.sol";

contract AllocationStaking is OwnableUpgradeable {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;

        uint256 tokensUnlockTime;
        address [] salesRegistered;
    }
    struct PoolInfo {
        IERC20 lpToken;
        uint256 allocPoint;
        uint256 lastRewardTimestamp;
        uint256 accERC20PerShare;
        uint256 totalDeposits;
    }

    IERC20 public erc20;
    uint256 public paidOut;
    uint256 public rewardPerSecond;
    uint256 public totalRewards;
    ISalesFactory public salesFactory;
    PoolInfo[] public poolInfo;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    uint256 public totalAllocPoint;

    uint256 public startTimestamp;
    uint256 public endTimestamp;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event CompoundedEarnings(address indexed user, uint256 indexed pid, uint256 amountAdded, uint256 totalDeposited);

    modifier onlyVerifiedSales {
        require(salesFactory.isSaleCreatedThroughFactory(msg.sender), "Sale not created through factory.");
        _;
    }

    function initialize(
        IERC20 _erc20,
        uint256 _rewardPerSecound,
        uint256 _startTimestamp,
        address _salesFactory
    )
    initializer
    public
    {
        __Ownable_init();

        erc20 = _erc20;
        rewardPerSecond = _rewardPerSecound;
        startTimestamp = _startTimestamp;
        endTimestamp = _startTimestamp;
        salesFactory = ISalesFactory(_salesFactory);
    }

    function setSalesFactory(address _salesFactory) external onlyOwner {
        require(_salesFactory != address(0));
        salesFactory = ISalesFactory(_salesFactory);
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function fund(uint256 _amount) public {
        require(block.timestamp < endTimestamp, "func: too late, the farm is closed");
        erc20.safeTransferFrom(address(msg.sender), address(this), _amount);
        endTimestamp += _amount / rewardPerSecond;
        totalRewards += _amount;
    }

    function add(
        uint256 _allocPoint,
        IERC20 _lpToken,
        bool _withUpdate
    ) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardTimestamp = block.timestamp > startTimestamp ? block.timestamp : startTimestamp;
        totalAllocPoint += _allocPoint;
        poolInfo.push(
            PoolInfo({
                lpToken : _lpToken,
                allocPoint : _allocPoint,
                lastRewardTimestamp : lastRewardTimestamp,
                accERC20PerShare : 0,
                totalDeposits : 0
            })
        );
    }

    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint - poolInfo[_pid].allocPoint + _allocPoint;
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    function deposited(
        uint256 _pid,
        address _user
    ) public view returns (uint256) {
        UserInfo storage user = userInfo[_pid][_user];
        return user.amount;
    }

    function pending(
        uint256 _pid,
        address _user
    ) public view returns (uint256) {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accERC20PerShare = pool.accERC20PerShare;

        uint256 lpSupply = pool.totalDeposits;

        if (block.timestamp > pool.lastRewardTimestamp && lpSupply != 0) {
            uint256 lastTimestamp = block.timestamp < endTimestamp ? block.timestamp : endTimestamp;
            uint256 nrOfSeconds = lastTimestamp - pool.lastRewardTimestamp;
            uint256 erc20Reward = nrOfSeconds * rewardPerSecond * pool.allocPoint / totalAllocPoint;
            accERC20PerShare += erc20Reward * 1e36 / lpSupply;
        }
        return (user.amount * accERC20PerShare / 1e36) - user.rewardDebt;
    }

    function totalPending() external view returns (uint256) {
        if (block.timestamp <= startTimestamp) {
            return 0;
        }

        uint256 lastTimestamp = block.timestamp < endTimestamp ? block.timestamp : endTimestamp;
        return rewardPerSecond * (lastTimestamp - startTimestamp) - paidOut;
    }

    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }
    
    function setTokenUnlockTime(
        uint256 _pid,
        address _user,
        uint256 _tokensUnlockTime
    ) external onlyVerifiedSales {
        UserInfo storage user = userInfo[_pid][_user];
        require(user.tokensUnlockTime <= block.timestamp);
        user.tokensUnlockTime = _tokensUnlockTime;
        user.salesRegistered.push(msg.sender);
    }

    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];

        uint256 lastTimestamp = block.timestamp < endTimestamp ? block.timestamp : endTimestamp;

        if (lastTimestamp <= pool.lastRewardTimestamp) {
            lastTimestamp = pool.lastRewardTimestamp;
        }

        uint256 lpSupply = pool.totalDeposits;

        if (lpSupply == 0) {
            pool.lastRewardTimestamp = lastTimestamp;
            return;
        }

        uint256 nrOfSeconds = lastTimestamp - pool.lastRewardTimestamp;
        uint256 erc20Reward = nrOfSeconds * rewardPerSecond * pool.allocPoint - totalAllocPoint;

        pool.accERC20PerShare += erc20Reward * 1e36 / lpSupply;
        pool.lastRewardTimestamp = lastTimestamp;
    }

    function deposit(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        uint256 depositAmount = _amount;

        updatePool(_pid);

        if (user.amount > 0) {
            uint256 pendingAmount = user.amount * pool.accERC20PerShare / 1e36 - user.rewardDebt;
            erc20Transfer(msg.sender, pendingAmount);
        }

        pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
        pool.totalDeposits += depositAmount;
        user.amount += depositAmount;
        user.rewardDebt = user.amount * pool.accERC20PerShare / 1e36;
        emit Deposit(msg.sender, _pid, depositAmount);
    }

    function withdraw(uint256 _pid, uint256 _amount) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        require(user.tokensUnlockTime <= block.timestamp, "Last sale you registered for is not finished yet.");
        require(user.amount >= _amount, "withdraw: can't withdraw more than deposit");

        updatePool(_pid);

        uint256 pendingAmount = user.amount * pool.accERC20PerShare / 1e36 - user.rewardDebt;

        erc20Transfer(msg.sender, pendingAmount);
        user.amount -= _amount;
        user.rewardDebt = user.amount * pool.accERC20PerShare / 1e36;

        pool.lpToken.safeTransfer(address(msg.sender), _amount);
        pool.totalDeposits -= _amount;

        if (_amount > 0) {
            user.tokensUnlockTime = 0;
        }

        emit Withdraw(msg.sender, _pid, _amount);
    }

    function compound(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        require(user.amount >= 0, "User does not have anything staked.");

        updatePool(_pid);

        uint256 pendingAmount = user.amount * pool.accERC20PerShare / 1e36 - user.rewardDebt;

        user.amount += pendingAmount;
        user.rewardDebt = user.amount * pool.accERC20PerShare / 1e36;

        pool.totalDeposits += pendingAmount;
        emit CompoundedEarnings(msg.sender, _pid, pendingAmount, user.amount);
    }

    function erc20Transfer(address _to, uint256 _amount) internal {
        erc20.transfer(_to, _amount);
        paidOut += _amount;
    }

    function getPendingAndDepositedForUsers(address [] memory users, uint pid)
    external
    view
    returns (uint256 [] memory, uint256 [] memory)
    {
        uint256 [] memory deposits = new uint256[](users.length);
        uint256 [] memory earnings = new uint256[](users.length);

        for (uint i = 0; i < users.length; i++) {
            deposits[i] = deposited(pid, users[i]);
            earnings[i] = pending(pid, users[i]);
        }

        return (deposits, earnings);
    }
}