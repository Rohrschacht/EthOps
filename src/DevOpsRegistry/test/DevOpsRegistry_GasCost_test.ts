import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DevOpsRegistry GasCost Tests", function() {
    it("should measure gas cost for voting with one voter COMPLETE", async function() {
        const [mainPipeline, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();
        const initialVoters = [voter1.address];
        const DevOpsRegistry = await hre.ethers.getContractFactory("DevOpsRegistry");
        const devOpsRegistryInstance = await DevOpsRegistry.deploy(initialVoters, 100, 100);

        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
    });

    it("should measure gas cost for voting with five voters COMPLETE", async function() {
        const [mainPipeline, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();
        const initialVoters = [voter1.address, voter2.address, voter3.address, voter4.address, voter5.address];
        const DevOpsRegistry = await hre.ethers.getContractFactory("DevOpsRegistry");
        const devOpsRegistryInstance = await DevOpsRegistry.deploy(initialVoters, 100, 100);

        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter4).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter5).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
    });
});