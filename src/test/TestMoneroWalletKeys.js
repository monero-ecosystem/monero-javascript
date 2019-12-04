const MoneroWalletKeys = require("../main/js/wallet/MoneroWalletKeys");
const TestMoneroWalletCommon = require("./TestMoneroWalletCommon");

/**
 * Tests the fully client-side Monero wallet.
 */
class TestMoneroWalletKeys extends TestMoneroWalletCommon {
  
  constructor() {
    super(TestUtils.getDaemonRpc());
  }
  
  async getTestWallet() {
    return TestUtils.getWalletKeys();
  }
  
  async openWallet(path) {
    throw new Error("TestMoneroWalletKeys.openWallet(path) not supported");
  }
  
  async createRandomWallet() {
    return await MoneroWalletKeys.createWalletRandom(TestUtils.NETWORK_TYPE);
  }
  
  async createWalletFromKeys(address, privateViewKey, privateSpendKey, daemonConnection, firstReceiveHeight, language) {
    return await MoneroWalletKeys.createWalletFromKeys(address, privateViewKey, privateSpendKey, language);
  }
  
  runTests(config) {
    let that = this;
    describe("TEST MONERO WALLET KEYS ONLY", function() {
      
      // initialize wallet
      before(async function() {
        that.wallet = await TestUtils.getWalletKeys();
      });
      
      // run tests specific to keys wallet
      that._testWalletKeys(config);
      
      // run common tests
      that.runCommonTests(config);
    });
  }
  
  // ---------------------------------- PRIVATE -------------------------------
  
  _testWalletKeys(config) {
    let that = this;
    let daemon = this.daemon;
    
    describe("Tests specific to keys wallet", function() {
      
//      // NOTE: this test will only be good until the next time stagenet is reset (today's date: 2018/12/07)
//      it("Can run precise tests on wallet with address 55AepZu...", async function() {
//        
//        // test configuration
//        let config = {
//            mnemonic: TestUtils.MNEMONIC,
//            blockHeights: [197148, 199930, 209120, 209121], // known block heights (optional)
//            startHeight: 192000,                            // start of range to scan (ignored if block heights given)
//        }
//        
//        // create the wallet
//        let wallet = new MoneroWalletKeys({daemon: daemon, mnemonic: config.mnemonic});
//        
//        // scan specific blocks
//        if (config.blockHeights && config.blockHeights.length > 0) {
//          for (let height of config.blockHeights) await wallet.sync(height, onProgress);
//        }
//        
//        // otherwise scan range
//        else {
//          await wallet.sync(config.startHeight, onProgress);
//        }
//        
//        // print updates as they happen
//        function onProgress(progress) {
//          console.log("Progress: " + progress.percent + ", done blocks: " + progress.doneBlocks + ", total blocks: " + progress.totalBlocks + ", message: " + progress.message);
//        }
//      });
      
      it("Can get the seed", async function() {
        let seed = await that.wallet.getSeed();
        MoneroUtils.validateSeed(seed);
        
        // sync entire wallet and print progress
        await that.wallet.sync(await daemon.getHeight() - 720, function(progress) {
          //console.log("Progress: " + progress.percent + ", done blocks: " + progress.doneBlocks + ", total blocks: " + progress.totalBlocks + ", message: " + progress.message);
        });
      });
      
      it("Can get the language of the mnemonic phrase", async function() {
        throw new Error("Not implemented");
      });
      
      it("Can get the public view key", async function() {
        throw new Error("Not implemented");
      });
      
      it("Can get the public spend key", async function() {
        throw new Error("Not implemented");
      });
      
      it("Can get the private spend key", async function() {
        throw new Error("Not implemented");
      });
      
      it("Can get the blockchain height", async function() {
        assert.equal(await that.wallet.getChainHeight(), await daemon.getHeight());
      });
      
      it("Can be created and synced without a seed", async function() {
        
        // wallet starts at the daemon's height by default
        let wallet = new MoneroWalletKeys(daemon);
        assert.equal(await wallet.getHeight(), await daemon.getHeight());
        
        // sync the wallet
        let progressTester = new SyncProgressTester(wallet, await wallet.getHeight(), await wallet.getChainHeight() - 1, undefined, true);
        await wallet.sync(undefined, undefined, function(progress) { progressTester.onProgress(progress) });
        progressTester.testDone();
        assert.equal(await daemon.getHeight(), await wallet.getHeight());
        
        // sync the wallet with default params
        await wallet.sync();
        assert.equal(await wallet.getHeight(), await daemon.getHeight());
      });
      
      it("Can be created and synced with a seed and start height", async function() {
        
        // create wallet with a start height 50 blocks ago
        let numBlocks = 200;
        let wallet = new MoneroWalletKeys({daemon: daemon, mnemonic: TestUtils.MNEMONIC, startHeight: (await daemon.getHeight()) - numBlocks});
        
        // sync the wallet 
        let progressTester = new SyncProgressTester(wallet, await wallet.getChainHeight() - numBlocks, await wallet.getChainHeight() - 1, undefined);
        await wallet.sync(undefined, function(progress) { progressTester.onProgress(progress) });
        assert.equal(await daemon.getHeight(), await wallet.getHeight()); // TODO: can fail because blockchain grows, need to sync up to this point
        
        // TODO: test progress according to new java interface
        progressTester.testDone();
      });
      
      it("Does not allow a start height to be specified if a new seed is being created", async function() {
        try {
          let wallet = new MoneroWalletKeys({daemon: daemon, startHeight: 0});
          fail("Should have failed");
        } catch (e) { }
      });
      
      it("Can be exported/imported to/from a JSON object", async function() {
        
        // create a new wallet initialized from a seed
        let wallet = new MoneroWalletKeys(TestUtils.WALLET_LOCAL_CONFIG);
        assert.equal(await wallet.getHeight(), 0);
        
        // sync some blocks
        let startHeight = Math.max(1000, await daemon.getHeight() - 1000);
        await wallet.sync(startHeight);
        assert.equal(await wallet.getHeight(), await daemon.getHeight());
        
        // save the wallet
        let store = await wallet.getStore();
        
        // recreate the wallet
        let wallet2 = new MoneroWalletKeys({daemon: daemon, store: store});
        assert.deepEqual(wallet2.getStore(), wallet.getStore());
        assert.equal(await wallet2.getHeight(), await wallet.getHeight());
        
        // sync the same blocks and assert progress is immediately done
        let progressTester = new SyncProgressTester(wallet, 0, await wallet.getChainHeight() - 1, true, true);
        await wallet.sync(undefined, function(progress) { progressTester.onProgress(progress) });
        progressTester.testDone();
      });
      
      it("Validates the sync range that is given to it", async function() {
        
        // create a new wallet
        let chainHeight = await daemon.getHeight();
        let wallet = new MoneroWalletKeys(daemon);
        assert.equal(await wallet.getHeight(), chainHeight);
        
        // heights must be less than chain height
        try {
          await wallet.sync(chainHeight + 1);
          fail("Should have failed");
        } catch (e) { }
        
        // sync last few
        await wallet.sync(chainHeight - 20);
      });
      
      it("Reports progress while it's syncing", async function() {
        let wallet = new MoneroWalletKeys(TestUtils.WALLET_LOCAL_CONFIG);
        let numBlocks = 100;
        let startHeight = await wallet.getChainHeight() - numBlocks
        let endHeight = await wallet.getChainHeight() - 1;
        let progressTester = new SyncProgressTester(wallet, startHeight, endHeight);
        let resp = await wallet.sync(startHeight, function(progress) { progressTester.onProgress(progress) });
        progressTester.testDone();
        assert.equal(resp, undefined);
        //assert.equal(resp.blocks_fetched, numBlocks); // TODO: test response
        //assert(typeof resp.received_money === "boolean");
      });
      
//      it("Can sync specific ranges", async function() {
//        
//        // create a new wallet
//        let chainHeight = await daemon.getHeight();
//        let wallet = new MoneroWalletKeys(daemon);
//        assert.equal(await that.wallet.getHeight(), chainHeight);
//        
//        // scan a few ranges
//        // TODO: randomly sample ranges of varying but capped heights
//        let progressTester = new SyncProgressTester(wallet, 0, 0);
//        await that.wallet.sync(0, 0, function(progress) { progressTester.onProgress(progress) });
//        progressTester.testDone();
//        assert.equal(await that.wallet.getHeight(), 1);
//        progressTester = new SyncProgressTester(wallet, 101000, 102000);
//        await that.wallet.sync(101000, 102000, function(progress) { progressTester.onProgress(progress) });
//        progressTester.testDone();
//        assert.equal(await that.wallet.getHeight(), 102001);
//        progressTester = new SyncProgressTester(wallet, 103000, 104000);
//        await that.wallet.sync(103000, 104000, function(progress) { progressTester.onProgress(progress) });
//        progressTester.testDone();
//        assert.equal(await that.wallet.getHeight(), 104001);
//        progressTester = new SyncProgressTester(wallet, 105000, 106000);
//        await that.wallet.sync(105000, 106000, function(progress) { progressTester.onProgress(progress) });
//        progressTester.testDone();
//        assert.equal(await that.wallet.getHeight(), 106001);
//        
//        // scan a previously processed range
//        progressTester = new SyncProgressTester(wallet, 101000, 102000, true);
//        await that.wallet.sync(101000, 102000, function(progress) { progressTester.onProgress(progress) });
//        progressTester.testDone();
//        assert.equal(await that.wallet.getHeight(), 106001);
//      });
    });
  }
}

/**
 * Internal class to test progress updates.
 */
class SyncProgressTester {
  
  constructor(wallet, startHeight, endHeight, noMidway, noProgress) {
    assert(wallet);
    assert(startHeight >= 0);
    assert(endHeight >= 0);
    this.wallet = wallet;
    this.startHeight = startHeight;
    this.endHeight = endHeight;
    this.noMidway = noMidway;
    this.noProgress = noProgress;
    this.firstProgress = undefined;
    this.lastProgress = undefined;
    this.midwayFound = false;
  }
  
  onProgress(progress) {
    assert(!this.noProgress, "Should not call progress");
    assert.equal(progress.totalBlocks, this.endHeight - this.startHeight + 1);
    assert(progress.doneBlocks >= 0 && progress.doneBlocks <= progress.totalBlocks);
    if (this.noMidway) assert(progress.percent === 0 || progress.percent === 1);
    if (progress.percent > 0 && progress.percent < 1) this.midwayFound = true;
    assert(progress.message);
    if (this.firstProgress == undefined) {
      this.firstProgress = progress;
      assert(progress.percent === 0);
      assert(progress.doneBlocks === 0);
    } else {
      assert(progress.percent > this.lastProgress.percent);
      assert(progress.doneBlocks >= this.lastProgress.doneBlocks && progress.doneBlocks <= progress.totalBlocks);
    }
    this.lastProgress = progress;
  }
  
  testDone() {
    
    // nothing to test if no progress called
    if (this.noProgress) {
      assert(!this.firstProgress);
      return;
    }
    
    // test first progress
    assert(this.firstProgress, "Progress was never updated");
    assert.equal(this.firstProgress.percent, 0);
    assert.equal(this.firstProgress.doneBlocks, 0);
    
    // test midway progress
    if (this.endHeight > this.startHeight && !this.noMidway) assert(this.midwayFound, "No midway progress reported but it should have been");
    else assert(!this.midwayFound, "No midway progress should have been reported but it was");
    
    // test last progress
    assert.equal(this.lastProgress.percent, 1);
    assert.equal(this.lastProgress.doneBlocks, this.endHeight - this.startHeight + 1);
    assert.equal(this.lastProgress.totalBlocks, this.lastProgress.doneBlocks);
  }
}

module.exports = TestMoneroWalletKeys