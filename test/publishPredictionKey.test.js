const { expect } = require("chai");
const { ethers } = require("hardhat");
const { defaultTournaments } = require('./helper')
const _ = require('lodash')

const daySeconds = 24 * 60 * 60

describe("publishPredictionKey", function () {
    before(async function () {
        this.Alphasea = await ethers.getContractFactory('Alphasea');
    });

    beforeEach(async function () {
        const addresses = await ethers.getSigners()
        this.myAddress = addresses[0]
        this.otherAddress = addresses[1]

        this.alphasea = await this.Alphasea.deploy(defaultTournaments);
        await this.alphasea.deployed();

        await (await this.alphasea.createModels([{
            modelId: 'model1',
            tournamentId: 'crypto_daily',
            predictionLicense: 'CC0-1.0'
        }, {
            modelId: 'model2',
            tournamentId: 'crypto_daily',
            predictionLicense: 'CC0-1.0'
        },{
            modelId: 'model3',
            tournamentId: 'crypto_daily',
            predictionLicense: 'CC0-1.0'
        }])).wait()

        await (await this.alphasea.connect(this.otherAddress).createModels([{
            modelId: 'other_model1',
            tournamentId: 'crypto_daily',
            predictionLicense: 'CC0-1.0'
        }])).wait()

        const baseTime = Math.floor(2000000000 / daySeconds) * daySeconds;
        this.executionStartAt = baseTime + 30 * 60
        this.publicationStartAt = this.executionStartAt + daySeconds + 60 * 60

        await ethers.provider.send("evm_setNextBlockTimestamp", [this.publicationStartAt])
    });

    it("empty contentKeyGenerator", async function () {
        await expect(this.alphasea.publishPredictionKey(
            'crypto_daily',
            this.executionStartAt,
            []
        ))
            .to.be.revertedWith('contentKeyGenerator empty');
    })

    it("too early", async function () {
        await ethers.provider.send("evm_setNextBlockTimestamp",
            [this.publicationStartAt - 1])

        await expect(this.alphasea.publishPredictionKey(
            'crypto_daily',
            this.executionStartAt,
            [1, 2, 3]
        ))
            .to.be.revertedWith('publishPrediction is forbidden now');
    })

    it("too late", async function () {
        await ethers.provider.send("evm_setNextBlockTimestamp", [this.publicationStartAt + 30 * 60])

        await expect(this.alphasea.publishPredictionKey(
            'crypto_daily',
            this.executionStartAt,
            [1, 2, 3]
        ))
            .to.be.revertedWith('publishPrediction is forbidden now');
    })

    it("ok", async function () {
        await expect(this.alphasea.publishPredictionKey(
            'crypto_daily',
            this.executionStartAt,
            [1, 2, 3]
        ))
            .to.emit(this.alphasea, 'PredictionKeyPublished')
            .withArgs(
                this.alphasea.signer.address,
                'crypto_daily',
                this.executionStartAt,
                ethers.utils.solidityKeccak256(
                    ['bytes', 'address'],
                    [[1, 2, 3], this.alphasea.signer.address]
                ),
            );
    })
});
