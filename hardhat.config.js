require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');
require("@nomiclabs/hardhat-etherscan");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

const config = {
  solidity: {
    version: "0.8.11",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {},
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      ropsten: process.env.ETHERSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
    }
  },
}

if (process.env.POLYGON_PRIVATE_KEY) {
  config.networks.polygon = {
    url: "https://polygon-rpc.com",
    accounts: [process.env.POLYGON_PRIVATE_KEY]
  }
}

if (process.env.ROPSTEN_PRIVATE_KEY) {
  config.networks.ropsten = {
    url: 'https://ropsten.infura.io/v3/a3313d9ab92742e3bb3aef9c78c859d6',
    accounts: [process.env.ROPSTEN_PRIVATE_KEY]
  }
  config.networks.mumbai = {
    url: "https://rpc-mumbai.maticvigil.com",
    accounts: [process.env.ROPSTEN_PRIVATE_KEY]
  }
  config.networks.fuji = {
    url: 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: 43113,
    accounts: [process.env.ROPSTEN_PRIVATE_KEY]
  }
}

module.exports = config
