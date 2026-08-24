import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
    const [deployer] = await ethers.getSigners();

    const escrow = await ethers.deployContract("Escrow");
    await escrow.waitForDeployment();

    console.log("Deployer:", deployer.address);
    console.log("Escrow deployed to:", await escrow.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });