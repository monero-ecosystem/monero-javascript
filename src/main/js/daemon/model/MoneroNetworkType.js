const MoneroError = require("../../common/MoneroError");

/**
 * Defines the Monero network types (mainnet, testnet, and stagenet).
 * 
 * @hideconstructor
 */
class MoneroNetworkType {
  
  /**
   * Validates the given network type.
   * 
   * @param {int} networkType - the network type to validate as a numeric
   */
  static validate(networkType) {
    if (networkType !== 0 && networkType !== 1 && networkType !== 2) throw new MoneroError("Network type is invalid: " + networkType);
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
  
  /**
   * Get the network type in human-readable form.
   *
   * @return {string} the network type in human-readable form
   */
  static toString(networkType) {
    if (networkType === 0) return "mainnet";
    if (networkType === 1) return "testnet";
    if (networkType === 2) return "stagenet";
    throw new MoneroError("Invalid network type: " + networkType);
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