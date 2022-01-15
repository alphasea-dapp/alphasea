const { expect } = require("chai");
const { ethers } = require("hardhat");
const { defaultTournaments } = require('./helper')

const daySeconds = 24 * 60 * 60

describe("purchase", function () {
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

    // predict
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

    this.purchaseStartAt = this.executionStartAt - 3 * 15 * 60
    await ethers.provider.send("evm_setNextBlockTimestamp", [this.purchaseStartAt])
  });

  describe("createPurchases", function () {
    it("empty", async function () {
      await expect(this.alphasea.createPurchases([]))
          .to.be.revertedWith('empty params');
    });

    it("model not exist", async function () {
      await expect(this.alphasea.createPurchases([{
        modelId: 'not_found',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('modelId not exist.');
    });

    it("self model", async function () {
      await expect(this.alphasea.createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('cannot purchase my models.');
    });

    it("empty publicKey", async function () {
      await expect(this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [],
      }]))
          .to.be.revertedWith('publicKey empty');
    });

    it("too early", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp",
          [this.purchaseStartAt - 1])

      await expect(this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('createPurchase is forbidden now');
    });

    it("too late", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp",
          [this.purchaseStartAt + 15 * 60])

      await expect(this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('createPurchase is forbidden now');
    });

    it("prediction not exist", async function () {
      await expect(this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model3',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('prediction not exist.');
    });

    it("already exists", async function () {
      await (await this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }], { 'value': 1 })).wait()

      await expect(this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('Already purchased.');
    });

    it("lack of money", async function () {
      await expect(this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }, {
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }], { 'value': 2 }))
          .to.be.revertedWith('sent eth mismatch.');
    });

    it("excess money", async function () {
      await expect(this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }, {
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }], { 'value': 4 }))
          .to.be.revertedWith('sent eth mismatch.');
    });

    it("ok", async function () {
      await expect(this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }, {
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        publicKey: [4, 5, 6],
      }], { 'value': 3 }))
          .to.emit(this.alphasea, 'PurchaseCreated')
          .withArgs(
              'model1',
              this.executionStartAt,
              this.otherAddress.address,
              '0x010203',
          )
          .to.emit(this.alphasea, 'PurchaseCreated')
          .withArgs(
              'model2',
              this.executionStartAt,
              this.otherAddress.address,
              '0x040506',
          );
    });
  })

  describe("shipPurchases", function () {
    it("empty", async function () {
      await expect(this.alphasea.shipPurchases([]))
          .to.be.revertedWith('empty params');
    });

    it("model not exist", async function () {
    });
    it("not model owner", async function () {
    });
    it("empty encryptedContentKey", async function () {
    });
    it("too early", async function () {
    });
    it("too late", async function () {
    });
    it("purchase not exist", async function () {
    });
    it("already shipped", async function () {
    });
    it("already refunded", async function () {
      // impossible
    });
    it("reentrance", async function () {
    });
    it("ok", async function () {
    });
  })

  describe("refundPurchases", function () {
    it("empty", async function () {
      await expect(this.alphasea.refundPurchases([]))
          .to.be.revertedWith('empty params');
    });

    it("model not exist", async function () {
    });
    it("not purchaser", async function () {
    });
    it("too early", async function () {
    });
    it("purchase not exist", async function () {
    });
    it("already shipped", async function () {
    });
    it("already refunded", async function () {
    });
    it("reentrance", async function () {
    });
    it("ok", async function () {
    });
  })
});
