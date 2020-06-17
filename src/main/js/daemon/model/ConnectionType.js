const assert = require("assert");

/**
 * Enumerates connection types.
 * 
 * Based on enums.h in monero-project.
 * 
 * @hideconstructor
 */
class ConnectionType {
    
  /**
   * Asserts that the given connection type is valid.
   */
  static validate(type) {
    assert(type === 0 || type === 1 || type === 2 || type === 3, "Connection type is invalid: " + type);
  }
  
  /**
   * Indicates if the given connection type is valid or not.
   */
  static isValid(type) {
    return type === 0 || type === 1 || type === 2 || 3;
  }
}

/**
 * Invalid connection type (value=0).
 */
ConnectionType.INVALID = 0;

/**
 * IPV4 connection type (value=1).
 */
ConnectionType.IPV4 = 1;

/**
 * IPV6 connection type (value=2).
 */
ConnectionType.IPV6 = 2;

/**
 * TOR connection type (value=3).
 */
ConnectionType.TOR = 3;

/**
 * I2P connection type (value=4).
 */
ConnectionType.I2P = 4;

module.exports = ConnectionType;