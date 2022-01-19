// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const config = require('./config')

async function main() {
    await hre.run("verify:verify", {
        address: '0xdf9b68cf2630FA451EE6C17A4a6Ec83F8B7431A0',
        constructorArguments: [
            config.tournaments
        ],
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
