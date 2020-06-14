const TestUtils = require("./utils/TestUtils");
const TestMoneroWalletCommon = require("./TestMoneroWalletCommon");
const monerojs = require("monero-javascript");
const MoneroWalletKeys = monerojs.MoneroWalletKeys;
const MoneroWalletConfig = monerojs.MoneroWalletConfig;
const GenUtils = monerojs.GenUtils;

/**
 * Tests the implementation of MoneroWallet which only manages keys using WebAssembly.
 */
class TestMoneroWalletKeys extends TestMoneroWalletCommon {
  
  constructor(config) {
    super(config);
  }
  
  async getTestWallet() {
    return TestUtils.getWalletKeys();
  }
  
  async getTestDaemon() {
    throw new Error("TestMoneroWalletKeys.getTestDaemon() not applicable");
  }
  
  async openWallet(config) {
    throw new Error("TestMoneroWalletKeys.openWallet(config) not applicable, use createWallet()");
  }
  
  async createWallet(config) {
    
    // assign defaults
    config = new MoneroWalletConfig(config);
    if (!config.getPassword()) config.setPassword(TestUtils.WALLET_PASSWORD);
    if (config.getNetworkType() === undefined) config.setNetworkType(TestUtils.NETWORK_TYPE);
    if (config.getServer()) throw new Error("Cannot initialize keys wallet with connection");
    
    // create wallet
    return await MoneroWalletKeys.createWallet(config);
  }

  async getMnemonicLanguages() {
    return await MoneroWalletKeys.getMnemonicLanguages();
  }
  
  runTests() {
    let that = this;
    describe("TEST MONERO WALLET KEYS", function() {
      
      // initialize wallet
      before(async function() {
        that.wallet = await that.getTestWallet();
      });
      
      // run tests specific to keys wallet
      that._testWalletKeys();
      
      // run common tests
      that.runCommonTests();
    });
  }
  
  // ---------------------------------- PRIVATE -------------------------------
  
  _testWalletKeys() {
    let that = this;
    let config = this.config;
    let daemon = this.daemon;
    
    describe("Tests specific to keys wallet", function() {
      
      it("Has the same keys as the RPC wallet", async function() {
        await WalletEqualityUtils.testWalletEqualityKeys(await TestUtils.getWalletRpc(), await that.getTestWallet());
      });
      
      it("Has the same keys as the RPC wallet with a seed offset", async function() {
        
        // use common offset to compare wallet implementations
        let seedOffset = "my super secret offset!";
        
        // create rpc wallet with offset
        let walletRpc = await TestUtils.getWalletRpc();
        await walletRpc.createWallet({path: GenUtils.getUUID(), password: TestUtils.WALLET_PASSWORD, mnemonic: await walletRpc.getMnemonic(), restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT, seedOffset: seedOffset});
        
        // create keys-only wallet with offset
        let walletKeys = await MoneroWalletKeys.createWallet({
            networkType: TestUtils.NETWORK_TYPE,
            mnemonic: TestUtils.MNEMONIC,
            seedOffset: seedOffset
        });
        
        // deep compare
        await WalletEqualityUtils.testWalletEqualityKeys(walletRpc, walletKeys);
      });
    });
  }
}

module.exports = TestMoneroWalletKeys