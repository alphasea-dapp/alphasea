require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');

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
  solidity: "0.8.11",
  optimizer: {
    enabled: true
  },
  networks: {}
}

if (process.env.ROPSTEN_PRIVATE_KEY) {
  config.networks.ropsten = {
    url: `http://127.0.0.1:18545`,
    accounts: [`${process.env.ROPSTEN_PRIVATE_KEY}`]
  }
}

module.exports = config
