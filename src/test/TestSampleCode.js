const TestUtils = require("./utils/TestUtils");

/**
 * Test the sample code in README.md.
 */
class TestSampleCode {
  
  runTests() {
    describe("Test Sample Code", function() {
      let that = this;
      
      // initialize wallet
      before(async function() {
        try {
          // all wallets need to wait for txs to confirm to reliably sync
          TestUtils.TX_POOL_WALLET_TRACKER.reset();
          
          // pre-create test wallet
          let wallet = await TestUtils.getWalletRpc();
          await wallet.close();
          
          // create directory for test wallets if it doesn't exist
          const monerojs = require("monero-javascript");
          let fs = monerojs.LibraryUtils.getDefaultFs();
          if (!fs.existsSync(TestUtils.TEST_WALLETS_DIR)) {
            if (!fs.existsSync(process.cwd())) fs.mkdirSync(process.cwd(), { recursive: true });  // create current process directory for relative paths which does not exist in memory fs
            fs.mkdirSync(TestUtils.TEST_WALLETS_DIR);
          }
        } catch (e) {
          console.error("Error before tests: ");
          console.error(e);
          throw e;
        }
      });
      
      // TODO: wrap test in try...catch and close wasm wallet
      it("Short sample code demonstration", async function() {
        
        // *** USE IN README.MD ***
        // import library
        const assert = require("assert");
        const monerojs = require("monero-javascript");
        const MoneroDaemonRpc = monerojs.MoneroDaemonRpc; // TODO: await monerojs.createDaemonRpcClient(...)
        const MoneroWalletRpc = monerojs.MoneroWalletRpc; // TODO: await monerojs.createWalletRpcClient(...)
        const MoneroWalletWasm = monerojs.MoneroWalletWasm; // TODO: await monerojs.createWalletWasm({...});
        const MoneroWalletListener = monerojs.MoneroWalletListener; // TODO: pass in js object instead of MoneroWalletListener class
        const BigInteger = monerojs.BigInteger; // TODO: support string or BigInteger, then no need to import BigInteger
        const GenUtils = monerojs.GenUtils;
        
        // connect to a daemon
        let daemon = new MoneroDaemonRpc("http://localhost:38081", "superuser", "abctesting123"); 
        let height = await daemon.getHeight();            // 1523651
        let feeEstimate = await daemon.getFeeEstimate();  // 1014313512
        let txsInPool = await daemon.getTxPool();         // get transactions in the pool
        
        // open wallet on monero-wallet-rpc
        let walletRpc = new MoneroWalletRpc("http://localhost:38083", "rpc_user", "abc123");
        await walletRpc.openWallet("test_wallet_1", "supersecretpassword123");  // *** CHANGE README TO "sample_wallet_rpc" ***
        let primaryAddress = await walletRpc.getPrimaryAddress(); // 555zgduFhmKd2o8rPUz...
        let balance = await walletRpc.getBalance();               // 533648366742
        let txs = await walletRpc.getTxs();                       // get transactions containing transfers to/from the wallet
        
        // create wallet from mnemonic phrase using WebAssembly bindings to Monero Core
        let walletWasm = await MoneroWalletWasm.createWallet({
          path: "./test_wallets/" + GenUtils.getUUID(),           // *** CHANGE README TO "sample_wallet_wasm"
          password: "supersecretpassword123",
          networkType: "stagenet",
          serverUri: "http://localhost:38081",
          serverUsername: "superuser",
          serverPassword: "abctesting123",
          mnemonic: TestUtils.MNEMONIC,                 // *** REPLACE WITH MNEMONIC IN README ***
          restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT // *** REPLACE WITH FIRST RECEIVE HEIGHT IN README ***
        });
        
        // synchronize with progress notifications
        await walletWasm.sync(new class extends MoneroWalletListener {
          onSyncProgress(height, startHeight, endHeight, percentDone, message) {
            // feed a progress bar?
          }
        });
        
        // synchronize in the background
        await walletWasm.startSyncing();
        
        // listen for incoming transfers
        let fundsReceived = false;
        await walletWasm.addListener(new class extends MoneroWalletListener {
          onOutputReceived(output) {
            let amount = output.getAmount();
            let txHash = output.getTx().getHash();
            fundsReceived = true;
          }
        });
        
        // send funds from RPC wallet to WebAssembly wallet
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(walletRpc); // *** REMOVE FROM README SAMPLE ***
        let createdTx = await walletRpc.createTx({
          accountIndex: 0,
          address: await walletWasm.getAddress(1, 0),
          amount: new BigInteger("50000"), // amount to transfer in atomic units
          relay: false // create transaction and relay to the network if true
        });
        let fee = createdTx.getFee(); // "Are you sure you want to send... ?"
        await walletRpc.relayTx(createdTx); // relay the transaction
        
        // recipient receives unconfirmed funds within 10 seconds
        await new Promise(function(resolve) { setTimeout(resolve, 10000); });
        assert(fundsReceived);
        
        // save and close WebAssembly wallet
        await walletWasm.close(true);
      });
      
      // TODO: wrap test in try...catch and close wasm wallet
      if (false)
      it("Long sample code demonstration", async function() {
        
        // import library
        //require("monero-javascript"); // *** USE IN README.MD ***
        
        // connect to a daemon
        let daemon = new MoneroDaemonRpc({
          uri: "http://localhost:38081", 
          username: "superuser",
          password: "abctesting123",
          proxyToWorker: TestUtils.PROXY_TO_WORKER       // *** REMOVE FROM README.MD ***
        });
        let height = await daemon.getHeight();           // 1523651
        let feeEstimate = await daemon.getFeeEstimate(); // 1014313512
        
        // get transactions in the pool
        let txsInPool = await daemon.getTxPool();
        for (let tx of txsInPool) {
          let hash = tx.getHash();
          let fee = tx.getFee();
          let isDoubleSpendSeen = tx.isDoubleSpendSeen();
        }
        
        // get last 100 blocks as a binary request
        let blocks = await daemon.getBlocksByRange(height - 100, height - 1);
        for (let block of blocks) {
          let numTxs = block.getTxs().length;
        }
        
        // connect to a monero-wallet-rpc endpoint with authentication
        let walletRpc = new MoneroWalletRpc("http://localhost:38083", "rpc_user", "abc123");
        
        // open a wallet on the server
        await walletRpc.openWallet("test_wallet_1", "supersecretpassword123");
        let primaryAddress = await walletRpc.getPrimaryAddress(); // 59aZULsUF3YNSKGiHz4J...
        let balance = await walletRpc.getBalance();               // 533648366742
        let subaddress = await walletRpc.getSubaddress(1, 0);
        let subaddressBalance = subaddress.getBalance();
        
        // query a transaction by hash
        let tx = await walletRpc.getTx((await walletRpc.getTxs(new MoneroTxQuery().setIsOutgoing(true)))[0].getHash());  // *** REMOVE FROM README SAMPLE ***
        //let tx = await walletRpc.getTx("32088012e68be1c090dc022f7852ca4d7c23066241649cdfaeb14ec1fd5a10f8");
        let txHeight = tx.getHeight();
        let incomingTransfers = tx.getIncomingTransfers();
        let destinations = tx.getOutgoingTransfer().getDestinations();
        
        // query incoming transfers to account 1
        let transferQuery = new MoneroTransferQuery().setIsIncoming(true).setAccountIndex(1);
        let transfers = await walletRpc.getTransfers(transferQuery);
        
        // query unspent outputs
        let outputQuery = new MoneroOutputQuery().setIsSpent(false);
        let outputs = await walletRpc.getOutputs(outputQuery);
        
        // create a wallet from a mnemonic phrase using WebAssembly bindings to monero-project
        let walletWasm = await MoneroWalletWasm.createWallet({  // *** REPLACE WITH BELOW FOR README.MD ***
          path: "./test_wallets/" + GenUtils.getUUID(),
          password: "supersecretpassword123",
          networkType: TestUtils.NETWORK_TYPE,
          mnemonic: TestUtils.MNEMONIC,
          server: await daemon.getRpcConnection(),
          restoreHeight: TestUtils.FIRST_RECEIVE_HEIGHT,
          proxyToWorker: TestUtils.PROXY_TO_WORKER
        });
//        let walletWasm = await MoneroWalletWasm.createWallet({
//          path: "MyWallet",
//          password: "supersecretpassword123",
//          networkType: MoneroNetworkType.STAGENET,
//          mnemonic: "hefty value ...",
//          server: await daemon.getRpcConnection(),
//          restoreHeight: 501788
//        });
        
        // synchronize the wallet and receive progress notifications
        await walletWasm.sync(new class extends MoneroWalletListener {
          onSyncProgress(height, startHeight, endHeight, percentDone, message) {
            // feed a progress bar?
          }
        });
        
        // start syncing the wallet continuously in the background
        await walletWasm.startSyncing();
        
        // receive notifications when the wasm wallet receives funds
        await walletWasm.addListener(new class extends MoneroWalletListener {
          onOutputReceived(output) {
            console.log("Wallet received funds!");
            let txHash = output.getTx().getHash();
            let accountIdx = output.getAccountIndex();
            let subaddressIdx = output.getSubaddressIndex();
            TestSampleCode.CORE_OUTPUT_RECEIVED = true;
          }
        });
        
        // send funds from the RPC wallet to the wasm wallet
        await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(walletRpc); // wait for txs to clear pool *** REMOVE FROM README SAMPLE ***
        let txSet = await walletRpc.createTx({
          accountIndex: 0,
          address: await walletWasm.getPrimaryAddress(),
          amount: BigInteger.parse("50000"),
          relay: true
        });
        let sentTx = txSet.getTxs()[0];  // send methods return tx set(s) which contain sent txs
        assert(sentTx.inTxPool(), "Sent transaction is not in the tx pool");
        
        // mine with 7 threads to push the network along
        let numThreads = 7;
        let isBackground = false;
        let ignoreBattery = false;
        try { await walletRpc.startMining(numThreads, isBackground, ignoreBattery); } catch(e) { }
        
        // wait for the next block to be added to the chain
        let nextBlockHeader = await daemon.getNextBlockHeader();
        let nextNumTxs = nextBlockHeader.getNumTxs();
        
        // stop mining
        try { await walletRpc.stopMining(); } catch(e) { }
        
        // the transaction is (probably) confirmed
        await new Promise(function(resolve) { setTimeout(resolve, 10000); });  // wait 10s for auto refresh
        let isConfirmed = (await walletRpc.getTx(sentTx.getHash())).isConfirmed();
        
        // configure a config to send funds from RPC wallet to multiple destinations in the WASM wallet
        let config = new MoneroTxConfig()
                .setAccountIndex(1)                           // send from account 1
                .setSubaddressIndices([0, 1])                 // send from subaddresses in account 1
                .setPriority(MoneroTxPriority.UNIMPORTANT)    // no rush
                .setRelay(true)
                .setDestinations([
                        new MoneroDestination(await walletWasm.getAddress(1, 0), BigInteger.parse("50000")),
                        new MoneroDestination(await walletWasm.getAddress(2, 0), BigInteger.parse("50000"))]);
        
        // create the transaction, confirm with the user, and relay to the network
        let createdTx = await walletRpc.createTx(config);
        let fee = createdTx.getFee();  // "Are you sure you want to send ...?"
        await walletRpc.relayTx(createdTx); // submit the transaction which will notify the JNI wallet
        
        // wasm wallet will receive notification of incoming output after a moment
        await new Promise(function(resolve) { setTimeout(resolve, 10000); });
        assert(TestSampleCode.CORE_OUTPUT_RECEIVED, "Output not received");
        
        // save and close the wasm wallet
        await walletWasm.close(true);
      });
    });
  }
}

module.exports = TestSampleCode;