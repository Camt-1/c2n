const hre = require("hardhat");
const {saveContractAddress, getSavedContractAddresses} = require('../utils')
const config = require("../configs/saleConfig.json");
const {ethers} = hre

async function getCurrentBlockTimestamp() {
  //通过调用最新区块的时间戳,获取链上的当前时间
  const block = await ethers.provider.getBlock('latest')
  return block.timestamp
}

//定义一个延迟函数,延迟时间为为3000毫秒(3秒)
const delay = ms => new Promise(res => setTimeout(res, ms))
const delayLength = 3000

async function main() {
  //从保存地址中获取当前网络的合约地址
  const contracts = getSavedContractAddresses()[hre.network.name]
  //从配置文件中读取当前网络的参数
  const c = config[hre.network.name]

  //通过合约工厂部署销售合约
  const salesFactory = await hre.ethers.getContractAt('SalesFactory', contracts['SalesFactory']);
  let tx = await salesFactory.deploySale()
  await tx.wait()
  console.log('Sale is deployed successfully.')

  //获取最后部署的销售合约地址
  const lastDeployedSale = await salesFactory.getLastDeployedSale()
  console.log('Deployed Sale address is: ', lastDeployedSale)
  //使用地址实例化销售合约
  const sale = await hre.ethers.getContractAt('C2NSale', lastDeployedSale)
  console.log(`Successfully instantiated sale contract at address: ${lastDeployedSale}.`)
  //待销售的代币总量
  const totalTokens = ethers.parseUnits(c['totalTokens'], 18)
  console.log('Total tokens to sell: ', c['totalTokens'])
  //代币价格(以ETH表示)
  const tokenPriceInEth = ethers.parseUnits(c['tokenPriceInEth'], 18)
  console.log('tokenPriceInEth: ', c['tokenPriceInEth'])
  //销售合约的所有者
  const saleOwner = c['saleOwner']
  console.log('Sale owner is: ', c['saleOwner'])
  
  //注册起始时间
  const registrationStart = BigInt(c['registrationStartAt'])
  //注册截止时间
  const registrationEnd = registrationStart + BigInt(c['registrationLength'])
  //销售起始时间
  const saleStartTime = registrationEnd + BigInt(c['delayBetweenRegistrationAndSale'])
  //销售截止时间
  const saleEndTime = saleStartTime + BigInt(c['saleRoundLength'])
  //单个用户的最大参与量
  const maxParticipation = ethers.parseUnits(c['maxParticipation'], 18)
  //代币解锁时间
  const tokensUnlockTime = BigInt(c['TGE'])

  console.log("ready to set sale params")
  tx = await sale.setSaleParams(
    c["tokenAddress"],
    saleOwner,
    tokenPriceInEth,
    totalTokens,
    saleEndTime,
    tokensUnlockTime,
    c['portionVestingPrecision'],
    maxParticipation
  )
  await tx.wait();
  console.log('Sale Params set successfully.')

  //设置注册时间
  console.log('Setting registration time.')
  console.log('registrationStart: ', registrationStart)
  console.log('registrationEnd', registrationEnd)
  tx = await sale.setRegistrationTime(
    registrationStart,
    registrationEnd
  )
  await tx.wait()
  console.log('Registration time set.')

  //设置销售开始时间
  console.log('Setting saleStart.')
  tx = await sale.setSaleStart(saleStartTime)
  await tx.wait()
  console.log('Sale time set.')

  //调用setVestingParams设置分期解锁参数
  const unlockingTimes = c['unlockingTimes'].map(BigInt)
  const percents = c['portionPercents']
  const maxVestingTimeShift = BigInt(c['maxVestingTimeShift'])
  console.log('Unlocking times: ', unlockingTimes)
  console.log('Percents: ', percents)
  console.log('Precision for vesting: ', c['portionVestingPrecision'])
  console.log('Max vesting time shift in seconds: ', c['maxVestingTimeShift'])
  console.log('Setting vesting params.')
  tx = await sale.setVestingParams(unlockingTimes, percents, maxVestingTimeShift)
  await tx.wait()
  console.log('Vesting parameters set successfully.')

  //打印所有设置的参数信息
  const summary = {
    saleAddress: lastDeployedSale,
    saleToken: c["tokenAddress"],
    saleOwner,
    tokenPriceInEth: tokenPriceInEth.toString(),
    totalTokens: totalTokens.toString(),
    saleEndTime: saleEndTime.toString(),
    tokensUnlockTime: tokensUnlockTime.toString(),
    registrationStart: registrationStart.toString(),
    registrationEnd: registrationEnd.toString(),
    saleStartTime: saleStartTime.toString()
  };

  console.log('Deployment summary')
  console.table(summary)
  console.log(JSON.stringify(summary))
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
/**
 * 实现以下功能:
 * i. 部署销售合约
 * ii. 设置销售参数
 * iii. 设置注册时间和销售时间
 * iv. 设置分期解释参数
 * v. 打印所有部署和配置结果
 */