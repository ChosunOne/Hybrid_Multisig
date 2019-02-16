# Hybrid Multisig
An ethereum 2 of 2 [ERC 191 Compliant](https://github.com/ethereum/EIPs/issues/191) multisig with withdrawal limits enforced in a sliding window.

## Requirements
First install Truffle via  
`sudo npm install -g truffle`

Then update the solidity compiler to version 0.5.4 by
```
cd /usr/lib/node_modules/truffle  
sudo npm install solc@0.5.4  
```

## Installation
Clone the repo then run  
`npm install`  
to install the needed node libraries.
Then run  
`truffle compile`  
and ensure that the contracts compile successfully.

## Configuration
Parameters defining the node to connect to are located in the `truffle.js` configuration file.  Instructions for editing the configuration can be found at the [Truffle Framework Docs](http://truffleframework.com/docs/advanced/configuration#networks).

## Usage
### Tests
To run the test suite, first launch  
`truffle develop --log`  
to start a local ethereum instance.  

Once the local instance is running, in a separate window run  
`truffle test`  
to run the test suite in the test folder

### Deployment
After configuring truffle to deploy to a network, run  
`truffle migrate --network network_name`  
where 'network_name' corresponds to the configuration in truffle.js. 

## Contract API
### Constructor
`Multisig(address c, address g, uint gLimit, uint cLimit, uint b, uint k)`  
#### Parameters
address customer -- The address to be used to sign or request actions by the multisig.  
address  exchange -- The address to be used to sign or request actions by the multisig.  
uint gLimit -- The maximum value in Wei that  exchange can send from the multisig over the last B blocks  
uint cLimit -- The maximum value in Wei that the customer can send from the multisig over the last B blocks  
uint b -- The number of blocks to enforce the limits for  exchange and customer  
uint k -- The number of periods in which the spending limit is enforced.  The lower this value is, the cheaper enforcements of the limits are, but the tradeoff will be a longer total enforcement time (B + B/K).  

### executeSolo
`executeSolo(address destination, uint value, bytes data)`  


#### Parameters
address destination -- The address to interact with or send funds to  
uint value -- The value in Wei to send to the destination  
bytes data -- The data to include in the transaction, such as a function call.  
  
executeSolo allows either the customer or  exchange to take an action without requiring action from the other party.  It is capable of making any kind of transaction on the Ethereum network, with value being constrained by the appropriate sender limit.  

### execute
`execute(uint8[] sigV, bytes32[] sigR, bytes32[] sigS, address destination, uint value, bytes data)`  
#### Parameters
uint8\[] sigV -- An array of the v values from signing the keccak256 hash of the request by both parties.  In this contract it should be of length 2.  
bytes32\[] sigR -- An array of the r values from signing the keccak256 hash of the request by both parties.  In this contract it should be of length 2.  
bytes32\[] sigS -- An array of the s values from signing the keccak256 hash of the request by both parties.  In this contract it should be of length 2.  
address destination -- The address to interact with or send funds to  
uint value -- The value in Wei to send to the destination  
bytes data -- The data to include in the transaction, such as a function call.  
  
execute allows an arbitrary amount of Wei to be sent from the contract once it has verified that both parties have signed it.  It follows the [ERC 191](https://github.com/ethereum/EIPs/issues/191) signed data standard.  Data from  exchange should occupy the first position in the inputs, and data from customer should occupy the second position.  

## Debug API
This version of the contract includes state and functions to help debug the operation of the contract.  

### debug
`debug(address destination, uint value, bytes data)`  
#### Parameters
address destination -- The address to include in the keccak hash as the destination address  
uint value -- The value to include in the keccak hash as the value  
bytes data -- The data to includei n the keccak hash as the data  

This function takes inputs used to calculate the keccak256 hash of the input to execute.  It stores this calculated hash into the bytes32 DEBUG contract variable.  Since there are no tools which allow you to step through smart contract execution easily this can be simpler to ensure the hashes you are generating clientside match the hashes being generated on the contract.  

### debugInputs
`debugInputs(uint8 sigV, bytes32 sigR, bytes32 sigS, address destination, uint value, bytes data)`  
#### Parameters
uint8 sigV -- The v value from signing the hash used in execute.  
bytes32 sigR -- The r value from signing the hash used in execute.
bytes32 sigS -- The s value from signing the hash used in execute.
address destination -- The address used in signing the hash used in execute.  
uint value -- The value used in signing the hash used in execute.  
bytes data -- The data used in signing the hash used in execute.  

debugInputs is most useful for ensuring that the values received by the contract match the intended values to be sent.  Some libraries do not document their contract abstraction behavior, and this can be used to ensure inputs are correct.  It also calculates the address recovered from the values, storing it in the DEBUG_ADDR contract variable.  

### debugRecover
`debugRecover(uint8 sigV, bytes32 sigR, bytes32 sigS, address destination, uint value, bytes data)`  
This is similar to debugInputs, but only calculates the message hash and recovered address.  

### debugExecute
`debugExecute(uint8[] sigV, bytes32[] sigR, bytes32[] sigS, address destination, uint value, bytes data`  
#### Parameters
Same as execute  
  
This will store calculations from execute in the following contract variables:  
DEBUG -- The hash of the signed message
DEBUG_V -- The received sigV array  
DEBUG_R -- The received sigR array  
DEBUG_S -- The received sigS array  
DEBUG_ADDR_G -- The recovered address corresponding to the exchange signature  
DEBUG_ADDR_C -- The recovered address corresponding to the customer signature
