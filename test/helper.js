
const { network } = require("hardhat");

const defaultTournaments = [
    {
        'tournamentId': 'crypto_daily',
        'executionStartAt': 15 * 60, // 0:15UTC
        'predictionTime': 4 * 60,
        'purchaseTime': 4 * 60,
        'shippingTime': 4 * 60,
        'executionPreparationTime': 3 * 60,
        'executionTime': 60 * 60,
        'publicationTime': 15 * 60,
        'description': 'description1',
    }
]

module.exports = {
    defaultTournaments: defaultTournaments,
}

// use snapshot instead of hardhat_reset because of solidity-coverage
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
