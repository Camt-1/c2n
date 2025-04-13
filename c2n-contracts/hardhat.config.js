require('dotenv').config();
require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');

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
        accounts:['ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80']
    },
    sepolia: {
        url: 'https://eth-sepolia.g.alchemy.com/v2/9wE1yRYtd9af7fc8KLTt-k_SuFJStzsS',
        //accounts: [process.env.PRIVATE_KEY]
        accounts:['fcbe63d30fadcbdc958152cb2afc99e3e29a647bb4edf20bcb2cebf045ec4d90']
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