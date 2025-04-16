/**
 * 测试目标是验证AllocationStaking合约的核心功能,具体包括:
 * 1. 代币设置
 * 2. 奖励资金注入
 * 3. 添加和更新奖励池
 * 4. 用户存款, 提款, 和复利
 * 5. 紧急提款和事件触发
 */
const {ethers} = require("hardhat");
const {expect} = require("chai");
const {BigNumber, utils} = require("ethers");

describe('AllocationStaking', function () {
  let Admin
  let C2NToken, BreLP1, BreLP2
  let AllocationStaking
  let AllocationStakingRewardsFactory
  let SalesFactory
  let deployer, alice, bob
  let startTimestamp

  let ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

  const REWARDS_PER_SECOND = ethers.utils.parseUnits('0.1')
  const TOKEN_TO_ADD = ethers.utils.parseUnits('100000')
  const TOKEN_TO_SEND = ethers.utils.parseUnits('1000')
  const START_TIMESTAMP_DELTA = 600
  const END_TIMESTAMP_DELTA = Math.floor(TOKEN_TO_ADD / REWARDS_PER_SECOND)
  const ALLOC_POINT = 1000
  const DEFAULT_DEPOSIT = 1000
  const NUMBER_1E36 = '1000000000000000000000000000000000000'
  const DEFAULT_LP_APPROVAL = 10000
  const DEFAULT_BALANCE_ALICE = 10000

  async function getCurrentBlockTimestamp() {
    return (await ethers.provider.getBlock('latest')).timestamp
  }

  async function baseSetup(params) {
    await C2NToken.approve(AllocationStaking.address, TOKEN_TO_ADD)
    await AllocationStaking.fund(TOKEN_TO_ADD)

    await AllocationStaking.add(ALLOC_POINT, BreLP1.address, false)
  }

  async function baseSetupTwoPools(params) {
    await C2NToken.approve(AllocationStaking.address, TOKEN_TO_ADD)
    await AllocationStaking.fund(TOKEN_TO_ADD)

    await AllocationStaking.add(ALLOC_POINT, BreLP1.address, false)
    await AllocationStaking.add(ALLOC_POINT, BreLP2.address, false)

    await BreLP1.approve(AllocationStaking.address, DEFAULT_LP_APPROVAL)
    await BreLP1.connect(alice).approve(AllocationStaking.address, DEFAULT_LP_APPROVAL)
    await BreLP1.connect(bob).approve(AllocationStaking.address, DEFAULT_LP_APPROVAL)

    await BreLP2.approve(AllocationStaking.address, DEFAULT_LP_APPROVAL)
    await BreLP2.connect(alice).approve(AllocationStaking.address, DEFAULT_LP_APPROVAL)
    await BreLP2.connect(bob).approve(AllocationStaking.address, DEFAULT_LP_APPROVAL)

    await AllocationStaking.deposit(0, DEFAULT_DEPOSIT)
  }

  function computeExpectedReward(timestampNow, lastTimestamp, rewPerSec, poolAlloc, totalAlloc, poolDeposit) {
    const tnow = ethers.BigNumber.from(timestampNow)
    const tdif = tnow.sub(lastTimestamp)
    const totalRewards = tdif.mul(rewPerSec)
    const poolRewards = totalRewards.mul(poolAlloc).div(totalAlloc)
    const poolRewardsPerShare = poolRewards.mul(NUMBER_1E36).div(poolDeposit)

    return poolRewardsPerShare
  }

  beforeEach(async function () {
    const accounts = await ethers.getSigner()
    deployer = accounts[0]
    alice = accounts[1]
    bob = accounts[2]

    const AdminFactory = await ethers.getContractFactory('Admin')
    Admin = await AdminFactory.deploy([deployer.address, alice.address, bob.address])
    
    const BreTokenFactory = await ethers.getContractFactory('C2NToken')
    C2NToken = await BreTokenFactory.deploy('C2N', 'C2N', ethers.utils.parseUnits('1000000000'), 18)

    BreLP1 = await BreTokenFactory.deploy('BreLP1', 'BRELP1', ethers.utils.parseUnits('1000000000'), 18)
    BreLP2 = await BreTokenFactory.deploy('BreLP2', 'BRELP2', ethers.utils.parseUnits('1000000000'), 18)

    const SalesFactoryFactory = await ethers.getContractFactory('SalesFactory')
    SalesFactory = await SalesFactoryFactory.deploy(Admin.address, ZERO_ADDRESS)

    AllocationStakingRewardsFactory = await ethers.getContractFactory('AllocationStaking')
    const blockTimestamp = await getCurrentBlockTimestamp()
    startTimestamp = blockTimestamp + START_TIMESTAMP_DELTA

    AllocationStaking = await AllocationStakingRewardsFactory.deploy()
    await AllocationStaking.initialize(C2NToken.address, REWARDS_PER_SECOND, startTimestamp, SalesFactory.address)

    await SalesFactory.setAllocationStaking(AllocationStaking.address)

    await BreLP1.transfer(alice.address, DEFAULT_BALANCE_ALICE)
    await BreLP2.transfer(alice.address, DEFAULT_BALANCE_ALICE)
  })

  context('Setup', async function () {
    it('Should setup the token correctly', async function () {
      //When
      let decimals = await C2NToken.decimals()
      let totalSupply = await C2NToken.totalSupply()
      let deployerBalance = await C2NToken.balanceOf(deployer.address)

      //Then
      expect(decimals).to.equal(18)
      expect(totalSupply).to.equal(ethers.utils.parseUnits('1000000000'))
      expect(totalSupply).to.equal(deployerBalance)
    })

    it('Should setup the reward contract with no pools', async function () {
      //When
      let poolLength = await AllocationStaking.poolLength()
      let rewardPerSecond = await AllocationStaking.rewardPerSecond()
      let owner = await AllocationStaking.owner()
      let totalRewards = await AllocationStaking.totalRewards()

      //Then
      expect(poolLength).to.equal(0)
      expect(rewardPerSecond).to.equal(REWARDS_PER_SECOND)
      expect(owner).to.equal(deployer.address)
      expect(totalRewards).to.equal(0)
    })

    it('Should add a pool successfully', async function () {
      //When
      await AllocationStaking.add(ALLOC_POINT, C2NToken.address, false)

      //Then
      let poolLength = await AllocationStaking.poolLength()
      let totalAllocPoint = await AllocationStaking.totalAllocPoint()

      expect(poolLength).to.equal(1)
      expect(totalAllocPoint).to.equal(ALLOC_POINT)
    })

    it('Should add a pool successfully with mass update', async function () {
      //When
      await AllocationStaking.add(ALLOC_POINT, C2NToken.address, true)

      //Then
      let poolLength = await AllocationStaking.poolLength()
      let totalAllocPoint = await AllocationStaking.totalAllocPoint()

      expect(poolLength).to.equal(1)
      expect(totalAllocPoint).to.equal(ALLOC_POINT)
    })

    it('Should set salesFactory', async function () {
      //Given
      const SalesFactoryFactory = await ethers.getContractFactory('SalesFactory')
      const SalesFactory2 = await SalesFactoryFactory.deploy(Admin.address, ZERO_ADDRESS)

      //When
      await AllocationStaking.setSalesFactory(SalesFactory2.address)

      //Then
      expect(await AllocationStaking.salesFactory()).to.equal(SalesFactory2.address)
    })
  })

  context('Fund', async function () {
    it('Should fund the farm successfully', async function () {
      //Given
      let deployerBalanceBefore = await C2NToken.balanceOf(deployer.address)
      let rewardPerSecond = await AllocationStaking.rewardPerSecond()
      let StartTimestamp = await AllocationStaking.startTimestamp()

      await C2NToken.approve(AllocationStaking.address, TOKEN_TO_ADD)
      await AllocationStaking.add(ALLOC_POINT, C2NToken.address, false)

      //When
      await AllocationStaking.fund(TOKEN_TO_ADD)

      //Then
      let deployerBalanceAfter = await C2NToken.balanceOf(deployer.address)
      let contractBalanceAfter = await C2NToken.balanceOf(AllocationStaking.address)
      let endTimestampAfter = await AllocationStaking.endTimestamp()
      let totalRewardsAfter = await AllocationStaking.totalRewards()

      expect(deployerBalanceBefore.sub(deployerBalanceAfter)).to.equal(TOKEN_TO_ADD)
      expect(contractBalanceAfter).to.equal(TOKEN_TO_ADD)
      expect(endTimestampAfter).to.equal(startTimestamp.add(ethers.BigNumber.from(TOKEN_TO_ADD).div(rewardPerSecond)))
      expect(totalRewardsAfter).to.equal(TOKEN_TO_ADD)
    })

    it('Should not fund the farm after end date', async function () {
      //Given
      await C2NToken.approve(AllocationStaking.address, TOKEN_TO_ADD)

      //When
      await ethers.provider.send('evm_increaseTime', [START_TIMESTAMP_DELTA])
      await ethers.provider.send('evm_mine')

      //Then
      await expect(AllocationStaking.fund(TOKEN_TO_ADD)).to.be.revertedWith('fund: too late, the farm is closed')
    })

    it('Should not fund the farm if token was not approved', async function () {
      //Then
      await expect(AllocationStaking.fund(TOKEN_TO_ADD)).to.be.revertedWith('ERC20: transfer amont exceeds allowance')
    })

    it('Should not fund the farm if reward per second is 0', async function () {
      //Given
      const blockTimestamp = await getCurrentBlockTimestamp()
      AllocationStaking = await AllocationStakingRewardsFactory.deploy()
      AllocationStaking.initialize(C2NToken.address, 0, blockTimestamp + START_TIMESTAMP_DELTA, SalesFactory.address)
      await C2NToken.approve(AllocationStaking.address, TOKEN_TO_ADD)

      //Then
      await expect(AllocationStaking.fund(TOKEN_TO_ADD)).to.be.revertedWith('SafeMath: division by zero')
    })
  })

  context('Pools', async function () {
    desribe('Add pools', async function () {
      it('Should add pool to list', async function () {
        //When
        await AllocationStaking.add(ALLOC_POINT, BreLP1.address, false)

        //Then
        const poolLength = await AllocationStaking.poolLength()
        const pool = await AllocationStaking.poolInfo(0)
        expect(poolLength).to.equal(1)
        expect(pool.lpToken).to.equal(BreLP1.address)
        expect(pool.allocPoint).to.equal(ALLOC_POINT)
        expect(pool.lastRewardTimestamp).to.equal(startTimestamp)
        expect(pool.accERC20PerShare).to.equal(0)
        expect(pool.totalDeposits).to.equal(0)

        expect(await AllocationStaking.totalAllocPoint()).to.equal(ALLOC_POINT)
      })

      it('Should add two pools to list', async function () {
        //When
        await AllocationStaking.add(ALLOC_POINT, BreLP1.address, false)
        await AllocationStaking.add(ALLOC_POINT, BreLP2.address, false)

        //Then
        const poolLength = await AllocationStaking.poolLength()
        const pool1 = await AllocationStaking.poolInfo(0)
        const pool2 = await AllocationStaking.poolInfo(1)

        expect(poolLength).to.equal(2)

        expect(pool1.lpToken).to.equal(BreLP1.address)
        expect(pool1.allocPoint).to.equal(ALLOC_POINT);
        expect(pool1.lastRewardTimestamp).to.equal(startTimestamp)
        expect(pool1.accERC20PerShare).to.equal(0)
        expect(pool1.totalDepostis).to.equal(0)

        expect(pool2.lpToken).to.equal(BreLP2.address)
        expect(pool2.allocPoint).to.equal(ALLOC_POINT)
        expect(pool2.lastRewardTimestamp).to.equal(startTimestamp)
        expect(pool2.accERc20PerShare).to.equal(0)
        expect(pool2.totalDeposits).to.equal(0)

        expect(await AllocationStaking.totalAllocPoint()).to.equal(2 * ALLOC_POINT)
      })

      it('Should not allow non-owner to add pool', async function () {
        //Then
        await expect(AllocationStaking.connect(alice).add(BreLp1.address)).to.be.reverted
      })
    })

    
  })
})