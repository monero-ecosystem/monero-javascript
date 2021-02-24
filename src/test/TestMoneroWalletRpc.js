const assert = require("assert");
const TestUtils = require("./utils/TestUtils");
const TestMoneroWalletCommon = require("./TestMoneroWalletCommon");
const TestMoneroWalletFull = require("./TestMoneroWalletFull");
const monerojs = require("../../index");
const MoneroError = monerojs.MoneroError;
const GenUtils = monerojs.GenUtils;
const MoneroWalletConfig = monerojs.MoneroWalletConfig;
const MoneroUtils = monerojs.MoneroUtils;
const MoneroAccountTag = monerojs.MoneroAccountTag;

/**
 * Tests the Monero Wallet RPC client and server.
 */
class TestMoneroWalletRpc extends TestMoneroWalletCommon {
  
  constructor(testConfig) {
    super(testConfig);
  }
  
  async beforeAll() {
    await super.beforeAll();
    
    // if full tests ran, wait for full wallet's pool txs to confirm
    if (TestMoneroWalletFull.FULL_TESTS_RUN) {
      let walletFull = await TestUtils.getWalletFull();
      await TestUtils.WALLET_TX_TRACKER.waitForWalletTxsToClearPool(walletFull);
      await walletFull.close(true);
    }
  }
  
  async beforeEach(currentTest) {
    await super.beforeEach(currentTest);
  }
  
  async afterAll() {
    await super.afterAll();
    for (let portOffset of Object.keys(TestUtils.WALLET_PORT_OFFSETS)) { // TODO: this breaks encapsulation, use MoneroWalletRpcManager
      console.error("WARNING: Wallet RPC process on port " + (TestUtils.WALLET_RPC_PORT_START + Number(portOffset)) + " was not stopped after all tests, stopping");
      await TestUtils.stopWalletRpcProcess(TestUtils.WALLET_PORT_OFFSETS[portOffset]);
    }
  }
  
  async afterEach(currentTest) {
    await super.afterEach(currentTest);
  }
  
  async getTestWallet() {
    return TestUtils.getWalletRpc();
  }
  
  async getTestDaemon() {
    return TestUtils.getDaemonRpc();
  }
  
  async openWallet(config) {
    
    // assign defaults
    config = new MoneroWalletConfig(config);
    if (!config.getPassword()) config.setPassword(TestUtils.WALLET_PASSWORD);
    
    // create client connected to internal monero-wallet-rpc executable
    let wallet = await TestUtils.startWalletRpcProcess();
    
    // open wallet
    try {
      await wallet.openWallet(config);
      if (config.getServerUri() === "") wallet.setDaemonConnection(""); // serverUri "" denotes offline wallet for tests
      else await wallet.startSyncing(TestUtils.SYNC_PERIOD_IN_MS);
      return wallet;
    } catch (err) {
      await TestUtils.stopWalletRpcProcess(wallet);
      throw err;
    }
  }
  
  async createWallet(config) {
    
    // assign defaults
    config = new MoneroWalletConfig(config);
    let random = !config.getMnemonic() && !config.getPrimaryAddress();
    if (!config.getPath()) config.setPath(GenUtils.getUUID());
    if (!config.getPassword()) config.setPassword(TestUtils.WALLET_PASSWORD);
    if (!config.getRestoreHeight() && !random) config.setRestoreHeight(0);
    
    // create client connected to internal monero-wallet-rpc executable
    let wallet = await TestUtils.startWalletRpcProcess();
    
    // create wallet
    try {
      await wallet.createWallet(config);
      if (config.getServerUri() === "") wallet.setDaemonConnection(""); // serverUri "" denotes offline wallet for tests
      else await wallet.startSyncing(TestUtils.SYNC_PERIOD_IN_MS);
      return wallet;
    } catch (err) {
      await TestUtils.stopWalletRpcProcess(wallet);
      throw err;
    }
  }
  
  async closeWallet(wallet, save) {
    await wallet.close(save);
    await TestUtils.stopWalletRpcProcess(wallet);
  }
  
  async getMnemonicLanguages() {
    return await this.wallet.getMnemonicLanguages();
  }
  
  runTests() {
    let that = this;
    let testConfig = this.testConfig;
    describe("TEST MONERO WALLET RPC", function() {
      
      // register handlers to run before and after tests
      before(async function() { await that.beforeAll(); });
      beforeEach(async function() { await that.beforeEach(this.currentTest); });
      after(async function() { await that.afterAll(); });
      afterEach(async function() { await that.afterEach(this.currentTest); });
      
      // run tests specific to wallet rpc
      that._testWalletRpc(testConfig);
      
      // run common tests
      that.runCommonTests(testConfig);
    });
  }
  
  // ---------------------------------- PRIVATE -------------------------------
  
  // rpc-specific tx test
  async _testTxWallet(tx, ctx) {
    ctx = Object.assign({}, ctx);
    
    // run common tests
    await super._testTxWallet(tx, ctx);
  }
  
  // rpc-specific out-of-range subaddress test
  async _testGetSubaddressAddressOutOfRange() {
    let accounts = await this.wallet.getAccounts(true);
    let accountIdx = accounts.length - 1;
    let subaddressIdx = accounts[accountIdx].getSubaddresses().length;
    let address = await this.wallet.getAddress(accountIdx, subaddressIdx);
    assert.equal(address, undefined);
  }
  
  _testWalletRpc(testConfig) {
    let that = this;
    describe("Tests specific to RPC wallet", function() {
      
      // ---------------------------- BEGIN TESTS ---------------------------------
      
      if (testConfig.testNonRelays)
      it("Can create a wallet with a randomly generated mnemonic", async function() {
        
        // create random wallet with defaults
        let path = GenUtils.getUUID();
        let wallet = await that.createWallet({path: path});
        let mnemonic = await wallet.getMnemonic();
        MoneroUtils.validateMnemonic(mnemonic);
        assert.notEqual(mnemonic, TestUtils.MNEMONIC);
        MoneroUtils.validateAddress(await wallet.getPrimaryAddress(), TestUtils.NETWORK_TYPE);
        await wallet.sync();  // very quick because restore height is chain height
        await that.closeWallet(wallet);

        // create random wallet with non defaults
        path = GenUtils.getUUID();
        wallet = await that.createWallet({path: path, language: "Spanish"});
        MoneroUtils.validateMnemonic(await wallet.getMnemonic());
        assert.notEqual(await wallet.getMnemonic(), mnemonic);
        mnemonic = await wallet.getMnemonic();
        MoneroUtils.validateAddress(await wallet.getPrimaryAddress(), TestUtils.NETWORK_TYPE);
        
        // attempt to create wallet which already exists
        try {
          await that.createWallet({path: path, language: "Spanish"});
        } catch (e) {
          assert.equal(e.message, "Wallet already exists: " + path);
          assert.equal(-21, e.getCode())
          assert.equal(mnemonic, await wallet.getMnemonic());
        }
        await that.closeWallet(wallet);
      });
      
      if (testConfig.testNonRelays)
      it("Can create a RPC wallet from a mnemonic phrase", async function() {
        
        // create wallet with mnemonic and defaults
        let path = GenUtils.getUUID();
        let wallet = await that.createWallet({path: path, password: TestUtils.WALLET_PASSWORD, mnemonic: TestUtils.MNEMONIC, restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT});
        assert.equal(await wallet.getMnemonic(), TestUtils.MNEMONIC);
        assert.equal(await wallet.getPrimaryAddress(), TestUtils.ADDRESS);
        await wallet.sync();
        assert.equal(await wallet.getHeight(), await that.daemon.getHeight());
        let txs = await wallet.getTxs();
        assert(txs.length > 0); // wallet is used
        assert.equal(txs[0].getHeight(), TestUtils.FIRST_RECEIVE_HEIGHT);
        await that.closeWallet(wallet);
        
        // create wallet with non-defaults
        path = GenUtils.getUUID();
        wallet = await that.createWallet({path: path, password: TestUtils.WALLET_PASSWORD, mnemonic: TestUtils.MNEMONIC, restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT, language: "German", seedOffset: "my offset!", saveCurrent: false});
        MoneroUtils.validateMnemonic(await wallet.getMnemonic());
        assert.notEqual(await wallet.getMnemonic(), TestUtils.MNEMONIC);  // mnemonic is different because of offset
        assert.notEqual(await wallet.getPrimaryAddress(), TestUtils.ADDRESS);
        await that.closeWallet(wallet);
      });
      
      if (testConfig.testNonRelays)
      it("Can open wallets", async function() {
      
        // create names of test wallets
        let numTestWallets = 3;
        let names = [];
        for (let i = 0; i < numTestWallets; i++) names.push(GenUtils.getUUID());
        
        // create test wallets
        let mnemonics = [];
        for (let name of names) {
          let wallet = await that.createWallet({path: name, password: TestUtils.WALLET_PASSWORD});
          mnemonics.push(await wallet.getMnemonic());
          await that.closeWallet(wallet, true);
        }
        
        // open test wallets
        let wallets = [];
        for (let i = 0; i < numTestWallets; i++) {
          let wallet = await that.openWallet({path: names[i], password: TestUtils.WALLET_PASSWORD});
          assert.equal(await wallet.getMnemonic(), mnemonics[i]);
          wallets.push(wallet);
        }
        
        // attempt to re-open already opened wallet
        try {
          await that.openWallet({path: names[numTestWallets - 1], password: TestUtils.WALLET_PASSWORD});
        } catch (e) {
          assert.equal(e.getCode(), -1);
        }
        
        // attempt to open non-existent
        try {
          await that.openWallet({path: "btc_integrity", password: TestUtils.WALLET_PASSWORD});
          throw new Error("Cannot open wallet which is already open");
        } catch (e) {
          assert(e instanceof MoneroError);
          assert.equal( e.getCode(), -1);  // -1 indicates wallet does not exist (or is open by another app)
        }
        
        // close wallets
        for (let wallet of wallets) await that.closeWallet(wallet);
      });
      
      if (testConfig.testNonRelays)
      it("Can indicate if multisig import is needed for correct balance information", async function() {
        assert.equal(await that.wallet.isMultisigImportNeeded(), false);
      });

      if (testConfig.testNonRelays)
      it("Can tag accounts and query accounts by tag", async function() {
        
        // get accounts
        let accounts = await that.wallet.getAccounts();
        assert(accounts.length >= 3, "Not enough accounts to test; run create account test");
        
        // tag some of the accounts
        let tag = new MoneroAccountTag("my_tag_" + GenUtils.getUUID(), "my tag label", [0, 1]);
        await that.wallet.tagAccounts(tag.getTag(), tag.getAccountIndices());
        
        // query accounts by tag
        let taggedAccounts = await that.wallet.getAccounts(undefined, tag.getTag());
        assert.equal(taggedAccounts.length, 2);
        assert.equal(taggedAccounts[0].getIndex(), 0);
        assert.equal(taggedAccounts[0].getTag(), tag.getTag());
        assert.equal(taggedAccounts[1].getIndex(), 1);
        assert.equal(taggedAccounts[1].getTag(), tag.getTag());

        // set tag label
        await that.wallet.setAccountTagLabel(tag.getTag(), tag.getLabel());
        
        // fetch tags and ensure new tag is contained
        let tags = await that.wallet.getAccountTags();
        assert(GenUtils.arrayContains(tags, tag));
        
        // re-tag an account
        let tag2 = new MoneroAccountTag("my_tag_" + GenUtils.getUUID(), "my tag label 2", [1]);
        await that.wallet.tagAccounts(tag2.getTag(), tag2.getAccountIndices());
        let taggedAccounts2 = await that.wallet.getAccounts(undefined, tag2.getTag())
        assert.equal(taggedAccounts2.length, 1);
        assert.equal(taggedAccounts2[0].getIndex(), 1);
        assert.equal(taggedAccounts2[0].getTag(), tag2.getTag());
        
        // re-query original tag which only applies to one account now
        taggedAccounts = await that.wallet.getAccounts(undefined, tag.getTag());
        assert.equal(taggedAccounts.length, 1);
        assert.equal(taggedAccounts[0].getIndex(), 0);
        assert.equal(taggedAccounts[0].getTag(), tag.getTag());
        
        // untag and query accounts
        await that.wallet.untagAccounts([0, 1]);
        assert.equal((await that.wallet.getAccountTags()).length, 0);
        try {
          await that.wallet.getAccounts(undefined, tag.getTag());
          fail("Should have thrown exception with unregistered tag");
        } catch (e) {
          assert.equal(e.getCode(), -1);
        }
        
        // test that non-existing tag returns no accounts
        try {
          await that.wallet.getAccounts(undefined, "non_existing_tag");
          fail("Should have thrown exception with unregistered tag");
        } catch (e) {
          assert.equal(e.getCode(), -1);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can fetch accounts and subaddresses without balance info because this is another RPC call", async function() {
        let accounts = await that.wallet.getAccounts(true, undefined, true);
        assert(accounts.length > 0);
        for (let account of accounts) {
          assert(account.getSubaddresses().length > 0);
          for (let subaddress of account.getSubaddresses()) {
            assert.equal(typeof subaddress.getAddress(), "string");
            assert(subaddress.getAddress().length > 0);
            assert(subaddress.getAccountIndex() >= 0);
            assert(subaddress.getIndex() >= 0);
            assert(subaddress.getLabel() === undefined || typeof subaddress.getLabel() === "string");
            if (typeof subaddress.getLabel() === "string") assert(subaddress.getLabel().length > 0);
            assert.equal(typeof subaddress.isUsed(), "boolean");
            assert.equal(subaddress.getNumUnspentOutputs(), undefined);
            assert.equal(subaddress.getBalance(), undefined);
            assert.equal(subaddress.getUnlockedBalance(), undefined);
          }
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can rescan spent", async function() {
        await that.wallet.rescanSpent();
      });
      
      if (testConfig.testNonRelays)
      it("Can save the wallet file", async function() {
        await that.wallet.save();
      });
      
      if (testConfig.testNonRelays)
      it("Can close a wallet", async function() {
        
        // create a test wallet
        let path = GenUtils.getUUID();
        let wallet = await that.createWallet({path: path, password: TestUtils.WALLET_PASSWORD});
        await wallet.sync();
        assert((await wallet.getHeight()) > 1);
        
        // close the wallet
        await wallet.close();
        
        // attempt to interact with the wallet
        try {
          await wallet.getHeight();
        } catch (e) {
          assert.equal(e.getCode(), -13);
          assert.equal(e.message, "No wallet file");
        }
        try {
          await wallet.getMnemonic();
        } catch (e) {
          assert.equal(e.getCode(), -13);
          assert.equal(e.message, "No wallet file");
        }
        try {
          await wallet.sync();
        } catch (e) {
          assert.equal(e.getCode(), -13);
          assert.equal(e.message, "No wallet file");
        }
        
        // re-open the wallet
        await wallet.openWallet(path, TestUtils.WALLET_PASSWORD);
        await wallet.sync();
        assert.equal(await wallet.getHeight(), await that.daemon.getHeight());
        
        // close the wallet
        await that.closeWallet(wallet, true);
      });
      
      if (false && testConfig.testNonRelays)  // disabled so server not actually stopped
      it("Can stop the RPC server", async function() {
        await that.wallet.stop();
      });
    });
  }
}

module.exports = TestMoneroWalletRpc;

function testAddressBookEntry(entry) {
  assert(entry.getIndex() >= 0);
  assert(entry.getAddress());
  assert(entry.getDescription());
}