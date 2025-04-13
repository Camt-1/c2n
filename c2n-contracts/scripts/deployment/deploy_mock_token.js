const hre = require("hardhat");
const { saveContractAddress } = require('../utils')

async function main() {
  //定义代币参数
  const tokenName = "MOCK-TOKEN";
  const symbol = "MCK";
  const totalSupply = ethers.parseUnits("1000000000", 18);
  const decimals = 18;
  
  //获取合约工厂
  const MCK = await hre.ethers.getContractFactory("C2NToken");
  //部署合约,调用`MCK.deploy`方法部署智能合约,传入参数,返回token对象代表已部署的智能合约实例
  const token = await MCK.deploy(tokenName, symbol, totalSupply, decimals);
  //等待合约完成部署,打印合约部署地址
  await token.waitForDeployment();
  
  console.log("MCK deployed to: ", token.target);

  //保存合约地址
  saveContractAddress(hre.network.name, "MCK-TOKEN", token.target);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });