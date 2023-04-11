import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DevOpsRegistry VersionProposal Tests", function() {
    async function deployDevOpsRegistryFixture() {
        const [mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2] = await ethers.getSigners();
        const initialVoters = [voter1.address, voter2.address, voter3.address];
        const DevOpsRegistry = await hre.ethers.getContractFactory("DevOpsRegistry");
        const devOpsRegistryInstance = await DevOpsRegistry.deploy(initialVoters, 100, 100);

        return { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance };
    }

    it("should create a VersionProposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
    });

    it("should reject a VersionProposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.connect(voter1).createVersionProposal(versionProposalName)).to.be.revertedWith("Caller is not registered as the main pipeline");
    });

    it("should reject a double VersionProposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).to.be.revertedWith("VersionProposal already exists");
    });

    it("should reject the VersionProposal vote because voter is not registered", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(unregistered1).voteVersionProposal(versionProposalName, true)).to.be.revertedWith("Caller is not amongst the voters");
    });

    it("should reject the VersionProposal vote because it does not exist", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).to.be.revertedWith("This VersionProposal has not been initialized");
    });

    it("should reject the VersionProposal vote because voter tried to vote twice", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).to.be.revertedWith("You have already voted on this VersionProposal");
    });

    it("should error because the VersionProposal being queried does not exist", async function (){
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.be.revertedWith("This VersionProposal has not been initialized");
        await expect(devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.be.revertedWith("This VersionProposal has not been initialized");
    });

    it("should reject the VersionProposal because quorum is not met COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, false)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(true);
    });

    it("should accept the VersionProposal COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
    });

    it("should not immediately reject the VersionProposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);
    });

    it("should accept the VersionProposal at second voting round COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, false)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(true);

        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);

        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);
    });

    it("should reject a VersionProposal check", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.connect(unregistered1).triggerVersionProposalCheck(versionProposalName)).to.be.revertedWith("Caller is not amongst the voters");
        await expect(devOpsRegistryInstance.connect(voter1).triggerVersionProposalCheck(versionProposalName)).to.be.revertedWith("This VersionProposal has not been initialized");
    });

    it("should trigger a rejected VersionProposal check", async function() {
        const [mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2] = await ethers.getSigners();
        const initialVoters = [voter1.address, voter2.address, voter3.address];
        const DevOpsRegistry = await hre.ethers.getContractFactory("DevOpsRegistry");
        const devOpsRegistryInstance = await DevOpsRegistry.deploy(initialVoters, 60, 60);

        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, false)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);

        await expect(devOpsRegistryInstance.connect(voter1).releaseVoter(voter3.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(voter3.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteRoleBindingProposal(voter3.address, true)).not.to.be.reverted;

        await expect(devOpsRegistryInstance.connect(voter1).triggerVersionProposalCheck(versionProposalName)).to.emit(devOpsRegistryInstance, "VersionRejected");
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(true);

        await expect(devOpsRegistryInstance.connect(voter1).triggerVersionProposalCheck(versionProposalName)).not.to.be.reverted;
    });
});