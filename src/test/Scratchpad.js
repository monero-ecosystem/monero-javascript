describe("Scratchpad", function() {
  
  it("Can be scripted easily", async function() {
    
    // get test wasm wallet
//    let daemon = await TestUtils.getDaemonRpc();
//    let walletRpc = await TestUtils.getWalletRpc();
//    let walletWasm = await TestUtils.getWalletWasm();
    
    // initialize daemon rpc client
    let daemon = new MoneroDaemonRpc({
      uri: "http://localhost:38081",
      username: "superuser",
      password: "abctesting123",
      proxyToWorker: TestUtils.PROXY_TO_WORKER,
      rejectUnauthorized: false
    });
    console.log("Daemon height: " + await daemon.getHeight());
    
    // initialize wallet rpc client
    let walletRpc = new MoneroWalletRpc({
      uri: "http://localhost:38083",
      username: "rpc_user",
      password: "abc123",
      rejectUnauthorized: false
    });
    //await walletRpc.openWallet("test_wallet_1", "supersecretpassword123");
    console.log("RPC wallet mnemonic: " + await walletRpc.getMnemonic());
    
    // create in-memory wallet with random mnemonic
    let walletWasm = await MoneroWalletWasm.createWallet({
      //path: "./test_wallets/" + GenUtils.getUUID(), // in-memory wallet if not given
      password: "abctesting123",
      networkType: "stagenet",
      serverUri: "http://localhost:38081",
      serverUsername: "superuser",
      serverPassword: "abctesting123",
      mnemonic: "spying swept ashtray going hence jester swagger cease spying unusual boss vain dyslexic divers among unfit asleep bays ostrich maverick skirting jaunt scenic shuffled spying",
      restoreHeight: 573800,
      proxyToWorker: TestUtils.PROXY_TO_WORKER,
      rejectUnauthorized: false
    });
    await walletWasm.sync();
    console.log("WASM wallet daemon height: " + await walletWasm.getDaemonHeight());
    console.log("WASM wallet mnemonic: " + await walletWasm.getMnemonic());
    
    await walletWasm.close();
  });
});