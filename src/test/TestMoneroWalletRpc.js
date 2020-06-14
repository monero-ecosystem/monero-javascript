const assert = require("assert");
const TestMoneroWalletCommon = require("./TestMoneroWalletCommon");
const monerojs = require("monero-javascript");
const MoneroWalletRpc = monerojs.MoneroWalletRpc;
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
  
  async getTestWallet() {
    return TestUtils.getWalletRpc();
  }
  
  async getTestDaemon() {
    return TestUtils.getDaemonRpc();
  }
  
  async openWallet(config) {
    
    // assign defaults
    config = new MoneroWalletConfig(config);
    if (!config) config = new MoneroWalletConfig();
    if (!config.getPassword()) config.setPassword(TestUtils.WALLET_PASSWORD);
    
    // open wallet
    await this.wallet.openWallet(config);
    
    // serverUri "" denotes offline wallet for tests
    if (config.getServerUri() === "") await this.wallet.setDaemonConnection("");
    return this.wallet;
  }
  
  async createWallet(config) {
    
    // assign defaults
    config = new MoneroWalletConfig(config);
    let random = !config.getMnemonic() && !config.getPrimaryAddress();
    if (!config.getPath()) config.setPath(GenUtils.getUUID());
    if (!config.getPassword()) config.setPassword(TestUtils.WALLET_PASSWORD);
    if (!config.getRestoreHeight() && !random) config.setRestoreHeight(0);
    
    // create wallet
    await this.wallet.createWallet(config);
    
    // serverUri "" denotes offline wallet for tests
    if (config.getServerUri() === "") await this.wallet.setDaemonConnection("");
    return this.wallet;
  }
  
  async getMnemonicLanguages() {
    return await this.wallet.getMnemonicLanguages();
  }

  runTests() {
    let that = this;
    let testConfig = this.testConfig;
    describe("TEST MONERO WALLET RPC", function() {
      
      // initialize wallet
      before(async function() {
        that.wallet = await that.getTestWallet();
        that.daemon = await that.getTestDaemon();
        TestUtils.TX_POOL_WALLET_TRACKER.reset(); // all wallets need to wait for txs to confirm to reliably sync
      });
      
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
  
  _testWalletRpc(config) {
    let that = this;
    describe("Tests specific to RPC wallet", function() {
      
      // ---------------------------- BEGIN TESTS ---------------------------------
      
      it("Can create a wallet with a randomly generated mnemonic", async function() {
        let err;
        try {
          
          // create random wallet with defaults
          let path = GenUtils.getUUID();
          await that.createWallet({path: path});
          let mnemonic = await that.wallet.getMnemonic();
          MoneroUtils.validateMnemonic(mnemonic);
          assert.notEqual(mnemonic, TestUtils.MNEMONIC);
          MoneroUtils.validateAddress(await that.wallet.getPrimaryAddress());
          await that.wallet.sync();  // very quick because restore height is chain height
          await that.wallet.close();

          // create random wallet with non defaults
          path = GenUtils.getUUID();
          await that.createWallet({path: path, language: "Spanish"});
          MoneroUtils.validateMnemonic(await that.wallet.getMnemonic());
          assert.notEqual(await that.wallet.getMnemonic(), mnemonic);
          MoneroUtils.validateAddress(await that.wallet.getPrimaryAddress());
          await that.wallet.close();
          
          // attempt to create wallet which already exists
          try {
            await that.createWallet({path: path, language: "Spanish"});
          } catch (e) {
            assert.equal(e.message, "Wallet already exists: " + path);
          }
        } catch (e) {
          err = e;
        }
          
        // open main test wallet for other tests
        await that.wallet.openWallet(TestUtils.WALLET_NAME, TestUtils.WALLET_PASSWORD);
        
        // throw error if there was one
        if (err) throw err;
      });
      
      it("Can create a wallet from a mnemonic phrase", async function() {
        let err;
        try {
          
          // create wallet with mnemonic and defaults
          let path = GenUtils.getUUID();
          await that.createWallet({path: path, password: TestUtils.WALLET_PASSWORD, mnemonic: TestUtils.MNEMONIC, restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT});
          assert.equal(await that.wallet.getMnemonic(), TestUtils.MNEMONIC);
          assert.equal(await that.wallet.getPrimaryAddress(), TestUtils.ADDRESS);
          await that.wallet.sync();
          assert.equal(await that.wallet.getHeight(), await that.daemon.getHeight());
          let txs = await that.wallet.getTxs();
          assert(txs.length > 0); // wallet is used
          assert.equal(txs[0].getHeight(), TestUtils.FIRST_RECEIVE_HEIGHT);
          await that.wallet.close();
          
          // create wallet with non-defaults
          path = GenUtils.getUUID();
          await that.createWallet({path: path, password: TestUtils.WALLET_PASSWORD, mnemonic: TestUtils.MNEMONIC, restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT, language: "German", seedOffset: "my offset!", saveCurrent: false});
          MoneroUtils.validateMnemonic(await that.wallet.getMnemonic());
          assert.notEqual(await that.wallet.getMnemonic(), TestUtils.MNEMONIC);  // mnemonic is different because of offset
          assert.notEqual(await that.wallet.getPrimaryAddress(), TestUtils.ADDRESS);
          await that.wallet.close();
          
        } catch (e) {
          err = e;
        }
        
        // open main test wallet for other tests
        await that.wallet.openWallet(TestUtils.WALLET_NAME, TestUtils.WALLET_PASSWORD);
        
        // throw error if there was one
        if (err) throw err;
      });
      
      it("Can open wallets", async function() {
        let err;
        try {
          
          // create names of test wallets
          let numTestWallets = 3;
          let names = [];
          for (let i = 0; i < numTestWallets; i++) names.add(GenUtils.getUUID());
          
          // create test wallets
          let mnemonics = [];
          for (let name of names) {
            await that.createWallet({path: name, password: TestUtils.WALLET_PASSWORD});
            mnemonics.add(await that.wallet.getMnemonic());
            await that.wallet.close();
          }
          
          // open test wallets
          for (let i = 0; i < numTestWallets; i++) {
            await that.wallet.openWallet(names[i], TestUtils.WALLET_PASSWORD);
            assert.equal(await that.wallet.getMnemonic(), mnemonics[i]);
            await that.wallet.close();
          }
          
          // attempt to re-open already opened wallet
          try {
            await that.wallet.openWallet(names[numTestWallets - 1], TestUtils.WALLET_PASSWORD);
          } catch (e) {
            assert.equal(e.getCode(), -1);
          }
          
          // attempt to open non-existent
          try {
            await that.wallet.openWallet("btc_integrity", TestUtils.WALLET_PASSWORD);
          } catch (e) {
            assert.equal( e.getCode(), -1);  // -1 indicates wallet does not exist (or is open by another app)
          }
        } catch (e) {
          let err = e;
        }
        
        // open main test wallet for other tests
        try {
          await that.wallet.openWallet(TestUtils.WALLET_NAME, TestUtils.WALLET_PASSWORD);
        } catch (e) {
          assert.equal(e.getCode(), -1); // ok if wallet is already open
        }
        
        // throw error if there was one
        if (err) throw err;
      });
      
      it("Can indicate if multisig import is needed for correct balance information", async function() {
        assert.equal(await that.wallet.isMultisigImportNeeded(), false);
      });

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
      
      it("Can rescan spent", async function() {
        await that.wallet.rescanSpent();
      });
      
      it("Can save the wallet file", async function() {
        await that.wallet.save();
      });
      
      it("Can close a wallet", async function() {
        
        // create a test wallet
        let path = GenUtils.getUUID();
        await that.createWallet({path: path, password: TestUtils.WALLET_PASSWORD});
        await that.wallet.sync();
        assert((await that.wallet.getHeight()) > 1);
        
        // close the wallet
        await that.wallet.close();
        
        // attempt to interact with the wallet
        try {
          await that.wallet.getHeight();
        } catch (e) {
          assert.equal(e.getCode(), -13);
          assert.equal(e.message, "No wallet file");
        }
        try {
          await that.wallet.getMnemonic();
        } catch (e) {
          assert.equal(e.getCode(), -13);
          assert.equal(e.message, "No wallet file");
        }
        try {
          await that.wallet.sync();
        } catch (e) {
          assert.equal(e.getCode(), -13);
          assert.equal(e.message, "No wallet file");
        }
        
        // re-open the wallet
        await that.wallet.openWallet(path, TestUtils.WALLET_PASSWORD);
        await that.wallet.sync();
        assert.equal(await that.wallet.getHeight(), await that.daemon.getHeight());
        
        // close the wallet
        await that.wallet.close();
        
        // re-open main test wallet for other tests
        await that.wallet.openWallet(TestUtils.WALLET_NAME, TestUtils.WALLET_PASSWORD);
      });
      
      if (false)  // disabled so server not actually stopped
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