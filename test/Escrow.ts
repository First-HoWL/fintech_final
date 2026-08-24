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
        const {escrow, buyer} = await deployFixture();
        const item = await escrow.getAllItems();
        const apple = item[0];
        const totalPrice = apple.price * 2n;

        await expect(escrow.connect(buyer).take(apple.id, { value: totalPrice })).to.not.be.reverted;
    });
});
