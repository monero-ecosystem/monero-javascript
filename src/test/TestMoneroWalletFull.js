const assert = require("assert");
const TestUtils = require("./utils/TestUtils");
const TestMoneroWalletCommon = require("./TestMoneroWalletCommon");
const StartMining = require("./utils/StartMining");
const WalletSyncPrinter = require("./utils/WalletSyncPrinter");
const WalletEqualityUtils = require("./utils/WalletEqualityUtils");
const monerojs = require("../../index");
const MoneroWalletListener = monerojs.MoneroWalletListener;
const LibraryUtils = monerojs.LibraryUtils;
const MoneroWalletConfig = monerojs.MoneroWalletConfig;
const GenUtils = monerojs.GenUtils;
const MoneroUtils = monerojs.MoneroUtils;
const BigInteger = monerojs.BigInteger;
const MoneroNetworkType = monerojs.MoneroNetworkType;
const MoneroTxWallet = monerojs.MoneroTxWallet;
const MoneroTxConfig = monerojs.MoneroTxConfig;
const MoneroRpcConnection = monerojs.MoneroRpcConnection;
const MoneroDestination = monerojs.MoneroDestination;
const MoneroOutputQuery = monerojs.MoneroOutputQuery;
const MoneroOutputWallet = monerojs.MoneroOutputWallet;
const MoneroWalletFull = monerojs.MoneroWalletFull;

/**
 * Tests a Monero wallet using WebAssembly to bridge to monero-project's wallet2.
 */
class TestMoneroWalletFull extends TestMoneroWalletCommon {
  
  constructor(testConfig) {
    super(testConfig);
  }
  
  async beforeAll(currentTest) {
    await super.beforeAll(currentTest);
  }
  
  async beforeEach(currentTest) {
    await super.beforeEach(currentTest);
  }
  
  async afterAll() {
    await super.afterAll();
    TestMoneroWalletFull.FULL_TESTS_RUN = true;
  }
  
  async afterEach(currentTest) {
    await super.afterEach(currentTest);
    
    // print memory usage
    console.log("WASM memory usage: " + await LibraryUtils.getWasmMemoryUsed());
    //console.log(process.memoryUsage());
    
    // remove non-whitelisted wallets
    let whitelist = [TestUtils.WALLET_NAME, "ground_truth"];
    let items = TestUtils.getDefaultFs().readdirSync(TestUtils.TEST_WALLETS_DIR);
    for (let item of items) {
      let found = false;
      for (let whitelisted of whitelist) {
        if (item === whitelisted || item === whitelisted + ".keys" || item === whitelisted + ".address.txt") {
          found = true;
          break;
        }
      }
      if (!found) TestUtils.getDefaultFs().unlinkSync(TestUtils.TEST_WALLETS_DIR + "/" + item);
    }
  }
  
  async getTestWallet() {
    return await TestUtils.getWalletFull();
  }
  
  async getTestDaemon() {
    return await TestUtils.getDaemonRpc();
  }
  
  async openWallet(config, startSyncing) {
    
    // assign defaults
    config = new MoneroWalletConfig(config);
    if (config.getPassword() === undefined) config.setPassword(TestUtils.WALLET_PASSWORD);
    if (config.getNetworkType() === undefined) config.setNetworkType(TestUtils.NETWORK_TYPE);
    if (config.getProxyToWorker() === undefined) config.setProxyToWorker(TestUtils.PROXY_TO_WORKER);
    if (config.getServer() === undefined && config.getServerUri() === undefined) config.setServer(TestUtils.getDaemonRpcConnection());
    if (config.getFs() === undefined) config.setFs(TestUtils.getDefaultFs());
    
    // open wallet
    let wallet = await monerojs.openWalletFull(config);
    if (startSyncing !== false && await wallet.isConnected()) await wallet.startSyncing(TestUtils.SYNC_PERIOD_IN_MS);
    return wallet;
  }
  
  async createWallet(config, startSyncing) {
    
    // assign defaults
    config = new MoneroWalletConfig(config);
    let random = config.getMnemonic() === undefined && config.getPrimaryAddress() === undefined;
    if (config.getPath() === undefined) config.setPath(TestUtils.TEST_WALLETS_DIR + "/" + GenUtils.getUUID());
    if (config.getPassword() === undefined) config.setPassword(TestUtils.WALLET_PASSWORD);
    if (config.getNetworkType() === undefined) config.setNetworkType(TestUtils.NETWORK_TYPE);
    if (!config.getRestoreHeight() && !random) config.setRestoreHeight(0);
    if (!config.getServer() && config.getServerUri() === undefined) config.setServer(TestUtils.getDaemonRpcConnection());
    if (config.getProxyToWorker() === undefined) config.setProxyToWorker(TestUtils.PROXY_TO_WORKER);
    if (config.getFs() === undefined) config.setFs(TestUtils.getDefaultFs());
    
    // create wallet
    let wallet = await monerojs.createWalletFull(config);
    if (!random) assert.equal(await wallet.getSyncHeight(), config.getRestoreHeight() === undefined ? 0 : config.getRestoreHeight());
    if (startSyncing !== false && await wallet.isConnected()) await wallet.startSyncing(TestUtils.SYNC_PERIOD_IN_MS);
    return wallet;
  }
  
  async getWalletGt() {
    let path = TestUtils.TEST_WALLETS_DIR + "/ground_truth";
    let wallet = await MoneroWalletFull.walletExists(path, TestUtils.getDefaultFs()) ? await this.openWallet({path: path}) : await this.createWallet({path: path, mnemonic: TestUtils.MNEMONIC, restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT, proxyToWorker: TestUtils.PROXY_TO_WORKER});
    await wallet.sync();
    return wallet;
  }
  
  async closeWallet(wallet, save) {
    await wallet.close(save);
  }
  
  async getMnemonicLanguages() {
    return await MoneroWalletFull.getMnemonicLanguages();
  }
  
  // ------------------------------- BEGIN TESTS ------------------------------
  
  runTests() {
    let that = this;
    let testConfig = this.testConfig;
    describe("TEST MONERO WALLET FULL", function() {
        
      // register handlers to run before and after tests
      before(async function() { await that.beforeAll(); });
      beforeEach(async function() { await that.beforeEach(this.currentTest); });
      after(async function() { await that.afterAll(); });
      afterEach(async function() { await that.afterEach(this.currentTest); });
      
      // run tests specific to full wallet
      that._testWalletFull();
      
      // run common tests
      that.runCommonTests();
    });
  }
  
  _testWalletFull() {
    let that = this;
    let testConfig = this.testConfig;
    describe("Tests specific to WebAssembly wallet", function() {
      
      if (false && testConfig.testNonRelays)
      it("Does not leak memory", async function() {
        let restoreHeight = TestUtils.FIRST_RECEIVE_HEIGHT;
        //let wallet = await that.createWallet({mnemonic: TestUtils.MNEMONIC, restoreHeight: restoreHeight}, false);
        for (let i = 0; i < 100; i++) {
          console.log(process.memoryUsage());
          await _testSyncMnemonic(TestUtils.FIRST_RECEIVE_HEIGHT, undefined, false, true);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get the daemon's height", async function() {
        assert(await that.wallet.isConnected());
        let daemonHeight = await that.wallet.getDaemonHeight();
        assert(daemonHeight > 0);
      });
      
      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can open, sync, and close wallets repeatedly", async function() {
        let wallets = [];
        for (let i = 0; i < 4; i++) {
          let wallet = await that.createWallet({mnemonic: TestUtils.MNEMONIC, restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT});
          await wallet.startSyncing();
          wallets.push(wallet);
        }
        for (let wallet of wallets) await wallet.close();
      });
      
      if (testConfig.testNonRelays)
      it("Can get the daemon's max peer height", async function() {
        let height = await that.wallet.getDaemonMaxPeerHeight();
        assert(height > 0);
      });
      
      if (testConfig.testNonRelays)
      it("Can set the daemon connection", async function() {
        let err;
        let wallet;
        try {
          
          // create unconnected random wallet
          wallet = await that.createWallet({serverUri: ""});
          assert.equal(await wallet.getDaemonConnection(), undefined);
          
          // set daemon uri
          await wallet.setDaemonConnection(TestUtils.DAEMON_RPC_CONFIG.uri);
          assert.deepEqual((await wallet.getDaemonConnection()).getConfig(), new MoneroRpcConnection(TestUtils.DAEMON_RPC_CONFIG.uri).getConfig());
          await wallet.setDaemonConnection(TestUtils.DAEMON_RPC_CONFIG.uri, TestUtils.DAEMON_RPC_CONFIG.username, TestUtils.DAEMON_RPC_CONFIG.password, TestUtils.DAEMON_RPC_CONFIG.rejectUnauthorized);
          assert(await wallet.isConnected());
          
          // nullify daemon connection
          await wallet.setDaemonConnection(undefined);
          assert.equal(await wallet.getDaemonConnection(), undefined);
          await wallet.setDaemonConnection(TestUtils.DAEMON_RPC_CONFIG.uri);
          assert.deepEqual((await wallet.getDaemonConnection()).getConfig(), new MoneroRpcConnection(TestUtils.DAEMON_RPC_CONFIG.uri).getConfig());
          await wallet.setDaemonConnection(undefined);
          assert.equal(await wallet.getDaemonConnection(), undefined);
          
          // set daemon uri to non-daemon
          await wallet.setDaemonConnection("www.getmonero.org");
          assert.deepEqual((await wallet.getDaemonConnection()).getConfig(), new MoneroRpcConnection("www.getmonero.org").getConfig());
          assert(!await wallet.isConnected());
          
          // set daemon to invalid uri
          await wallet.setDaemonConnection("abc123");
          assert(!await wallet.isConnected());
          
          // attempt to sync
          try {
            await wallet.sync();
            throw new Error("Exception expected");
          } catch (e1) {
            assert.equal(e1.message, "Wallet is not connected to daemon");
          }
        } catch (e) {
          err = e;
        }
        
        // close wallet and throw if error occurred
        if (err) console.log(err);
        await wallet.close();
        if (err) throw err;
      });
      
      if (testConfig.testNonRelays)
      it("Can create a random full wallet", async function() {
        
        // create unconnected random wallet
        let wallet = await that.createWallet({networkType: MoneroNetworkType.MAINNET, serverUri: ""});
        MoneroUtils.validateMnemonic(await wallet.getMnemonic());
        MoneroUtils.validateAddress(await wallet.getPrimaryAddress(), MoneroNetworkType.MAINNET);
        assert.equal(await wallet.getNetworkType(), MoneroNetworkType.MAINNET);
        assert.equal(await wallet.getDaemonConnection(), undefined);
        assert(!(await wallet.isConnected()));
        assert.equal(await wallet.getMnemonicLanguage(), "English");
        assert(!(await wallet.isSynced()));
        assert.equal(await wallet.getHeight(), 1); // TODO monero-project: why does height of new unsynced wallet start at 1?
        assert(await wallet.getSyncHeight() >= 0);
        
        // cannot get daemon chain height
        try {
          await wallet.getDaemonHeight();
        } catch (e) {
          assert.equal(e.message, "Wallet is not connected to daemon");
        }
        
        // set daemon connection and check chain height
        await wallet.setDaemonConnection(await that.daemon.getRpcConnection());
        assert.equal(await wallet.getDaemonHeight(), await that.daemon.getHeight());
        
        // close wallet which releases resources
        await wallet.close();

        // create random wallet with non defaults
        wallet = await that.createWallet({networkType: MoneroNetworkType.TESTNET, language: "Spanish"});
        MoneroUtils.validateMnemonic(await wallet.getMnemonic());
        MoneroUtils.validateAddress(await wallet.getPrimaryAddress(), MoneroNetworkType.TESTNET);
        assert.equal(await wallet.getNetworkType(), await MoneroNetworkType.TESTNET);
        assert(await wallet.getDaemonConnection());
        assert((await that.daemon.getRpcConnection()).getConfig() !== (await wallet.getDaemonConnection()).getConfig());         // not same reference
        assert.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri());
        assert.equal((await wallet.getDaemonConnection()).getUsername(), (await that.daemon.getRpcConnection()).getUsername());
        assert.equal((await wallet.getDaemonConnection()).getPassword(), (await that.daemon.getRpcConnection()).getPassword());
        assert(await wallet.isConnected());
        assert.equal(await wallet.getMnemonicLanguage(), "Spanish");
        assert(!(await wallet.isSynced()));
        assert.equal(await wallet.getHeight(), 1); // TODO monero-project: why is height of unsynced wallet 1?
        if (await that.daemon.isConnected()) assert.equal(await wallet.getSyncHeight(), await that.daemon.getHeight());
        else assert(await wallet.getSyncHeight() >= 0);
        await wallet.close();
      });
      
      if (testConfig.testNonRelays)
      it("Can create a full wallet from mnemonic", async function() {
        
        // create unconnected wallet with mnemonic
        let wallet = await that.createWallet({mnemonic: TestUtils.MNEMONIC, serverUri: ""});
        assert.equal(await wallet.getMnemonic(), TestUtils.MNEMONIC);
        assert.equal(await wallet.getPrimaryAddress(), TestUtils.ADDRESS);
        assert.equal(await wallet.getNetworkType(), TestUtils.NETWORK_TYPE);
        assert.equal(await wallet.getDaemonConnection(), undefined);
        assert(!(await wallet.isConnected()));
        assert.equal(await wallet.getMnemonicLanguage(), "English");
        assert(!(await wallet.isSynced()));
        assert.equal(await wallet.getHeight(), 1);
        assert.equal(await wallet.getSyncHeight(), 0);
        try { await wallet.startSyncing(); } catch (e) { assert.equal(e.message, "Wallet is not connected to daemon"); }
        await wallet.close();
        
        // create wallet without restore height
        wallet = await that.createWallet({mnemonic: TestUtils.MNEMONIC}, false);
        assert.equal(await wallet.getMnemonic(), TestUtils.MNEMONIC);
        assert.equal(await wallet.getPrimaryAddress(), TestUtils.ADDRESS);
        assert.equal(TestUtils.NETWORK_TYPE, await wallet.getNetworkType());
        assert(await wallet.getDaemonConnection());
        assert(await that.daemon.getRpcConnection() != await wallet.getDaemonConnection());
        assert.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri());
        assert.equal((await wallet.getDaemonConnection()).getUsername(), (await that.daemon.getRpcConnection()).getUsername());
        assert.equal((await wallet.getDaemonConnection()).getPassword(), (await that.daemon.getRpcConnection()).getPassword());
        assert(await wallet.isConnected());
        assert.equal(await wallet.getMnemonicLanguage(), "English");
        assert(!(await wallet.isSynced()));
        assert.equal(await wallet.getHeight(), 1); // TODO monero-project: why does height of new unsynced wallet start at 1?
        assert.equal(await wallet.getSyncHeight(), 0);
        await wallet.close();
        
        // create wallet with mnemonic, no connection, and restore height
        let restoreHeight = 10000;
        wallet = await that.createWallet({mnemonic: TestUtils.MNEMONIC, restoreHeight: restoreHeight, serverUri: ""});
        assert.equal(await wallet.getMnemonic(), TestUtils.MNEMONIC);
        assert.equal(await wallet.getPrimaryAddress(), TestUtils.ADDRESS);
        assert.equal(await wallet.getNetworkType(), TestUtils.NETWORK_TYPE);
        assert.equal(await wallet.getDaemonConnection(), undefined);
        assert(!(await wallet.isConnected()));
        assert.equal(await wallet.getMnemonicLanguage(), "English");
        assert.equal(await wallet.getHeight(), 1); // TODO monero-project: why does height of new unsynced wallet start at 1?
        assert.equal(await wallet.getSyncHeight(), restoreHeight);
        let path = await await wallet.getPath();
        await wallet.close(true);
        wallet = await that.openWallet({path: path, serverUri: ""});
        assert(!(await wallet.isConnected()));
        assert(!(await wallet.isSynced()));
        assert.equal(await wallet.getHeight(), 1);
        assert.equal(await wallet.getSyncHeight(), restoreHeight);
        await wallet.close();

        // create wallet with mnemonic, connection, and restore height
        wallet = await that.createWallet({mnemonic: TestUtils.MNEMONIC, restoreHeight: restoreHeight}, false);
        assert.equal(await wallet.getMnemonic(), TestUtils.MNEMONIC);
        assert(await wallet.getPrimaryAddress(), TestUtils.ADDRESS);
        assert(await wallet.getNetworkType(), TestUtils.NETWORK_TYPE);
        assert(await wallet.getDaemonConnection());
        assert(await that.daemon.getRpcConnection() != wallet.getDaemonConnection());
        assert.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri());
        assert.equal((await wallet.getDaemonConnection()).getUsername(), (await that.daemon.getRpcConnection()).getUsername());
        assert.equal((await wallet.getDaemonConnection()).getPassword(), (await that.daemon.getRpcConnection()).getPassword());
        assert(await wallet.isConnected());
        assert.equal(await wallet.getMnemonicLanguage(), "English");
        assert(!(await wallet.isSynced()));
        assert.equal(await wallet.getHeight(), 1); // TODO monero-project: why does height of new unsynced wallet start at 1?
        assert.equal(await wallet.getSyncHeight(), restoreHeight);
        await wallet.close();
      });
      
      if (testConfig.testNonRelays)
      it("Can create a full wallet from keys", async function() {
        
        // recreate test wallet from keys
        let wallet = that.wallet;
        let walletKeys = await that.createWallet({serverUri: "", networkType: await wallet.getNetworkType(), primaryAddress: await wallet.getPrimaryAddress(), privateViewKey: await wallet.getPrivateViewKey(), privateSpendKey: await wallet.getPrivateSpendKey(), restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT});
        let err;
        try {
          assert.equal(await walletKeys.getMnemonic(), await wallet.getMnemonic());
          assert.equal(await walletKeys.getPrimaryAddress(), await wallet.getPrimaryAddress());
          assert.equal(await walletKeys.getPrivateViewKey(), await wallet.getPrivateViewKey());
          assert.equal(await walletKeys.getPublicViewKey(), await wallet.getPublicViewKey());
          assert.equal(await walletKeys.getPrivateSpendKey(), await wallet.getPrivateSpendKey());
          assert.equal(await walletKeys.getPublicSpendKey(), await wallet.getPublicSpendKey());
          assert.equal(await walletKeys.getSyncHeight(), TestUtils.FIRST_RECEIVE_HEIGHT);
          assert(!await walletKeys.isConnected());
          assert(!(await walletKeys.isSynced()));
        } catch (e) {
          err = e;
        }
        await walletKeys.close();
        if (err) throw err;
      });
      
      if (testConfig.testNonRelays && !GenUtils.isBrowser())
      it("Is compatible with monero-wallet-rpc wallet files", async function() {
        
        // create wallet using monero-wallet-rpc
        let walletName = GenUtils.getUUID();
        let walletRpc = await TestUtils.getWalletRpc();
        await walletRpc.createWallet(new MoneroWalletConfig().setPath(walletName).setPassword(TestUtils.WALLET_PASSWORD).setMnemonic(TestUtils.MNEMONIC).setRestoreHeight(TestUtils.FIRST_RECEIVE_HEIGHT));
        await walletRpc.sync();
        let balance = await walletRpc.getBalance();
        let outputsHex = await walletRpc.exportOutputs();
        assert(outputsHex.length > 0);
        await walletRpc.close(true);
        
        // open as full wallet
        let walletFull = await monerojs.openWalletFull(new MoneroWalletConfig().setPath(TestUtils.WALLET_RPC_LOCAL_WALLET_DIR + "/" + walletName).setPassword(TestUtils.WALLET_PASSWORD).setNetworkType(TestUtils.NETWORK_TYPE).setServer(TestUtils.DAEMON_RPC_CONFIG));
        await walletFull.sync();
        assert.equal(TestUtils.MNEMONIC, await walletFull.getMnemonic());
        assert.equal(TestUtils.ADDRESS, await walletFull.getPrimaryAddress());
        assert.equal(balance.toString(), (await walletFull.getBalance()).toString());
        assert.equal(outputsHex.length, (await walletFull.exportOutputs()).length);
        await walletFull.close(true);
        
        // create full wallet
        walletName = GenUtils.getUUID();
        walletFull = await monerojs.createWalletFull(new MoneroWalletConfig().setPath(TestUtils.WALLET_RPC_LOCAL_WALLET_DIR + "/" + walletName).setPassword(TestUtils.WALLET_PASSWORD).setNetworkType(TestUtils.NETWORK_TYPE).setMnemonic(TestUtils.MNEMONIC).setRestoreHeight(TestUtils.FIRST_RECEIVE_HEIGHT).setServer(TestUtils.DAEMON_RPC_CONFIG));
        await walletFull.sync();
        balance = await walletFull.getBalance();
        outputsHex = await walletFull.exportOutputs();
        await walletFull.close(true);
        
        // open wallet using monero-wallet-rpc
        await walletRpc.openWallet(new MoneroWalletConfig().setPath(walletName).setPassword(TestUtils.WALLET_PASSWORD));
        await walletRpc.sync();
        assert.equal(TestUtils.MNEMONIC, await walletRpc.getMnemonic());
        assert.equal(TestUtils.ADDRESS, await walletRpc.getPrimaryAddress());
        assert.equal(balance.toString(), (await walletRpc.getBalance()).toString());
        assert.equal(outputsHex.length, (await walletRpc.exportOutputs()).length);
        await walletRpc.close(true);
      });
      
      it("Is compatible with monero-wallet-rpc outputs and offline transaction signing", async function() {
        
        // create view-only wallet in wallet rpc process
        let viewOnlyWallet = await TestUtils.startWalletRpcProcess();
        await viewOnlyWallet.createWallet({path: GenUtils.getUUID(), password: TestUtils.WALLET_PASSWORD, primaryAddress: await that.wallet.getPrimaryAddress(), privateViewKey: await that.wallet.getPrivateViewKey(), restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT});
        
        // create offline full wallet
        let offlineWallet = await that.createWallet({primaryAddress: await that.wallet.getPrimaryAddress(), privateViewKey: await that.wallet.getPrivateViewKey(), privateSpendKey: await that.wallet.getPrivateSpendKey(), serverUri: "", restoreHeight: 0});
        
        // test tx signing with wallets
        let err;
        try { await that._testViewOnlyAndOfflineWallets(viewOnlyWallet, offlineWallet); }
        catch (e) { err = e; }
        
        // finally
        TestUtils.stopWalletRpcProcess(viewOnlyWallet);
        await that.closeWallet(offlineWallet);
        if (err) throw err;
      });
      
      // TODO monero-project: cannot re-sync from lower block height after wallet saved
      if (testConfig.testNonRelays && !testConfig.liteMode && false)
      it("Can re-sync an existing wallet from scratch", async function() {
        let wallet = await that.openWallet({path: TestUtils.WALLET_FULL_PATH, password: TestUtils.WALLET_PASSWORD, networkType: MoneroNetworkType.STAGENET});  // wallet must already exist
        await wallet.setDaemonConnection(TestUtils.getDaemonRpcConnection());
        //long startHeight = TestUtils.TEST_RESTORE_HEIGHT;
        let startHeight = 0;
        let progressTester = new SyncProgressTester(wallet, startHeight, await wallet.getDaemonHeight());
        await wallet.setSyncHeight(1);
        let result = await wallet.sync(progressTester, 1);
        await progressTester.onDone(await wallet.getDaemonHeight());
        
        // test result after syncing
        assert(await wallet.isConnected());
        assert(await wallet.isSynced());
        assert.equal(result.getNumBlocksFetched(), await wallet.getDaemonHeight() - startHeight);
        assert(result.getReceivedMoney());
        assert.equal(await wallet.getHeight(), await that.daemon.getHeight());
        await wallet.close();
      });
      
      if (testConfig.testNonRelays)
      it("Can sync a wallet with a randomly generated seed", async function() {
        assert(await that.daemon.isConnected(), "Not connected to daemon");

        // create test wallet
        let restoreHeight = await that.daemon.getHeight();
        let wallet = await that.createWallet({}, false);

        // test wallet's height before syncing
        let walletGt;
        let err;
        try {
          assert.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri());
          assert.equal((await wallet.getDaemonConnection()).getUsername(), (await that.daemon.getRpcConnection()).getUsername());
          assert.equal((await wallet.getDaemonConnection()).getPassword(), (await that.daemon.getRpcConnection()).getPassword());
          assert.equal(await wallet.getDaemonHeight(), restoreHeight);
          assert(await wallet.isConnected());
          assert(!(await wallet.isSynced()));
          assert.equal(await wallet.getHeight(), 1);
          assert.equal(await wallet.getSyncHeight(), restoreHeight);
  
          // sync the wallet
          let progressTester = new SyncProgressTester(wallet, await wallet.getSyncHeight(), await wallet.getDaemonHeight());
          let result = await wallet.sync(progressTester, undefined);
          await progressTester.onDone(await wallet.getDaemonHeight());
        
          // test result after syncing
          walletGt = await that.createWallet({mnemonic: await wallet.getMnemonic(), restoreHeight: restoreHeight});
          await walletGt.sync();
          assert(await wallet.isConnected());
          assert(await wallet.isSynced());
          assert.equal(result.getNumBlocksFetched(), 0);
          assert(!result.getReceivedMoney());
          if (await wallet.getHeight() !== await that.daemon.getHeight()) console.log("WARNING: wallet height " + await wallet.getHeight() + " is not synced with daemon height " + await that.daemon.getHeight());  // TODO: height may not be same after long sync

          // sync the wallet with default params
          await wallet.sync();
          assert(await wallet.isSynced());
          assert.equal(await wallet.getHeight(), await that.daemon.getHeight());
          
          // compare wallet to ground truth
          await TestMoneroWalletFull._testWalletEqualityOnChain(walletGt, wallet);
        } catch (e) {
          err = e;
        }
        
        // finally 
        if (walletGt) await walletGt.close();
        await wallet.close();
        if (err) throw err;
        
        // attempt to sync unconnected wallet
        wallet = await that.createWallet({serverUri: ""});
        err = undefined;
        try {
          await wallet.sync();
          throw new Error("Should have thrown exception");
        } catch (e1) {
          try {
            assert.equal(e1.message, "Wallet is not connected to daemon");
          } catch (e2) {
            err = e2;
          }
        }
        
        // finally
        await wallet.close();
        if (err) throw err;
      });
      
      if (false && testConfig.testNonRelays && !testConfig.liteMode) // TODO: re-enable before release
      it("Can sync a wallet created from mnemonic from the genesis", async function() {
        await _testSyncMnemonic(undefined, undefined, true, false);
      });
      
      if (testConfig.testNonRelays)
      it("Can sync a wallet created from mnemonic from a restore height", async function() {
        await _testSyncMnemonic(undefined, TestUtils.FIRST_RECEIVE_HEIGHT);
      });
      
      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can sync a wallet created from mnemonic from a start height.", async function() {
        await _testSyncMnemonic(TestUtils.FIRST_RECEIVE_HEIGHT, undefined, false, true);
      });
      
      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can sync a wallet created from mnemonic from a start height less than the restore height", async function() {
        await _testSyncMnemonic(TestUtils.FIRST_RECEIVE_HEIGHT, TestUtils.FIRST_RECEIVE_HEIGHT + 3);
      });
      
      if (testConfig.testNonRelays && !testConfig.liteMode)
      it("Can sync a wallet created from mnemonic from a start height greater than the restore height", async function() {
        await _testSyncMnemonic(TestUtils.FIRST_RECEIVE_HEIGHT + 3, TestUtils.FIRST_RECEIVE_HEIGHT);
      });
      
      async function _testSyncMnemonic(startHeight, restoreHeight, skipGtComparison, testPostSyncNotifications) {
        assert(await that.daemon.isConnected(), "Not connected to daemon");
        if (startHeight !== undefined && restoreHeight != undefined) assert(startHeight <= TestUtils.FIRST_RECEIVE_HEIGHT || restoreHeight <= TestUtils.FIRST_RECEIVE_HEIGHT);
        
        // create wallet from mnemonic
        let wallet = await that.createWallet({mnemonic: TestUtils.MNEMONIC, restoreHeight: restoreHeight}, false);
        
        // sanitize expected sync bounds
        if (restoreHeight === undefined) restoreHeight = 0;
        let startHeightExpected = startHeight === undefined ? restoreHeight : startHeight;
        if (startHeightExpected === 0) startHeightExpected = 1;
        let endHeightExpected = await wallet.getDaemonMaxPeerHeight();
        
        // test wallet and close as final step
        let walletGt = undefined;
        let err = undefined;  // to permit final cleanup like Java's try...catch...finally
        try {
          
          // test wallet's height before syncing
          assert(await wallet.isConnected());
          assert(!(await wallet.isSynced()));
          assert.equal(await wallet.getHeight(), 1);
          assert.equal(await wallet.getSyncHeight(), restoreHeight);
          
          // register a wallet listener which tests notifications throughout the sync
          let walletSyncTester = new WalletSyncTester(wallet, startHeightExpected, endHeightExpected);
          await wallet.addListener(walletSyncTester);
          
          // sync the wallet with a listener which tests sync notifications
          let progressTester = new SyncProgressTester(wallet, startHeightExpected, endHeightExpected);
          let result = await wallet.sync(progressTester, startHeight);
          
          // test completion of the wallet and sync listeners
          await progressTester.onDone(await wallet.getDaemonHeight());
          await walletSyncTester.onDone(await wallet.getDaemonHeight());
          
          // test result after syncing
          assert(await wallet.isSynced());
          assert.equal(result.getNumBlocksFetched(), await wallet.getDaemonHeight() - startHeightExpected);
          assert(result.getReceivedMoney());
          if (await wallet.getHeight() !== await that.daemon.getHeight()) console.log("WARNING: wallet height " + await wallet.getHeight() + " is not synced with daemon height " + await that.daemon.getHeight());  // TODO: height may not be same after long sync
          assert.equal(await wallet.getDaemonHeight(), await that.daemon.getHeight(), "Daemon heights are not equal: " + await wallet.getDaemonHeight() + " vs " + await that.daemon.getHeight());
          if (startHeightExpected > TestUtils.FIRST_RECEIVE_HEIGHT) assert((await wallet.getTxs())[0].getHeight() > TestUtils.FIRST_RECEIVE_HEIGHT);  // wallet is partially synced so first tx happens after true restore height
          else assert.equal((await wallet.getTxs())[0].getHeight(), TestUtils.FIRST_RECEIVE_HEIGHT);  // wallet should be fully synced so first tx happens on true restore height
          
          // sync the wallet with default params
          result = await wallet.sync();
          assert(await wallet.isSynced());
          if (await wallet.getHeight() !== await that.daemon.getHeight()) console.log("WARNING: wallet height " + await wallet.getHeight() + " is not synced with daemon height " + await that.daemon.getHeight() + " after re-syncing");
          assert.equal(result.getNumBlocksFetched(), 0);
          assert(!result.getReceivedMoney());
          
          // compare with ground truth
          if (!skipGtComparison) {
            walletGt = await that.createWallet({mnemonic: TestUtils.MNEMONIC, restoreHeight: startHeightExpected});
            await walletGt.sync();
            await TestMoneroWalletFull._testWalletEqualityOnChain(walletGt, wallet);
          }
          
          // if testing post-sync notifications, wait for a block to be added to the chain
          // then test that sync arg listener was not invoked and registered wallet listener was invoked
          if (testPostSyncNotifications) {
            
            // start automatic syncing
            await wallet.startSyncing(TestUtils.SYNC_PERIOD_IN_MS);
            
            // attempt to start mining to push the network along  // TODO: TestUtils.tryStartMining() : reqId, TestUtils.tryStopMining(reqId)
            let startedMining = false;
            let miningStatus = await that.daemon.getMiningStatus();
            if (!miningStatus.isActive()) {
              try {
                await StartMining.startMining();
                startedMining = true;
              } catch (e) {
                // no problem
              }
            }
            
            try {
              
              // wait for block
              console.log("Waiting for next block to test post sync notifications");
              await that.daemon.waitForNextBlockHeader();
              
              // ensure wallet has time to detect new block
              await new Promise(function(resolve) { setTimeout(resolve, TestUtils.SYNC_PERIOD_IN_MS); }); // sleep for the wallet interval
              
              // test that wallet listener's onSyncProgress() and onNewBlock() were invoked after previous completion
              assert(walletSyncTester.getOnSyncProgressAfterDone());
              assert(walletSyncTester.getOnNewBlockAfterDone());
            } catch (e) {
              err = e;
            }
            
            // finally
            if (startedMining) {
              await that.daemon.stopMining();
              //await wallet.stopMining();  // TODO: support client-side mining?
            }
            if (err) throw err;
          }
        } catch (e) {
          err = e;
        }
        
        // finally
        if (walletGt !== undefined) await walletGt.close(true);
        await wallet.close();
        if (err) throw err;
      }
      
      if (testConfig.testNonRelays)
      it("Can sync a wallet created from keys", async function() {
        
        // recreate test wallet from keys
        let walletKeys = await that.createWallet({primaryAddress: await that.wallet.getPrimaryAddress(), privateViewKey: await that.wallet.getPrivateViewKey(), privateSpendKey: await that.wallet.getPrivateSpendKey(), restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT}, false);
        
        // create ground truth wallet for comparison
        let walletGt = await that.getWalletGt();
        
        // test wallet and close as final step
        let err;
        try {
          assert.equal(await walletKeys.getMnemonic(), await walletGt.getMnemonic());
          assert.equal(await walletKeys.getPrimaryAddress(), await walletGt.getPrimaryAddress());
          assert.equal(await walletKeys.getPrivateViewKey(), await walletGt.getPrivateViewKey());
          assert.equal(await walletKeys.getPublicViewKey(), await walletGt.getPublicViewKey());
          assert.equal(await walletKeys.getPrivateSpendKey(), await walletGt.getPrivateSpendKey());
          assert.equal(await walletKeys.getPublicSpendKey(), await walletGt.getPublicSpendKey());
          assert.equal(await walletKeys.getSyncHeight(), TestUtils.FIRST_RECEIVE_HEIGHT);
          assert(await walletKeys.isConnected());
          assert(!(await walletKeys.isSynced()));

          // sync the wallet
          let progressTester = new SyncProgressTester(walletKeys, TestUtils.FIRST_RECEIVE_HEIGHT, await walletKeys.getDaemonMaxPeerHeight());
          let result = await walletKeys.sync(progressTester);
          await progressTester.onDone(await walletKeys.getDaemonHeight());
          
          // test result after syncing
          assert(await walletKeys.isSynced());
          assert.equal(result.getNumBlocksFetched(), await walletKeys.getDaemonHeight() - TestUtils.FIRST_RECEIVE_HEIGHT);
          assert(result.getReceivedMoney());
          assert.equal(await walletKeys.getHeight(), await that.daemon.getHeight());
          assert.equal(await walletKeys.getDaemonHeight(), await that.daemon.getHeight());
          assert.equal((await walletKeys.getTxs())[0].getHeight(), TestUtils.FIRST_RECEIVE_HEIGHT);  // wallet should be fully synced so first tx happens on true restore height
          
          // compare with ground truth
          await TestMoneroWalletFull._testWalletEqualityOnChain(walletGt, walletKeys);
        } catch (e) {
          err = e;
        }
        
        // finally
        await walletGt.close(true);
        await walletKeys.close();
        if (err) throw err;
      });
      
      // TODO: test start syncing, notification of syncs happening, stop syncing, no notifications, etc
      if (testConfig.testNonRelays)
      it("Can start and stop syncing", async function() {
        
        // test unconnected wallet
        let err;  // used to emulate Java's try...catch...finally
        let path = TestMoneroWalletFull._getRandomWalletPath();
        let wallet = await that.createWallet({path: path, password: TestUtils.WALLET_PASSWORD, networkType: TestUtils.NETWORK_TYPE, serverUri: ""});
        try {
          assert.notEqual(await wallet.getMnemonic(), undefined);
          assert.equal(await wallet.getHeight(), 1);
          assert.equal(await wallet.getBalance(), BigInteger.parse("0"));
          await wallet.startSyncing();
        } catch (e1) {  // first error is expected
          try {
            assert.equal(e1.message, "Wallet is not connected to daemon");
          } catch (e2) {
            err = e2;
          }
        }
        
        // finally
        await wallet.close();
        if (err) throw err;
        
        // test connecting wallet
        path = TestMoneroWalletFull._getRandomWalletPath();
        wallet = await that.createWallet({path: path, password: TestUtils.WALLET_PASSWORD, networkType: TestUtils.NETWORK_TYPE, serverUri: ""});
        try {
          assert.notEqual(wallet.getMnemonic(), undefined);
          assert(!await wallet.isConnected());
          await wallet.setDaemonConnection(await that.daemon.getRpcConnection());
          assert.equal(await wallet.getHeight(), 1);
          assert(!await wallet.isSynced());
          assert.equal((await wallet.getBalance()).compare(new BigInteger(0)), 0);
          let chainHeight = await wallet.getDaemonHeight();
          await wallet.setSyncHeight(chainHeight - 3);
          await wallet.startSyncing();
          assert.equal(await wallet.getSyncHeight(), chainHeight - 3);
          assert.equal((await wallet.getDaemonConnection()).getUri(), (await that.daemon.getRpcConnection()).getUri()); // TODO: replace with config comparison
          assert.equal((await wallet.getDaemonConnection()).getUsername(), (await that.daemon.getRpcConnection()).getUsername());
          assert.equal((await wallet.getDaemonConnection()).getPassword(), (await that.daemon.getRpcConnection()).getPassword());
          await wallet.stopSyncing();
          await wallet.sync();
          await wallet.stopSyncing();
          await wallet.stopSyncing();
        } catch (e) {
          err = e;
        }
        
        // finally
        await wallet.close();
        if (err) throw err;
        
        // test that sync starts automatically
        let restoreHeight = await that.daemon.getHeight() - 100;
        path = TestMoneroWalletFull._getRandomWalletPath();
        wallet = await that.createWallet({path: path, password: TestUtils.WALLET_PASSWORD, networkType: TestUtils.NETWORK_TYPE, mnemonic: TestUtils.MNEMONIC, server: await that.daemon.getRpcConnection(), restoreHeight: restoreHeight}, false);
        try {
          
          // start syncing
          assert.equal(await wallet.getHeight(), 1);
          assert.equal(await wallet.getSyncHeight(), restoreHeight);
          assert(!(await wallet.isSynced()));
          assert.equal(await wallet.getBalance(), new BigInteger(0));
          await wallet.startSyncing(TestUtils.SYNC_PERIOD_IN_MS);
          
          // pause for sync to start
          await new Promise(function(resolve) { setTimeout(resolve, TestUtils.SYNC_PERIOD_IN_MS + 1000); }); // in ms
          
          // test that wallet has started syncing
          assert(await wallet.getHeight() > 1);
          
          // stop syncing
          await wallet.stopSyncing();
          
       // TODO monero-project: wallet.cpp m_synchronized only ever set to true, never false
//          // wait for block to be added to chain
//          await that.daemon.waitForNextBlockHeader();
//          
//          // wallet is no longer synced
//          assert(!(await wallet.isSynced()));  
        } catch (e) {
          err = e;
        }
                
        // finally
        await wallet.close();
        if (err) throw err;
      });
      
      if (testConfig.testNonRelays)
      it("Does not interfere with other wallet notifications", async function() {
        
        // create 2 wallets with a recent restore height
        let height = await that.daemon.getHeight();
        let restoreHeight = height - 5;
        let wallet1 = await that.createWallet({mnemonic: TestUtils.MNEMONIC, restoreHeight: restoreHeight}, false);
        let wallet2 = await that.createWallet({mnemonic: TestUtils.MNEMONIC, restoreHeight: restoreHeight}, false);
        
        // track notifications of each wallet
        let tester1 = new SyncProgressTester(wallet1, restoreHeight, height);
        let tester2 = new SyncProgressTester(wallet2, restoreHeight, height);
        await wallet1.addListener(tester1);
        await wallet2.addListener(tester2);
        
        // sync first wallet and test that 2nd is not notified
        await wallet1.sync();
        assert(tester1.isNotified());
        assert(!tester2.isNotified());
        
        // sync 2nd wallet and test that 1st is not notified
        let tester3 = new SyncProgressTester(wallet1, restoreHeight, height);
        await wallet1.addListener(tester3);
        await wallet2.sync();
        assert(tester2.isNotified());
        assert(!(tester3.isNotified()));
        
        // close wallets
        await wallet1.close();
        await wallet2.close();
      });
      
      if (testConfig.testNonRelays)
      it("Is equal to the RPC wallet.", async function() {
        await WalletEqualityUtils.testWalletEqualityOnChain(await TestUtils.getWalletRpc(), that.wallet);
      });

      if (testConfig.testNonRelays)
      it("Is equal to the RPC wallet with a seed offset", async function() {
        
        // use common offset to compare wallet implementations
        let seedOffset = "my super secret offset!";
        
        // create rpc wallet with offset
        let walletRpc = await TestUtils.getWalletRpc();
        await walletRpc.createWallet({path: GenUtils.getUUID(), password: TestUtils.WALLET_PASSWORD, mnemonic: await walletRpc.getMnemonic(), restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT, seedOffset: seedOffset});
        
        // create full wallet with offset
        let walletFull = await that.createWallet({mnemonic: TestUtils.MNEMONIC, restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT, seedOffset: seedOffset});
        
        // deep compare
        let err;
        try {
          await WalletEqualityUtils.testWalletEqualityOnChain(walletRpc, walletFull);
        } catch (e) {
          err = e;
        }
        await walletFull.close();
        if (err) throw err;
      });
      
      if (testConfig.testNonRelays)
      it("Supports multisig sample code", async function() {
        await testCreateMultisigWallet(2, 2);
        await testCreateMultisigWallet(2, 3);
        await testCreateMultisigWallet(2, 4);
      });
      
      async function testCreateMultisigWallet(M, N) {
        console.log("Creating " + M + "/" + N + " multisig wallet");
        
        // create participating wallets
        let wallets = []
        for (let i = 0; i < N; i++) {
          wallets.push(await that.createWallet());
        }
        
        // prepare and collect multisig hex from each participant
        let preparedMultisigHexes = []
        for (let wallet of wallets) preparedMultisigHexes.push(await wallet.prepareMultisig());
        
        // make each wallet multsig and collect results
        let madeMultisigHexes = [];
        for (let i = 0; i < wallets.length; i++) {
          
          // collect prepared multisig hexes from wallet's peers
          let peerMultisigHexes = [];
          for (let j = 0; j < wallets.length; j++) if (j !== i) peerMultisigHexes.push(preparedMultisigHexes[j]);
        
          // make wallet multisig and collect result hex
          let result = await wallets[i].makeMultisig(peerMultisigHexes, M, TestUtils.WALLET_PASSWORD);
          madeMultisigHexes.push(result.getMultisigHex());
        }
        
        // if wallet is not N/N, exchange multisig keys N-M times
        if (M !== N) {
          let multisigHexes = madeMultisigHexes;
          for (let i = 0; i < N - M; i++) {
            
            // exchange multisig keys among participants and collect results for next round if applicable
            let resultMultisigHexes = [];
            for (let wallet of wallets) {
              
              // import the multisig hex of other participants and collect results
              let result = await wallet.exchangeMultisigKeys(multisigHexes, TestUtils.WALLET_PASSWORD);
              resultMultisigHexes.push(result.getMultisigHex());
            }
            
            // use resulting multisig hex for next round of exchange if applicable
            multisigHexes = resultMultisigHexes;
          }
        }
        
        // wallets are now multisig
        for (let wallet of wallets) {
          let primaryAddress = await wallet.getAddress(0, 0);
          MoneroUtils.validateAddress(primaryAddress, await wallet.getNetworkType());
          let info = await wallet.getMultisigInfo();
          assert(info.isMultisig());
          assert(info.isReady());
          assert.equal(info.getThreshold(), M);
          assert.equal(info.getNumParticipants(), N);
          await wallet.close(true);
        }
      }
      
      if (testConfig.testNonRelays)
      it("Can be saved", async function() {
        
        // create unique path for new test wallet
        let path = TestMoneroWalletFull._getRandomWalletPath();
        
        // wallet does not exist
        assert(!(await MoneroWalletFull.walletExists(path, TestUtils.getDefaultFs())));
        
        // cannot open non-existant wallet
        try {
          await that.openWallet({path: path, serverUri: ""});
          throw new Error("Cannot open non-existant wallet");
        } catch (e) {
          assert.equal(e.message, "Wallet does not exist at path: " + path);
        }
        
        // create wallet at the path
        let restoreHeight = await that.daemon.getHeight() - 200;
        let wallet = await that.createWallet({path: path, password: TestUtils.WALLET_PASSWORD, networkType: TestUtils.NETWORK_TYPE, mnemonic: TestUtils.MNEMONIC, restoreHeight: restoreHeight});
        
        // test wallet at newly created state
        let err;
        try {
          assert(await MoneroWalletFull.walletExists(path, TestUtils.getDefaultFs()));
          assert.equal(await wallet.getMnemonic(), TestUtils.MNEMONIC);
          assert.equal(await wallet.getNetworkType(), TestUtils.NETWORK_TYPE);
          assert.equal(await wallet.getDaemonConnection(), undefined);
          assert.equal(await wallet.getSyncHeight(), restoreHeight);
          assert.equal(await wallet.getMnemonicLanguage(), "English");
          assert.equal(await wallet.getHeight(), 1);
          assert.equal(await wallet.getSyncHeight(), restoreHeight);
          
          // set the wallet's connection and sync
          await wallet.setDaemonConnection(TestUtils.getDaemonRpcConnection());
          await wallet.sync();
          if (await wallet.getHeight() !== await wallet.getDaemonHeight()) console.log("WARNING: wallet height " + await wallet.getHeight() + " is not synced with daemon height " + await that.daemon.getHeight());  // TODO: height may not be same after long sync
          
          // close the wallet without saving
          await wallet.close();
          
          // re-open the wallet
          wallet = await that.openWallet({path: path});
          
          // test wallet is at newly created state
          assert(await MoneroWalletFull.walletExists(path, TestUtils.getDefaultFs()));
          assert.equal(await wallet.getMnemonic(), TestUtils.MNEMONIC);
          assert.equal(await wallet.getNetworkType(), TestUtils.NETWORK_TYPE);
          assert.equal(await wallet.getDaemonConnection(), undefined);
          assert(!(await wallet.isConnected()));
          assert.equal(await wallet.getMnemonicLanguage(), "English");
          assert(!(await wallet.isSynced()));
          assert.equal(await wallet.getHeight(), 1);
          assert.equal(await wallet.getSyncHeight(), 0); // TODO monero-project: restoreHeight is reset to 0 after closing
          
          // set the wallet's connection and sync
          await wallet.setDaemonConnection(TestUtils.getDaemonRpcConnection());
          assert(await wallet.isConnected());
          await wallet.setSyncHeight(restoreHeight);
          await wallet.sync();
          assert(await wallet.isSynced());
          assert.equal(await wallet.getHeight(), await wallet.getDaemonHeight());
          let prevHeight = await wallet.getHeight();
          
          // save and close the wallet
          await wallet.save();
          await wallet.close();
          
          // re-open the wallet
          wallet = await that.openWallet({path: path, serverUri: ""});
          
          // test wallet state is saved
          assert(!(await wallet.isConnected()));
          await wallet.setDaemonConnection(TestUtils.getDaemonRpcConnection());  // TODO monero-project: daemon connection not stored in wallet files so must be explicitly set each time
          assert.equal(await wallet.getDaemonConnection(), TestUtils.getDaemonRpcConnection());
          assert(await wallet.isConnected());
          assert.equal(await wallet.getHeight(), prevHeight);
          assert.equal(await wallet.getSyncHeight(), 0); // TODO monero-project: restoreHeight is reset to 0 after closing
          assert(await MoneroWalletFull.walletExists(path, TestUtils.getDefaultFs()));
          assert.equal(await wallet.getMnemonic(), TestUtils.MNEMONIC);
          assert.equal(await wallet.getNetworkType(), TestUtils.NETWORK_TYPE);
          assert.equal(await wallet.getMnemonicLanguage(), "English");
          
          // sync
          await wallet.sync();
        } catch (e) {
          let err = e;
        }
        
        // finally
        await wallet.close();
        if (err) throw err;
      });
      
      if (testConfig.testNonRelays)
      it("Can be moved", async function() {
        let err;
        let wallet;
        try {
          
          // create random in-memory wallet with defaults
          wallet = await that.createWallet(new MoneroWalletConfig().setPath(""));
          let mnemonic = await wallet.getMnemonic();
          await wallet.setAttribute("mykey", "myval1");
          
          // move wallet from memory to disk
          let path1 = TestUtils.TEST_WALLETS_DIR + "/" + GenUtils.getUUID();
          assert(!MoneroWalletFull.walletExists(path1, TestUtils.getDefaultFs()));
          await wallet.moveTo(path1);
          assert(MoneroWalletFull.walletExists(path1, TestUtils.getDefaultFs()));
          assert.equal(await wallet.getMnemonic(), mnemonic);
          assert.equal("myval1", await wallet.getAttribute("mykey"));
          
          // move to same path which is same as saving
          await wallet.setAttribute("mykey", "myval2");
          await wallet.moveTo(path1);
          await wallet.close();
          assert(MoneroWalletFull.walletExists(path1, TestUtils.getDefaultFs()));
          wallet = await that.openWallet(new MoneroWalletConfig().setPath(path1));
          assert.equal(await wallet.getMnemonic(), mnemonic);
          assert.equal("myval2", await wallet.getAttribute("mykey"));
          
          // move wallet to new directory
          let path2 = TestUtils.TEST_WALLETS_DIR + "/" + GenUtils.getUUID();
          await wallet.setAttribute("mykey", "myval3");
          await wallet.moveTo(path2);
          assert(!MoneroWalletFull.walletExists(path1, TestUtils.getDefaultFs()));
          assert(MoneroWalletFull.walletExists(path2, TestUtils.getDefaultFs()));
          assert.equal(await wallet.getMnemonic(), mnemonic);
          
          // re-open and test wallet
          await wallet.close();
          wallet = await that.openWallet(new MoneroWalletConfig().setPath(path2));
          await wallet.sync();
          assert.equal(await wallet.getMnemonic(), mnemonic);
          assert.equal("myval3", await wallet.getAttribute("mykey"));
        } catch (e) {
          err = e;
        }
        
        // final cleanup
        if (wallet) await wallet.close();
        if (err) throw err;
      });
      
    if (testConfig.testNonRelays)
      it("Can be closed", async function() {
        let err;
        let wallet;
        try {
          
          // create a test wallet
          wallet = await that.createWallet();
          let path = await wallet.getPath();
          await wallet.sync();
          assert(await wallet.getHeight() > 1);
          assert(await wallet.isSynced());
          assert.equal(await wallet.isClosed(), false);
          
          // close the wallet
          await wallet.close();
          assert(await wallet.isClosed());
          
          // attempt to interact with the wallet
          try { await wallet.getHeight(); }
          catch (e) { assert.equal(e.message, "Wallet is closed"); }
          try { await wallet.getMnemonic(); }
          catch (e) { assert.equal(e.message, "Wallet is closed"); }
          try { await wallet.sync(); }
          catch (e) { assert.equal(e.message, "Wallet is closed"); }
          try { await wallet.startSyncing(); }
          catch (e) { assert.equal(e.message, "Wallet is closed"); }
          try { await wallet.stopSyncing(); }
          catch (e) { assert.equal(e.message, "Wallet is closed"); }
          
          // re-open the wallet
          wallet = await that.openWallet({path: path});
          await wallet.sync();
          assert.equal(await wallet.getHeight(), await wallet.getDaemonHeight());
          assert.equal(await wallet.isClosed(), false);
        } catch (e) {
          console.log(e);
          err = e;
        }
        
        // final cleanup
        await wallet.close();
        assert(await wallet.isClosed());
        if (err) throw err;
      });
    });
  }
  
  //----------------------------- PRIVATE HELPERS -----------------------------
  
  static _getRandomWalletPath() {
    return TestUtils.TEST_WALLETS_DIR + "/test_wallet_" + GenUtils.getUUID();
  }
  
  // possible configuration: on chain xor local wallet data ("strict"), txs ordered same way? TBD
  static async _testWalletEqualityOnChain(wallet1, wallet2) {
    await WalletEqualityUtils.testWalletEqualityOnChain(wallet1, wallet2);
    assert.equal(await wallet2.getNetworkType(), await wallet1.getNetworkType());
    //assert.equal(await wallet2.getSyncHeight(), await wallet1.getSyncHeight()); // TODO monero-project: sync height is lost after close
    assert.equal((await wallet2.getDaemonConnection()).getUri(), (await wallet1.getDaemonConnection()).getUri());
    assert.equal((await wallet2.getDaemonConnection()).getUsername(), (await wallet1.getDaemonConnection()).getUsername());
    assert.equal((await wallet2.getDaemonConnection()).getPassword(), (await wallet1.getDaemonConnection()).getPassword());
    assert.equal(await wallet2.getMnemonicLanguage(), await wallet1.getMnemonicLanguage());
    // TODO: more wasm-specific extensions
  }
}

/**
 * Helper class to test progress updates.
 */
class SyncProgressTester extends WalletSyncPrinter {
  
  constructor(wallet, startHeight, endHeight) {
    super();
    this.wallet = wallet;
    assert(startHeight >= 0);
    assert(endHeight >= 0);
    this.startHeight = startHeight;
    this.prevEndHeight = endHeight;
    this.isDone = false;
  }
  
  onSyncProgress(height, startHeight, endHeight, percentDone, message) {
    super.onSyncProgress(height, startHeight, endHeight, percentDone, message);
    
    // registered wallet listeners will continue to get sync notifications after the wallet's initial sync
    if (this.isDone) {
      assert(this.wallet.getListeners().includes(this), "Listener has completed and is not registered so should not be called again");
      this.onSyncProgressAfterDone = true;
    }
    
    // update tester's start height if new sync session
    if (this.prevCompleteHeight !== undefined && startHeight === this.prevCompleteHeight) this.startHeight = startHeight;  
    
    // if sync is complete, record completion height for subsequent start heights
    if (percentDone === 1) this.prevCompleteHeight = endHeight;
    
    // otherwise start height is equal to previous completion height
    else if (this.prevCompleteHeight !== undefined) assert.equal(startHeight, this.prevCompleteHeight);
    
    assert(endHeight > startHeight, "end height > start height");
    assert.equal(startHeight, this.startHeight);
    assert(endHeight >= this.prevEndHeight);  // chain can grow while syncing
    this.prevEndHeight = endHeight;
    assert(height >= startHeight);
    assert(height < endHeight);
    let expectedPercentDone = (height - startHeight + 1) / (endHeight - startHeight);
    assert.equal(expectedPercentDone, percentDone);
    if (this.prevHeight === undefined) assert.equal(height, startHeight);
    else assert.equal(this.prevHeight + 1, height);
    this.prevHeight = height;
  }
  
  async onDone(chainHeight) {
    assert(!this.isDone);
    this.isDone = true;
    if (this.prevHeight === undefined) {
      assert.equal(this.prevCompleteHeight, undefined);
      assert.equal(this.startHeight, chainHeight);
    } else {
      assert.equal(this.prevHeight, chainHeight - 1);  // otherwise last height is chain height - 1
      assert.equal(this.prevCompleteHeight, chainHeight);
    }
  }
  
  isNotified() {
    return this.prevHeight !== undefined;
  }
  
  getOnSyncProgressAfterDone() {
    return this.onSyncProgressAfterDone;
  }
}

/**
 * Internal class to test all wallet notifications on sync. 
 */
class WalletSyncTester extends SyncProgressTester {
  
  constructor(wallet, startHeight, endHeight) {
    super(wallet, startHeight, endHeight);
    assert(startHeight >= 0);
    assert(endHeight >= 0);
    this.incomingTotal = BigInteger.parse("0");
    this.outgoingTotal = BigInteger.parse("0");
  }
  
  onNewBlock(height) {
    if (this.isDone) {
      assert(this.wallet.getListeners().includes(this), "Listener has completed and is not registered so should not be called again");
      this.onNewBlockAfterDone = true;
    }
    if (this.walletTesterPrevHeight !== undefined) assert.equal(height, this.walletTesterPrevHeight + 1);
    assert(height >= this.startHeight);
    this.walletTesterPrevHeight = height;
  }
  
  async onBalancesChanged(newBalance, newUnlockedBalance) {
    if (this.prevBalance !== undefined) assert(newBalance.toString() !== this.prevBalance.toString() || newUnlockedBalance.toString() !== this.prevUnlockedBalance.toString());
    this.prevBalance = newBalance;
    this.prevUnlockedBalance = newUnlockedBalance;
  }

  onOutputReceived(output) {
    assert.notEqual(output, undefined);
    this.prevOutputReceived = output;
    
    // test output
    TestUtils.testUnsignedBigInteger(output.getAmount());
    assert(output.getAccountIndex() >= 0);
    assert(output.getSubaddressIndex() >= 0);
    
    // test output's tx
    assert(output.getTx());
    assert(output.getTx() instanceof MoneroTxWallet);
    assert(output.getTx().getHash());
    assert.equal(output.getTx().getHash().length, 64);
    assert(output.getTx().getVersion() >= 0);
    assert(output.getTx().getUnlockHeight() >= 0);
    assert.equal(output.getTx().getInputs(), undefined);
    assert.equal(output.getTx().getOutputs().length, 1);
    assert(output.getTx().getOutputs()[0] === output);
    
    // extra is not sent over the wasm bridge
    assert.equal(output.getTx().getExtra(), undefined);
    
    // add incoming amount to running total
    this.incomingTotal = this.incomingTotal.add(output.getAmount());
  }

  onOutputSpent(output) {
    assert.notEqual(output, undefined);
    this.prevOutputSpent = output;
    
    // test output
    TestUtils.testUnsignedBigInteger(output.getAmount());
    assert(output.getAccountIndex() >= 0);
    assert(output.getSubaddressIndex() >= 0);
    
    // test output's tx
    assert(output.getTx());
    assert(output.getTx() instanceof MoneroTxWallet);
    assert(output.getTx().getHash());
    assert.equal(output.getTx().getHash().length, 64);
    assert(output.getTx().getVersion() >= 0);
    assert.equal(output.getTx().getUnlockHeight(), undefined);
    assert.equal(output.getTx().getInputs().length, 1);
    assert(output.getTx().getInputs()[0] === output);
    assert.equal(output.getTx().getOutputs(), undefined);
    
    // extra is not sent over the wasm bridge
    assert.equal(output.getTx().getExtra(), undefined);
    
    // add outgoing amount to running total
    this.outgoingTotal = this.outgoingTotal.add(output.getAmount());
  }
  
  async onDone(chainHeight) {
    await super.onDone(chainHeight);
    assert.notEqual(this.walletTesterPrevHeight, undefined);
    assert.notEqual(this.prevOutputReceived, undefined);
    assert.notEqual(this.prevOutputSpent, undefined);
    let balance = this.incomingTotal.subtract(this.outgoingTotal);
    assert.equal(balance.toString(), (await this.wallet.getBalance()).toString());
    assert.equal(this.prevBalance.toString(), (await this.wallet.getBalance()).toString());
    assert.equal(this.prevUnlockedBalance.toString(), (await this.wallet.getUnlockedBalance()).toString());
  }
  
  getOnNewBlockAfterDone() {
    return this.onNewBlockAfterDone;
  }
}

module.exports = TestMoneroWalletFull;
