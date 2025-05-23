const {ethers} = require("hardhat");
const {expect} = require("chai");

const REWARDS_PER_SECOND = ethers.parseUnits('0.1')
const START_TIMESTAMP_DELTA = 1000
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

async function getCurrentBlockTimestamp() {
  const block = await ethers.provider.getBlock('latest')
  return block.timestamp
}

describe('SalesFactoty', function ()  {
  let deployer, alice, bob
  let C2NToken, BreToken2
  let Admin, SalesFactory, AllocationStaking
  let C2NSaleFactory
  let startTimestamp

  //合约初始化
  beforeEach(async function () {
    [deployer, alice, bob] = await ethers.getSigners()

    C2NToken = await ethers.deployContract('C2NToken', [
      'C2N',
      'C2N',
      ethers.parseUnits('100000000'),
      18
    ])

    BreToken2 = await ethers.deployContract('C2NToken', [
      'Bre2',
      'BRE2',
      ethers.parseUnits('100000000'),
      18
    ])

    Admin = await ethers.deployContract('Admin', [
      [deployer.address, alice.address, bob.address],
    ])

    SalesFactory = await ethers.deployContract('SalesFactory', [
      Admin.address,
      ZERO_ADDRESS,
    ])

    const currentTimestamp = await getCurrentBlockTimestamp()
    startTimestamp = currentTimestamp + START_TIMESTAMP_DELTA

    AllocationStaking = await ethers.deployContract('AllocationStaking', [])
    await AllocationStaking.initialize(
      C2NToken.address,
      REWARDS_PER_SECOND,
      startTimestamp,
      SalesFactory.address
    )
    await AllocationStaking.add(1, C2NToken.address, false)

    await SalesFactory.setAllocationStaking(AllocationStaking.address)

    C2NSaleFactory = await ethers.getContractFactory('C2NSale')
  })

  //工厂合约的初始化状态验证
  context('Setup', async function () {
    //验证SalesFactory的管理员地址是否正确设置
    it('Should setup the factory correctly', async function () {
      //Given
      let admin = await SalesFactory.admin()

      //Then
      expect(admin).to.equal(Admin.address)
    })

    //验证是否正确设置AllocationStaking合约地址, 是否只有管理员可以设置AllocationStaking
    describe('Set allocation staking', async function () {
      it('Should set allocation staking contract', async function () {
        //When
        await SalesFactory.setAllocaionStaking(C2NToken.address)

        //Then
        expect(await SalesFactory.allocationStaking().to.equal(C2NToken.address))
      })

      it('Should not set allocation staking contract to zero address', async function () {
        //Then
        await expect(SalesFactory.setAllocationStaking(ZERO_ADDRESS)).to.be.reverted
      })

      it('Should no allow non-admin to set allocation staking contract', async function () {
        //Given
        await Admin.removeAdmin(deployer.address)

        //Then
        await expect(SalesFactory.setAllocationStaking(C2NToken.address)).to.be.reverted
      })
    })
  })

  //销售合约的验证
  context('Sales', async function () {
    //验证销售合约的部署
    describe('Deploy sale', async function () {
      //检查销售合约是否可以成功部署
      it('Should deploy sale', async function () {
        //When
        await SalesFactory.deploySale()

        //Then
        expect(await SalesFactory.getNumberOFSalesDeployed()).to.equal(1)
        const saleAddress = await SalesFactory.allSales(0)
        expect(await SalesFactory.isSaleCreatedThroughfactory(saleAddress)).to.be.true
      })

      //验证是否只有管理员可以部署销售合约
      it('Should not allow non-admin to deploy sale', async function () {
        //Given
        await Admin.removeAdmin(deployer.address)

        //Then
        await expect(SalesFactory.deploySale()).to.be.revertedWith('Only Admin can deploy sales')
      })

      //验证成功部署销售合约是否触发了SaleDeployed事件
      it('Should emit SaleDeployed event', async function () {
        //Then
        await expect(SalesFactory.deploySale()).to.emit(SalesFactory, 'SaleDeployed')
      })
    })

    //验证销售参数设置
    describe('Set Sale owner and token', async function () {
      //验证销售所有者和代币参数是否可以正确设置, 设置的销售参数是否符合预期
      it('Should set sale owner and token', async function () {
        //Given
        await SalesFactory.deploySale()
        const C2NSale =C2NSaleFactory.attach(await SalesFactory.allSales(0))

        //When
        const blockTimestamp = (await ethers.provider.getBlock('latest')).timestamp
        await C2NSale.setSaleParams(C2NToken.address, deployer.address, 10, 10, blockTimestamp + 100, blockTimestamp + 10, PORTION_VESTING_PERCISION, MAX_PARTICIPATION)

        //Then
        const sale = await C2NSale.sale()
        expect(sale.saleOwner).to.equal(deployer.address)
        expect(sale.token).to.equal(C2NToken.address)
      })
    })

    //验证部署成功后销售合约的数量是否正确
    describe('Get number of sales deployed', async function () {
      it('Should return 0 if there are no sales', async function () {
        //Then
        expect(await SalesFactory.getNumberOfSalesDeployed()).to.be.equal(0)
      })

      it('Should return number of sales if there is only one sale', async function () {
        //Given
        await SalesFactory.deploySale()

        //Then
        expect(await SalesFactory.getNumberOfSalesDeployed().to.equal(1))
      })

      it('Should return number of sales if there are multiple sales', async function () {
        //Given
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()

        //Then
        expect(await SalesFactory.getNumberOfSalesDeployed().to.equal(3))
      })
    })

    //销售合约信息的获取
    describe('Get all sales', async function () {
      it('Should return last deployed sale', async function () {
        //Given
        //Condition: There were no sales deployed before
        await SalesFactory.deploySale()

        let sale = await SalesFactory.allSales(0)
        expect(await SalesFactory.getLastDeployedSale()).to.equal(sale)
      })

      it('Should return zero address if there were no sales deployed', async function () {
        //Given
        //Condition: There were no sales deployed before

        expect(await SalesFactory.getLastDeployedSale()).to.equal(ZERO_ADDRESS)
      })

      it('Should return only first sale', async function () {
        //Given
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()
        
        //When
        const sales = await SalesFactory.getAllSales(0, 1)

        //Then
        expect(sales.length).to.equal(1)
        expect(sales[0]).to.equal(await SalesFactory.allSales(0))
      })

      it('Should return only last sale', async function () {
        //Given
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()

        //When
        const sales = await SalesFactory.getAllSales(2, 3)

        //Then
        expect(sales.length).to.equal(1)
        expect(sales[0]).to.equal(await SalesFactory.allSales(2))
      })

      it('Should return all sales', async function () {
        //Given
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()

        //When
        const sales = await SalesFactory.getAllSales(0,3)

        //Then
        expect(sales.length).to.equal(3)
        expect(sales[0]).to.equal(await SalesFactory.allSales(0))
        expect(sales[1]).to.equal(await SalesFactory.allSales(1))
        expect(sales[2]).to.equal(await SalesFactory.allSales(2))
      })

      it('Should not return 0 sales', async function () {
        //Given
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()

        //Then
        await expect(SalesFactory.getAllSales(2, 3)).to.be.reverted
      })

      it('Should not return sales if start index is higher than end index', async function () {
        //Given
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()

        //Then
        await expect(SalesFactory.getAllSales(1, 0)).to.be.reverted
      })

      it('Should not allow negative start index', async function () {
        //Give
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()

        //Then
        await expect(SalesFactory.getAllSales(-5, 2)).to.be.reverted
      })

      it('Should not allow end index out of bounds', async function () {
        //Given
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()

        //Then
        await expect(SalesFactory.getAllSales(1, 12)).to.be.reverted
      })

      it('Should not allow start index out of bounds', async function () {
        //Given
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()
        await SalesFactory.deploySale()

        //Then
        await expect(SalesFactory.getAllSales(12, 13)).to.be.reverted
      })
    })
  })
})