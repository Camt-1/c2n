const hre = require("hardhat");
const { saveContractAddress, getSavedContractAddresses } = require('../utils');

async function main() {
  //获取当前网络(hre.network.name)中保存的C2N-TOKEN合约地址
  //打印C2N-TOKEN合约地址
  const c2nTokenAddress = getSavedContractAddresses()[hre.network.name]["C2N-TOKEN"];
  console.log("c2nTokenAddress: ", c2nTokenAddress)

  //使用hardhat的ethers模块从合约工厂部署Airdrop合约
  //部署时将C2N-TOKEN地址作为参数
  //等待部署完成后,打印部署的Airdrop合约地址
  const air = await hre.ethers.getContractFactory("Airdrop");
  const Air = await air.deploy(c2nTokenAddress);
  await Air.waitForDeployment();
  console.log("Air deployed to: ", Air.target);

  //将Airdrop合约地址保存到特定网络存储中,标记为Airdrop-C2N
  saveContractAddress(hre.network.name, "Airdrop-C2N", Air.target);

  //获取已部署的C2NToken合约实例
  //将10,000个C2N代币转移到Airdrop合约地址
  //等待交易完成
  const c2nToken = await hre.ethers.getContractAt("C2NToken", c2nTokenAddress);
  let tx = await c2nToken.transfer(Air.target, ethers.parseUnits("10000", 18));
  await tx.wait();

  //查询并打印Airdrop合约的C2N代币余额
  const balance = await c2nToken.balanceOf(Air.target);
  console.log("Airdrop balance of C2N token: ", ethers.formatEther(balance, 18));

  //调用Airdrop合约的withdrawTokens方法,将代币提取
  //再次查询并打印Airdrop合约的C2N代币余额
  tx = await Air.withdrawTokens();
  await tx.wait();

  const balanceAfter = await c2nToken.balanceOf(Air.target);
  console.log("Airdrop balance of C2N token after withdrawTokens: ", ethers.formatUnits(balanceAfter, 18));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
/**
 * 实现功能如下:
 * 1. 获取已保存的C2N-TOKEN地址
 * 2. 部署一个新的Airdrop合约
 * 3. 将10,000个C2N代币转移到Airdrop合约中,从打印余额
 * 4. 调用Airdrop的withdrawtokens方法提取代币,并打印提取后的余额
 */