const { ethers, upgrades } = require("hardhat");
const { getSavedContractAddresses, getSavedProxyABI, saveContractAddress} = require('../utils')
const hre = require("hardhat");

async function main() {
  //从已保存的地址文件中获取当前网络的所有合约地址
  const contracts = getSavedContractAddresses()[hre.network.name];
  //从地址列表中获取ProxyAdmin合约的地址,获取ProxyAdmin的ABI,用于与合约交互
  const proxyAdminAbi = getSavedProxyABI()['ProxyAdmin'];

  //通过ABI和地址获取ProxyAdmin合约实例
  //proxyAdmin是一个代表ProxyAdmin合约实例的对象
  const proxyAdmin = await hre.ethers.getContractAt(proxyAdminAbi, contracts['ProxyAdmin']);
  //从保存的地址列表中获取AllocationStakingProxy的代理地址
  const allocationStakingProxy = contracts["AllocationStakingProxy"];
  //打印代理地址
  console.log("Proxy: ", allocationStakingProxy);

  //获取AllocationStaking合约工厂,用于部署新的实现合约
  const allocationStakingImplementation = await ethers.getContractFactory("AllocationStaking");
  //部署新的AllocationStaking实现合约
  const allocationStakingImpl = await allocationStakingImplementation.deploy();
  //等待部署完成
  await allocationStakingImpl.deployed();

  //输出新部署的AllocationStaking实现合约的地址
  console.log("New Implementation: ", allocationStakingImpl.address);

  //调用ProxyAdmin合约的upgrade方法,将代理合约allocationStakingProxy的实现地址升级为新的实现合约地址allocationStakingImpl.address
  await proxyAdmin.upgrade(allocationStakingProxy, allocationStakingImpl.address)
  //打印升级完成的信息
  console.log("AllocationStaking contract upgraded");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
/**
 * 实现功能:
 * i. 获取代理管理合约(ProxyAdmin)和代理合约地址(AllocationStakingProxy)
 * ii. 部署新的AllocationStaking实现合约
 * iii. 通过ProxyAdmin将代理合约升级到新的实现合约
 */