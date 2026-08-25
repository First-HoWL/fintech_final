import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Escrow", function () {
    async function deployFixture() {
        const [owner, buyer, other] = await ethers.getSigners();
        const escrow = await ethers.deployContract("Escrow");
        return { escrow, owner, buyer, other };
    }

    it("Should let buyer take an item with correct payment", async function () {
    const { escrow, buyer } = await deployFixture();

    const items = await escrow.getAllItems();
    const apple = items[0];
    const totalPrice = apple.price * 2n;

    await expect(
      escrow.connect(buyer).take(apple.id, 2, { value: totalPrice })
    ).to.not.be.reverted;
  });

  it("Should decrease item count after purchase", async function () {
    const { escrow, buyer } = await deployFixture();
    const before = (await escrow.getAllItems())[0];

    await escrow.connect(buyer).take(before.id, 1, { value: before.price });

    const after = (await escrow.getAllItems())[0];
    expect(after.count).to.equal(before.count - 1n);
  });

  it("Should transfer ETH to the seller (owner by default)", async function () {
    const { escrow, owner, buyer } = await deployFixture();
    const item = (await escrow.getAllItems())[0];

    const balanceBefore = await ethers.provider.getBalance(owner.address);

    await escrow.connect(buyer).take(item.id, 1, { value: item.price });

    const balanceAfter = await ethers.provider.getBalance(owner.address);
    expect(balanceAfter - balanceBefore).to.equal(item.price);
  });

  it("Should record the purchase for the buyer", async function () {
    const { escrow, buyer } = await deployFixture();
    const item = (await escrow.getAllItems())[0];

    await escrow.connect(buyer).take(item.id, 1, { value: item.price });

    const purchases = await escrow.connect(buyer).purchases(buyer.address, 0);
    expect(purchases.id).to.equal(item.id);
  });

  it("Should revert if count is zero", async function () {
    const { escrow, buyer } = await deployFixture();
    const item = (await escrow.getAllItems())[0];

    await expect(
      escrow.connect(buyer).take(item.id, 0, { value: 0 })
    ).to.be.revertedWith("Count can`t be zero!");
  });

  it("Should revert if payment amount is incorrect", async function () {
    const { escrow, buyer } = await deployFixture();
    const item = (await escrow.getAllItems())[0];

    await expect(
      escrow.connect(buyer).take(item.id, 1, { value: 1n })
    ).to.be.revertedWith("Incorrect payment amount");
  });

  it("Should revert if item not found", async function () {
    const { escrow, buyer } = await deployFixture();

    await expect(
      escrow.connect(buyer).take(999, 1, { value: 1000n })
    ).to.be.revertedWith("Item not found");
  });

  it("Should revert if not enough items in stock", async function () {
    const { escrow, buyer } = await deployFixture();
    const item = (await escrow.getAllItems())[0];

    await expect(
      escrow.connect(buyer).take(item.id, 999, { value: item.price * 999n })
    ).to.be.revertedWith("Not enough items!");
  });

  it("Should only allow owner or seller to addItems", async function () {
    const { escrow, other } = await deployFixture();

    await expect(
      escrow.connect(other).addItems("Bread", 5000, 10)
    ).to.be.revertedWith("Only owner or seller can do this");
  });

  it("Should allow owner to addItems", async function () {
    const { escrow, owner } = await deployFixture();

    await expect(
      escrow.connect(owner).addItems("Bread", 5000, 10)
    ).to.not.be.reverted;
  });

  it("Should only allow owner to changeOwner", async function () {
    const { escrow, other } = await deployFixture();

    await expect(
      escrow.connect(other).changeOwner(other.address)
    ).to.be.revertedWith("Only owner can do this");
  });

  it("Should revert changeOwner to zero address", async function () {
    const { escrow, owner } = await deployFixture();

    await expect(
      escrow.connect(owner).changeOwner(ethers.ZeroAddress)
    ).to.be.revertedWith("New owner should not be the zero address");
  });

});
