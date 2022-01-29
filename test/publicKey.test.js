const { expect } = require("chai");
const { ethers } = require("hardhat");
const { defaultTournaments } = require('./helper')

describe("changePublicKey", function () {
  before(async function () {
    this.Alphasea = await ethers.getContractFactory('Alphasea');
  });

  beforeEach(async function () {
    this.alphasea = await this.Alphasea.deploy(defaultTournaments);
    await this.alphasea.deployed();
  });

  it("empty", async function () {
    await expect(this.alphasea.changePublicKey([]))
        .to.be.revertedWith('publicKey empty');
  });

  it("ok", async function () {
    await expect(this.alphasea.changePublicKey('0x010203'))
        .to.emit(this.alphasea, 'PublicKeyChanged')
        .withArgs(
            this.alphasea.signer.address,
            '0x010203',
        );
  });
});
