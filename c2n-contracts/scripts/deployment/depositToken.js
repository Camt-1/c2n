const hre = require("hardhat")
const {saveContractAddress, getSavedContractAddresses} = require('../utils')
const config = require("../configs/saleConfig.json")
const {ethers} = hre

//获取当前网络中最新区块的时间戳
async function getCurrentBlockTimestamp() {
  return (await ethers.provider.getBlock('latest')).timestamp;
}
//延迟函数
const delay = ms => new Promise(res => setTimeout(res, ms));
const delayLength = 3000;

async function main() {
  //获取当前网络已保存的合约地址
  const contracts = getSavedContractAddresses()[hre.network.name];
  //获取当前网络的销售配置
  const c = config[hre.network.name];

  //获取合约实例
  const token = await hre.ethers.getContractAt('C2NToken', contracts['MOCK-TOKEN']);
  console.log(`${token}, ${token.target}`)
  const salesFactory = await hre.ethers.getContractAt('SalesFactory', contracts['SalesFactory']);

  //获取最后部署的销售合约地址
  const lastDeployedSale = await salesFactory.getLastDeployedSale();
  await token.approve(lastDeployedSale, ethers.parseEther(c.totalTokens));
  console.log('Deployed Sale address is: ', lastDeployedSale);
  console.log(`token.approve(${lastDeployedSale}, ${c.totalTokens})`);

  //获取销售合约并调用方法
  const sale = await hre.ethers.getContractAt('C2NSale', lastDeployedSale);
  console.log(`Successfully instantiated sale contract at address: ${lastDeployedSale}.`);
  await sale.depositTokens();
  console.log('ido sale deposited');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1);
  });
/**
 * 实现以下功能:
 * i. 获取代币和销售工厂的合约实例
 * ii. 授权销售合约管理特定数量的代币
 * iii. 获取最后部署的销售合约地址
 * iv. 调用销售合约的depositTokens方法,将代币存入
 */