
const _ = require('lodash');

const tournaments = _.map(_.range(0, 24, 2), (i) => {
    return {
        'tournamentId': 'crypto_daily_' + ('00' + i).slice(-2) + '30',
        'executionStartAt': 30 * 60 + i * 60 * 60, // i:30UTC
        'predictionTime': 8 * 60,
        'purchaseTime': 8 * 60,
        'shippingTime': 8 * 60,
        'executionPreparationTime': 6 * 60,
        'executionTime': 2 * 60 * 60,
        'publicationTime': 15 * 60,
        'description': 'https://github.com/alphasea-dapp/alphasea/tree/master/tournaments/crypto_daily.md',
    }
})

module.exports = {
    tournaments: tournaments,
}
