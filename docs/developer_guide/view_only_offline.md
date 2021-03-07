# View-only and offline wallets

Transactions can be generated without exposing the private spend key to an internet-connected device using view-only and offline wallets.

A view-only wallet uses the private view key to scan for received funds, but does not have the private spend key to determine which funds are spent or sign transactions.

An offline wallet has the private spend key to determine which funds are spent and sign transactions, but is not connected to any daemon to scan for received funds or broadcast transactions.

To sign and submit transactions using view-only and offline wallets:

1. Use a view-only wallet to scan for received funds.
2. Export outputs from the view-only wallet to an offline wallet.
3. Export key images from the offline wallet to the view-only wallet.
4. Create an unsigned transaction using the view-only wallet.
5. Sign the transaction using the offline wallet.
6. Broadcast the signed transaction using the view-only wallet or any daemon.

The following code demonstrates creating, signing, and submitting transactions using view-only and offline wallets:

```javascript
const monerojs = require("monero-javascript");

// create and sync view-only wallet without spend key
let viewOnlyWallet = await monerojs.createWalletFull({
  path: "my_view_only_wallet",
  networkType: "stagenet",
  primaryAddress: "55bcxMRhBWea6xxsot8moF1rdPprjJR2x4mfnNnTGgBJFgXa4gWXmWAYdUBKiRcJxy9AUAGJEg28DejvWdJU2VgUDrUvCHG",
  privateViewKey: "03d463f03ae547b11dfdf194a07ff82c14a3c6a3de559bd89c9a5e8dc5e9ae02",
  restoreHeight: 573936,
  server: {uri: "http://localhost:38081", username: "superuser", password: "abctesting123"}
});
await viewOnlyWallet.sync();

// create offline wallet
let offlineWallet = await monerojs.createWalletFull({
  path: "my_offline_wallet",
  networkType: "stagenet",
  mnemonic: "spying swept ashtray going hence jester swagger cease spying unusual..."
});
  
// export outputs from view-only wallet
let outputsHex = await viewOnlyWallet.exportOutputs();
  
// import outputs to offline wallet
await offlineWallet.importOutputs(outputsHex);
  
// export key images from offline wallet
let keyImages = await offlineWallet.getKeyImages();
  
// import key images to view-only wallet
await viewOnlyWallet.importKeyImages(keyImages);
  
// create unsigned tx using view-only wallet
let unsignedTx = await viewOnlyWallet.createTx({
  accountIndex: 0,
  address: "56j5AskbiNeeb2UAnS85qpey93GYs4VWB78hazZKGdsKCGHvEXUD6nuMQqXaiiY8SwMWsmtAEXS9kA2ko7hgNtGHKsEWyhv",
  amount: "250000000000" // 0.25 XMR
});

// parse unsigned tx set to confirm details
let parsedTxSet = await offlineWallet.parseTxSet(unsignedTx.getTxSet());
let fee = parsedTxSet.getTxs()[0].getFee();	// "Are you sure you want to send... ?"
  
// sign tx using offline wallet
let signedTxHex = await offlineWallet.signTxs(unsignedTx.getTxSet().getUnsignedTxHex());

// submit signed tx using view-only wallet
let txHashes = await viewOnlyWallet.submitTxs(signedTxHex);
```