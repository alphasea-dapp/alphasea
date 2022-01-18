const { expect } = require("chai");
const { ethers } = require("hardhat");
const { defaultTournaments } = require('./helper')

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
    this.executionStartAt = baseTime + 60 * 60
    this.predictionStartAt = this.executionStartAt - 4 * 15 * 60

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

  describe("publishPredictions", function () {
    beforeEach(async function () {
      await (await this.alphasea.createPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        encryptedContent: [1, 2, 3],
        price: 1,
      },{
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        encryptedContent: [4, 5, 6],
        price: 2,
      }])).wait()

      this.publicationStartAt = this.executionStartAt + daySeconds + 60 * 60

      await ethers.provider.send("evm_setNextBlockTimestamp", [this.publicationStartAt])
    })

    it("empty", async function () {
      await expect(this.alphasea.publishPredictions([]))
          .to.be.revertedWith('empty params');
    });

    it("model not exist", async function () {
      await expect(this.alphasea.publishPredictions([{
        modelId: 'not_found',
        executionStartAt: this.executionStartAt,
        contentKeyGenerator: [1, 2, 3],
      }]))
          .to.be.revertedWith('modelId not exist.');
    })

    it("not model owner", async function () {
      await expect(this.alphasea.publishPredictions([{
        modelId: 'other_model1',
        executionStartAt: this.executionStartAt,
        contentKeyGenerator: [1, 2, 3],
      }]))
          .to.be.revertedWith('model owner only.');
    })

    it("empty contentKeyGenerator", async function () {
      await expect(this.alphasea.publishPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        contentKeyGenerator: [],
      }]))
          .to.be.revertedWith('contentKeyGenerator empty');
    })

    it("too early", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp",
          [this.publicationStartAt - 1])

      await expect(this.alphasea.publishPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        contentKeyGenerator: [1, 2, 3],
      }]))
          .to.be.revertedWith('publishPrediction is forbidden now');
    })

    it("too late", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp", [this.publicationStartAt + 15 * 60])

      await expect(this.alphasea.publishPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        contentKeyGenerator: [1, 2, 3],
      }]))
          .to.be.revertedWith('publishPrediction is forbidden now');
    })

    it("prediction not found", async function () {
      await expect(this.alphasea.publishPredictions([{
        modelId: 'model3',
        executionStartAt: this.executionStartAt,
        contentKeyGenerator: [1, 2, 3],
      }]))
          .to.be.revertedWith('prediction not exist.');
    })

    it("already published", async function () {
      await (await this.alphasea.publishPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        contentKeyGenerator: [1, 2, 3],
      }])).wait()

      await expect(this.alphasea.publishPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        contentKeyGenerator: [1, 2, 3],
      }]))
          .to.be.revertedWith('Already published.');
    })

    it("ok", async function () {
      await expect(this.alphasea.publishPredictions([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        contentKeyGenerator: [1, 2, 3],
      },{
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        contentKeyGenerator: [4, 5, 6],
      }]))
          .to.emit(this.alphasea, 'PredictionPublished')
          .withArgs(
              'model1',
              this.executionStartAt,
              ethers.utils.solidityKeccak256(
                  ['bytes', 'string'],
                  [[1, 2, 3], 'model1']
              ),
          )
          .to.emit(this.alphasea, 'PredictionPublished')
          .withArgs(
              'model2',
              this.executionStartAt,
              ethers.utils.solidityKeccak256(
                  ['bytes', 'string'],
                  [[4, 5, 6], 'model2']
              ),
          );
    })
  })
});
