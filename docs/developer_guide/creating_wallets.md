# Creating wallets

Three types of wallets can be created:

* [RPC wallet](#rpc-wallet) - client connected to a monero-wallet-rpc server.
* [WebAssembly wallet](#webassembly-wallet) - client-side wallet which communicates directly with a daemon.
* [Keys-only wallet](#keys-only-wallet) - client-side wallet which supports only basic key management.

## RPC wallet

This example creates a client connected to monero-wallet-rpc then creates a wallet.

See [MoneroWalletRpc.createWallet()](https://moneroecosystem.org/monero-javascript/MoneroWalletRpc.html#createWallet) for all options.

```javascript
// import library
let monerojs = require("monero-javascript");

// create a client connected to monero-wallet-rpc
let walletRpc = monerojs.connectToWalletRpc("http://localhost:38081", "superuser", "abctesting123");

// create a wallet on monero-wallet-rpc
await walletRpc.createWallet({
  path: "mywallet",
  password: "supersecretpassword",
  mnemonic: "coexist igloo pamphlet lagoon...",
  restoreHeight: 1543218l
}); 
```

## WebAssembly wallet

This example creates a wallet using WebAssembly bindings to [wallet2.h](https://github.com/monero-project/monero/blob/master/src/wallet/wallet2.h).

See [MoneroWalletWasm.createWallet()](https://moneroecosystem.org/monero-javascript/MoneroWalletWasm.html#createWallet) for all options.

```javascript
// import library
let monerojs = require("monero-javascript");

// create wallet using WebAssembly
let wallet = await monerojs.createWalletWasm({
   path: "./test_wallets/wallet1", // leave blank for in-memory wallet
   password: "supersecretpassword",
   networkType: MoneroNetworkType.STAGENET,
   mnemonic: "coexist igloo pamphlet lagoon...",
   restoreHeight: 1543218,
   server: new MoneroRpcConnection("http://localhost:38081", "daemon_user", "daemon_password_123"),
});
```

## Keys-only wallet

This example creates a keys-only wallet using WebAssembly bindings to Monero Core.

See [MoneroWalletKeys.createWallet()](https://moneroecosystem.org/monero-javascript/MoneroWalletKeys.html#createWallet) for all options.

```javascript
// import library
let monerojs = require("monero-javascript");

// create keys-only wallet
let wallet = await monerojs.createWalletKeys({
   password: "abc123",
   networkType: MoneroNetworkType.STAGENET,
   mnemonic: "coexist igloo pamphlet lagoon..."
}); 
```