const hre = require("hardhat");
const { saveContractAbi } = require('./utils');

//定义一个异步函数main,作为脚本的主逻辑
async function main() {
  //调用Hardhat的run方法来编译合约
  await hre.run('compile');
  
  //保存合约ABI
  //i.`hre.network.name`获取当前网络名称
  //ii.`hre.artifacts.readArtifact("合约名称")`读取合约的Artifact文件(包含合约的ABI和其他部署相关信息)
  //iii.调用`saveContractAbi`保存每个合约的ABI
  saveContractAbi(hre.network.name, 'Admin', (await hre.artifacts.readArtifact("Admin")).abi)
  saveContractAbi(hre.network.namw, 'SalesFactory', (await hre.artifacts.readArtifact("SalesFactory")).abi)
  saveContractAbi(hre.network.name, 'AllocationStaking', (await hre.artifacts.readArtifact("AllocationStaking")).abi)
  saveContractAbi(hre.network.name, 'C2NSale', (await hre.artifacts.readArtifact("C2NSale")).abi)
}


main()
  //如果主函数执行成功,退出程序并返回状态码0
  .then(() => process.exit(0))
  //如果主函数执行失败,打印错误信息,并退出程序返回状态码1
  .catch(error => {
    console.error(error)
    process.exit(1)
  });
/**
 * 作用:
 * 1. 编译合约
 * 2. 读取指定合约的ABI
 * 3. 将ABI数据保存到文件或其他存储位置(通过saveContractAbi实现)
 */