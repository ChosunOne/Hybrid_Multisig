var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "chosunone chosunone chosunone chosunone chosunone chosunone chosunone chosunone chosunone chosunone chosunone chosunone";

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: "localhost",
      port: 9545,
      network_id: "*" // Match any network id
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "https://ropsten.infura.io/qU73LzId3aY2VKk4LN17");
      },
      network_id: 3,
      gas: 4612388
    }
  }
};
