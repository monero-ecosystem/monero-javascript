const TestUtils = require("./TestUtils");

/**
 * Utility class to start mining.
 */
class StartMining {
  
  static async startMining() {
    let numThreads = 6;
    //TestUtils.getWalletRpc().startMining(numThreads, false, true);
    let daemon = await TestUtils.getDaemonRpc();
    await daemon.startMining("56SWsnhejUTbgNs2EgyXdfNXUawymMMuAC9voZZSQrHzJHNxGsAvMnoUja7JcKVtPwNc1oKAkoAt1cv6EmtKRQ22U37B7cT", numThreads, false, false);  // random subaddress
  }
}

module.exports = StartMining;