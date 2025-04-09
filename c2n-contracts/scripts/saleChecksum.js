const hre = require("hardhat");
const {saveContractAddress, getSavedContractAddresses} = require('./utils')
const config = require("./configs/saleConfig.json");
const {BigNumber, getAddress, ethers} = require("ethers");

//定义输出样式
const bS = "\x1b[1m"; // Brightness start
const e = "\x1b[0m";  // End style
const VALID = bS + "\x1b[32mVALID ✅" + e;
const NOT_VALID = bS + "\x1b[31mNOT VALID ❌" + e;

const NUMBER_1E18 = BigNumber.from("1000000000000000000");

async function main() {
  //加载当前网络配置
  const c = config[hre.network.name];

  //获取销售合约实例
  const saleAddress = '';
  const saleContract = await hre.ethers.getContractAt('C2NSale', saleAddress);
  const sale = await saleContract.sale();
  const registration = await saleContract.registration();

  //验证代币地址
  console.log('Token');
  console.log(sale[0], c['tokenAddress'], sale[0] === c['tokenAddress'] ? VALID : NOT_VALID, "\n");

  //验证销售所用者
  console.log('SaleOwner');
  console.log(sale[5], c['saleOwner'], sale[5] === ethers.utils.getAddress(c['saleOwner']) ? VALID : NOT_VALID, "\n");

  //验证代币总量
  console.log('TotalTokenAmount')
  const totalTokens = sale[7];
  const a = c['totalTokens'];
  console.log(
    parseInt(totalTokens), parseInt(BigNumber.from(a).mul(NUMBER_1E18)),
    parseInt(totalTokens) === parseInt(BigNumber.from(a).mul(NUMBER_1E18)) ? VALID : NOT_VALID, "\n"
  );

  //验证代币价格
  console.log('TokenPriceInEth')
  const o = sale[6];
  const p = parseFloat(c['tokenPriceInEth']) * NUMBER_1E18;
  console.log(
    parseInt(o), parseInt(p),
    parseInt(o) === parseInt(p) ? VALID : NOT_VALID, "\n"
  );

  //验证销售结束时间
  console.log("Sale end");
  let val1 = parseInt(sale[11]);
  let val2 = parseInt(c['registrationStratAt']) + parseInt(c['registrationLength']) +
    parseInt(c['delayBetweenRegistrationAndSale']) + parseInt(c['saleRoundLength']);
  console.log(val1, val2, val1 === val2 ? VALID : NOT_VALID, "\n");

  //验证代币解锁时间
  console.log('TokenUnlockTime')
  val1 = parseInt(sale[12]);
  val2 = parseInt(c['unlockingTimes'][0]);
  console.log(val1, val2, val1 === val2 ? VALID : NOT_VALID, "\n");

  //验证注册开始时间
  console.log("Registration Start");
  val1 = parseInt(registration[0]);
  val2 = parseInt(c["registrationStartAt"]);
  console.log(val1, val2, val1 === val2 ? VALID : NOT_VALID, "\n");
  //验证注册结束时间
  console.log("Registration End");
  val1 = parseInt(registration[1]);
  val2 = parseInt(c["registrationStartAt"]) + parseInt(c["registrationLength"]);
  console.log(val1, val2, val1 === val2 ? VALID : NOT_VALID, "\n");

  //验证销售轮开始时间
  console.log("Sale Round Start");
  val1 = parseInt(sale[10]);
  val2 = parseInt(c["registrationStartAt"]) + parseInt(c["registrationLength"]) +
      parseInt(c["delayBetweenRegistrationAndSale"]);
  console.log(val1, val2, val1 === val2 ? VALID : NOT_VALID, "\n");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
/**
 * 该代码核心功能是验证销售合约是否符合预期.
 * 逐项检查销售合约的各个参数(如代币地址, 销售所有者, 代币总量等)
 * 并将结果输出到控制台,标记为有效或无效.
 */