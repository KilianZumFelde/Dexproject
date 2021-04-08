const Migrations = artifacts.require("dex");

module.exports = async function (deployer, network, accounts) {
  deployer.deploy(Migrations);
};
