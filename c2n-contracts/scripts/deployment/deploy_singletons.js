const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");
const {saveContractAddress, getSavedContractAddresses} = require('../utils')
const config = require('../configs/config.json');

//获取最新区块的时间戳
async function getCurrentBlockTimetamp() {
  return (await ethers.provider.getBlock('lastest')).timestamp;
}
//延迟函数,用于暂停代币执行
async function sleep(number) {
  return new Promise((resolve) => {
    setTimeout(resolve, number);
  });
}

async function main() {
  //加载网络配置
  const c = config[hre.network.name];
  const contracts = getSavedContractAddresses()[hre.network.name];
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  //部署Admin合约
  const Admin = await ethers.getContractFactory("Admin");
  console.log("ready to deploy admin")
  const admin = await Admin.deploy(c.admins);
  await admin.deployed();
  console.log("Admin contract deployed to: ", admin.address);
  saveContractAddress(hre.network.name, "Admin", admin.address);

  //部署SalesFactory合约
  console.log("ready to deploy salesFactory")
  const SalesFactory = await ethers.getContractFactory("SalesFactory");
  const salesFactory = await salesFactory.deploy(admin, address, ZERO_ADDRESS);
  await salesFactory.deployed();
  saveContractAddress(hre.network.name, "SalesFactory", salesFactory.address);
  console.log('Sales factory deployed to: ', salesFactory.address);

  //部署AllocationStaking可升级代理合约
  console.log("ready to deploy AllocationStaking")
  const currentTimestamp = await getCurrentBlockTimestamp();
  console.log('Farming start at: ', currentTimestamp);
  const AllocationStaking = await ethers.getContractFactory("AllocationStaking");
  const allocationStaking = await upgrades.deployProxy(AllocationStaking, [
      contracts["C2N-TOKEN"],
      ethers.utils.parseEther(c.allocationStakingRPS),
      currentTimestamp + c.delayBeforeStart,
      salesFactory.address 
    ], {unsafeAllow: ['delegatecall']}
  );
  await allocationStaking.deployed()
  console.log('AllocationStaking Proxy deployed to: ', allocationStaking.address);
  saveContractAddress(hre.network.name, 'AllocationStakingProxy', allocationStaking.address);
  let proxyAdminContract = await upgtades.admin.getInstance();
  saveContractAddress(hre.network.name, 'ProxyAdmin', proxyAdminContract.address);
  console.log('Proxy Admin address is: ', proxyAdminContract.address);

  //配置AllocationStaking
  console.log("ready to setAllocationStaking params")
  await salesFactory.setAllocationStaking(allocationStaking.address);
  console.log(`salesFactory.setAllocationStaking ${allocationStaking.address} done.`);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });