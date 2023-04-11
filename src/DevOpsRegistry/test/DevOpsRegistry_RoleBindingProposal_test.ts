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

    it("should create a nomination proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).nominateVoter(unregistered1.address)).not.to.be.reverted;
    });

    it("should reject a double nomination proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).nominateVoter(unregistered1.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).nominateVoter(unregistered1.address)).to.be.revertedWith("RoleBindingProposal with that address already exists");
    });

    it("should create a release proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).releaseVoter(voter2.address)).not.to.be.reverted;
    });

    it("should reject a double release proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).releaseVoter(voter2.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).releaseVoter(voter2.address)).to.be.revertedWith("RoleBindingProposal with that address already exists");
    });

    it("should reject a double-voting on a nomination proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).nominateVoter(unregistered1.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(unregistered1.address, true)).to.be.revertedWith("You have already voted on this RoleBindingProposal");
    });

    it("should error because the RoleBindingProposal being queried does not exist", async function (){
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.roleBindingProposalAccepted(unregistered1.address)).to.be.revertedWith("This RoleBindingProposal does not exist");
        await expect(devOpsRegistryInstance.roleBindingProposalRejected(unregistered1.address)).to.be.revertedWith("This RoleBindingProposal does not exist");
    });

    it("should reject a vote from a non-voter", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).nominateVoter(unregistered1.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(unregistered1).voteRoleBindingProposal(unregistered1.address, true)).to.be.revertedWith("Caller is not amongst the voters");
    });

    it("should reject proposals from non-voters", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(unregistered1).nominateVoter(unregistered1.address)).to.be.revertedWith("Caller is not amongst the voters");
        await expect(devOpsRegistryInstance.connect(unregistered2).releaseVoter(voter2.address)).to.be.revertedWith("Caller is not amongst the voters");
    });

    it("should reject a vote on a non-existing proposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(unregistered1.address, true)).to.be.revertedWith("This RoleBindingProposal does not exist");
    });

    it("should accept a nomination proposal COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).nominateVoter(unregistered1.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;

        const voter4 = unregistered1;
        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        // should not accept a VersionProposal without accepted fourth voter
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);

        // should accept after fourth vote
        await expect(devOpsRegistryInstance.connect(voter4).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);
    });

    it("should accept a release proposal COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).releaseVoter(voter3.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(voter3.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteRoleBindingProposal(voter3.address, true)).not.to.be.reverted;

        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        // should not accept a VersionProposal because 3rd voter still necessary
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);

        // should accept after release done
        await expect(devOpsRegistryInstance.connect(voter3).voteRoleBindingProposal(voter3.address, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);

        await expect(devOpsRegistryInstance.connect(voter1).triggerVersionProposalCheck(versionProposalName)).to.emit(devOpsRegistryInstance, "VersionAccepted");
    });

    it("should reject a nomination proposal COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        await expect(devOpsRegistryInstance.connect(voter1).nominateVoter(unregistered1.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteRoleBindingProposal(unregistered1.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteRoleBindingProposal(unregistered1.address, false)).not.to.be.reverted;

        expect(await devOpsRegistryInstance.roleBindingProposalAccepted(unregistered1.address)).to.equal(false);
        expect(await devOpsRegistryInstance.roleBindingProposalRejected(unregistered1.address)).to.equal(true);

        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        await expect(devOpsRegistryInstance.createVersionProposal(versionProposalName)).not.to.be.reverted;
        // should reject vote from unregistered1
        await expect(devOpsRegistryInstance.connect(unregistered1).voteVersionProposal(versionProposalName, true)).to.be.revertedWith("Caller is not amongst the voters");
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(false);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);

        // should accept from other voters
        await expect(devOpsRegistryInstance.connect(voter1).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteVersionProposal(versionProposalName, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.versionProposalAccepted(versionProposalName)).to.equal(true);
        expect(await devOpsRegistryInstance.versionProposalRejected(versionProposalName)).to.equal(false);
    });
});