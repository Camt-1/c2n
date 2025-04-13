const hre = require("hardhat");
const {saveContractAddress, getSavedContractAddresses} = require('../utils')
const {ethers} = require("hardhat");

async function main() {
  //定义每秒奖励的代币数量,这里设置的是一个代币
  const RPS = "1";
  //定义Farming合约的开始时间戳,为UNIX时间戳1744449493
  const startTs = 1744449493;
  //调用`getSavedContractAddresses`获取已保存的合约地址,根据当前网络获取C2NToken地址,打印出c2nTokenAddress
  const c2nTokenAddress = getSavedContractAddresses()[hre.network.name]["C2N-TOKEN"];
  console.log("c2nTokenAddress: ", c2nTokenAddress)

  //获取FarmingC2N合约工厂
  const farm = await hre.ethers.getContractFactory("FarmingC2N");
  //调用farm.deploy部署FarmingC2N合约,参数包括: 合约地址, 转换为wei的RPS, 开始时间戳
  const Farm = await farm.deploy(c2nTokenAddress, ethers.parseUnits(RPS, 18), startTs);
  //等待合约部署完成并打印合约地址
  await Farm.waitForDeployment();
  console.log("Farm deployed to: ", Farm.target);

  //保存FarmingC2N合约地址
  saveContractAddress(hre.network.name, "FarmingC2N", Farm.target);

  //使用`hre.ethers.getContractAt`获取C2NToken合约实例
  const C2N = await hre.ethers.getContractAt("C2NToken", c2nTokenAddress);
  //调用C2N.approve授权FarmingC2N合约50,000个代币
  const approveTx = await C2N.approve(Farm.target, ethers.parseUnits("50000", 18));
  //等待交易完成
  await approveTx.wait();

  //获取LP代币地址(这里仍然是C2N-TOKEN地址)
  const lpTokenAddress = getSavedContractAddresses()[hre.network.name]["C2N-TOKEN"];
  //调用Farm.add向FarmingC2N合约添加流动性池子,参数: 流动性池的权重, LP代币地址, 是否更新所有池
  await Farm.add(100, lpTokenAddress, true);
  //打印操作完成的日志
  console.log("Farm funded and LP token added");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
/**
 * 实现以下功能:
 * i. 获取C2NToken的地址
 * ii. 部署FarmingC2N合约
 * iii. 授权FarmingC2N合约使用C2NToken
 * iv. 添加一个流动性池(LP Token)
 */