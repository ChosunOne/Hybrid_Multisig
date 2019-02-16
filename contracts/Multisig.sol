pragma solidity 0.4.19;

// A 2 of 2 multisig wallet with set withdrawal limits for 1 of 2 functionality.  Able to create any kind of transaction.
// This contract is inspired by https://github.com/christianlundkvist/simple-multisig/blob/master/contracts/SimpleMultiSig.sol

contract Multisig {
    // Mutable States
    uint public nonce; // Used to prevent reusing a signature

    uint public eLLimit; // Spending limit for the exchange in the current calculation period
    uint public cLLimit; // Spending limit for the customer in the current calculation period

    uint[] public eSpending; // Current running sum of transaction value inside the current calculation period signed by the exchange
    uint[] public cSpending; // Current running sum of transaction value inside the current calculation period signed by the customer
    
    uint public windowIndex; // The pointer to the current index in the pastSpending array
    uint public lastStartingBlock; // The starting block of the last calculation period.

    // Immutable States 
    uint public ePLimit; // The maximum spending limit of the exchange over the period P in Wei
    uint public cPLimit; // The maximum spending limit of the customer over the period P in Wei

    uint public K; // The number of window calculation periods in P.
    uint public windowLength; // The length of each calculation window in P in blocks.

    address public customer; // The address of the customer that will sign transactions from this account
    address public exchange; // The address of the exchange that will sign transactions from this account

    // DEBUG -- REMOVE BEFORE RELEASE
    bytes32 public DEBUG;
    address public DEBUG_ADDR;
    address public DEBUG_ADDR_G;
    address public DEBUG_ADDR_C;
    uint8[] public DEBUG_V;
    bytes32[] public DEBUG_R;
    bytes32[] public DEBUG_S;

    uint8 public DEBUG_sigV;
    bytes32 public DEBUG_sigR;
    bytes32 public DEBUG_sigS;
    address public DEBUG_destination;
    uint public DEBUG_value;
    bytes public DEBUG_data;


    // Contract Constructor
    // Inputs
    // address c -- The address of the customer which will sign transactions
    // address e -- The address of the exchange which will sign transactions
    // uint eLimit -- The spending limit of the exchange over the time period
    // uint cLimit -- The spending limit of the customer over the time period
    // uint b -- The number of blocks that constitute the time period
    // uint k -- The number of calculation periods in b.
    function Multisig(address c, address e, uint eLimit, uint cLimit, uint b, uint k) public {
        require(c != e);
        require(b > 0);
        require(k > 0);

        // Set immutables
        customer = c;
        exchange = e;

        ePLimit = eLimit;
        cPLimit = cLimit;

        windowLength = b / k;
        K = k;

        // Set mutables
        nonce = 0;
        
        eLLimit = eLimit;
        cLLimit = cLimit;

        windowIndex = 0;

        eSpending = new uint[](K);
        cSpending = new uint[](K);

        lastStartingBlock = block.number;
    }

    // Function that determines whether the spending limit should be recalculated
    function recalculate() private {
        // Determine how many periods have passed since the last action, and update contract accordingly
        uint periods = (block.number - lastStartingBlock) / windowLength;
        
        // Update the starting block for this calculation period
        if (periods == 0) {
            return;
        } else {
            lastStartingBlock += (windowLength * periods);
        }
        
        if (periods < K) {
            // Update values in between the last period and the current one
            for (uint i = 0; i < periods; i++) {
                uint nextSlot = (windowIndex + 1) % K;
                eSpending[nextSlot] = 0;
                cSpending[nextSlot] = 0;
                windowIndex = nextSlot;
            }

            // Recalculate spending limit for the current interval
            uint sumESpending = 0;
            uint sumCSpending = 0;
            for (i = 0; i < K; i++) {
                sumESpending += eSpending[i];
                sumCSpending += cSpending[i];
            }

            eLLimit = ePLimit - sumESpending;
            cLLimit = cPLimit - sumCSpending;

            return;

        } else if (periods >= K) {
            // Reset most values to 0 and base limits, since K periods have passed with no prior activity
            for (i = 0; i < K; i++) {
                eSpending[i] = 0;
                cSpending[i] = 0;
            }

            windowIndex = 0;
            eLLimit = ePLimit;
            cLLimit = cLLimit;

            return;
        }
    }

    // Function that allows actions by only one signatory
    function executeSolo(address destination, uint value, bytes data) public {
        require(msg.sender == exchange || msg.sender == customer);
        recalculate();
        
        if (msg.sender == exchange) {
            require(eSpending[windowIndex] + value <= eLLimit);

            eSpending[windowIndex] += value;
            require(destination.call.value(value)(data));

        } else if (msg.sender == customer) {
            require(cSpending[windowIndex] + value <= cLLimit);

            cSpending[windowIndex] += value;
            require(destination.call.value(value)(data));
        }
    }

    // Function that allows spending by both signatories, should be the exchange signature and then Customer signature in that order
    function execute(uint8[] sigV, bytes32[] sigR, bytes32[] sigS, address destination, uint value, bytes data) public {
        require(sigR.length == 2);
        require(sigR.length == sigS.length && sigR.length == sigV.length);

        // Follows ERC191 signature scheme: https://github.com/ethereum/EIPs/issues/191
        bytes32 txHash = keccak256(byte(0x19), byte(0), this, destination, value, data, nonce);

        // Recover the exchange's signature
        address rExchange = ecrecover(txHash, sigV[0], sigR[0], sigS[0]);
        require(rExchange == exchange);

        // Recover the customer's signature
        address rCustomer = ecrecover(txHash, sigV[1], sigR[1], sigS[1]);
        require(rCustomer == customer);

        // If all signatures accounted for
        nonce = nonce + 1;
        require(destination.call.value(value)(data));
    }

    // Allow contract to accept deposits
    function () public payable {}

    // DEBUG 
    function debug(address destination, uint value, bytes data) public {
        DEBUG = keccak256(byte(0x19), byte(0), this, destination, value, data, nonce);
    }

    function debugInputs(uint8 sigV, bytes32 sigR, bytes32 sigS, address destination, uint value, bytes data) public {
        DEBUG_sigV = sigV;
        DEBUG_sigR = sigR;
        DEBUG_sigS = sigS;
        DEBUG_destination = destination;
        DEBUG_value = value;
        DEBUG_data = data;
        DEBUG = keccak256(byte(0x19), byte(0), this, destination, value, data, nonce);
        DEBUG_ADDR = ecrecover(DEBUG, sigV, sigR, sigS);
    }

    function debugRecover(uint8 sigV, bytes32 sigR, bytes32 sigS, address destination, uint value, bytes data) public {
        DEBUG = keccak256(byte(0x19), byte(0), this, destination, value, data, nonce);
        DEBUG_ADDR = ecrecover(DEBUG, sigV, sigR, sigS);
    }

    function debugExecute(uint8[] sigV, bytes32[] sigR, bytes32[] sigS, address destination, uint value, bytes data) public {
        DEBUG = keccak256(byte(0x19), byte(0), this, destination, value, data, nonce);
        DEBUG_V = sigV;
        DEBUG_R = sigR;
        DEBUG_S = sigS;
        DEBUG_ADDR_G = ecrecover(DEBUG, DEBUG_V[0], DEBUG_R[0], DEBUG_S[0]);
        DEBUG_ADDR_C = ecrecover(DEBUG, DEBUG_V[1], DEBUG_R[1], DEBUG_S[1]);
    }
}
