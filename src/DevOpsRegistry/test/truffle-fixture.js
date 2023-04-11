const DevOpsRegistry = artifacts.require("DevOpsRegistry");
const { ethers } = require("hardhat");

module.exports = async function() {
    const accounts = await ethers.getSigners();
    const initialVoters = [accounts[1].address, accounts[2].address, accounts[3].address];
    const devOpsRegistryInstance = await DevOpsRegistry.new(initialVoters, 100);
    DevOpsRegistry.setAsDeployed(devOpsRegistryInstance);
}
