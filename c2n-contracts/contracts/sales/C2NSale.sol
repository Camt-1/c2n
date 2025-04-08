//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "../interfaces/IAdmin.sol";
import "../interfaces/ISalesFactory.sol";
import "../interfaces/IAllocationStaking.sol";
import "../interfaces/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract C2NSale is ReentrancyGuard {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    IAllocationStaking public allocationStakingContract;
    ISalesFactory public factory;
    IAdmin public admin;

    struct Sale {
        IERC20 token;
        bool isCreated;
        bool earningsWithdrawn;
        bool leftoverWithdrawn;
        bool tokensDeposited;
        address saleOwner;
        uint256 tokenPriceInETH;
        uint256 amountOfTokensToSell;
        uint256 totalTokensSold;
        uint256 totalETHRaised;
        uint256 saleStart;
        uint256 saleEnd;
        uint256 tokensUnlockTime;
        uint256 maxParticipation;
    }

    struct Participation {
        uint256 amountBought;
        uint256 amountETHPaid;
        uint256 timeParticipated;
        bool[] isPortionWithdrawn;
    }
    struct Registration {
        uint256 registrationTimeStarts;
        uint256 registrationTimeEnds;
        uint256 numberOfRegistrants;
    }

    Sale public sale;
    Registration public registration;
    uint256 public numberOfParticipants;
    mapping(address => Participation) public userToParticipation;
    mapping(address => bool) public isRegistered;
    mapping(address => bool) public isParticipated;
    uint256[] public vestingPortionsUnlockTime;
    uint256[] public vestingPercentPerPortion;
    uint256 public portionVestingPrecision;
    uint256 public maxVestingTimeShift;

    modifier onlySaleOwner() {
        require(msg.sender == sale.saleOwner, "OnlySaleOwner:: Restricted");
        _;
    }
    modifier onlyAdmin() {
        require(
            admin.isAdmin(msg.sender),
            "Only admin can call this function."
        );
        _;
    }

    event TokensSold(address user, uint256 amount);
    event UserRegistered(address user);
    event TokenPriceSet(uint256 newPrice);
    event MaxParticipationSet(uint256 maxParticipation);
    event TokensWithdrawn(address user, uint256 amount);
    event SaleCreated(
        address saleOwner,
        uint256 tokenPriceInETH,
        uint256 amountOfTokensToSell,
        uint256 saleETH
    );
    event StartTimeSet(uint256 startTime);
    event RegistrationTimeSet(
        uint256 registrationTimeStarts,
        uint256 registrationTimeEnds
    );

    constructor(address _admin, address _allocationStaking) {
        require(_admin != address(0));
        require(_allocationStaking != address(0));
        admin = IAdmin(_admin);
        factory = ISalesFactory(msg.sender);
        allocationStakingContract = IAllocationStaking(_allocationStaking);
    }

    receive() external payable {}

    function setVestingParams(
        uint256[] memory _unlockingTimes,
        uint256[] memory _percents,
        uint256 _maxVestingTimeShift
    ) external onlyAdmin {
        require(
            vestingPercentPerPortion.length == 0 &&
            vestingPortionsUnlockTime.length == 0
        );
        require(_unlockingTimes.length == _percents.length);
        require(portionVestingPrecision > 0, "Safeguard for making sure setSaleParams get first called.");
        require(_maxVestingTimeShift <= 30 days, "Maximal shift is 30 days");

        maxVestingTimeShift = _maxVestingTimeShift;

        uint256 sum;

        for (uint256 i = 0; i < _unlockingTimes.length; i++) {
            vestingPortionsUnlockTime.push(_unlockingTimes[i]);
            vestingPercentPerPortion.push(_percents[i]);
            sum += _percents[i];
        }
        
        require(sum == portionVestingPrecision, "Percent distribution issue.");
    }

    function shiftVestingUnlockingTimes(uint256 timeToShift) external onlyAdmin {
        require(
            timeToShift > 0 && timeToShift < maxVestingTimeShift,
            "Shift must be nonzero adn smaller than maxVestingTimeShifr."
        );

        maxVestingTimeShift = 0;

        for (uint256 i = 0; i < vestingPortionsUnlockTime.length; i++) {
            vestingPortionsUnlockTime[i] += timeToShift;
        }
    }

    function setSaleParams(
        address _token,
        address _saleOwner,
        uint256 _tokenPriceInETH,
        uint256 _amountOfTokensToSell,
        uint256 _saleEnd,
        uint256 _tokensUnlockTime,
        uint256 _portionVestingPrecision,
        uint256 _maxParticipation
    ) external onlyAdmin {
        require(!sale.isCreated, "setSaleParams: Sale is already created.");
        require(
            _saleOwner != address(0),
            "setSaleParams: Sale owner address can not be 0."
        );
        require(
            _tokenPriceInETH != 0 &&
            _amountOfTokensToSell != 0 &&
            _saleEnd > block.timestamp &&
            _tokensUnlockTime > block.timestamp &&
            _maxParticipation > 0,
            "setSaleParams: Bad input"
        );
        require(_portionVestingPrecision >= 100, "Should be at least 100");

        sale.token = IERC20(_token);
        sale.isCreated = true;
        sale.saleOwner = _saleOwner;
        sale.tokenPriceInETH = _tokenPriceInETH;
        sale.amountOfTokensToSell = _amountOfTokensToSell;
        sale.saleEnd = _saleEnd;
        sale.tokensUnlockTime = _tokensUnlockTime;
        sale.maxParticipation = _maxParticipation;

        portionVestingPrecision = _portionVestingPrecision;
        emit SaleCreated(
            sale.saleOwner,
            sale.tokenPriceInETH,
            sale.amountOfTokensToSell,
            sale.saleEnd
        );
    }

    function setSaleToken(address saleToken) external onlyAdmin {
        require(address(sale.token) == address(0));
        sale.token = IERC20(saleToken);
    }

    function setRegistrationTime(
        uint256 _registrationTimeStarts,
        uint256 _registrationTimeEnds
    ) external onlyAdmin {
        require(sale.isCreated);
        require(registration.registrationTimeStarts == 0);
        require(
            _registrationTimeStarts >= block.timestamp &&
            _registrationTimeEnds > _registrationTimeStarts
        );
        require(_registrationTimeEnds < sale.saleEnd);

        if (sale.saleStart > 0) {
            require(_registrationTimeEnds < sale.saleStart, "registrationTimeEnd >= sale.saleStart is not allowed");
        }

        registration.registrationTimeStarts = _registrationTimeStarts;
        registration.registrationTimeEnds = _registrationTimeEnds;

        emit RegistrationTimeSet(
            registration.registrationTimeStarts,
            registration.registrationTimeEnds
        );
    }

    function setSaleStart(uint256 startTime) external onlyAdmin {
        require(sale.isCreated, "sale is not created.");
        require(sale.saleStart == 0, "setSaleStart: startTime is set already.");
        require(startTime > registration.registrationTimeEnds, "start time should greater then registrationTimeEnds");
        require(startTime >= block.timestamp, "start time should be in the future.");
        sale.saleStart = startTime;

        emit StartTimeSet(sale.saleStart);
    }

    function registerForSale(bytes memory signature, uint256 pid) external {
        require(
            block.timestamp >= registration.registrationTimeStarts &&
            block.timestamp <= registration.registrationTimeEnds,
            "Registration gate is closed."
        );
        require(
            checkRegistrationSignature(signature, msg.sender),
            "Invalid signature"
        );
        require(
            !isRegistered[msg.sender],
            "User already register"
        );
        isRegistered[msg.sender] = true;

        allocationStakingContract.setTokensUnlockTime(
            pid,
            msg.sender,
            sale.saleEnd
        );

        registration.numberOfRegistrants++;
        
        emit UserRegistered(msg.sender);
    }

    function updateTokenPriceInETH(uint256 price) external onlyAdmin {
        require(price > 0, "Price can not be 0.");
        sale.tokenPriceInETH = price;
        emit TokenPriceSet(price);
    }

    function postponeSale(uint256 timeToShift) external onlyAdmin {
        require(
            block.timestamp < sale.saleStart,
            "sale already started."
        );
        sale.saleStart += timeToShift;
        require(
            sale.saleStart + timeToShift < sale.saleEnd,
            "Start time can not be greater than end time."
        );
    }

    function extendRegistrationPeriod(uint256 timeToAdd) external onlyAdmin {
        require(
            registration.registrationTimeEnds + timeToAdd < sale.saleStart,
            "Registration period overflows sale start."
        );

        registration.registrationTimeEnds += timeToAdd;
    }

    function setCap(uint256 cap) external onlyAdmin {
        require(
            block.timestamp < sale.saleStart,
            "sale already started."
        );
        require(cap > 0, "Can't set max participation to 0");

        sale.maxParticipation = cap;

        emit MaxParticipationSet(sale.maxParticipation);
    }

    function depositTokens() external onlySaleOwner {
        require(!sale.tokensDeposited, "Deposit can be done only once");
        
        sale.tokensDeposited = true;

        sale.token.safeTransferFrom(
            msg.sender,
            address(this),
            sale.amountOfTokensToSell
        );
    }

    function participate(
        bytes memory signature,
        uint256 amount
    ) external payable {
        require(
            amount <= sale.maxParticipation,
            "Overflowing maximal participation for sale."
        );
        require(
            isRegistered[msg.sender],
            "Not registered for this sale."
        );
        require(
            checkParticipationsSignature(
                signature,
                msg.sender,
                amount
            ),
            "Invalid signature. Verification failed"
        );
        require(
            block.timestamp >= sale.saleStart &&
            block.timestamp < sale.saleEnd, "sale didn't start or it's ended."
        );
        require(!isParticipated[msg.sender], "User can participate only once.");
        require(msg.sender == tx.origin, "Only direct contract calls.");

        uint256 amountOfTokensBuying =
            (msg.value) * (uint(10) ** IERC20Metadata(address(sale.token)).decimals()) 
            / sale.tokenPriceInETH;
        
        require(amountOfTokensBuying > 0, "Can't buy 0 tokens");
        require(
            amountOfTokensBuying <= amount,
            "Tring to buy more than allowed."
        );

        sale.totalTokensSold += amountOfTokensBuying;
        sale.totalETHRaised += msg.value;

        bool[] memory _isPortionWithdrawn = new bool[](
            vestingPortionsUnlockTime.length
        );

        Participation memory p = Participation({
            amountBought : amountOfTokensBuying,
            amountETHPaid : msg.value,
            timeParticipated : block.timestamp,
            isPortionWithdrawn : _isPortionWithdrawn
        });

        userToParticipation[msg.sender] = p;
        isParticipated[msg.sender] = true;
        numberOfParticipants++;

        emit TokensSold(msg.sender, amountOfTokensBuying);
    }

    function withdrawTokens(uint256 portionId) external {
        require(
            block.timestamp >= sale.tokensUnlockTime,
            "Tokens can't be withdrawn yet."
        );
        require(
            portionId < vestingPercentPerPortion.length,
            "Portion id out of range."
        );

        Participation storage p = userToParticipation[msg.sender];

        if (
            !p.isPortionWithdrawn[portionId] &&
            vestingPortionsUnlockTime[portionId] <= block.timestamp
        ) {
            p.isPortionWithdrawn[portionId] = true;
            uint256 amountWithdrawing = p.amountBought *
                vestingPercentPerPortion[portionId] / portionVestingPrecision;
            
            if (amountWithdrawing > 0) {
                sale.token.safeTransfer(msg.sender, amountWithdrawing);
                emit TokensWithdrawn(msg.sender, amountWithdrawing);
            }
        } else {
            revert("Tokens already withdrawn or portion not unlocked yet.");
        }
    }

    function withdrawMultiplePortions(uint256 [] calldata portionIds) external {
        uint256 totalToWithdraw = 0;

        Participation storage p = userToParticipation[msg.sender];

        for (uint i = 0; i < portionIds.length; i++) {
            uint256 portionId = portionIds[i];
            require(portionId < vestingPercentPerPortion.length);

            if (
                !p.isPortionWithdrawn[portionId] &&
                vestingPortionsUnlockTime[portionId] <= block.timestamp
            ) {
                p.isPortionWithdrawn[portionId] = true;
                uint256 amountWithdrawing = p.amountBought *
                    vestingPercentPerPortion[portionId] / portionVestingPrecision;
                totalToWithdraw += amountWithdrawing;                
            }
        }
        if (totalToWithdraw > 0) {
            sale.token.safeTransfer(msg.sender, totalToWithdraw);
            emit TokensWithdrawn(msg.sender,totalToWithdraw);
        }
    }

    function safeTransferETH(address to, uint256 value) internal {
        (bool success, ) = to.call{value : value}(new bytes(0));
        require(success);
    }

    function withdrawEarningsAndLeftover() external onlySaleOwner {
        withdrawEarningsInternal();
        withdrawLeftoverInternal();       
    }

    function withdrawEarnings() external onlySaleOwner {
        withdrawEarningsInternal();
    }

    function withdrawLeftover() external onlySaleOwner {
        withdrawLeftoverInternal();
    }

    function withdrawEarningsInternal() internal {
        require(block.timestamp >= sale.saleEnd, "sale is not ended yet.");
        require(!sale.earningsWithdrawn, "owner can't withdraw earnings twice");

        sale.earningsWithdrawn = true;
        uint256 totalProfit = sale.totalETHRaised;
        safeTransferETH(msg.sender, totalProfit);
    }

    function withdrawLeftoverInternal() internal {
        require(block.timestamp >= sale.saleEnd, "sale is not ended yet.");
        require(!sale.leftoverWithdrawn, "owner can't withdraw leftover twice");

        sale.leftoverWithdrawn = true;
        uint256 leftover = sale.amountOfTokensToSell - sale.totalTokensSold;
        if (leftover > 0) {
            sale.token.safeTransfer(msg.sender, leftover);
        }
    }

    function checkRegistrationSignature(
        bytes memory signature,
        address user
    ) public view returns (bool) {
        bytes32 hash = keccak256(
            abi.encodePacked(user, address(this))
        );
        bytes32 messageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        return admin.isAdmin(messageHash.recover(signature));
    }

    function checkParticipationsSignature(
        bytes memory signature,
        address user,
        uint256 amount
    ) public view returns (bool) {
        return admin.isAdmin(
            getParticipationSigner(
                signature,
                user,
                amount
            )
        );
    }

    function getParticipationSigner(
        bytes memory signature,
        address user,
        uint256 amount
    ) public view returns (address) {
        bytes32 hash = keccak256(
            abi.encodePacked(
                user,
                amount,
                address(this)
            )
        );
        bytes32 messageHash = keccak256(
            abi.encodePacked("\n19Ethereum Signed Message:\n32", hash)
        );
        return messageHash.recover(signature);
    }

    function getParticipation(address _user)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            bool[] memory
        )
    {
        Participation memory p = userToParticipation[_user];
        return (
            p.amountBought,
            p.amountETHPaid,
            p.timeParticipated,
            p.isPortionWithdrawn
        );
    }

    function getNumberOfRegisteredUsers() external view returns (uint256) {
        return registration.numberOfRegistrants;
    }

    function getVestingInfo()
        external
        view
        returns (uint256[] memory, uint256[] memory)
    {
        return (vestingPortionsUnlockTime, vestingPercentPerPortion);
    }
}