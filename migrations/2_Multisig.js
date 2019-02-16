var Multisig = artifacts.require("Multisig");
// Currently deployed on ropsten at 0x5ced304C768e2F2619CE9366dE7b3E16e607E4B7
module.exports = function(deployer, network) {
    if (network === "development"){
        deployer.deploy(Multisig, "0x627306090abaB3A6e1400e9345bC60c78a8BEf57", "0xf17f52151EbEF6C7334FAD080c5704D77216b732", 10000000000000000000, 5000000000000000000, 60, 4);
    } else if (network === "ropsten") {
        deployer.deploy(Multisig, "0xb8F850eDf3799Bf960B7Fad4f5302d039876e708", "0xE83946fD8cBa7C3503Af1cB997B3EC5649095E5D", 5000000000000000000, 5000000000000000000, 5760, 24);
    }
    
}