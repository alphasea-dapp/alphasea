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
    });

    describe("tournaments", function () {
        it("ok", async function () {
            const result = await this.alphasea.tournaments('crypto_daily')
            expect(result.executionStartAt).to.equal(30 * 60)
            expect(result.predictionTime).to.equal(8 * 60)
            expect(result.sendingTime).to.equal(16 * 60)
            expect(result.executionPreparationTime).to.equal(6 * 60)
            expect(result.executionTime).to.equal(60 * 60)
            expect(result.publicationTime).to.equal(30 * 60)
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
})
