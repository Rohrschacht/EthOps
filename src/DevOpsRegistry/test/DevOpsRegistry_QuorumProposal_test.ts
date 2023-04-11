import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DevOpsRegistry RoleBindingProposal Tests", function() {
    async function deployDevOpsRegistryFixture() {
        const [mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2] = await ethers.getSigners();
        const initialVoters = [voter1.address, voter2.address, voter3.address];
        const DevOpsRegistry = await hre.ethers.getContractFactory("DevOpsRegistry");
        const devOpsRegistryInstance = await DevOpsRegistry.deploy(initialVoters, 100, 100);

        return { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance };
    }

    it("should create a version quorum proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createVersionQuorumProposal(50)).not.to.be.reverted;
    });

    it("should reject a double version quorum proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createVersionQuorumProposal(50)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).createVersionQuorumProposal(40)).to.be.revertedWith("The quorum proposal is already active");
    });

    it("should create a rolebinding quorum proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createRoleBindingQuorumProposal(50)).not.to.be.reverted;
    });

    it("should reject a double rolebinding quorum proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createRoleBindingQuorumProposal(50)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).createRoleBindingQuorumProposal(40)).to.be.revertedWith("The quorum proposal is already active");
    });

    it("should reject a VersionQuorumProposal with invalid quorum", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createVersionQuorumProposal(101)).to.be.revertedWith("quorum should be between 0 and 100");
    });

    it("should reject a RoleBindingQuorumProposal with invalid quorum", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createRoleBindingQuorumProposal(101)).to.be.revertedWith("quorum should be between 0 and 100");
    });

    it("should reject a double-voting on a quorum proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createRoleBindingQuorumProposal(50)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteQuorumProposal(true)).to.be.revertedWith("You have already voted on this quorum proposal");
    });

    it("should error because the QuorumProposal is inactive", async function (){
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.quorumProposalAccepted()).to.be.revertedWith("The quorum proposal is inactive");
        await expect(devOpsRegistryInstance.quorumProposalRejected()).to.be.revertedWith("The quorum proposal is inactive");
    });

    it("should reject a vote from a non-voter", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createRoleBindingQuorumProposal(50)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(unregistered1).voteQuorumProposal(true)).to.be.revertedWith("Caller is not amongst the voters");
    });

    it("should reject RoleBindingQuorumProposal from non-voters", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(unregistered1).createRoleBindingQuorumProposal(50)).to.be.revertedWith("Caller is not amongst the voters");
    });

    it("should reject VersionQuorumProposal from non-voters", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(unregistered1).createVersionQuorumProposal(50)).to.be.revertedWith("Caller is not amongst the voters");
    });

    it("should reject a vote on a non-existing proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).voteQuorumProposal(true)).to.be.revertedWith("The quorum proposal is inactive");
    });

    it("should accept a version quorum proposal COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createVersionQuorumProposal(50)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteQuorumProposal(true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.quorumProposalAccepted()).to.equal(true);
        expect(await devOpsRegistryInstance.quorumProposalRejected()).to.equal(false);

        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        // should accept a VersionProposal with 50% of the votes
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);
    });

    it("should accept another version quorum proposal COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createVersionQuorumProposal(50)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteQuorumProposal(true)).not.to.be.reverted;

        await expect(devOpsRegistryInstance.connect(voter1).createVersionQuorumProposal(90)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteQuorumProposal(true)).not.to.be.reverted;

        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        // should accept a VersionProposal with 90% of the votes
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);

        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);
    });

    it("should accept a rolebinding quorum proposal COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createRoleBindingQuorumProposal(50)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteQuorumProposal(true)).not.to.be.reverted;

        // should accept a RoleBindingProposal with 50% of the votes
        await expect(devOpsRegistryInstance.connect(voter1).nominateVoter(unregistered1.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;

        // should accept the new version with the new voter
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);

        // should accept with new voter
        await expect(devOpsRegistryInstance.connect(unregistered1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);
    });

    it("should accept another rolebinding quorum proposal COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createRoleBindingQuorumProposal(50)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteQuorumProposal(true)).not.to.be.reverted;

        // should accept this new quorum with 50% of the votes
        await expect(devOpsRegistryInstance.connect(voter1).createRoleBindingQuorumProposal(90)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteQuorumProposal(true)).not.to.be.reverted;

        // should accept a RoleBindingProposal with 90% of the votes
        await expect(devOpsRegistryInstance.connect(voter1).nominateVoter(unregistered1.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.roleBindingProposalAccepted(unregistered1.address)).to.equal(false);
        expect(await devOpsRegistryInstance.roleBindingProposalRejected(unregistered1.address)).to.equal(false);

        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.connect(unregistered1).voteVersionProposal(versionProposalName, true)).to.be.revertedWith("Caller is not amongst the voters");

        await expect(devOpsRegistryInstance.connect(voter3).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.roleBindingProposalAccepted(unregistered1.address)).to.equal(true);
        expect(await devOpsRegistryInstance.roleBindingProposalRejected(unregistered1.address)).to.equal(false);

        // should accept the new version with the new voter
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;

        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);

        // should accept with new voter
        await expect(devOpsRegistryInstance.connect(unregistered1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);
    });

    it("should reject a version quorum proposal COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).createVersionQuorumProposal(50)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteQuorumProposal(true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteQuorumProposal(false)).not.to.be.reverted;

        expect(await devOpsRegistryInstance.quorumProposalAccepted()).to.equal(false);
        expect(await devOpsRegistryInstance.quorumProposalRejected()).to.equal(true);

        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        // should not accept after half the votes
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);

        // should accept with initial quorum
        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);
    });
});