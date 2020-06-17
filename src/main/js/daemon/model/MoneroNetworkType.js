const assert = require("assert");

/**
 * Defines the Monero network types (mainnet, testnet, and stagenet).
 * 
 * @hideconstructor
 */
class MoneroNetworkType {
  
  /**
   * Asserts that the given network type is valid.
   * 
   * @param {int} networkType - the network type to validate as a numeric
   */
  static validate(networkType) {
    assert(networkType === 0 || networkType === 1 || networkType === 2, "Network type is invalid: " + networkType);
  }
  
  /**
   * Indicates if the given network type is valid or not.
   * 
   * @param {int} networkType - the network type to validate as a numeric
   * @return {boolean} true if the network type is valid, false otherwise
   */
  static isValid(networkType) {
    return networkType === 0 || networkType === 1 || networkType === 2;
  }
  
  /**
   * Parse the given string as a network type.
   * 
   * @param {string} networkTypeStr - "mainnet", "testnet", or "stagenet" (case insensitive)
   * @return {int} the network type as a numeric
   */
  static parse(networkTypeStr) {
    let str = ("" + networkTypeStr).toLowerCase();
    switch (str) {
      case "mainnet": return MoneroNetworkType.MAINNET;
      case "testnet": return MoneroNetworkType.TESTNET;
      case "stagenet": return MoneroNetworkType.STAGENET;
      default: throw new MoneroError("Invalid network type to parse: '" + networkTypeStr + "'");
    }
  }
}

/**
 * Mainnet (value=0).
 */
MoneroNetworkType.MAINNET = 0;

/**
 * Testnet (value=1).
 */
MoneroNetworkType.TESTNET = 1;

/**
 * Stagnet (value=2).
 */
MoneroNetworkType.STAGENET = 2;

module.exports = MoneroNetworkType;