const hre = require("hardhat");
const { getSavedContractAddresses } = require('../utils')
const { ethers } = hre

async function main() {
  //调用`getSavedContractAddresses`获取合约地址
  const contracts = getSavedContractAddresses()[hre.network.name];
  //使用`hre.ethers.getContractAt`获取名称为Admin的合约实例
  const admin = await hre.ethers.getContractAt('Admin', contracts['Admin']);
  //调用`admin.addAdmin`方法，向合约中添加一个新的管理员
  await admin.addAdmin('0xC9a04c27Cd1026c96f980e89a588d724011377c7');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
/**
 * 实现以下功能:
 * i. 获取已保存的Admin合约地址
 * ii. 使用Hardhat的ethers工具连接到Admin合约
 * iii. 调用Admin合约的addAdmin方法，向合约中添加新的管理员地址0xC9a04c27Cd1026c96f980e89a588d724011377c7
 */