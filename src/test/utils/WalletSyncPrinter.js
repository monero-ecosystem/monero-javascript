const MoneroWalletListener = require("../../main/js/wallet/model/MoneroWalletListener");

/**
 * Print sync progress every X blocks.
 */
class WalletSyncPrinter extends MoneroWalletListener {
  
  constructor(syncResolution) {
    super();
    this.nextIncrement = 0;
    this.syncResolution = syncResolution ? syncResolution : .05;
  }
  
  onSyncProgress(height, startHeight, endHeight, percentDone, message) {
    if (percentDone === 1 || percentDone >= this.nextIncrement) {
      console.log("onSyncProgress(" + height + ", " + startHeight + ", " + endHeight + ", " + percentDone + ", " + message + ")");
      this.nextIncrement += this.syncResolution;
    }
  }
}

module.exports = WalletSyncPrinter;