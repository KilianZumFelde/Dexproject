const Migrations = artifacts.require("kilcoin");

module.exports = async function (deployer, network, accounts) {
  deployer.deploy(Migrations);
};
