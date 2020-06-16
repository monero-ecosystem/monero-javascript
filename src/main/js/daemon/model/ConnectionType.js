const assert = require("assert");

/**
 * Enumerates connection types.
 * 
 * Based on enums.h in monero-project.
 */
ConnectionType = {
    
    /**
     * Enumerates the network types.
     */
    INVALID: 0,
    IPV4: 1,
    IPV6: 2,
    TOR: 3,
    I2P: 4,
    
    /**
     * Asserts that the given connection type is valid.
     */
    validate: function(type) {
      assert(type === 0 || type === 1 || type === 2 || type === 3, "Connection type is invalid: " + type);
    },
    
    /**
     * Indicates if the given connection type is valid or not.
     */
    isValid: function(type) {
      return type === 0 || type === 1 || type === 2 || 3;
    }
}

module.exports = ConnectionType;