const TestUtils = require("./utils/TestUtils");
const WalletSyncPrinter = require("./utils/WalletSyncPrinter");
const monerojs = require("../../index");

describe("Scratchpad", function() {
  
  it("Can be scripted easily", async function() {
    
    // get test wasm wallet
//    let daemon = await TestUtils.getDaemonRpc();
//    let walletRpc = await TestUtils.getWalletRpc();
//    let walletWasm = await TestUtils.getWalletWasm();
    
    
    // initialize daemon rpc client
    let daemon = monerojs.connectToDaemonRpc({
      uri: "http://localhost:38081",
      username: "superuser",
      password: "abctesting123",
      proxyToWorker: TestUtils.PROXY_TO_WORKER,
      rejectUnauthorized: false
    });
    console.log("Daemon height: " + await daemon.getHeight());
    
    // initialize wallet rpc client
    let walletRpc = monerojs.connectToWalletRpc({
      uri: "http://localhost:38083",
      username: "rpc_user",
      password: "abc123",
      rejectUnauthorized: false
    });
    //await walletRpc.openWallet("test_wallet_1", "supersecretpassword123");
    console.log("RPC wallet mnemonic: " + await walletRpc.getMnemonic());
    
    // create in-memory wallet with mnemonic
    let walletWasm = await monerojs.createWalletWasm({
      //path: "./test_wallets/" + GenUtils.getUUID(), // in-memory wallet if not given
      password: "abctesting123",
      networkType: "stagenet",
      serverUri: "http://localhost:38081",
      serverUsername: "superuser",
      serverPassword: "abctesting123",
      mnemonic: "hijack lucky rally sober hockey robot gumball amaze gave fifteen organs gecko skater wizard demonstrate upright system vegan tobacco tsunami lurk withdrawn tomorrow uphill organs",
      restoreHeight: 589429,
      proxyToWorker: TestUtils.PROXY_TO_WORKER,
      rejectUnauthorized: false
    });
    await walletWasm.sync(new WalletSyncPrinter());
    console.log("WASM wallet daemon height: " + await walletWasm.getDaemonHeight());
    console.log("WASM wallet mnemonic: " + await walletWasm.getMnemonic());
    
    await walletWasm.close();
  });
});