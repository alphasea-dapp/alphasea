const { expect } = require("chai");
const { ethers } = require("hardhat");
const { defaultTournaments } = require('./helper')

const daySeconds = 24 * 60 * 60

describe("getters", function () {
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
        }])).wait()

        const baseTime = Math.floor(2000000000 / daySeconds) * daySeconds;
        this.executionStartAt = baseTime + 30 * 60
        this.predictionStartAt = this.executionStartAt - 30 * 60
        this.purchaseStartAt = this.executionStartAt - 22 * 60
        this.shippingStartAt = this.executionStartAt - 14 * 60
        this.refundStartAt = this.executionStartAt - 6 * 60

        await ethers.provider.send("evm_setNextBlockTimestamp", [this.predictionStartAt])

        // predict
        await (await this.alphasea.createPredictions([{
            modelId: 'model1',
            executionStartAt: this.executionStartAt,
            encryptedContent: [1, 2, 3],
            price: 1,
        }])).wait()

        // purchase
        await ethers.provider.send("evm_setNextBlockTimestamp", [this.purchaseStartAt])
        await (await this.alphasea.connect(this.otherAddress).createPurchases([{
            modelId: 'model1',
            executionStartAt: this.executionStartAt,
            publicKey: [1, 2, 3],
        }], { 'value': 1 }))
    });

    describe("tournaments", function () {
        it("ok", async function () {
            const result = await this.alphasea.tournaments('crypto_daily')
            expect(result.executionStartAt).to.equal(30 * 60)
            expect(result.predictionTime).to.equal(8 * 60)
            expect(result.purchaseTime).to.equal(8 * 60)
            expect(result.shippingTime).to.equal(8 * 60)
            expect(result.executionPreparationTime).to.equal(6 * 60)
            expect(result.executionTime).to.equal(60 * 60)
            expect(result.publicationTime).to.equal(15 * 60)
            expect(result.description).to.equal('description1')
        });
    })

    describe("models", function () {
        it("ok", async function () {
            const result = await this.alphasea.models('model1')
            expect(result.tournamentId).to.equal('crypto_daily')
            expect(result.predictionLicense).to.equal('CC0-1.0')
            expect(result.owner).to.equal(this.myAddress.address)
        });
    })

    describe("predictions", function () {
        it("ok", async function () {
            const result = await this.alphasea.getPredictions('model1', this.executionStartAt)
            expect(result.price).to.equal(1)
            expect(result.published).to.equal(false)
        });
    })

    describe("purchases", function () {
        it("ok", async function () {
            const result = await this.alphasea.getPurchases('model1', this.executionStartAt, this.otherAddress.address)
            expect(result.created).to.equal(true)
            expect(result.shipped).to.equal(false)
            expect(result.refunded).to.equal(false)
        });
    })
})
