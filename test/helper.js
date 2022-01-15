
const { network } = require("hardhat");

const defaultTournaments = [
    {
        'tournamentId': 'crypto_daily',
        'executionStartAt': 60 * 60,
        'predictionTime': 15 * 60,
        'purchaseTime': 15 * 60,
        'shippingTime': 15 * 60,
        'executionPreparationTime': 15 * 60,
        'executionTime': 60 * 60,
        'publicationTime': 15 * 60,
        'description': 'description1',
    }
]

module.exports = {
    defaultTournaments: defaultTournaments,
}

// cannot use hardhat_reset to use solidity-coverage
// https://issueexplorer.com/issue/sc-forks/solidity-coverage/574

let snapshotId

beforeEach(async function() {
    snapshotId = await network.provider.request({ method: 'evm_snapshot' });
});

afterEach(async function() {
    await network.provider.request({
        method: 'evm_revert',
        params: [snapshotId]
    });
});
