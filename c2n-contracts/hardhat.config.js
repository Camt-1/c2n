require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  networks: {
    hardhat:{
        chainId: 31337
    },
    local: {
        url: 'http://127.0.0.1:8545',
        chainId:31337,
        // accounts: [process.env.LOCAL_PRIVATE_KEY]
        accounts:['LOCAL_PRIVATE_KEY']
    },
    sepolia: {
        url: 'https://eth-sepolia.g.alchemy.com/v2/9wE1yRYtd9af7fc8KLTt-k_SuFJStzsS',
        //accounts: [process.env.PRIVATE_KEY]
        accounts:['PRIVATE_KEY']
    }
},
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true
          }
        }
      },
      viaIR: true // Ensure viaIR is at the correct level
    }
  }
};