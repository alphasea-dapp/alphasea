const { expect } = require("chai");
const { ethers } = require("hardhat");

const tournaments = [
  {
    'tournamentId': 'tournament1',
    'executionStartAt': 1,
    'predictionTime': 2,
    'purchaseTime': 3,
    'shippingTime': 4,
    'executionPreparationTime': 5,
    'executionTime': 6,
    'publicationTime': 7,
    'description': 'description1',
  }
];

describe("tournament", function () {
  before(async function () {
    this.Alphasea = await ethers.getContractFactory('Alphasea');
  });

  beforeEach(async function () {
  });

  it("ok", async function () {
    this.alphasea = await this.Alphasea.deploy(tournaments);
    await this.alphasea.deployed()

    const tournament = await this.alphasea.tournaments('tournament1');

    expect(tournament.executionStartAt).to.equal(1);
    expect(tournament.predictionTime).to.equal(2);
    expect(tournament.purchaseTime).to.equal(3);
    expect(tournament.shippingTime).to.equal(4);
    expect(tournament.executionPreparationTime).to.equal(5);
    expect(tournament.executionTime).to.equal(6);
    expect(tournament.publicationTime).to.equal(7);
    expect(tournament.description).to.equal('description1');
  });

  it("not found", async function () {
    this.alphasea = await this.Alphasea.deploy([]);
    await expect(this.alphasea.deployed())
    const tournament = await this.alphasea.tournaments('tournament1');
    expect(tournament.predictionTime).to.equal(0);
  });
});
