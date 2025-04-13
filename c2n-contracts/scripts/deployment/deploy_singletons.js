const hre = require("hardhat");
const {ethers, upgrades} = require("hardhat");
const {saveContractAddress, getSavedContractAddresses} = require('../utils')
const config = require('../configs/config.json');

//获取最新区块的时间戳
async function getCurrentBlockTimestamp() {
  return (await ethers.provider.getBlock('latest')).timestamp;
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
  await admin.waitForDeployment();
  console.log("Admin contract deployed to: ", admin.target);
  saveContractAddress(hre.network.name, "Admin", admin.target);

  //部署SalesFactory合约
  console.log("ready to deploy salesFactory")
  const SalesFactory = await ethers.getContractFactory("SalesFactory");
  const salesFactory = await SalesFactory.deploy(admin.target, ZERO_ADDRESS);
  await salesFactory.waitForDeployment();
  saveContractAddress(hre.network.name, "SalesFactory", salesFactory.target);
  console.log('Sales factory deployed to: ', salesFactory.target);

  //部署AllocationStaking可升级代理合约
  console.log("ready to deploy AllocationStaking")
  const currentTimestamp = await getCurrentBlockTimestamp();
  console.log('Farming start at: ', currentTimestamp);
  const AllocationStaking = await ethers.getContractFactory("AllocationStaking");
  const allocationStaking = await upgrades.deployProxy(AllocationStaking, [
      contracts["C2N-TOKEN"],
      ethers.parseUnits(c.allocationStakingRPS),
      currentTimestamp + c.delayBeforeStart,
      salesFactory.target,
    ], {unsafeAllow: ['delegatecall']}
  );
  await allocationStaking.waitForDeployment()
  console.log('AllocationStaking Proxy deployed to: ', allocationStaking.target);
  saveContractAddress(hre.network.name, 'AllocationStakingProxy', allocationStaking.target);

  let proxyAdminContract = AllocationStaking;
  saveContractAddress(hre.network.name, 'ProxyAdmin', proxyAdminContract.target);
  console.log('Proxy Admin address is: ', proxyAdminContract.target);

  //配置AllocationStaking
  console.log("ready to setAllocationStaking params")
  await salesFactory.setAllocationStaking(allocationStaking.target);
  console.log(`salesFactory.setAllocationStaking ${allocationStaking.target} done.`);

  //授权代币并添加池子
  const totalRewards = ethers.parseUnits(c.initialRewardsAllocationStaking);
  const token = hre.ethers.getContractAt('C2NToken', contracts['C2N-TOKEN']);
  console.log("ready to approve " , c.initialRewardsAllocationStaking, "token to staking");

  let tx = await token.approve(allocationStaking.target, totalRewards);
  await tx.wait()
  console.log(`token.approve(${allocationStaking.target}, ${totalRewards.toString()})`);
  
  console.log("ready to add c2n to pool")

  tx = await allocationStaking.add(100, token.target, true);
  await tx.wait()
  console.log(`allocationStaking.add(${token.target})`);

  console.log("ready to add boba to pool")
  
  //调用fund方法,为AllocationStaking池子提供测试资金
  const fund = Math.floor(Number(c.initialRewardsAllocationStaking)).toString()
  console.log(`ready to fund ${fund} token for testing`);

  await allocationStaking.fund(ethers.parseUnits(fund, 18));
  console.log('Funded tokens')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
/**
 * 实现以下功能:
 * i. 部署合约并保存地址
 * ii. 配置合约之间的交互关系
 * iii. 添加资金池和测试资金
 * iv. 支持可升级合约的部署
 */