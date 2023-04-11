import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DevOpsRegistry Constructor Tests", function() {
    it("should reject because of negative quora", async function() {
        const [mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2] = await ethers.getSigners();
        const initialVoters = [voter1.address, voter2.address, voter3.address];
        const DevOpsRegistry = await hre.ethers.getContractFactory("DevOpsRegistry");
        await expect(DevOpsRegistry.deploy(initialVoters, -1, 100)).to.throw;
        await expect(DevOpsRegistry.deploy(initialVoters, 100, -1)).to.throw;
        await expect(DevOpsRegistry.deploy(initialVoters, -1, -1)).to.throw;
    });

    it("should reject because of quora over 100", async function() {
        const [mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2] = await ethers.getSigners();
        const initialVoters = [voter1.address, voter2.address, voter3.address];
        const DevOpsRegistry = await hre.ethers.getContractFactory("DevOpsRegistry");
        await expect(DevOpsRegistry.deploy(initialVoters, 101, 100)).to.be.revertedWith("Initial quorum should be between 0 and 100");
        await expect(DevOpsRegistry.deploy(initialVoters, 100, 101)).to.be.revertedWith("Initial quorum should be between 0 and 100");
        await expect(DevOpsRegistry.deploy(initialVoters, 101, 101)).to.be.revertedWith("Initial quorum should be between 0 and 100");
    });

    it("should accept quora between 0 and 100", async function() {
        const [mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2] = await ethers.getSigners();
        const initialVoters = [voter1.address, voter2.address, voter3.address];
        const DevOpsRegistry = await hre.ethers.getContractFactory("DevOpsRegistry");
        for (let i = 0; i <= 100; i+=20) {
            await expect(DevOpsRegistry.deploy(initialVoters, 0, i)).not.to.be.reverted;
            await expect(DevOpsRegistry.deploy(initialVoters, i, 0)).not.to.be.reverted;
            await expect(DevOpsRegistry.deploy(initialVoters, i, i)).not.to.be.reverted;
        }
    });
});