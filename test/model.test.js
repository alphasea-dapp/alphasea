const { expect } = require("chai");
const { ethers } = require("hardhat");
const { defaultTournaments } = require('./helper')

describe("createModels", function () {
  before(async function () {
    this.Alphasea = await ethers.getContractFactory('Alphasea');
  });

  beforeEach(async function () {
    this.alphasea = await this.Alphasea.deploy(defaultTournaments);
    await this.alphasea.deployed();
  });

  it("empty", async function () {
    await expect(this.alphasea.createModels([]))
        .to.be.revertedWith('empty params');
  });

  it("tournament not found", async function () {
    await expect(this.alphasea.createModels([{
      modelId: 'model1',
      tournamentId: 'not_found',
      predictionLicense: 'CC0-1.0'
    }]))
        .to.be.revertedWith('tournament_id not exists.');
  });

  it("license not supported", async function () {
    await expect(this.alphasea.createModels([{
      modelId: 'model1',
      tournamentId: 'crypto_daily',
      predictionLicense: 'MIT'
    }]))
        .to.be.revertedWith('predictionLicense must be CC0-1.0.');
  });

  it("ok", async function () {
    await expect(this.alphasea.createModels([{
      modelId: 'model1',
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }, {
      modelId: 'model2',
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }]))
        .to.emit(this.alphasea, 'ModelCreated')
        .withArgs(
            'model1',
            this.alphasea.signer.address,
            'crypto_daily',
            'CC0-1.0',
        )
        .to.emit(this.alphasea, 'ModelCreated')
        .withArgs(
            'model2',
            this.alphasea.signer.address,
            'crypto_daily',
            'CC0-1.0',
        );

    const model = await this.alphasea.models('model1');
    expect(model.owner).to.equal(this.alphasea.signer.address);
    expect(model.tournamentId).to.equal("crypto_daily");
    expect(model.predictionLicense).to.equal('CC0-1.0');

    const model2 = await this.alphasea.models('model2');
    expect(model2.owner).to.equal(this.alphasea.signer.address);
    expect(model2.tournamentId).to.equal("crypto_daily");
    expect(model2.predictionLicense).to.equal('CC0-1.0');
  });
});
