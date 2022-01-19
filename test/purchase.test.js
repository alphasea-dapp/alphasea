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
    this.otherAddress2 = addresses[2]

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
    },{
      modelId: 'model2',
      executionStartAt: this.executionStartAt,
      encryptedContent: [4, 5, 6],
      price: 2,
    }])).wait()

    await ethers.provider.send("evm_setNextBlockTimestamp", [this.purchaseStartAt])
  });

  describe("createPurchases", function () {
    it("empty", async function () {
      await expect(this.alphasea.connect(this.otherAddress).createPurchases([]))
          .to.be.revertedWith('empty params');
    });

    it("model not exist", async function () {
      await expect(this.alphasea.connect(this.otherAddress).createPurchases([{
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
          [this.purchaseStartAt + 8 * 60])

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

      expect(await this.alphasea.provider.getBalance(this.alphasea.address), 3)
    });
  })

  describe("shipPurchases", function () {
    beforeEach(async function () {
      await (await this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }, {
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        publicKey: [4, 5, 6],
      }], { 'value': 3 })).wait()

      await ethers.provider.send("evm_setNextBlockTimestamp", [this.shippingStartAt])
    })

    it("empty", async function () {
      await expect(this.alphasea.shipPurchases([]))
          .to.be.revertedWith('empty params');
    });

    it("model not exist", async function () {
      await expect(this.alphasea.shipPurchases([{
        modelId: 'not_found',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('modelId not exist.');
    });

    it("not model owner", async function () {
      await expect(this.alphasea.connect(this.otherAddress2).shipPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('model owner only.');
    });

    it("empty encryptedContentKey", async function () {
      await expect(this.alphasea.shipPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [],
      }]))
          .to.be.revertedWith('encryptedContentKey empty.');
    });

    it("too early", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp",
          [this.shippingStartAt - 1])

      await expect(this.alphasea.shipPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('shipPurchase is forbidden now');
    });

    it("too late", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp",
          [this.shippingStartAt + 8 * 60])

      await expect(this.alphasea.shipPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('shipPurchase is forbidden now');
    });

    it("purchase not exist", async function () {
      await expect(this.alphasea.shipPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress2.address,
        encryptedContentKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('Purchase not found.');
    });

    it("already shipped", async function () {
      await (await this.alphasea.shipPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [1, 2, 3],
      }])).wait()

      await expect(this.alphasea.shipPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [1, 2, 3],
      }]))
          .to.be.revertedWith('Already shipped.');
    });

    it("already refunded", async function () {
      // impossible
    });

    it("reentrance", async function () {
      // TODO
    });

    it("ok", async function () {
      await expect(this.alphasea.shipPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [1, 2, 3],
      }, {
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [4, 5, 6],
      }]))
          .to.emit(this.alphasea, 'PurchaseShipped')
          .withArgs(
              'model1',
              this.executionStartAt,
              this.otherAddress.address,
              '0x010203',
          )
          .to.emit(this.alphasea, 'PurchaseShipped')
          .withArgs(
              'model2',
              this.executionStartAt,
              this.otherAddress.address,
              '0x040506',
          );
    });

    it("ok. check balance", async function () {
      await expect(await this.alphasea.shipPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [1, 2, 3],
      }, {
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [4, 5, 6],
      }]))
          .to.changeEtherBalances(
              [this.myAddress, this.alphasea],
              [3, -3]
          )
    });
  })

  describe("refundPurchases", function () {
    beforeEach(async function () {
      await (await this.alphasea.connect(this.otherAddress).createPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        publicKey: [1, 2, 3],
      }, {
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
        publicKey: [4, 5, 6],
      }], { 'value': 3 })).wait()

      await ethers.provider.send("evm_setNextBlockTimestamp", [this.refundStartAt])
    })

    it("empty", async function () {
      await expect(this.alphasea.connect(this.otherAddress).refundPurchases([]))
          .to.be.revertedWith('empty params');
    });

    it("model not exist", async function () {
      await expect(this.alphasea.connect(this.otherAddress).refundPurchases([{
        modelId: 'not_found',
        executionStartAt: this.executionStartAt,
      }]))
          .to.be.revertedWith('modelId not exist.');
    });

    it("not purchaser / purchase not exist", async function () {
      await expect(this.alphasea.connect(this.otherAddress2).refundPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
      }]))
          .to.be.revertedWith('Purchase not found.');
    });

    it("too early", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp",
          [this.refundStartAt - 1])

      await expect(this.alphasea.connect(this.otherAddress).refundPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
      }]))
          .to.be.revertedWith('refundPurchase is forbidden now');
    });

    it("already shipped", async function () {
      await ethers.provider.send("evm_setNextBlockTimestamp", [this.shippingStartAt])
      await (await this.alphasea.shipPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
        purchaser: this.otherAddress.address,
        encryptedContentKey: [1, 2, 3],
      }])).wait()

      await ethers.provider.send("evm_setNextBlockTimestamp", [this.refundStartAt])
      await expect(this.alphasea.connect(this.otherAddress).refundPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
      }]))
          .to.be.revertedWith('Already shipped.');
    });

    it("already refunded", async function () {
      await (await this.alphasea.connect(this.otherAddress).refundPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
      }])).wait()

      await expect(this.alphasea.connect(this.otherAddress).refundPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
      }]))
          .to.be.revertedWith('Already refunded.');
    });

    it("reentrance", async function () {
      // TODO
    });

    it("ok", async function () {
      await expect(this.alphasea.connect(this.otherAddress).refundPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
      }, {
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
      }]))
          .to.emit(this.alphasea, 'PurchaseRefunded')
          .withArgs(
              'model1',
              this.executionStartAt,
              this.otherAddress.address,
          )
          .to.emit(this.alphasea, 'PurchaseRefunded')
          .withArgs(
              'model2',
              this.executionStartAt,
              this.otherAddress.address,
          )
    });

    it("ok. check balance", async function () {
      await expect(await this.alphasea.connect(this.otherAddress).refundPurchases([{
        modelId: 'model1',
        executionStartAt: this.executionStartAt,
      }, {
        modelId: 'model2',
        executionStartAt: this.executionStartAt,
      }]))
          .to.changeEtherBalances(
              [this.otherAddress, this.alphasea],
              [3, -3]
          )
    });
  })
});
