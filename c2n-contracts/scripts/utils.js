//文件系统模块,用于读取和写入文件
const fs = require(`fs`)
//路径模块,用于处理文件和目录路径
const path = require(`path`)

//读取保存的智能合约地址
function getSavedContractAddresses() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/contract-addresses.json`))
    } catch (err) {
        json = `{}`
    }
    const addrs = JSON.parse(json)       
    return addrs
}

//读取保存的智能合约ABI
function getSavedContractABI() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/contract-abis.json`))
    } catch (err) {
        json = `{}`
    }
    return JSON.parse(json)
}

//读取保存的代理合约ABI
function getSavedProxyABI() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/proxy-abis.json`))
    } catch (err) {
        json = `{}`
    }
    return JSON.parse(json)
}

//保存智能合约ABI
function saveContractAbi(network, contract, abi) {
    const abis = getSavedContractABI()
    abis[network] = abis[network] || {}
    abis[network][contract] = abi
    fs.writeFileSync(path.join(__dirname, `../deployments/contract-abis.json`), JSON.stringify(addrs, null, '    '))
}

//保存智能合约地址
function saveContractAddress(network, contract, address) {
    const addrs = getSavedContractAddresses()
    addrs[network] = addrs[network] || {}
    addrs[network][contract] = address
    fs.writeFileSync(path.join(__dirname, `../deployments/contract-addresses.json`), JSON.stringify(addrs, null, '    '))
}

//导出模块
module.exports = {
    getSavedContractAddresses,
    saveContractAddress,
    saveContractAbi,
    getSavedContractABI,
    getSavedProxyABI
}
