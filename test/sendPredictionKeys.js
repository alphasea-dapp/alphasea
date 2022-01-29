const { expect } = require("chai");
const { ethers } = require("hardhat");
const { defaultTournaments } = require('./helper')

const daySeconds = 24 * 60 * 60

describe("sendPredictionKeys", function () {
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

    const baseTime = Math.floor(2000000000 / daySeconds) * daySeconds;
    this.executionStartAt = baseTime + 30 * 60
    this.predictionStartAt = this.executionStartAt - 30 * 60
    this.purchaseStartAt = this.executionStartAt - 22 * 60

    await ethers.provider.send("evm_setNextBlockTimestamp", [this.purchaseStartAt])
  });

  it("empty", async function () {
    await expect(this.alphasea.sendPredictionKeys(
        'crypto_daily',
        this.executionStartAt,
        []
    ))
        .to.be.revertedWith('empty params');
  });

  it("send to me", async function () {
    await expect(this.alphasea.sendPredictionKeys(
        'crypto_daily',
        this.executionStartAt,
        [{
          receiver: this.myAddress.address,
          encryptedContentKey: [1, 2, 3]
        }]
    ))
        .to.be.revertedWith('cannot send to me');
  });

  it("empty encryptedContentKey", async function () {
    await expect(this.alphasea.sendPredictionKeys(
        'crypto_daily',
        this.executionStartAt,
        [{
          receiver: this.otherAddress.address,
          encryptedContentKey: []
        }]
    ))
        .to.be.revertedWith('encryptedContentKey empty');
  });

  it("too early", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp",
        [this.purchaseStartAt - 1])

    await expect(this.alphasea.sendPredictionKeys(
        'crypto_daily',
        this.executionStartAt,
        [{
          receiver: this.otherAddress.address,
          encryptedContentKey: [1, 2, 3]
        }]
    ))
        .to.be.revertedWith('sendPredictionKeys is forbidden now');
  });

  it("too late", async function () {
    await ethers.provider.send("evm_setNextBlockTimestamp",
        [this.purchaseStartAt + 16 * 60])

    await expect(this.alphasea.sendPredictionKeys(
        'crypto_daily',
        this.executionStartAt,
        [{
          receiver: this.otherAddress.address,
          encryptedContentKey: [1, 2, 3]
        }]
    ))
        .to.be.revertedWith('sendPredictionKeys is forbidden now');
  });

  it("ok", async function () {
    await expect(this.alphasea.sendPredictionKeys(
        'crypto_daily',
        this.executionStartAt,
        [{
          receiver: this.otherAddress.address,
          encryptedContentKey: [1, 2, 3]
        }, {
          receiver: this.otherAddress2.address,
          encryptedContentKey: [1, 2, 3]
        }]
    ))
        .to.emit(this.alphasea, 'PredictionKeySent')
        .withArgs(
            this.myAddress.address,
            'crypto_daily',
            this.executionStartAt,
            this.otherAddress.address,
            '0x010203',
        )
        .to.emit(this.alphasea, 'PredictionKeySent')
        .withArgs(
            this.myAddress.address,
            'crypto_daily',
            this.executionStartAt,
            this.otherAddress2.address,
            '0x010203',
        );
  });
});
