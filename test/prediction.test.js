const { expect } = require("chai");
const { ethers } = require("hardhat");
const { defaultTournaments } = require('./helper')
const _ = require('lodash')

const daySeconds = 24 * 60 * 60

describe("prediction", function () {
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
    this.predictionStartAt = this.executionStartAt - 30 * 60

    await ethers.provider.send("evm_setNextBlockTimestamp", [this.predictionStartAt])
  });

  describe("createPredictions", function () {
    it("empty", async function () {
      await expect(this.alphasea.createPredictions([]))
          .to.be.revertedWith('empty params');
    });

    it("model not exist", async function () {
      await expect(this.alphasea.createPredictions([{
        modelId: 'not_found',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
      }]))
          .to.be.revertedWith('modelId not exist.');
    });

    it("not model owner", async function () {
      await expect(this.alphasea.createPredictions([{
        modelId: 'other_model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
      }]))
          .to.be.revertedWith('model owner only.');
    });

    it("empty encryptedContent", async function () {
      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [],
        price: 1,
      }]))
          .to.be.revertedWith('encryptedContent empty');
    })

    it("too early", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp",
          [this.predictionStartAt - 1])

      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
      }]))
          .to.be.revertedWith('createPrediction is forbidden now');
    });

    it("too late", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp", [this.predictionStartAt + 8 * 60])

      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
      }]))
          .to.be.revertedWith('createPrediction is forbidden now');
    });

    it("invalid executionStartAt", async function () {
      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt + 1,
        encryptedContent: [1, 2, 3],
      }]))
          .to.be.revertedWith('executionStartAt is invalid');
    });

    describe("multiple executionStartAt", async function () {
      _.each(_.range(0, 24, 2), (hour) => {
        it('ok ' + hour, async function () {
          await ethers.provider.send("evm_setNextBlockTimestamp", [this.predictionStartAt + hour * 60 * 60])
          await expect(this.alphasea.createPredictions([{
            modelId: 'model1',
            executionStartAt: this.executionStartAt + hour * 60 * 60,
            encryptedContent: [1, 2, 3],
          }]))
              .to.emit(this.alphasea, 'PredictionCreated')
              .withArgs(
                  'model1',
                  this.executionStartAt + hour * 60 * 60,
                  '0x010203',
              )
        })
      })
    });

    it("ok", async function () {
      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
      },{
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        encryptedContent: [4, 5, 6],
      }]))
          .to.emit(this.alphasea, 'PredictionCreated')
          .withArgs(
              'model1',
              this.executionStartAt,
              '0x010203',
          )
          .to.emit(this.alphasea, 'PredictionCreated')
          .withArgs(
              'model2',
              this.executionStartAt,
              '0x040506',
          );
    });
  });
});
