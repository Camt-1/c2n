const { ethers, upgrades } = require("hardhat");
const { getSavedContractAddresses } = require('../utils')
const hre = require("hardhat");

async function main() {
  // 获取当前网络的所有合约地址
  const contracts = getSavedContractAddresses()[hre.network.name];
  //通过获取当前网络的AllocationStakingProxy合约地址,获取合约实例
  const allocationStaking = await hre.ethers.getContractAt(
    'AllocationStaking',
    contracts['AllocationStakingProxy']
  );

  //从AllocationStaking合约中获取当前的salesFactory地址
  let salesFactory = await allocationStaking.salesFactory();
  console.log(salesFactory);

  //设置新的SalesFactory地址,新的地址来自contracts['SalesFactory']
  await allocationStaking.setSalesFactory(contracts['SalesFactory']);

  //获取更新后的salesFactory地址
  salesFactory = await allocationStaking.salesFactory();
  console.log(salesFactory);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
/**
 * 实现以下功能:
 * i. 获取AllocationStakingProxy合约的实例
 * ii. 读取并打印当前的salesFactory地址
 * iii. 将SalesFactory合约地址更新为保存的地址
 * iv. 再次读取并打印salesFactory地址,确保更新成功
 */