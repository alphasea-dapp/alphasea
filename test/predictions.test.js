const { expect } = require("chai");
const { ethers } = require("hardhat");
const { defaultTournaments } = require('./helper')

const daySeconds = 24 * 60 * 60

describe("predictions", function () {
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
    }])).wait()

    await (await this.alphasea.connect(this.otherAddress).createModels([{
      modelId: 'other_model1',
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }])).wait()

    const baseTime = Math.floor(2000000000 / daySeconds) * daySeconds;
    this.executionStartAt = baseTime + 60 * 60
    this.predictionStartAt = this.executionStartAt - 4 * 15 * 60

    await ethers.provider.send("evm_setNextBlockTimestamp", [this.predictionStartAt])
    await ethers.provider.send("evm_mine")
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
        price: 1,
      }]))
          .to.be.revertedWith('modelId not exist.');
    });

    it("not model owner", async function () {
      await expect(this.alphasea.createPredictions([{
        modelId: 'other_model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
        price: 1,
      }]))
          .to.be.revertedWith('model owner only.');
    });

    it("price zero", async function () {
      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
        price: 0,
      }]))
          .to.be.revertedWith('price must be positive.');
    });

    it("price too large", async function () {
      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
        price: '452312848583266388373324160190187140051835877600158453279131187530910662656',
      }]))
          .to.be.revertedWith('price must be < 2^248');
    });

    it("too early", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp",
          [this.predictionStartAt + daySeconds - 1])

      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt + daySeconds,
        encryptedContent: [1, 2, 3],
        price: 1,
      }]))
          .to.be.revertedWith('createPrediction is forbidden now');
    });

    it("too late", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp", [this.predictionStartAt + 15 * 60])

      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
        price: 1,
      }]))
          .to.be.revertedWith('createPrediction is forbidden now');
    });

    it("invalid executionStartAt", async function () {
      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt + 1,
        encryptedContent: [1, 2, 3],
        price: 1,
      }]))
          .to.be.revertedWith('executionStartAt is invalid');
    });

    it("already exists", async function () {
      await (await this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
        price: 1,
      }])).wait()

      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
        price: 1,
      }]))
          .to.be.revertedWith('prediction already exists.');
    });

    it("ok", async function () {
      await expect(this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
        price: 1,
      },{
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        encryptedContent: [4, 5, 6],
        price: 2,
      }]))
          .to.emit(this.alphasea, 'PredictionCreated')
          .withArgs(
              'model1',
              this.executionStartAt,
              1,
              '0x010203',
          )
          .to.emit(this.alphasea, 'PredictionCreated')
          .withArgs(
              'model2',
              this.executionStartAt,
              2,
              '0x040506',
          );
    });

  });
});
