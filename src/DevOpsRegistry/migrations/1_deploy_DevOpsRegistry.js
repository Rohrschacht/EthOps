const DevOpsRegistry = artifacts.require("DevOpsRegistry");

module.exports = function(deployer, network, accounts) {
    const initialVoters = [accounts[1], accounts[2], accounts[3]];
    deployer.deploy(DevOpsRegistry, initialVoters, 100);
}