
const _ = require('lodash');

const tournaments = [
    {
        'tournamentId': 'crypto_daily',
        'executionStartAt': 30 * 60, // 0:30, 2:30, 4:30 ...
        'predictionTime': 8 * 60,
        'purchaseTime': 8 * 60,
        'shippingTime': 8 * 60,
        'executionPreparationTime': 6 * 60,
        'executionTime': 2 * 60 * 60,
        'publicationTime': 15 * 60,
        'description': 'https://github.com/alphasea-dapp/alphasea/tree/master/tournaments/crypto_daily.md',
    }
]

module.exports = {
    tournaments: tournaments,
}
