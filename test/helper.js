
const { network } = require("hardhat");

const defaultTournaments = [
    {
        'tournamentId': 'crypto_daily',
        'executionStartAt': 30 * 60, // 0:30UTC
        'predictionTime': 8 * 60,
        'purchaseTime': 8 * 60,
        'shippingTime': 8 * 60,
        'executionPreparationTime': 6 * 60,
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
