// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const tournaments = [
    {
        'tournamentId': 'crypto_daily',
        'executionStartAt': 0,
        'predictionTime': 15 * 60,
        'purchaseTime': 15 * 60,
        'shippingTime': 15 * 60,
        'executionPreparationTime': 15 * 60,
        'executionTime': 60 * 60,
        'publicationTime': 15 * 60,
        'description': 'description1',
    }
];

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // We get the contract to deploy
    const Alphasea = await hre.ethers.getContractFactory("Alphasea");
    const alphasea = await Alphasea.deploy(
        tournaments,
    );
    await alphasea.deployed();

    console.log("Alphasea deployed to:", alphasea.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
