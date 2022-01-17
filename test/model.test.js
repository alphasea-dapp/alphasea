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

  it("too short model_id", async function () {
    await expect(this.alphasea.createModels([{
      modelId: 'a'.repeat(3),
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }]))
        .to.be.revertedWith('invalid modelId');
  });

  it("too long model_id", async function () {
    await expect(this.alphasea.createModels([{
      modelId: 'a'.repeat(32),
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }]))
        .to.be.revertedWith('invalid modelId');
  });

  it("invalid character in model_id", async function () {
    const invalidCharacters = [
        '-', 'A', 'Z', '{', '`', '/', ':', '^', ''
    ]
    for (let i = 0; i < invalidCharacters.length; i++) {
      await expect(this.alphasea.createModels([{
        modelId: invalidCharacters[i] + 'aaa',
        tournamentId: 'crypto_daily',
        predictionLicense: 'CC0-1.0'
      }]))
          .to.be.revertedWith('invalid modelId');

      await expect(this.alphasea.createModels([{
        modelId: 'aaa' + invalidCharacters[i],
        tournamentId: 'crypto_daily',
        predictionLicense: 'CC0-1.0'
      }]))
          .to.be.revertedWith('invalid modelId');
    }
  });

  it("model_id start with number", async function () {
    await expect(this.alphasea.createModels([{
      modelId: '1abc',
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }]))
        .to.be.revertedWith('invalid modelId');
  });

  it("already exists", async function () {
    await (await this.alphasea.createModels([{
      modelId: 'model1',
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }])).wait()

    await expect(this.alphasea.createModels([{
      modelId: 'model1',
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }]))
        .to.be.revertedWith('modelId already exists.');
  });

  it("ok", async function () {
    await expect(this.alphasea.createModels([{
      modelId: '_az09',
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }, {
      modelId: 'a'.repeat(4),
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }, {
      modelId: 'a'.repeat(31),
      tournamentId: 'crypto_daily',
      predictionLicense: 'CC0-1.0'
    }]))
        .to.emit(this.alphasea, 'ModelCreated')
        .withArgs(
            '_az09',
            this.alphasea.signer.address,
            'crypto_daily',
            'CC0-1.0',
        )
        .to.emit(this.alphasea, 'ModelCreated')
        .withArgs(
            'a'.repeat(4),
            this.alphasea.signer.address,
            'crypto_daily',
            'CC0-1.0',
        )
        .to.emit(this.alphasea, 'ModelCreated')
        .withArgs(
            'a'.repeat(31),
            this.alphasea.signer.address,
            'crypto_daily',
            'CC0-1.0',
        );

    const model = await this.alphasea.models('_az09');
    expect(model.owner).to.equal(this.alphasea.signer.address);
    expect(model.tournamentId).to.equal("crypto_daily");
    expect(model.predictionLicense).to.equal('CC0-1.0');

    const model2 = await this.alphasea.models('a'.repeat(4));
    expect(model2.owner).to.equal(this.alphasea.signer.address);
    expect(model2.tournamentId).to.equal("crypto_daily");
    expect(model2.predictionLicense).to.equal('CC0-1.0');

    const model3 = await this.alphasea.models('a'.repeat(31));
    expect(model3.owner).to.equal(this.alphasea.signer.address);
    expect(model3.tournamentId).to.equal("crypto_daily");
    expect(model3.predictionLicense).to.equal('CC0-1.0');
  });
});
