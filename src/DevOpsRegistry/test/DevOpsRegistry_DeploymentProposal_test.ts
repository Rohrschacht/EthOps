import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DevOpsRegistry DeploymentProposal Tests", function() {
    async function deployDevOpsRegistryFixture() {
        const [mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2] = await ethers.getSigners();
        const initialVoters = [voter1.address, voter2.address, voter3.address];
        const DevOpsRegistry = await hre.ethers.getContractFactory("DevOpsRegistry");
        const devOpsRegistryInstance = await DevOpsRegistry.deploy(initialVoters, 100, 100);

        return { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance };
    }

    it("should create a DeploymentProposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
    });

    it("should reject a DeploymentProposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.connect(voter1).createDeploymentProposal(deploymentProposalAddress)).to.be.revertedWith("Caller is not registered as the main pipeline");
    });

    it("should reject a double DeploymentProposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).to.be.revertedWith("DeploymentProposal already exists");
    });

    it("should reject the DeploymentProposal vote because voter is not registered", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(unregistered1).voteDeploymentProposal(deploymentProposalAddress, true)).to.be.revertedWith("Caller is not amongst the voters");
    });

    it("should reject the DeploymentProposal vote because it does not exist", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.connect(voter1).voteDeploymentProposal(deploymentProposalAddress, true)).to.be.revertedWith("This DeploymentProposal has not been initialized");
    });

    it("should reject the DeploymentProposal vote because voter tried to vote twice", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteDeploymentProposal(deploymentProposalAddress, true)).to.be.revertedWith("You have already voted on this DeploymentProposal");
    });

    it("should error because the DeploymentProposal being queried does not exist", async function (){
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.deploymentProposalAccepted(deploymentProposalAddress)).to.be.revertedWith("This DeploymentProposal has not been initialized");
        await expect(devOpsRegistryInstance.deploymentProposalRejected(deploymentProposalAddress)).to.be.revertedWith("This DeploymentProposal has not been initialized");
    });

    it("should reject the DeploymentProposal because quorum is not met COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteDeploymentProposal(deploymentProposalAddress, false)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.deploymentProposalAccepted(deploymentProposalAddress)).to.equal(false);
        expect(await devOpsRegistryInstance.deploymentProposalRejected(deploymentProposalAddress)).to.equal(true);
        expect(await devOpsRegistryInstance.applicationContract()).to.equal("0x0000000000000000000000000000000000000000");
    });

    it("should accept the DeploymentProposal COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.deploymentProposalAccepted(deploymentProposalAddress)).to.equal(true);
        expect(await devOpsRegistryInstance.deploymentProposalRejected(deploymentProposalAddress)).to.equal(false);
        expect(await devOpsRegistryInstance.applicationContract()).to.equal("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
    });

    it("should not immediately reject the DeploymentProposal", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.deploymentProposalAccepted(deploymentProposalAddress)).to.equal(false);
        expect(await devOpsRegistryInstance.deploymentProposalRejected(deploymentProposalAddress)).to.equal(false);
    });

    it("should accept the DeploymentProposal after second voting round COMPLETE", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteDeploymentProposal(deploymentProposalAddress, false)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.deploymentProposalAccepted(deploymentProposalAddress)).to.equal(false);
        expect(await devOpsRegistryInstance.deploymentProposalRejected(deploymentProposalAddress)).to.equal(true);
        expect(await devOpsRegistryInstance.applicationContract()).to.equal("0x0000000000000000000000000000000000000000");

        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.deploymentProposalAccepted(deploymentProposalAddress)).to.equal(true);
        expect(await devOpsRegistryInstance.deploymentProposalRejected(deploymentProposalAddress)).to.equal(false);
        expect(await devOpsRegistryInstance.applicationContract()).to.equal("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
    });

    it("should accept a DeploymentProposal after a role-binding release", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.deploymentProposalAccepted(deploymentProposalAddress)).to.equal(false);
        expect(await devOpsRegistryInstance.deploymentProposalRejected(deploymentProposalAddress)).to.equal(false);

        await expect(devOpsRegistryInstance.connect(voter1).releaseVoter(voter3.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(voter3.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteRoleBindingProposal(voter3.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter3).voteRoleBindingProposal(voter3.address, true)).not.to.be.reverted;

        await expect(devOpsRegistryInstance.connect(voter1).triggerDeploymentProposalCheck(deploymentProposalAddress)).to.emit(devOpsRegistryInstance, "DeploymentAccepted");
        expect(await devOpsRegistryInstance.deploymentProposalAccepted(deploymentProposalAddress)).to.equal(true);
        expect(await devOpsRegistryInstance.deploymentProposalRejected(deploymentProposalAddress)).to.equal(false);

        await expect(devOpsRegistryInstance.connect(voter1).triggerDeploymentProposalCheck(deploymentProposalAddress)).not.to.be.reverted;
    });

    it("should trigger a rejected DeploymentProposal check", async function() {
        const [mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2] = await ethers.getSigners();
        const initialVoters = [voter1.address, voter2.address, voter3.address];
        const DevOpsRegistry = await hre.ethers.getContractFactory("DevOpsRegistry");
        const devOpsRegistryInstance = await DevOpsRegistry.deploy(initialVoters, 60, 60);

        const versionProposalName = ethers.utils.hexZeroPad("0x5", 20);
        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.createDeploymentProposal(deploymentProposalAddress)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteDeploymentProposal(deploymentProposalAddress, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteDeploymentProposal(deploymentProposalAddress, false)).not.to.be.reverted;
        expect(await devOpsRegistryInstance.deploymentProposalAccepted(deploymentProposalAddress)).to.equal(false);
        expect(await devOpsRegistryInstance.deploymentProposalRejected(deploymentProposalAddress)).to.equal(false);

        await expect(devOpsRegistryInstance.connect(voter1).releaseVoter(voter3.address)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter1).voteRoleBindingProposal(voter3.address, true)).not.to.be.reverted;
        await expect(devOpsRegistryInstance.connect(voter2).voteRoleBindingProposal(voter3.address, true)).not.to.be.reverted;

        await expect(devOpsRegistryInstance.connect(voter1).triggerDeploymentProposalCheck(deploymentProposalAddress)).to.emit(devOpsRegistryInstance, "DeploymentRejected");
        expect(await devOpsRegistryInstance.deploymentProposalAccepted(deploymentProposalAddress)).to.equal(false);
        expect(await devOpsRegistryInstance.deploymentProposalRejected(deploymentProposalAddress)).to.equal(true);
    });

    it("should reject a DeploymentProposal check", async function() {
        const { mainPipeline, voter1, voter2, voter3, unregistered1, unregistered2, devOpsRegistryInstance } = await deployDevOpsRegistryFixture();

        const deploymentProposalAddress = ethers.utils.getAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F");
        await expect(devOpsRegistryInstance.connect(unregistered1).triggerDeploymentProposalCheck(deploymentProposalAddress)).to.be.revertedWith("Caller is not amongst the voters");
        await expect(devOpsRegistryInstance.connect(voter1).triggerDeploymentProposalCheck(deploymentProposalAddress)).to.be.revertedWith("This DeploymentProposal has not been initialized");
    });
});