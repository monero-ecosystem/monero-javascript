/**
 * Exports test utilities for use across the tests.
 * 
 * Exporting like this resolves circular dependencies, e.g. between TestUtils and TxPoolWalletTracker.
 */
module.exports = function() {
  this.TestUtils = require("./TestUtils");
  this.TxPoolWalletTracker = require("./TxPoolWalletTracker");
  this.StartMining = require("./StartMining");
}