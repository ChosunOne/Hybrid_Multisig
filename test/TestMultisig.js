var Multisig = artifacts.require("Multisig");
var util = require('ethereumjs-util');
var abi = require('ethereumjs-abi');

var defaultState = {
    K: 0,
    gPLimit: 0,
    cPLimit: 0,
    windowLength: 0,
    customer: 0,
    exchange: 0,
    nonce: 0,
    gLLimit: 0,
    cLLimit: 0,
    gSpending: [],
    cSpending: [],
    lastStartingBlock: 0,
    windowIndex: 0,
}

var debugState = {
    DEBUG: 0,
    DEBUG_ADDR: 0,
    DEBUG_V: [],
    DEBUG_R: [],
    DEBUG_S: [],
    DEBUG_ADDR_G: "",
    DEBUG_ADDR_C: ""
}

contract('Multisig', function (accounts) {
    it("should correctly be deployed", function () {
        return getContractState(defaultState).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(10, "ether"),
                cLLimit: web3.toWei(5, "ether"),
                gSpending: [0, 0, 0, 0],
                cSpending: [0, 0, 0, 0],
                windowIndex: 0,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should reject non-member accounts from calling executeSolo", function () {
        let multisig;
        let before = web3.fromWei(web3.eth.getBalance("0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2"), "ether").toNumber();

        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[4], value: web3.toWei(.01, "ether") });
        }).then(function () {
            // Spend with a non-member
            return multisig.executeSolo("0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2", web3.toWei(.01, "ether"), 0, { from: accounts[4] })
                .then(function () {
                    let after = web3.fromWei(web3.eth.getBalance("0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2"), "ether").toNumber();
                    assert(after < (before - .01), "multisig should not executeSolo unauthorized");
                });
        }).catch(function (error) {
            assert.include(error.message, 'Exception');
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly update gSpending values after a single executeSolo", function () {
        let multisig;

        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[1], value: web3.toWei(.1, "ether") });
        }).then(function () {
            // Spend with exchange
            return multisig.executeSolo("0x821aEa9a577a9b44299B9c15c88cf3087F3b5544", web3.toWei(.1, "ether"), 0, { from: accounts[1] });
        }).then(function () {
            return getContractState(defaultState);
        }).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(10, "ether"),
                cLLimit: web3.toWei(5, "ether"),
                gSpending: [parseInt(web3.toWei(.1, "ether")), 0, 0, 0],
                cSpending: [0, 0, 0, 0],
                windowIndex: 0,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly update cSpending values after a single executeSolo", function () {
        let multisig;

        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[0], value: web3.toWei(.1, "ether") });
        }).then(function () {
            // Spend with the customer
            return multisig.executeSolo("0x821aEa9a577a9b44299B9c15c88cf3087F3b5544", web3.toWei(.1, "ether"), 0, { from: accounts[0] });
        }).then(function () {
            return getContractState(defaultState);
        }).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(10, "ether"),
                cLLimit: web3.toWei(5, "ether"),
                gSpending: [0, 0, 0, 0],
                cSpending: [parseInt(web3.toWei(.1, "ether")), 0, 0, 0],
                windowIndex: 0,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly update gSpending values after multiple executeSolo calls", function () {
        let multisig;
        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[1], value: web3.toWei(.4, "ether") });
        }).then(function () {
            let promises = [];
            // Spend 4 times with exchange
            for (let i = 0; i < 4; i++) {
                let call = multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", web3.toWei(.1, "ether"), 0, { from: accounts[1] });
                promises.push(call);
            }
            return Promise.all(promises);
        }).then(function () {
            return getContractState(defaultState);
        }).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(10, "ether"),
                cLLimit: web3.toWei(5, "ether"),
                gSpending: [parseInt(web3.toWei(.4, "ether")), 0, 0, 0],
                cSpending: [0, 0, 0, 0],
                windowIndex: 0,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly update cSpending values after multiple executeSolo calls", function () {
        let multisig;
        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[0], value: web3.toWei(.4, "ether") });
        }).then(function () {
            let promises = [];
            // Spend 4 times with the customer
            for (let i = 0; i < 4; i++) {
                let call = multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", web3.toWei(.1, "ether"), 0, { from: accounts[0] });
                promises.push(call);
            }
            return Promise.all(promises);
        }).then(function () {
            return getContractState(defaultState);
        }).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(10, "ether"),
                cLLimit: web3.toWei(5, "ether"),
                gSpending: [0, 0, 0, 0],
                cSpending: [parseInt(web3.toWei(.4, "ether")), 0, 0, 0],
                windowIndex: 0,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly transition between adjacent gSpending windows", function () {
        let multisig;

        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[1], value: web3.toWei(.1, "ether") });
        }).then(function () {
            // Spend with exchange
            return multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", web3.toWei(.1, "ether"), 0, { from: accounts[1] });
        }).then(function () {
            let promises = [];
            // Mine out 15 blocks
            for (let i = 0; i < 15; i++) {
                let call = multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", 0, 0, { from: accounts[1] });
                promises.push(call);
            }
            return Promise.all(promises);
        }).then(function () {
            return getContractState(defaultState);
        }).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(9.9, "ether"),
                cLLimit: web3.toWei(5, "ether"),
                gSpending: [parseInt(web3.toWei(.1, "ether")), 0, 0, 0],
                cSpending: [0, 0, 0, 0],
                windowIndex: 1,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly transition between adjacent cSpending windows", function () {
        let multisig;

        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[0], value: web3.toWei(.1, "ether") });
        }).then(function () {
            // Spend with the customer
            return multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", web3.toWei(.1, "ether"), 0, { from: accounts[0] });
        }).then(function () {
            let promises = [];
            // Mine out 15 blocks
            for (let i = 0; i < 15; i++) {
                let call = multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", 0, 0, { from: accounts[0] });
                promises.push(call);
            }
            return Promise.all(promises);
        }).then(function () {
            return getContractState(defaultState);
        }).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(10, "ether"),
                cLLimit: web3.toWei(4.9, "ether"),
                gSpending: [0, 0, 0, 0],
                cSpending: [parseInt(web3.toWei(.1, "ether")), 0, 0, 0],
                windowIndex: 1,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly transition between non-adjacent gSpending windows", function () {
        let multisig;

        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[1], value: web3.toWei(.1, "ether") });
        }).then(function () {
            // Spend with exchange
            return multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", web3.toWei(.1, "ether"), 0, { from: accounts[1] });
        }).then(function () {
            // Mine out 45 blocks
            let promises = [];
            for (let i = 0; i < 45; i++) {
                let call = multisig.sendTransaction({ from: accounts[1], value: 0 });
                promises.push(call);
            }
            return Promise.all(promises);
        }).then(function () {
            // Trigger recalc
            return multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", 0, 0, { from: accounts[1] });
        }).then(function () {
            return getContractState(defaultState);
        }).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(9.9, "ether"),
                cLLimit: web3.toWei(5, "ether"),
                gSpending: [parseInt(web3.toWei(.1, "ether")), 0, 0, 0],
                cSpending: [0, 0, 0, 0],
                windowIndex: 3,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly transition between non-adjacent cSpending windows", function () {
        let multisig;

        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[0], value: web3.toWei(.1, "ether") });
        }).then(function () {
            // Spend with the customer
            return multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", web3.toWei(.1, "ether"), 0, { from: accounts[0] });
        }).then(function () {
            // Mine out 45 blocks
            let promises = [];
            for (let i = 0; i < 45; i++) {
                let call = multisig.sendTransaction({ from: accounts[0], value: 0 });
                promises.push(call);
            }
            return Promise.all(promises);
        }).then(function () {
            // Trigger recalc
            return multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", 0, 0, { from: accounts[0] });
        }).then(function () {
            return getContractState(defaultState);
        }).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(10, "ether"),
                cLLimit: web3.toWei(4.9, "ether"),
                gSpending: [0, 0, 0, 0],
                cSpending: [parseInt(web3.toWei(.1, "ether")), 0, 0, 0],
                windowIndex: 3,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly clear gSpending outside K periods ago", function () {
        let multisig;

        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[1], value: web3.toWei(.1, "ether") });
        }).then(function () {
            // Spend with exchange
            return multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", web3.toWei(.1, "ether"), 0, { from: accounts[1] });
        }).then(function () {
            // Mine out 60 blocks
            let promises = [];
            for (let i = 0; i < 60; i++) {
                let call = multisig.sendTransaction({ from: accounts[1], value: 0 });
                promises.push(call);
            }
            return Promise.all(promises);
        }).then(function () {
            // Trigger recalc
            return multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", 0, 0, { from: accounts[1] });
        }).then(function () {
            return getContractState(defaultState);
        }).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(10, "ether"),
                cLLimit: web3.toWei(5, "ether"),
                gSpending: [0, 0, 0, 0],
                cSpending: [0, 0, 0, 0],
                windowIndex: 0,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly clear cSpending outside K periods ago", function () {
        let multisig;

        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[0], value: web3.toWei(.1, "ether") });
        }).then(function () {
            // Spend with the customer
            return multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", web3.toWei(.1, "ether"), 0, { from: accounts[0] });
        }).then(function () {
            // Mine out 60 blocks
            let promises = [];
            for (let i = 0; i < 60; i++) {
                let call = multisig.sendTransaction({ from: accounts[0], value: 0 });
                promises.push(call);
            }
            return Promise.all(promises);
        }).then(function () {
            // Trigger recalc
            return multisig.executeSolo("0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e", 0, 0, { from: accounts[0] });
        }).then(function () {
            return getContractState(defaultState);
        }).then(function (state) {
            let expectedState = {
                nonce: 0,
                gLLimit: web3.toWei(10, "ether"),
                cLLimit: web3.toWei(5, "ether"),
                gSpending: [0, 0, 0, 0],
                cSpending: [0, 0, 0, 0],
                windowIndex: 0,
                gPLimit: web3.toWei(10, "ether"),
                cPLimit: web3.toWei(5, "ether"),
                K: 4,
                windowLength: 15,
                customer: "0x627306090abab3a6e1400e9345bc60c78a8bef57",
                exchange: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }

            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should reject accounts from calling execute without a properly signed transaction", function () {
        let multisig;
        let before = web3.fromWei(web3.eth.getBalance(accounts[4]), "ether").toNumber();
        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[4], value: web3.toWei(.01, "ether") });
        }).then(function () {
            // Private key of accounts[4]
            let privateKey = Buffer.from('388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418', 'hex');
            let data = Buffer.from('190' + multisig.address.substr(2, 40) + accounts[4].substr(2, 40) + parseInt(web3.toWei(.01, "ether")).toString(16) + '0' + '0', 'hex');
            let dataHash = util.sha3(data);
            let signedHash = util.ecsign(dataHash, privateKey);

            let V = [signedHash.v, signedHash.v];
            let R = ['0x' + signedHash.r.toString('hex'), '0x' + signedHash.r.toString('hex')];
            let S = ['0x' + signedHash.s.toString('hex'), '0x' + signedHash.s.toString('hex')];

            return multisig.execute(V, R, S, accounts[4], web3.toWei(.01, "ether"), 0)
                .then(function () {
                    let after = web3.fromWei(web3.eth.getBalance(accounts[4]), "ether").toNumber();
                    assert(after < (before - 0.01), "multisig should not execute unauthorized");
                });

        }).catch(function (error) {
            assert.include(error.message, 'Exception');
        });
    });
});

contract('Multisig', function (accounts) {
    it("should match the right hashes", function () {
        let multisig;
        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[0], value: web3.toWei(.1, "ether") });
        }).then(function () {
            let byteData = new String('0x0');
            return multisig.debug(accounts[3], web3.toWei(.1, "ether"), byteData.valueOf())
                .then(function () {
                    let requestState = { DEBUG: 0 }
                    return getContractState(requestState);
                })
                .then(function (state) {
                    let hash = '0x' +
                        abi.soliditySHA3(["uint8", "uint8", "address", "address", "uint", "bytes", "uint"],
                            [25, 0, multisig.address, accounts[3], web3.toWei(.1, "ether"), Buffer.from('0', 'hex'), 0]).toString('hex');
                    let expectedState = { DEBUG: hash }

                    assert(checkState(state, expectedState));
                })
        });
    });
});

contract('Multisig', function (accounts) {
    it("should correctly receive inputs", function () {
        let multisig;
        let expectedState = {};
        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[0], value: web3.toWei(.1, "ether") });
        }).then(function () {
            let byteData = new String('0x0');
            let gPrivateKey = Buffer.from('ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f', 'hex');

            let txData = new String('0x0');

            let dataHash = abi.soliditySHA3(["uint8", "uint8", "address", "address", "uint", "bytes", "uint"],
                [25, 0, multisig.address, accounts[3], web3.toWei(.1, "ether"), Buffer.from('0', 'hex'), 0]);
            let gSignedHash = util.ecsign(dataHash, gPrivateKey);

            let pubKey = util.ecrecover(dataHash, gSignedHash.v, gSignedHash.r, gSignedHash.s);
            let addr = util.sha3(pubKey);

            expectedState.DEBUG = '0x' + dataHash.toString('hex');
            expectedState.DEBUG_sigV = gSignedHash.v;
            expectedState.DEBUG_sigR = '0x' + gSignedHash.r.toString('hex');
            expectedState.DEBUG_sigS = '0x' + gSignedHash.s.toString('hex');
            expectedState.DEBUG_destination = accounts[3];
            expectedState.DEBUG_value = web3.toWei(.1, "ether");
            expectedState.DEBUG_data = '0x';
            expectedState.DEBUG_ADDR = "0xf17f52151ebef6c7334fad080c5704d77216b732";

            return multisig.debugInputs(gSignedHash.v, '0x' + gSignedHash.r.toString('hex'), '0x' + gSignedHash.s.toString('hex'), accounts[3], web3.toWei(.1, "ether"), byteData.valueOf())
                .then(function () {
                    let requestState = {
                        DEBUG: 0,
                        DEBUG_sigV: 0,
                        DEBUG_sigR: 0,
                        DEBUG_sigS: 0,
                        DEBUG_destination: 0,
                        DEBUG_value: 0,
                        DEBUG_data: 0,
                        DEBUG_ADDR: 0
                    }
                    return getContractState(requestState);
                })
                .then(function (state) {
                    let hash = '0x' +
                        abi.soliditySHA3(["uint8", "uint8", "address", "address", "uint", "bytes", "uint"],
                            [25, 0, multisig.address, accounts[3], web3.toWei(.1, "ether"), Buffer.from('0', 'hex'), 0]).toString('hex');
                    assert(checkState(state, expectedState));
                })
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly recover the exchange address", function () {
        let multisig;
        let hash;
        return Multisig.deployed().then(function (instance) {
            multisig = instance;

        }).then(function () {
            // Private key of accounts[1]
            let gPrivateKey = Buffer.from('ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f', 'hex');

            let txData = new String('0x0');

            let dataHash = abi.soliditySHA3(["uint8", "uint8", "address", "address", "uint", "bytes", "uint"],
                [25, 0, multisig.address, accounts[3], web3.toWei(.1, "ether"), Buffer.from('0', 'hex'), 0]);
            hash = '0x' + dataHash.toString('hex');
            let gSignedHash = util.ecsign(dataHash, gPrivateKey);

            let pubKey = util.ecrecover(dataHash, gSignedHash.v, gSignedHash.r, gSignedHash.s);
            let addr = util.sha3(pubKey);


            return multisig.debugRecover(gSignedHash.v, '0x' + gSignedHash.r.toString('hex'), '0x' + gSignedHash.s.toString('hex'), accounts[3], web3.toWei(.1, "ether"), txData.valueOf());
        }).then(function () {
            let requestState = {
                DEBUG: 0,
                DEBUG_ADDR: 0
            }
            return getContractState(requestState);
        }).then(function (state) {
            let expectedState = {
                DEBUG: hash,
                DEBUG_ADDR: "0xf17f52151ebef6c7334fad080c5704d77216b732"
            }
            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly recover the customer address", function () {
        let multisig;
        return Multisig.deployed().then(function (instance) {
            multisig = instance;

        }).then(function () {
            // Private key of accounts[0]
            let cPrivateKey = Buffer.from('c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3', 'hex');

            let txData = new String('0x0');

            let dataHash = abi.soliditySHA3(["uint8", "uint8", "address", "address", "uint", "bytes", "uint"],
                [25, 0, multisig.address, accounts[3], web3.toWei(.1, "ether"), Buffer.from('0', 'hex'), 0]);

            let cSignedHash = util.ecsign(dataHash, cPrivateKey);

            return multisig.debugRecover(cSignedHash.v, '0x' + cSignedHash.r.toString('hex'), '0x' + cSignedHash.s.toString('hex'), accounts[3], web3.toWei(.1, "ether"), txData.valueOf())
        }).then(function () {
            let requestState = { DEBUG_ADDR: 0 }
            return getContractState(requestState)
        }).then(function (state) {
            let expectedState = { DEBUG_ADDR: "0x627306090abab3a6e1400e9345bc60c78a8bef57" }
            assert(checkState(state, expectedState));
        });
    });
});

contract('Multisig', function (accounts) {
    it("should properly receive both signatures", function () {
        let multisig;
        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[0], value: web3.toWei(.1, "ether") });
        }).then(function () {
            // Private key of accounts[1]
            let gPrivateKey = Buffer.from('ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f', 'hex');
            // Private key of accounts[0]
            let cPrivateKey = Buffer.from('c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3', 'hex');

            let txData = new String('0x0');

            let dataHash = abi.soliditySHA3(["uint8", "uint8", "address", "address", "uint", "bytes", "uint"],
                [25, 0, multisig.address, accounts[3], web3.toWei(.1, "ether"), Buffer.from('0', 'hex'), 0]);

            let gSignedHash = util.ecsign(dataHash, gPrivateKey);
            let cSignedHash = util.ecsign(dataHash, cPrivateKey);

            let V = [gSignedHash.v, cSignedHash.v];
            let R = ['0x' + gSignedHash.r.toString('hex'), '0x' + cSignedHash.r.toString('hex')];
            let S = ['0x' + gSignedHash.s.toString('hex'), '0x' + cSignedHash.s.toString('hex')];

            return multisig.debugExecute(V, R, S, accounts[3], web3.toWei(.1, "ether"), txData.valueOf())
                .then(function () {
                    return getContractState(debugState);
                })
                .then(function (state) {
                    let expectedState = {
                        DEBUG: '0x' + dataHash.toString('hex'),
                        DEBUG_V: V,
                        DEBUG_R: R,
                        DEBUG_S: S,
                        DEBUG_ADDR_G: "0xf17f52151ebef6c7334fad080c5704d77216b732",
                        DEBUG_ADDR_C: "0x627306090abab3a6e1400e9345bc60c78a8bef57"
                    }

                    assert(checkState(state, expectedState));
                });
        });
    });
});

contract('Multisig', function (accounts) {
    it("should allow a transaction with two valid signatures", function () {
        let multisig;
        return Multisig.deployed().then(function (instance) {
            multisig = instance;
            // Fund the contract
            return multisig.sendTransaction({ from: accounts[0], value: web3.toWei(.1, "ether") });
        }).then(function () {
            // Private key of accounts[1]
            let gPrivateKey = Buffer.from('ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f', 'hex');
            // Private key of accounts[0]
            let cPrivateKey = Buffer.from('c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3', 'hex');

            let txData = new String('0x0');

            let dataHash = abi.soliditySHA3(["uint8", "uint8", "address", "address", "uint", "bytes", "uint"],
                [25, 0, multisig.address, accounts[3], web3.toWei(.1, "ether"), Buffer.from('0', 'hex'), 0]);

            let gSignedHash = util.ecsign(dataHash, gPrivateKey);
            let cSignedHash = util.ecsign(dataHash, cPrivateKey);

            let V = [gSignedHash.v, cSignedHash.v];
            let R = ['0x' + gSignedHash.r.toString('hex'), '0x' + cSignedHash.r.toString('hex')];
            let S = ['0x' + gSignedHash.s.toString('hex'), '0x' + cSignedHash.s.toString('hex')];

            return multisig.execute(V, R, S, accounts[3], web3.toWei(.1, "ether"), txData.valueOf())
                .then(function () {
                    return getContractState(defaultState);
                })
                .then(function (state) {
                    let expectedState = { nonce: 1 }

                    assert(checkState(state, expectedState));
                });
        });
    });
});

function checkState(state, expectedState) {
    for (let prop in expectedState) {
        if (expectedState.hasOwnProperty(prop)) {
            if (Array.isArray(expectedState[prop])) {
                assert.deepEqual(state[prop], expectedState[prop], prop + " should be " + expectedState[prop]);
            } else {
                assert.equal(state[prop], expectedState[prop], prop + " should be " + expectedState[prop]);
            }
        }
    }

    return true;
}

function getContractState(state) {
    let multisig;

    return Multisig.deployed().then(async function (instance) {
        multisig = instance;

        for (let prop in state) {
            if (state.hasOwnProperty(prop)) {
                if (prop === "gSpending") {
                    await getGSpending(multisig, state.K)
                        .then(function (value) {
                            state.gSpending = value;
                        });
                } else if (prop === "cSpending") {
                    await getCSpending(multisig, state.K)
                        .then(function (value) {
                            state.cSpending = value;
                        });
                } else if (prop === "DEBUG_V") {
                    await getDebugV(multisig)
                        .then(function (value) {
                            state.DEBUG_V = value;
                        });
                } else if (prop === "DEBUG_R") {
                    await getDebugR(multisig)
                        .then(function (value) {
                            state.DEBUG_R = value;
                        });
                } else if (prop === "DEBUG_S") {
                    await getDebugS(multisig)
                        .then(function (value) {
                            state.DEBUG_S = value;
                        });
                } else {
                    await multisig[prop].call()
                        .then(function (value) {
                            if (typeof value !== 'string') {
                                state[prop] = value.toNumber();
                            } else {
                                state[prop] = value;
                            }
                        });
                }
            }
        }
        return state;
    });
}

async function getGSpending(contract, k) {
    let gSpending = [];
    for (let i = 0; i < k; i++) {
        await contract.gSpending.call(i)
            .then(function (value) {
                gSpending.push(value.toNumber());
            });
    }
    return gSpending;
}

async function getCSpending(contract, k) {
    let cSpending = [];
    for (let i = 0; i < k; i++) {
        await contract.cSpending.call(i)
            .then(function (value) {
                cSpending.push(value.toNumber());
            });
    }
    return cSpending;
}

async function getDebugV(contract) {
    let V = [];
    for (let i = 0; i < 2; i++) {
        await contract.DEBUG_V.call(i)
            .then(function (value) {
                V.push(value.toNumber());
            });
    }
    return V;
}

async function getDebugR(contract) {
    let R = [];
    for (let i = 0; i < 2; i++) {
        await contract.DEBUG_R.call(i)
            .then(function (value) {
                R.push(value);
            });
    }
    return R;
}

async function getDebugS(contract) {
    let S = [];
    for (let i = 0; i < 2; i++) {
        await contract.DEBUG_S.call(i)
            .then(function (value) {
                S.push(value);
            });
    }
    return S;
}