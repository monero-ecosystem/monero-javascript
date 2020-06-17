const assert = require("assert");
const TestUtils = require("./utils/TestUtils");
const monerojs = require("../../index");
const BigInteger = monerojs.BigInteger;
const MoneroOutput = monerojs.MoneroOutput;
const MoneroTxConfig = monerojs.MoneroTxConfig;
const MoneroBan = monerojs.MoneroBan;
const MoneroKeyImage = monerojs.MoneroKeyImage;
const MoneroTx = monerojs.MoneroTx;
const MoneroAltChain = monerojs.MoneroAltChain;
const MoneroDaemonSyncInfo = monerojs.MoneroDaemonSyncInfo;
const MoneroDaemonConnection = monerojs.MoneroDaemonConnection;
const MoneroDaemonPeer = monerojs.MoneroDaemonPeer;
const MoneroKeyImageSpentStatus = monerojs.MoneroKeyImageSpentStatus;

// context for testing binary blocks
// TODO: binary blocks have inconsistent client-side pruning
// TODO: get_blocks_by_height.bin does not return output indices (#5127)
const BINARY_BLOCK_CTX = { hasHex: false, headerIsFull: false, hasTxs: true, ctx: { isPruned: false, isConfirmed: true, fromGetTxPool: false, hasOutputIndices: false, fromBinaryBlock: true } };

/**
 * Tests a Monero daemon.
 */
class TestMoneroDaemonRpc {
  
  constructor(testConfig) {
    this.testConfig = testConfig;
    TestUtils.TX_POOL_WALLET_TRACKER.reset(); // all wallets need to wait for txs to confirm to reliably sync
  }
  
  /**
   * Run all tests.
   */
  runTests() {
    let that = this;
    let testConfig = this.testConfig;
    describe("TEST MONERO DAEMON RPC", function() {
      
      // initialize wallet before all tests
      before(async function() {
        try {
          that.wallet = await TestUtils.getWalletRpc();
          that.daemon = await TestUtils.getDaemonRpc();
          TestUtils.TX_POOL_WALLET_TRACKER.reset(); // all wallets need to wait for txs to confirm to reliably sync
        } catch (e) {
          console.error("Error before tests: ");
          console.error(e);
          throw e;
        }
      });
      
      // -------------------------- TEST NON RELAYS ---------------------------
      
      if (testConfig.testNonRelays)
      it("Can get the daemon's version", async function() {
        let version = await that.daemon.getVersion();
        assert(version.getNumber() > 0);
        assert.equal(typeof version.isRelease(), "boolean");
      });
      
      if (testConfig.testNonRelays)
      it("Can indicate if it's trusted", async function() {
        let isTrusted = await that.daemon.isTrusted();
        assert.equal(typeof isTrusted, "boolean");
      });

      if (testConfig.testNonRelays)
      it("Can get the blockchain height", async function() {
        let height = await that.daemon.getHeight();
        assert(height, "Height must be initialized");
        assert(height > 0, "Height must be greater than 0");
      });

      if (testConfig.testNonRelays)
      it("Can get a block hash by height", async function() {
        let lastHeader = await that.daemon.getLastBlockHeader();
        let hash = await that.daemon.getBlockHash(lastHeader.getHeight());
        assert(hash);
        assert.equal(hash.length, 64);
      });
      
      if (testConfig.testNonRelays)
      it("Can get a block template", async function() {
        let template = await that.daemon.getBlockTemplate(TestUtils.ADDRESS, 2);
        testBlockTemplate(template);
      });

      if (testConfig.testNonRelays)
      it("Can get the last block's header", async function() {
        let lastHeader = await that.daemon.getLastBlockHeader();
        testBlockHeader(lastHeader, true);
      });
      
      if (testConfig.testNonRelays)
      it("Can get a block header by hash", async function() {
        
        // retrieve by hash of last block
        let lastHeader = await that.daemon.getLastBlockHeader();
        let hash = await that.daemon.getBlockHash(lastHeader.getHeight());
        let header = await that.daemon.getBlockHeaderByHash(hash);
        testBlockHeader(header, true);
        assert.deepEqual(header, lastHeader);
        
        // retrieve by hash of previous to last block
        hash = await that.daemon.getBlockHash(lastHeader.getHeight() - 1);
        header = await that.daemon.getBlockHeaderByHash(hash);
        testBlockHeader(header, true);
        assert.equal(header.getHeight(), lastHeader.getHeight() - 1);
      });
      
      if (testConfig.testNonRelays)
      it("Can get a block header by height", async function() {
        
        // retrieve by height of last block
        let lastHeader = await that.daemon.getLastBlockHeader();
        let header = await that.daemon.getBlockHeaderByHeight(lastHeader.getHeight());
        testBlockHeader(header, true);
        assert.deepEqual(header, lastHeader);
        
        // retrieve by height of previous to last block
        header = await that.daemon.getBlockHeaderByHeight(lastHeader.getHeight() - 1);
        testBlockHeader(header, true);
        assert.equal(header.getHeight(), lastHeader.getHeight() - 1);
      });
      
      // TODO: test start with no end, vice versa, inclusivity
      if (testConfig.testNonRelays)
      it("Can get block headers by range", async function() {
        
        // determine start and end height based on number of blocks and how many blocks ago
        let numBlocks = 100;
        let numBlocksAgo = 100;
        let currentHeight = await that.daemon.getHeight();
        let startHeight = currentHeight - numBlocksAgo;
        let endHeight = currentHeight - (numBlocksAgo - numBlocks) - 1;
        
        // fetch headers
        let headers = await that.daemon.getBlockHeadersByRange(startHeight, endHeight);
        
        // test headers
        assert.equal(headers.length, numBlocks);
        for (let i = 0; i < numBlocks; i++) {
          let header = headers[i];
          assert.equal(header.getHeight(), startHeight + i);
          testBlockHeader(header, true);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get a block by hash", async function() {
        
        // context for testing blocks
        let testBlockCtx = { hasHex: true, headerIsFull: true, hasTxs: false };
        
        // retrieve by hash of last block
        let lastHeader = await that.daemon.getLastBlockHeader();
        let hash = await that.daemon.getBlockHash(lastHeader.getHeight());
        let block = await that.daemon.getBlockByHash(hash);
        testBlock(block, testBlockCtx);
        assert.deepEqual(block, await that.daemon.getBlockByHeight(block.getHeight()));
        assert(block.getTxs() === undefined);
        
        // retrieve by hash of previous to last block
        hash = await that.daemon.getBlockHash(lastHeader.getHeight() - 1);
        block = await that.daemon.getBlockByHash(hash);
        testBlock(block, testBlockCtx);
        assert.deepEqual(block, await that.daemon.getBlockByHeight(lastHeader.getHeight() - 1));
        assert(block.getTxs() === undefined);
      });
      
      if (testConfig.testNonRelays)
      it("Can get blocks by hash which includes transactions (binary)", async function() {
        throw new Error("Not implemented");
      })
      
      if (testConfig.testNonRelays)
      it("Can get a block by height", async function() {
        
        // context for testing blocks
        let testBlockCtx = { hasHex: true, headerIsFull: true, hasTxs: false };
        
        // retrieve by height of last block
        let lastHeader = await that.daemon.getLastBlockHeader();
        let block = await that.daemon.getBlockByHeight(lastHeader.getHeight());
        testBlock(block, testBlockCtx);
        assert.deepEqual(block, await that.daemon.getBlockByHeight(block.getHeight()));
        
        // retrieve by height of previous to last block
        block = await that.daemon.getBlockByHeight(lastHeader.getHeight() - 1);
        testBlock(block, testBlockCtx);
        assert.deepEqual(block.getHeight(), lastHeader.getHeight() - 1);
      });

      if (testConfig.testNonRelays)
      it("Can get blocks by height which includes transactions (binary)", async function() {
        
        // set number of blocks to test
        const numBlocks = 200;
        
        // select random heights  // TODO: this is horribly inefficient way of computing last 100 blocks if not shuffling
        let currentHeight = await that.daemon.getHeight();
        let allHeights = [];
        for (let i = 0; i < currentHeight - 1; i++) allHeights.push(i);
        //GenUtils.shuffle(allHeights);
        let heights = [];
        for (let i = allHeights.length - numBlocks; i < allHeights.length; i++) heights.push(allHeights[i]);
        
        // fetch blocks
        let blocks = await that.daemon.getBlocksByHeight(heights);
        
        // test blocks
        let txFound = false;
        assert.equal(blocks.length, numBlocks);
        for (let i = 0; i < heights.length; i++) {
          let block = blocks[i];
          if (block.getTxs().length) txFound = true;
          testBlock(block, BINARY_BLOCK_CTX);
          assert.equal(block.getHeight(), heights[i]);      
        }
        assert(txFound, "No transactions found to test");
      });
      
      if (testConfig.testNonRelays)
      it("Can get blocks by range in a single request", async function() {
        
        // get height range
        let numBlocks = 100;
        let numBlocksAgo = 190;
        assert(numBlocks > 0);
        assert(numBlocksAgo >= numBlocks);
        let height = await that.daemon.getHeight();
        assert(height - numBlocksAgo + numBlocks - 1 < height);
        let startHeight = height - numBlocksAgo;
        let endHeight = height - numBlocksAgo + numBlocks - 1;
        
        // test known start and end heights
        await testGetBlocksRange(startHeight, endHeight, height, false);
        
        // test unspecified start
        await testGetBlocksRange(undefined, numBlocks - 1, height, false);
        
        // test unspecified end
        await testGetBlocksRange(height - numBlocks - 1, undefined, height, false);
      });
      
      // Can get blocks by range using chunked requests
      if (testConfig.testNonRelays)
      it("Can get blocks by range using chunked requests", async function() {
        
        // get long height range
        let numBlocks = 1000;
        assert(numBlocks > 0);
        let height = await that.daemon.getHeight();
        assert(height - numBlocks - 1 < height);
        let startHeight = height - numBlocks;
        let endHeight = height - 1;
        
        // test known start and end heights
        await testGetBlocksRange(startHeight, endHeight, height, true);
        
        // test unspecified start
        await testGetBlocksRange(undefined, numBlocks - 1, height, true);
        
        // test unspecified end
        await testGetBlocksRange(endHeight - numBlocks - 1, undefined, height, true);
      });
      
      async function testGetBlocksRange(startHeight, endHeight, chainHeight, chunked) {
        
        // fetch blocks by range
        let realStartHeight = startHeight === undefined ? 0 : startHeight;
        let realEndHeight = endHeight === undefined ? chainHeight - 1 : endHeight;
        let blocks = chunked ? await that.daemon.getBlocksByRangeChunked(startHeight, endHeight) : await that.daemon.getBlocksByRange(startHeight, endHeight);
        assert.equal(blocks.length, realEndHeight - realStartHeight + 1);
        
        // test each block
        for (let i = 0; i < blocks.length; i++) {
          assert.equal(blocks[i].getHeight(), realStartHeight + i);
          testBlock(blocks[i], BINARY_BLOCK_CTX);
        }
      }
      
      if (testConfig.testNonRelays)
      it("Can get block hashes (binary)", async function() {
        //get_hashes.bin
        throw new Error("Not implemented");
      });
      
      if (testConfig.testNonRelays)
      it("Can get a transaction by hash with and without pruning", async function() {
        
        // fetch transaction hashes to test
        let txHashes = await getConfirmedTxHashes(that.daemon);
        
        // fetch each tx by hash without pruning
        for (let txHash of txHashes) {
          let tx = await that.daemon.getTx(txHash);
          testTx(tx, {isPruned: false, isConfirmed: true, fromGetTxPool: false});
        }
        
        // fetch each tx by hash with pruning
        for (let txHash of txHashes) {
          let tx = await that.daemon.getTx(txHash, true);
          testTx(tx, {isPruned: true, isConfirmed: true, fromGetTxPool: false});
        }
        
        // fetch invalid hash
        try {
          await that.daemon.getTx("invalid tx hash");
          throw new Error("fail");
        } catch (e) {
          assert.equal("Invalid transaction hash", e.message);
        }
      });
      
      if (testConfig.testNonRelays)
      it ("Can get transactions by hashes with and without pruning", async function() {
        
        // fetch transaction hashes to test
        let txHashes = await getConfirmedTxHashes(that.daemon);
        
        // fetch txs by hash without pruning
        let txs = await that.daemon.getTxs(txHashes);
        assert.equal(txs.length, txHashes.length);
        for (let tx of txs) {
          testTx(tx, {isPruned: false, isConfirmed: true, fromGetTxPool: false});
        }
        
        // fetch txs by hash with pruning
        txs = await that.daemon.getTxs(txHashes, true);
        assert.equal(txs.length, txHashes.length);
        for (let tx of txs) {
          testTx(tx, {isPruned: true, isConfirmed: true, fromGetTxPool: false});
        }
        
        // fetch invalid hash
        txHashes.push("invalid tx hash");
        try {
          await that.daemon.getTxs(txHashes);
          throw new Error("fail");
        } catch (e) {
          assert.equal("Invalid transaction hash", e.message);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get transactions by hashes that are in the transaction pool", async function() {
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(that.wallet); // wait for wallet's txs in the pool to clear to ensure reliable sync
        
        // submit txs to the pool but don't relay
        let txHashes = [];
        for (let i = 1; i < 3; i++) {
          let tx = await getUnrelayedTx(that.wallet, i);
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          testSubmitTxResultGood(result);
          assert.equal(result.isRelayed(), false);
          txHashes.push(tx.getHash());
        }
        
        // fetch txs by hash
        let txs = await that.daemon.getTxs(txHashes);
        
        // test fetched txs
        assert.equal(txs.length, txHashes.length);
        for (let tx of txs) {
          testTx(tx, {isConfirmed: false, fromGetTxPool: false, isPruned: false});
        }
        
        // clear txs from pool
        await that.daemon.flushTxPool(txHashes);
        await that.wallet.sync();
      });
      
      if (testConfig.testNonRelays)
      it("Can get a transaction hex by hash with and without pruning", async function() {
        
        // fetch transaction hashes to test
        let txHashes = await getConfirmedTxHashes(that.daemon);
        
        // fetch each tx hex by hash with and without pruning
        let hexes = []
        let hexesPruned = [];
        for (let txHash of txHashes) {
          hexes.push(await that.daemon.getTxHex(txHash));
          hexesPruned.push(await that.daemon.getTxHex(txHash, true));
        }
        
        // test results
        assert.equal(hexes.length, txHashes.length);
        assert.equal(hexesPruned.length, txHashes.length);
        for (let i = 0; i < hexes.length; i++) {
          assert.equal(typeof hexes[i], "string");
          assert.equal(typeof hexesPruned[i], "string");
          assert(hexesPruned[i].length > 0);
          assert(hexes[i].length > hexesPruned[i].length); // pruned hex is shorter
        }
        
        // fetch invalid hash
        try {
          await that.daemon.getTxHex("invalid tx hash");
          throw new Error("fail");
        } catch (e) {
          assert.equal("Invalid transaction hash", e.message);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get transaction hexes by hashes with and without pruning", async function() {
        
        // fetch transaction hashes to test
        let txHashes = await getConfirmedTxHashes(that.daemon);
        
        // fetch tx hexes by hash with and without pruning
        let hexes = await that.daemon.getTxHexes(txHashes);
        let hexesPruned = await that.daemon.getTxHexes(txHashes, true);
        
        // test results
        assert.equal(hexes.length, txHashes.length);
        assert.equal(hexesPruned.length, txHashes.length);
        for (let i = 0; i < hexes.length; i++) {
          assert.equal(typeof hexes[i], "string");
          assert.equal(typeof hexesPruned[i], "string");
          assert(hexesPruned[i].length > 0);
          assert(hexes[i].length > hexesPruned[i].length); // pruned hex is shorter
        }
        
        // fetch invalid hash
        txHashes.push("invalid tx hash");
        try {
          await that.daemon.getTxHexes(txHashes);
          throw new Error("fail");
        } catch (e) {
          assert.equal("Invalid transaction hash", e.message);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get the miner transaction sum", async function() {
        let sum = await that.daemon.getMinerTxSum(0, 50000);
        testMinerTxSum(sum);
      });
      
      if (testConfig.testNonRelays)
      it("Can get a fee estimate", async function() {
        let fee = await that.daemon.getFeeEstimate();
        TestUtils.testUnsignedBigInteger(fee, true);
      });
      
      if (testConfig.testNonRelays)
      it("Can get all transactions in the transaction pool", async function() {
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        
        // submit tx to pool but don't relay
        let tx = await getUnrelayedTx(that.wallet, 0);
        let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
        testSubmitTxResultGood(result);
        assert.equal(result.isRelayed(), false);
        
        // fetch txs in pool
        let txs = await that.daemon.getTxPool();
        
        // test txs
        assert(Array.isArray(txs));
        assert(txs.length > 0, "Test requires an unconfirmed tx in the tx pool");
        for (let tx of txs) {
          testTx(tx, { isPruned: false, isConfirmed: false, fromGetTxPool: true });
        }
        
        // flush the tx from the pool, gg
        await that.daemon.flushTxPool(tx.getHash());
        await that.wallet.sync();
      });
      
      if (testConfig.testNonRelays)
      it("Can get hashes of transactions in the transaction pool (binary)", async function() {
        // TODO: get_transaction_pool_hashes.bin
        throw new Error("Not implemented");
      });
      
      if (testConfig.testNonRelays)
      it("Can get the transaction pool backlog (binary)", async function() {
        // TODO: get_txpool_backlog
        throw new Error("Not implemented");
      });
      
      if (testConfig.testNonRelays)
      it("Can get transaction pool statistics (binary)", async function() {
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        
        // submit txs to the pool but don't relay (multiple txs result in binary `histo` field)
        for (let i = 0; i < 2; i++) {
          
          // submit tx hex
          let tx = await getUnrelayedTx(that.wallet, i);
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          assert.equal(result.isGood(), true);
          
          // test stats
          try {
            stats = await that.daemon.getTxPoolStats();
            assert(stats.getNumTxs() > i);
            testTxPoolStats(stats);
          } finally {
            await that.daemon.flushTxPool(tx.getHash());
            await that.wallet.sync();
          }
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can flush all transactions from the pool", async function() {
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        
        // preserve original transactions in the pool
        let txPoolBefore = await that.daemon.getTxPool();
        
        // submit txs to the pool but don't relay
        for (let i = 0; i < 2; i++) {
          let tx = await getUnrelayedTx(that.wallet, i);
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          testSubmitTxResultGood(result);
        }
        assert.equal((await that.daemon.getTxPool()).length, txPoolBefore.length + 2);
        
        // flush tx pool
        await that.daemon.flushTxPool();
        assert.equal((await that.daemon.getTxPool()).length, 0);
        
        // re-submit original transactions
        for (let tx of txPoolBefore) {
          let result = await that.daemon.submitTxHex(tx.getFullHex(), tx.isRelayed());
          testSubmitTxResultGood(result);
        }
        
        // pool is back to original state
        assert.equal((await that.daemon.getTxPool()).length, txPoolBefore.length);
        
        // sync wallet for next test
        await that.wallet.sync();
      });
      
      if (testConfig.testNonRelays)
      it("Can flush a transaction from the pool by hash", async function() {
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        
        // preserve original transactions in the pool
        let txPoolBefore = await that.daemon.getTxPool();
        
        // submit txs to the pool but don't relay
        let txs = [];
        for (let i = 1; i < 3; i++) {
          let tx = await getUnrelayedTx(that.wallet, i);
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          testSubmitTxResultGood(result);
          txs.push(tx);
        }

        // remove each tx from the pool by hash and test
        for (let i = 0; i < txs.length; i++) {
          
          // flush tx from pool
          await that.daemon.flushTxPool(txs[i].getHash());
          
          // test tx pool
          let poolTxs = await that.daemon.getTxPool();
          assert.equal(poolTxs.length, txs.length - i - 1);
        }
        
        // pool is back to original state
        assert.equal((await that.daemon.getTxPool()).length, txPoolBefore.length);
        
        // sync wallet for next test
        await that.wallet.sync();
      });
      
      if (testConfig.testNonRelays)
      it("Can flush transactions from the pool by hashes", async function() {
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        
        // preserve original transactions in the pool
        let txPoolBefore = await that.daemon.getTxPool();
        
        // submit txs to the pool but don't relay
        let txHashes = [];
        for (let i = 1; i < 3; i++) {
          let tx = await getUnrelayedTx(that.wallet, i);
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          testSubmitTxResultGood(result);
          txHashes.push(tx.getHash());
        }
        assert.equal((await that.daemon.getTxPool()).length, txPoolBefore.length + txHashes.length);
        
        // remove all txs by hashes
        await that.daemon.flushTxPool(txHashes);
        
        // pool is back to original state
        assert.equal((await that.daemon.getTxPool()).length, txPoolBefore.length, "Tx pool size is different from start");
        await that.wallet.sync();
      });
      
      if (testConfig.testNonRelays)
      it("Can get the spent status of key images", async function() {
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        
        // submit txs to the pool to collect key images then flush them
        let txs = [];
        for (let i = 1; i < 3; i++) {
          let tx = await getUnrelayedTx(that.wallet, i);
          await that.daemon.submitTxHex(tx.getFullHex(), true);
          txs.push(tx);
        }
        let keyImages = [];
        let txHashes = txs.map(tx => tx.getHash());
        for (let tx of await that.daemon.getTxs(txHashes)) {
          for (let input of tx.getInputs()) keyImages.push(input.getKeyImage().getHex());
        }
        await that.daemon.flushTxPool(txHashes);
        
        // key images are not spent
        await testSpentStatuses(keyImages, MoneroKeyImageSpentStatus.NOT_SPENT);
        
        // submit txs to the pool but don't relay
        for (let tx of txs) await that.daemon.submitTxHex(tx.getFullHex(), true);
        
        // key images are in the tx pool
        await testSpentStatuses(keyImages, MoneroKeyImageSpentStatus.TX_POOL);
        
        // collect key images of confirmed txs
        keyImages = [];
        txs = await getConfirmedTxs(that.daemon, 10);
        for (let tx of txs) {
          for (let input of tx.getInputs()) keyImages.push(input.getKeyImage().getHex());
        }
        
        // key images are all spent
        await testSpentStatuses(keyImages, MoneroKeyImageSpentStatus.CONFIRMED);
        
        // flush this test's txs from pool
        await that.daemon.flushTxPool(txHashes);
        
        // helper function to check the spent status of a key image or array of key images
        async function testSpentStatuses(keyImages, expectedStatus) {
          
          // test image
          for (let keyImage of keyImages) {
            assert.equal(await that.daemon.getKeyImageSpentStatus(keyImage), expectedStatus);
          }
          
          // test array of images
          let statuses = keyImages.length == 0 ? [] : await that.daemon.getKeyImageSpentStatuses(keyImages);
          assert(Array.isArray(statuses));
          assert.equal(statuses.length, keyImages.length);
          for (let status of statuses) assert.equal(status, expectedStatus);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get output indices given a list of transaction hashes (binary)", async function() {
        throw new Error("Not implemented"); // get_o_indexes.bin
      });
      
      if (testConfig.testNonRelays)
      it("Can get outputs given a list of output amounts and indices (binary)", async function() {
        throw new Error("Not implemented"); // get_outs.bin
      });
      
      if (testConfig.testNonRelays)
      it("Can get an output histogram (binary)", async function() {
        let entries = await that.daemon.getOutputHistogram();
        assert(Array.isArray(entries));
        assert(entries.length > 0);
        for (let entry of entries) {
          testOutputHistogramEntry(entry);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get an output distribution (binary)", async function() {
        let amounts = [];
        amounts.push(new BigInteger(0));
        amounts.push(new BigInteger(1));
        amounts.push(new BigInteger(10));
        amounts.push(new BigInteger(100));
        amounts.push(new BigInteger(1000));
        amounts.push(new BigInteger(10000));
        amounts.push(new BigInteger(100000));
        amounts.push(new BigInteger(1000000));
        let entries = await that.daemon.getOutputDistribution(amounts);
        for (let entry of entries) {
          testOutputDistributionEntry(entry);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get general information", async function() {
        let info = await that.daemon.getInfo();
        testInfo(info);
      });
      
      if (testConfig.testNonRelays)
      it("Can get sync information", async function() {
        let syncInfo = await that.daemon.getSyncInfo();
        testSyncInfo(syncInfo);
      });
      
      if (testConfig.testNonRelays)
      it("Can get hard fork information", async function() {
        let hardForkInfo = await that.daemon.getHardForkInfo();
        testHardForkInfo(hardForkInfo);
      });
      
      if (testConfig.testNonRelays)
      it("Can get alternative chains", async function() {
        let altChains = await that.daemon.getAltChains();
        assert(Array.isArray(altChains) && altChains.length >= 0);
        for (let altChain of altChains) {
          testAltChain(altChain);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get alternative block hashes", async function() {
        let altBlockHashes = await that.daemon.getAltBlockHashes();
        assert(Array.isArray(altBlockHashes) && altBlockHashes.length >= 0);
        for (let altBlockHash of altBlockHashes) {
          assert.equal(typeof altBlockHash, "string");
          assert.equal(altBlockHash.length, 64);  // TODO: common validation
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get, set, and reset a download bandwidth limit", async function() {
        let initVal = await that.daemon.getDownloadLimit();
        assert(initVal > 0);
        let setVal = initVal * 2;
        await that.daemon.setDownloadLimit(setVal);
        assert.equal(await that.daemon.getDownloadLimit(), setVal);
        let resetVal = await that.daemon.resetDownloadLimit();
        assert.equal(resetVal, initVal);
        
        // test invalid limits
        try {
          await that.daemon.setDownloadLimit();
          fail("Should have thrown error on invalid input");
        } catch (e) {
          assert.equal("Download limit must be an integer greater than 0", e.message);
        }
        try {
          await that.daemon.setDownloadLimit(0);
          fail("Should have thrown error on invalid input");
        } catch (e) {
          assert.equal("Download limit must be an integer greater than 0", e.message);
        }
        try {
          await that.daemon.setDownloadLimit(1.2);
          fail("Should have thrown error on invalid input");
        } catch (e) {
          assert.equal("Download limit must be an integer greater than 0", e.message);
        }
        assert.equal(await that.daemon.getDownloadLimit(), initVal);
      });
      
      if (testConfig.testNonRelays)
      it("Can get, set, and reset an upload bandwidth limit", async function() {
        let initVal = await that.daemon.getUploadLimit();
        assert(initVal > 0);
        let setVal = initVal * 2;
        await that.daemon.setUploadLimit(setVal);
        assert.equal(await that.daemon.getUploadLimit(), setVal);
        let resetVal = await that.daemon.resetUploadLimit();
        assert.equal(resetVal, initVal);
        
        // test invalid limits
        try {
          await that.daemon.setUploadLimit();
          fail("Should have thrown error on invalid input");
        } catch (e) {
          assert.equal("Upload limit must be an integer greater than 0", e.message);
        }
        try {
          await that.daemon.setUploadLimit(0);
          fail("Should have thrown error on invalid input");
        } catch (e) {
          assert.equal("Upload limit must be an integer greater than 0", e.message);
        }
        try {
          await that.daemon.setUploadLimit(1.2);
          fail("Should have thrown error on invalid input");
        } catch (e) {
          assert.equal("Upload limit must be an integer greater than 0", e.message);
        }
        assert.equal(await that.daemon.getUploadLimit(), initVal);
      });

      if (testConfig.testNonRelays)
      it("Can get known peers which may be online or offline", async function() {
        let peers = await that.daemon.getKnownPeers();
        assert(peers.length > 0, "Daemon has no known peers to test");
        for (let peer of peers) {
          testKnownPeer(peer);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can get incoming and outgoing peer connections", async function() {
        let connections = await that.daemon.getConnections();
        assert(Array.isArray(connections));
        assert(connections.length > 0, "Daemon has no incoming or outgoing connections to test");
        for (let connection of connections) {
          testDaemonConnection(connection);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can limit the number of outgoing peers", async function() {
        await that.daemon.setOutgoingPeerLimit(0);
        await that.daemon.setOutgoingPeerLimit(8);
        await that.daemon.setOutgoingPeerLimit(10);
        try {
          await that.daemon.setOutgoingPeerLimit("a");
          throw new Error("Should have failed on invalid input");
        } catch(e) {
          assert.notEqual("Should have failed on invalid input", e.message);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can limit the number of incoming peers", async function() {
        await that.daemon.setIncomingPeerLimit(0);
        await that.daemon.setIncomingPeerLimit(8);
        await that.daemon.setIncomingPeerLimit(10);
        try {
          await that.daemon.setIncomingPeerLimit("a");
          throw new Error("Should have failed on invalid input");
        } catch(e) {
          assert.notEqual("Should have failed on invalid input", e.message);
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can ban a peer", async function() {
        
        // set ban
        let ban = new MoneroBan();
        ban.setHost("192.168.1.56");
        ban.setIsBanned(true);
        ban.setSeconds(60);
        await that.daemon.setPeerBan(ban);
        
        // test ban
        let bans = await that.daemon.getPeerBans();
        let found = false;
        for (let aBan of bans) {
          testMoneroBan(aBan);
          if (aBan.getHost() === "192.168.1.56") found = true;
        }
        assert(found);
      });
      
      if (testConfig.testNonRelays)
      it("Can ban peers", async function() {
        
        // set bans
        let ban1 = new MoneroBan();
        ban1.setHost("192.168.1.52");
        ban1.setIsBanned(true);
        ban1.setSeconds(60);
        let ban2 = new MoneroBan();
        ban2.setHost("192.168.1.53");
        ban2.setIsBanned(true);
        ban2.setSeconds(60);
        let bans = [];
        bans.push(ban1);
        bans.push(ban2);
        await that.daemon.setPeerBans(bans);
        
        // test bans
        bans = await that.daemon.getPeerBans();
        let found1 = false;
        let found2 = false;
        for (let aBan of bans) {
          testMoneroBan(aBan);
          if (aBan.getHost() === "192.168.1.52") found1 = true;
          if (aBan.getHost() === "192.168.1.53") found2 = true;
        }
        assert(found1);
        assert(found2);
      });
      
      if (testConfig.testNonRelays)
      it("Can start and stop mining", async function() {
        
        // stop mining at beginning of test
        try { await that.daemon.stopMining(); }
        catch(e) { }
        
        // generate address to mine to
        let address = await that.wallet.getPrimaryAddress();
        
        // start mining
        await that.daemon.startMining(address, 2, false, true);
        
        // stop mining
        await that.daemon.stopMining();
      });
      
      if (testConfig.testNonRelays)
      it("Can get mining status", async function() {
        
        try {
          
          // stop mining at beginning of test
          try { await that.daemon.stopMining(); }
          catch(e) { }
          
          // test status without mining
          let status = await that.daemon.getMiningStatus();
          assert.equal(status.isActive(), false);
          assert.equal(status.getAddress(), undefined);
          assert.equal(status.getSpeed(), 0);
          assert.equal(status.getNumThreads(), 0);
          assert.equal(status.isBackground(), undefined);
          
          // test status with mining
          let address = await that.wallet.getPrimaryAddress();
          let threadCount = 3;
          let isBackground = false;
          await that.daemon.startMining(address, threadCount, isBackground, true);
          status = await that.daemon.getMiningStatus();
          assert.equal(status.isActive(), true);
          assert.equal(status.getAddress(), address);
          assert(status.getSpeed() >= 0);
          assert.equal(status.getNumThreads(), threadCount);
          assert.equal(status.isBackground(), isBackground);
        } catch(e) {
          throw e;
        } finally {
          
          // stop mining at end of test
          try { await that.daemon.stopMining(); }
          catch(e) { }
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can submit a mined block to the network", async function() {
        
        // get template to mine on
        let template = await that.daemon.getBlockTemplate(TestUtils.ADDRESS);
        
        // TODO test mining and submitting block
        
        // try to submit block hashing blob without nonce
        try {
          await that.daemon.submitBlock(template.getBlockHashingBlob());
          fail("Should have thrown error");
        } catch (e) {
          assert.equal(e.getCode(), -7);
          assert.equal(e.message, "Block not accepted");
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can check for an update", async function() {
        let result = await that.daemon.checkForUpdate();
        testUpdateCheckResult(result);
      });
      
      if (testConfig.testNonRelays)
      it("Can download an update", async function() {
        
        // download to default path
        let result = await that.daemon.downloadUpdate();
        testUpdateDownloadResult(result);
        
        // download to defined path
        let path = "test_download_" + +new Date().getTime() + ".tar.bz2";
        result = await that.daemon.downloadUpdate(path);
        testUpdateDownloadResult(result, path);
        
        // test invalid path
        if (result.isUpdateAvailable()) {
          try {
            result = await that.daemon.downloadUpdate("./ohhai/there");
            throw new Error("Should have thrown error");
          } catch(e) {
            assert.notEqual("Should have thrown error", e.message);
            assert.equal(e.statusCode, 500);  // TODO monero-daemon-rpc: this causes a 500 in that.daemon rpc
          }
        }
      });
      
      if (testConfig.testNonRelays)
      it("Can be stopped", async function() {
        return; // test is disabled to not interfere with other tests
        
        // give the that.daemon time to shut down
        await new Promise(function(resolve) { setTimeout(resolve, MoneroUtils.WALLET_REFRESH_RATE); });
        
        // stop the that.daemon
        await that.daemon.stop();
        
        // give the that.daemon 10 seconds to shut down
        await new Promise(function(resolve) { setTimeout(resolve, 10000); }); 
        
        // try to interact with the that.daemon
        try {
          await that.daemon.getHeight();
          throw new Error("Should have thrown error");
        } catch(e) {
          console.log(e);
          assert.notEqual("Should have thrown error", e.message);
        }
      });
      
      // ---------------------------- TEST RELAYS -----------------------------
      
      if (testConfig.testRelays)
      it("Can submit a tx in hex format to the pool and relay in one call", async function() {
        
        // wait one time for wallet txs in the pool to clear
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        
        // create 2 txs, the second will double spend outputs of first
        let tx1 = await getUnrelayedTx(that.wallet, 2);  // TODO: this test requires tx to be from/to different accounts else the occlusion issue (#4500) causes the tx to not be recognized by the wallet at all
        let tx2 = await getUnrelayedTx(that.wallet, 2);
        
        // submit and relay tx1
        let result = await that.daemon.submitTxHex(tx1.getFullHex());
        assert.equal(result.isRelayed(), true);
        testSubmitTxResultGood(result);
        
        // tx1 is in the pool
        let txs = await that.daemon.getTxPool();
        let found = false;
        for (let aTx of txs) {
          if (aTx.getHash() === tx1.getHash()) {
            assert.equal(aTx.isRelayed(), true);
            found = true;
            break;
          }
        }
        assert(found, "Tx1 was not found after being submitted to the that.daemon's tx pool");
        
        // tx1 is recognized by the wallet
        await that.wallet.sync();
        await that.wallet.getTx(tx1.getHash());
        
        // submit and relay tx2 hex which double spends tx1
        result = await that.daemon.submitTxHex(tx2.getFullHex());
        assert.equal(result.isRelayed(), true);
        testSubmitTxResultDoubleSpend(result);
        
        // tx2 is in not the pool
        txs = await that.daemon.getTxPool();
        found = false;
        for (let aTx of txs) {
          if (aTx.getHash() === tx2.getHash()) {
            found = true;
            break;
          }
        }
        assert(!found, "Tx2 should not be in the pool because it double spends tx1 which is in the pool");
        
        // all wallets will need to wait for tx to confirm in order to properly sync
        TestUtils.TX_POOL_WALLET_TRACKER.reset();
      });
      
      if (testConfig.testRelays && !testConfig.liteMode)
      it("Can submit a tx in hex format to the pool then relay", async function() {
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        let tx = await getUnrelayedTx(that.wallet, 1);
        await testSubmitThenRelay([tx]);
      });
      
      if (testConfig.testRelays && !testConfig.liteMode)
      it("Can submit txs in hex format to the pool then relay", async function() {
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(that.wallet);
        let txs = [];
        txs.push(await getUnrelayedTx(that.wallet, 2));
        txs.push(await getUnrelayedTx(that.wallet, 3));  // TODO: accounts cannot be re-used across send tests else isRelayed is true; wallet needs to update?
        await testSubmitThenRelay(txs);
      });
      
      async function testSubmitThenRelay(txs) {
        
        // submit txs hex but don't relay
        let txHashes = [];
        for (let tx of txs) {
          txHashes.push(tx.getHash());
          let result = await that.daemon.submitTxHex(tx.getFullHex(), true);
          testSubmitTxResultGood(result);
          assert.equal(result.isRelayed(), false);
          
          // ensure tx is in pool
          let poolTxs = await that.daemon.getTxPool();
          let found = false;
          for (let aTx of poolTxs) {
            if (aTx.getHash() === tx.getHash()) {
              assert.equal(aTx.isRelayed(), false);
              found = true;
              break;
            }
          }
          assert(found, "Tx was not found after being submitted to the that.daemon's tx pool");
          
          // fetch tx by hash and ensure not relayed
          let fetchedTx = await that.daemon.getTx(tx.getHash());
          assert.equal(fetchedTx.isRelayed(), false);
        }
        
        // relay the txs
        try {
          txHashes.length === 1 ? await that.daemon.relayTxByHash(txHashes[0]) : await that.daemon.relayTxsByHash(txHashes);
        } catch (e) {
          await that.daemon.flushTxPool(txHashes); // flush txs when relay fails to prevent double spends in other tests  
          throw e;
        }
        
        // ensure txs are relayed
        for (let tx of txs) {
          let poolTxs = await that.daemon.getTxPool();
          let found = false;
          for (let aTx of poolTxs) {
            if (aTx.getHash() === tx.getHash()) {
              assert.equal(aTx.isRelayed(), true);
              found = true;
              break;
            }
          }
          assert(found, "Tx was not found after being submitted to the that.daemon's tx pool");
        }
        
        // wallets will need to wait for tx to confirm in order to properly sync
        TestUtils.TX_POOL_WALLET_TRACKER.reset();
      }
      
      // ------------------------ TEST NOTIFICATIONS --------------------------
      
      if (!testConfig.liteMode && testConfig.testNotifications)
      it("Can notify listeners when a new block is added to the chain", async function() {
        let err;
        try {
          
          // start mining if possible to help push the network along
          let address = await that.wallet.getPrimaryAddress();
          try { await that.daemon.startMining(address, 8, false, true); }
          catch (e) { if ("BUSY" === e.message) throw e; }
          
          // register a listener
          let listenerHeader;
          let listener = async function(header) {
            listenerHeader = header;
            await that.daemon.removeBlockListener(listener); // otherwise daemon will keep polling
          }
          await that.daemon.addBlockListener(listener);
          
          // wait for next block notification
          let header = await that.daemon.getNextBlockHeader();
          testBlockHeader(header, true);
          
          // test that listener was called with equivalent header
          assert.deepEqual(listenerHeader, header);
        } catch (e) {
          err = e;
        }
        
        // finally
        try { await that.daemon.stopMining(); }
        catch (e) { }
        if (err) throw err;
      });
    });
  }
}

function testBlockHeader(header, isFull) {
  assert(typeof isFull === "boolean");
  assert(header);
  assert(header.getHeight() >= 0);
  assert(header.getMajorVersion() >= 0);
  assert(header.getMinorVersion() >= 0);
  assert(header.getTimestamp() >= 0);
  assert(header.getPrevHash());
  assert(header.getNonce());
  assert.equal(typeof header.getNonce(), "number");
  assert(header.getPowHash() === undefined);  // never seen defined
  assert(!isFull ? undefined === header.getSize() : header.getSize());
  assert(!isFull ? undefined === header.getDepth() : header.getDepth() >= 0);
  assert(!isFull ? undefined === header.getDifficulty() : header.getDifficulty().toJSValue() > 0);
  assert(!isFull ? undefined === header.getCumulativeDifficulty() : header.getCumulativeDifficulty().toJSValue() > 0);
  assert(!isFull ? undefined === header.getHash() : header.getHash().length === 64);
  assert(!isFull ? undefined === header.getMinerTxHash() : header.getMinerTxHash().length === 64);
  assert(!isFull ? undefined === header.getNumTxs() : header.getNumTxs() >= 0);
  assert(!isFull ? undefined === header.getOrphanStatus() : typeof header.getOrphanStatus() === "boolean");
  assert(!isFull ? undefined === header.getReward() : header.getReward());
  assert(!isFull ? undefined === header.getWeight() : header.getWeight());
}

// TODO: test block deep copy
function testBlock(block, ctx) {
  
  // check inputs
  assert(ctx);
  assert.equal(typeof ctx.hasHex, "boolean");
  assert.equal(typeof ctx.headerIsFull, "boolean");
  assert.equal(typeof ctx.hasTxs, "boolean");
  
  // test required fields
  assert(block);
  assert(Array.isArray(block.getTxHashes())); // TODO: tx hashes probably part of tx
  assert(block.getTxHashes().length >= 0);
  testMinerTx(block.getMinerTx());   // TODO: miner tx doesn't have as much stuff, can't call testTx?
  testBlockHeader(block, ctx.headerIsFull);
  
  if (ctx.hasHex) {
    assert(block.getHex());
    assert(block.getHex().length > 1);
  } else {
    assert(block.getHex() === undefined)
  }
  
  if (ctx.hasTxs) {
    assert(typeof ctx.ctx === "object");
    assert(block.getTxs() instanceof Array);
    for (let tx of block.getTxs()) {
      assert(block === tx.getBlock());
      testTx(tx, ctx.ctx);
    }
  } else {
    assert(ctx.ctx === undefined);
    assert(block.getTxs() === undefined);
  }
}

function testMinerTx(minerTx) {
  assert(minerTx);
  assert(minerTx instanceof MoneroTx);
  assert.equal(typeof minerTx.isMinerTx(), "boolean");
  assert(minerTx.isMinerTx());
  
  assert(minerTx.getVersion() >= 0);
  assert(Array.isArray(minerTx.getExtra()));
  assert(minerTx.getExtra().length > 0);
  assert(minerTx.getUnlockTime() >= 0);

  // TODO: miner tx does not have hashes in binary requests so this will fail, need to derive using prunable data
//  testTx(minerTx, {
//    hasJson: false,
//    isPruned: true,
//    isFull: false,
//    isConfirmed: true,
//    isMinerTx: true,
//    fromGetTxPool: false,
//  })
}

// TODO: how to test output indices? comes back with /get_transactions, maybe others
function testTx(tx, ctx) {
  
  // check inputs
  assert(tx);
  assert.equal(typeof ctx, "object");
  assert.equal(typeof ctx.isPruned, "boolean");
  assert.equal(typeof ctx.isConfirmed, "boolean");
  assert.equal(typeof ctx.fromGetTxPool, "boolean");
  
  // standard across all txs
  assert(tx.getHash().length === 64);
  if (tx.isRelayed() === undefined) assert(tx.inTxPool());  // TODO monero-daemon-rpc: add relayed to get_transactions
  else assert.equal(typeof tx.isRelayed(), "boolean");
  assert.equal(typeof tx.isConfirmed(), "boolean");
  assert.equal(typeof tx.inTxPool(), "boolean");
  assert.equal(typeof tx.isMinerTx(), "boolean");
  assert.equal(typeof tx.isDoubleSpendSeen(), "boolean");
  assert(tx.getVersion() >= 0);
  assert(tx.getUnlockTime() >= 0);
  assert(tx.getInputs());
  assert(tx.getOutputs());
  assert(tx.getExtra().length > 0);
  
  // test presence of output indices
  // TODO: change this over to outputs only
  if (tx.isMinerTx()) assert.equal(tx.getOutputIndices(), undefined); // TODO: how to get output indices for miner transactions?
  if (tx.inTxPool() || ctx.fromGetTxPool || ctx.hasOutputIndices === false) assert.equal(tx.getOutputIndices(), undefined);
  else assert(tx.getOutputIndices());
  if (tx.getOutputIndices()) assert(tx.getOutputIndices().length > 0);
  
  // test confirmed ctx
  if (ctx.isConfirmed === true) assert.equal(tx.isConfirmed(), true);
  if (ctx.isConfirmed === false) assert.equal(tx.isConfirmed(), false);
  
  // test confirmed
  if (tx.isConfirmed()) {
    assert(tx.getBlock());
    assert(tx.getBlock().getTxs().includes(tx));
    assert(tx.getBlock().getHeight() > 0);
    assert(tx.getBlock().getTimestamp() > 0);
    assert.equal(tx.isRelayed(), true);
    assert.equal(tx.isFailed(), false);
    assert.equal(tx.inTxPool(), false);
    assert.equal(tx.getRelay(), true);
    assert.equal(tx.isDoubleSpendSeen(), false);
    assert.equal(tx.getNumConfirmations(), undefined); // client must compute
  } else {
    assert.equal(tx.getBlock(), undefined);
    assert.equal(tx.getNumConfirmations(), 0);
  }
  
  // test in tx pool
  if (tx.inTxPool()) {
    assert.equal(tx.isConfirmed(), false);
    assert.equal(tx.isDoubleSpendSeen(), false);
    assert.equal(tx.getLastFailedHeight(), undefined);
    assert.equal(tx.getLastFailedHash(), undefined);
    assert(tx.getReceivedTimestamp() > 0);
    assert(tx.getSize() > 0);
    assert(tx.getWeight() > 0);
    assert.equal(typeof tx.isKeptByBlock(), "boolean");
    assert.equal(tx.getLastFailedHeight(), undefined);
    assert.equal(tx.getLastFailedHash(), undefined);
    assert(tx.getMaxUsedBlockHeight() >= 0);
    assert(tx.getMaxUsedBlockHash());
  } else {
    assert.equal(tx.getLastRelayedTimestamp(), undefined);
  }
  
  // test miner tx
  if (tx.isMinerTx()) {
    assert.equal(tx.getFee().compare(new BigInteger(0)), 0);
    assert(tx.getIncomingTransfers().length > 0); // TODO: MoneroTx does not have getIncomingTransfers() but this doesn't fail?
    assert.equal(tx.getInputs(), undefined);
    assert.equal(tx.getSignatures(), undefined);
  } else {
    if (tx.getSignatures() !== undefined) assert(tx.getSignatures().length > 0)
  }
  
  // test failed  // TODO: what else to test associated with failed
  if (tx.isFailed()) {
    assert(tx.getOutgoingTransfer() instanceof MoneroTransfer); // TODO: MoneroTx does not have getOutgoingTransfer() but this doesn't fail?
    assert(tx.getReceivedTimestamp() > 0)
  } else {
    if (tx.isRelayed() === undefined) assert.equal(tx.getRelay(), undefined); // TODO monero-daemon-rpc: add relayed to get_transactions
    else if (tx.isRelayed()) assert.equal(tx.isDoubleSpendSeen(), false);
    else {
      assert.equal(tx.isRelayed(), false);
      assert.equal(tx.getRelay(), false);
      assert.equal(typeof tx.isDoubleSpendSeen(), "boolean");
    }
  }
  assert.equal(tx.getLastFailedHeight(), undefined);
  assert.equal(tx.getLastFailedHash(), undefined);
  
  // received time only for tx pool or failed txs
  if (tx.getReceivedTimestamp() !== undefined) {
    assert(tx.inTxPool() || tx.isFailed());
  }
  
  // test inputs and outputs
  assert(tx.getInputs() && Array.isArray(tx.getInputs()) && tx.getInputs().length >= 0);
  assert(tx.getOutputs() && Array.isArray(tx.getOutputs()) && tx.getOutputs().length >= 0);
  if (!tx.isMinerTx()) assert(tx.getInputs().length > 0);
  for (let input of tx.getInputs()) {
    assert(tx === input.getTx());
    testVin(input, ctx);
  }
  assert(tx.getOutputs().length > 0);
  for (let output of tx.getOutputs()) {
    assert(tx === output.getTx());
    testOutput(output, ctx);
  }
  
  // test pruned vs not pruned
  if (ctx.fromGetTxPool || ctx.fromBinaryBlock) assert.equal(tx.getPrunableHash(), undefined);   // TODO monero-daemon-rpc: tx pool txs do not have prunable hash, TODO: getBlocksByHeight() has inconsistent client-side pruning
  else assert(tx.getPrunableHash());
  if (ctx.isPruned) {
    assert.equal(tx.getRctSigPrunable(), undefined);
    assert.equal(tx.getSize(), undefined);
    assert.equal(tx.getLastRelayedTimestamp(), undefined);
    assert.equal(tx.getReceivedTimestamp(), undefined);
    assert.equal(tx.getFullHex(), undefined);
    assert(tx.getPrunedHex());
  } else {
    assert.equal(tx.getPrunedHex(), undefined);
    assert(tx.getVersion() >= 0);
    assert(tx.getUnlockTime() >= 0);
    assert(Array.isArray(tx.getExtra()) && tx.getExtra().length > 0);
    if (ctx.fromBinaryBlock) assert.equal(tx.getFullHex(), undefined);         // TODO: getBlocksByHeight() has inconsistent client-side pruning
    else assert(tx.getFullHex().length > 0);
    if (ctx.fromBinaryBlock) assert.equal(tx.getRctSigPrunable(), undefined);  // TODO: getBlocksByHeight() has inconsistent client-side pruning
    //else assert.equal(typeof tx.getRctSigPrunable().nbp, "number");
    assert.equal(tx.isDoubleSpendSeen(), false);
    if (tx.isConfirmed()) {
      assert.equal(tx.getLastRelayedTimestamp(), undefined);
      assert.equal(tx.getReceivedTimestamp(), undefined);
    } else {
      if (tx.isRelayed()) assert(tx.getLastRelayedTimestamp() > 0);
      else assert.equal(tx.getLastRelayedTimestamp(), undefined);
      assert(tx.getReceivedTimestamp() > 0);
    }
  }
  
  if (tx.isFailed()) {
    // TODO: implement this
  }
  
  // test deep copy
  if (!ctx.doNotTestCopy) testTxCopy(tx, ctx);
}

function testBlockTemplate(template) {
  assert(template);
  assert(template.getBlockTemplateBlob());
  assert(template.getBlockHashingBlob());
  assert(template.getDifficulty());
  assert(template.getDifficulty() instanceof BigInteger);
  assert(template.getExpectedReward());
  assert(template.getHeight());
  assert(template.getPrevHash());
  assert(template.getReservedOffset());
  assert.equal(typeof template.getSeedHeight(), "number");
  assert(template.getSeedHeight() > 0);
  assert.equal(typeof template.getSeedHash(), "string");
  assert(template.getSeedHash());
  // next seed hash can be null or initialized  // TODO: test circumstances for each
}

function testInfo(info) {
  assert(info.getVersion());
  assert(info.getNumAltBlocks() >= 0);
  assert(info.getBlockSizeLimit());
  assert(info.getBlockSizeMedian());
  assert(info.getBootstrapDaemonAddress() === undefined || (typeof info.getBootstrapDaemonAddress() === "string" && info.getBootstrapDaemonAddress().length > 0));
  assert(info.getCumulativeDifficulty());
  assert(info.getCumulativeDifficulty() instanceof BigInteger)
  assert(info.getFreeSpace());
  assert(info.getNumOfflinePeers() >= 0);
  assert(info.getNumOnlinePeers() >= 0);
  assert(info.getHeight() >= 0);
  assert(info.getHeightWithoutBootstrap());
  assert(info.getNumIncomingConnections() >= 0);
  assert(info.getNetworkType());
  assert(typeof info.isOffline() === "boolean");
  assert(info.getNumOutgoingConnections() >= 0);
  assert(info.getNumRpcConnections() >= 0);
  assert(info.getStartTimestamp());
  assert(info.getTarget());
  assert(info.getTargetHeight() >= 0);
  assert(info.getNumTxs() >= 0);
  assert(info.getNumTxsPool() >= 0);
  assert(typeof info.getWasBootstrapEverUsed() === "boolean");
  assert(info.getBlockWeightLimit());
  assert(info.getBlockWeightMedian());
  assert(info.getDatabaseSize() > 0);
  assert(typeof info.getUpdateAvailable() === "boolean");
  TestUtils.testUnsignedBigInteger(info.getCredits(), false);
  assert.equal(typeof info.getTopBlockHash(), "string");
  assert(info.getTopBlockHash());
}

function testSyncInfo(syncInfo) { // TODO: consistent naming, daemon in name?
  assert(syncInfo instanceof MoneroDaemonSyncInfo);
  assert(syncInfo.getHeight() >= 0);
  if (syncInfo.getConnections() !== undefined) {
    assert(syncInfo.getConnections().length > 0);
    for (let connection of syncInfo.getConnections()) {
      testDaemonConnection(connection);
    }
  }
  if (syncInfo.getSpans() !== undefined) {  // TODO: test that this is being hit, so far not used
    assert(syncInfo.getSpans().length > 0);
    for (let span of syncInfo.getSpans()) {
      testDaemonConnectionSpan(span);
    }
  }
  assert(syncInfo.getNextNeededPruningSeed() >= 0);
  assert.equal(syncInfo.getOverview(), undefined);
  TestUtils.testUnsignedBigInteger(syncInfo.getCredits(), false);
  assert.equal(syncInfo.getTopBlockHash(), undefined);
}

function testDaemonConnectionSpan(span) {
  assert.notEqual(span, undefined);
  assert.notEqual(span.getConnectionId(), undefined);
  assert(span.getConnectionId().length > 0);
  assert(span.getStartHeight() > 0);
  assert(span.getNumBlocks() > 0);
  assert(span.getRemoteAddress() === undefined || span.getRemoteAddress().length > 0);
  assert(span.getRate() > 0);
  assert(span.getSpeed() >= 0);
  assert(span.getSize() > 0);
}

function testHardForkInfo(hardForkInfo) {
  assert.notEqual(hardForkInfo.getEarliestHeight(), undefined);
  assert.notEqual(hardForkInfo.isEnabled(), undefined);
  assert.notEqual(hardForkInfo.getState(), undefined);
  assert.notEqual(hardForkInfo.getThreshold(), undefined);
  assert.notEqual(hardForkInfo.getVersion(), undefined);
  assert.notEqual(hardForkInfo.getNumVotes(), undefined);
  assert.notEqual(hardForkInfo.getVoting(), undefined);
  assert.notEqual(hardForkInfo.getWindow(), undefined);
  TestUtils.testUnsignedBigInteger(hardForkInfo.getCredits(), false);
  assert.equal(hardForkInfo.getTopBlockHash(), undefined);
}

function testMoneroBan(ban) {
  assert.notEqual(ban.getHost(), undefined);
  assert.notEqual(ban.getIp(), undefined);
  assert.notEqual(ban.getSeconds(), undefined);
}

function testMinerTxSum(txSum) {
  TestUtils.testUnsignedBigInteger(txSum.getEmissionSum(), true);
  TestUtils.testUnsignedBigInteger(txSum.getFeeSum(), true);
}

function testOutputHistogramEntry(entry) {
  TestUtils.testUnsignedBigInteger(entry.getAmount());
  assert(entry.getNumInstances() >= 0);
  assert(entry.getNumUnlockedInstances() >= 0);
  assert(entry.getNumRecentInstances() >= 0);
}

function testOutputDistributionEntry(entry) {
  TestUtils.testUnsignedBigInteger(entry.getAmount());
  assert(entry.getBase() >= 0);
  assert(Array.isArray(entry.getDistribution()) && entry.getDistribution().length > 0);
  assert(entry.getStartHeight() >= 0);
}

function testSubmitTxResultGood(result) {
  testSubmitTxResultCommon(result);
  try {
    assert.equal(result.isDoubleSpendSeen(), false, "tx submission is double spend.");
    assert.equal(result.isFeeTooLow(), false);
    assert.equal(result.isMixinTooLow(), false);
    assert.equal(result.hasInvalidInput(), false);
    assert.equal(result.hasInvalidOutput(), false);
    assert.equal(result.hasTooFewOutputs(), false);
    assert.equal(result.isOverspend(), false);
    assert.equal(result.isTooBig(), false);
    assert.equal(result.getSanityCheckFailed(), false);
    TestUtils.testUnsignedBigInteger(result.getCredits(), false); // 0 credits
    assert.equal(result.getTopBlockHash(), undefined);
    assert.equal(result.isGood(), true);
  } catch (e) {
    console.log("Submit result is not good: " + JSON.stringify(result));
    throw e;
  }
}

function testSubmitTxResultDoubleSpend(result) {
  testSubmitTxResultCommon(result);
  assert.equal(result.isGood(), false);
  assert.equal(result.isDoubleSpendSeen(), true);
  assert.equal(result.isFeeTooLow(), false);
  assert.equal(result.isMixinTooLow(), false);
  assert.equal(result.hasInvalidInput(), false);
  assert.equal(result.hasInvalidOutput(), false);
  assert.equal(result.isOverspend(), false);
  assert.equal(result.isTooBig(), false);
}

function testSubmitTxResultCommon(result) {
  assert.equal(typeof result.isGood(), "boolean");
  assert.equal(typeof result.isRelayed(), "boolean");
  assert.equal(typeof result.isDoubleSpendSeen(), "boolean");
  assert.equal(typeof result.isFeeTooLow(), "boolean");
  assert.equal(typeof result.isMixinTooLow(), "boolean");
  assert.equal(typeof result.hasInvalidInput(), "boolean");
  assert.equal(typeof result.hasInvalidOutput(), "boolean");
  assert.equal(typeof result.isOverspend(), "boolean");
  assert.equal(typeof result.isTooBig(), "boolean");
  assert.equal(typeof result.getSanityCheckFailed(), "boolean");
  assert(result.getReason() === undefined || result.getReason().length > 0);
}

function testTxPoolStats(stats) {
  assert(stats);
  assert(stats.getNumTxs() >= 0);
  if (stats.getNumTxs() > 0) {
    if (stats.getNumTxs() === 1) assert.equal(stats.getHisto(), undefined);
    else {
      assert(stats.getHisto());
      console.log(stats.getHisto());
      throw new Error("Ready to test histogram");
    }
    assert(stats.getBytesMax() > 0);
    assert(stats.getBytesMed() > 0);
    assert(stats.getBytesMin() > 0);
    assert(stats.getBytesTotal() > 0);
    assert(stats.getHisto98pc() === undefined || stats.getHisto98pc() > 0);
    assert(stats.getOldestTimestamp() > 0);
    assert(stats.getNum10m() >= 0);
    assert(stats.getNumDoubleSpends() >= 0);
    assert(stats.getNumFailing() >= 0);
    assert(stats.getNumNotRelayed() >= 0);
  } else {
    assert.equal(stats.getBytesMax(), undefined);
    assert.equal(stats.getBytesMed(), undefined);
    assert.equal(stats.getBytesMin(), undefined);
    assert.equal(stats.getBytesTotal(), 0);
    assert.equal(stats.getHisto98pc(), undefined);
    assert.equal(stats.getOldestTimestamp(), undefined);
    assert.equal(stats.getNum10m(), 0);
    assert.equal(stats.getNumDoubleSpends(), 0);
    assert.equal(stats.getNumFailing(), 0);
    assert.equal(stats.getNumNotRelayed(), 0);
    assert.equal(stats.getHisto(), undefined);
  }
}

async function getUnrelayedTx(wallet, accountIdx) {
  let config = new MoneroTxConfig({accountIndex: accountIdx, address: await wallet.getPrimaryAddress(), amount: TestUtils.MAX_FEE}); 
  let tx = await wallet.createTx(config);
  assert(tx.getFullHex());
  assert.equal(tx.getRelay(), false);
  return tx;
}

function testVin(input, ctx) {
  testOutput(input);
  testKeyImage(input.getKeyImage(), ctx);
  assert(input.getRingOutputIndices() && Array.isArray(input.getRingOutputIndices()) && input.getRingOutputIndices().length > 0);
  for (let index of input.getRingOutputIndices()) {
    assert.equal(typeof index, "number")
    assert(index >= 0);
  }
}

function testKeyImage(image, ctx) {
  assert(image instanceof MoneroKeyImage);
  assert(image.getHex());
  if (image.getSignature() !== undefined) {
    assert.equal(typeof image.getSignature(), "string");
    assert(image.getSignature().length > 0);
  }
}

function testOutput(output, ctx) { 
  assert(output instanceof MoneroOutput);
  TestUtils.testUnsignedBigInteger(output.getAmount());
  if (ctx) {
    if (output.getTx().inTxPool() || ctx.fromGetTxPool || ctx.hasOutputIndices === false) assert.equal(output.getIndex(), undefined); // TODO: get_blocks_by_height.bin (#5127), get_transaction_pool, and tx pool txs do not return output indices 
    else assert(output.getIndex() >= 0);
    assert(output.getStealthPublicKey() && output.getStealthPublicKey().length === 64);
  }
}

async function getConfirmedTxs(daemon, numTxs) {
  let txs = [];
  let numBlocksPerReq = 50;
  for (let startIdx = await daemon.getHeight() - numBlocksPerReq - 1; startIdx >= 0; startIdx -= numBlocksPerReq) {
    let blocks = await daemon.getBlocksByRange(startIdx, startIdx + numBlocksPerReq);
    for (let block of blocks) {
      if (!block.getTxs()) continue;
      for (let tx of block.getTxs()) {
        txs.push(tx);
        if (txs.length === numTxs) return txs;
      }
    }
  }
  throw new Error("Could not get " + numTxs + " confirmed txs");
}

function testAltChain(altChain) {
  assert(altChain instanceof MoneroAltChain);
  assert(Array.isArray(altChain.getBlockHashes()) && altChain.getBlockHashes().length > 0);
  TestUtils.testUnsignedBigInteger(altChain.getDifficulty(), true);
  assert(altChain.getHeight() > 0);
  assert(altChain.getLength() > 0);
  assert(altChain.getMainChainParentBlockHash().length === 64);
}

function testDaemonConnection(connection) {
  assert(connection instanceof MoneroDaemonConnection);
  assert(connection.getPeer());
  testKnownPeer(connection.getPeer(), true);
  assert(connection.getId());
  assert(connection.getAvgDownload() >= 0);
  assert(connection.getAvgUpload() >= 0);
  assert(connection.getCurrentDownload() >= 0);
  assert(connection.getCurrentUpload() >= 0);
  assert(connection.getHeight() >= 0);
  assert(connection.getLiveTime() >= 0);
  assert.equal(typeof connection.isLocalIp(), "boolean");
  assert.equal(typeof connection.isLocalHost(), "boolean");
  assert(connection.getNumReceives() >= 0);
  assert(connection.getReceiveIdleTime() >= 0);
  assert(connection.getNumSends() >= 0);
  assert(connection.getSendIdleTime() >= 0);
  assert(connection.getState());
  assert(connection.getNumSupportFlags() >= 0);
  ConnectionType.validate(connection.getType());
}

function testKnownPeer(peer, fromConnection) {
  assert(peer instanceof MoneroDaemonPeer);
  assert.equal(typeof peer.getId(), "string");
  assert.equal(typeof peer.getHost(), "string");
  assert(typeof peer.getPort() === "number");
  assert(peer.getPort() > 0);
  assert(peer.getRpcPort() === undefined || (typeof peer.getRpcPort() === "number" && peer.getRpcPort() >= 0));
  assert.equal(typeof peer.isOnline(), "boolean");
  if (peer.getRpcCreditsPerHash() !== undefined) TestUtils.testUnsignedBigInteger(peer.getRpcCreditsPerHash());
  if (fromConnection) assert.equal(undefined, peer.getLastSeenTimestamp());
  else {
    if (peer.getLastSeenTimestamp() < 0) console("Last seen timestamp is invalid: " + peer.getLastSeenTimestamp());
    assert(peer.getLastSeenTimestamp() >= 0);
  }
  assert(peer.getPruningSeed() === undefined || peer.getPruningSeed() >= 0);
}

function testUpdateCheckResult(result) {
  assert(result instanceof MoneroDaemonUpdateCheckResult);
  assert.equal(typeof result.isUpdateAvailable(), "boolean");
  if (result.isUpdateAvailable()) {
    assert(result.getAutoUri(), "No auto uri; is daemon online?");
    assert(result.getUserUri());
    assert.equal(typeof result.getVersion(), "string");
    assert.equal(typeof result.getHash(), "string");
    assert.equal(result.getHash().length, 64);
  } else {
    assert.equal(result.getAutoUri(), undefined);
    assert.equal(result.getUserUri(), undefined);
    assert.equal(result.getVersion(), undefined);
    assert.equal(result.getHash(), undefined);
  }
}

function testUpdateDownloadResult(result, path) {
  testUpdateCheckResult(result);
  if (result.isUpdateAvailable()) {
    if (path) assert.equal(result.getDownloadPath(), path);
    else assert(result.getDownloadPath());
  } else {
    assert.equal(result.getDownloadPath(), undefined);
  }
}

async function getConfirmedTxHashes(daemon) {
  let numTxs = 5;
  let txHashes = [];
  let height = await daemon.getHeight();
  while (txHashes.length < numTxs) {
    let block = await daemon.getBlockByHeight(--height);
    for (let txHash of block.getTxHashes()) txHashes.push(txHash);
  }
  return txHashes;
}

function testTxCopy(tx, ctx) {
  
  // copy tx and test
  let copy = tx.copy();
  assert(copy instanceof MoneroTx);
  assert.equal(copy.getBlock(), undefined);
  if (tx.getBlock()) copy.setBlock(tx.getBlock().copy().setTxs([copy]));  // copy block for testing equality
  assert.equal(copy.toString(), tx.toString());
  
  // test different input references
  if (copy.getInputs() === undefined) assert.equal(tx.getInputs(), undefined);
  else {
    assert(copy.getInputs() !== tx.getInputs());
    for (let i = 0; i < copy.getInputs().length; i++) {
      assert.equal(0, tx.getInputs()[i].getAmount().compare(copy.getInputs()[i].getAmount()));
    }
  }
  
  // test different output references
  if (copy.getOutputs() === undefined) assert.equal(tx.getOutputs(), undefined);
  else {
    assert(copy.getOutputs() !== tx.getOutputs());
    for (let i = 0; i < copy.getOutputs().length; i++) {
      assert.equal(0, tx.getOutputs()[i].getAmount().compare(copy.getOutputs()[i].getAmount()));
    }
  }
  
  // test copied tx
  ctx = Object.assign({}, ctx);
  ctx.doNotTestCopy = true;
  if (tx.getBlock()) copy.setBlock(tx.getBlock().copy().setTxs([copy])); // copy block for testing
  testTx(copy, ctx);
  
  // test merging with copy
  let merged = copy.merge(copy.copy());
  assert.equal(merged.toString(), tx.toString());
}

module.exports = TestMoneroDaemonRpc;