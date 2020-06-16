const assert = require("assert");

/**
 * Defines the Monero network types (mainnet, testnet, and stagenet).
 */
MoneroNetworkType = {
    
    /**
     * Enumerates the network types.
     */
    MAINNET: 0,
    TESTNET: 1,
    STAGENET: 2,
    
    /**
     * Asserts that the given network type is valid.
     */
    validate: function(networkType) {
      assert(networkType === 0 || networkType === 1 || networkType === 2, "Network type is invalid: " + networkType);
    },
    
    /**
     * Indicates if the given network type is valid or not.
     */
    isValid: function(networkType) {
      return networkType === 0 || networkType === 1 || networkType === 2;
    },
    
    /**
     * Parse the given string as a network type.
     */
    parse: function(networkTypeStr) {
      let str = ("" + networkTypeStr).toLowerCase();
      switch (str) {
        case "mainnet": return MoneroNetworkType.MAINNET;
        case "testnet": return MoneroNetworkType.TESTNET;
        case "stagenet": return MoneroNetworkType.STAGENET;
        default: throw new MoneroError("Invalid network type to parse: '" + networkTypeStr + "'");
      }
    }
}

module.exports = MoneroNetworkType;