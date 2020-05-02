<!--
consistent capitalization (wallet vs Daemon consistent, WASM, RPC, monero-javascript)
-->

# Introduction
Monero-javascript is a javascript library for implementing Monero cryptocurrency functionality in web browser and node.js applications. The library derives its object and method hierarchy from [The Hidden Model](https://moneroecosystem.org/monero-java/monero-spec.pdf), a concise, uniform, and intuitive reorganization of the underlying Monero software structure and the foundation of the [monero-cpp](https://github.com/woodser/monero-cpp-library) and [monero-java](https://monero-ecosystem/monero-java) libraries.

In addition to standard wallet manipulation through an RPC server, monero-javascript can manage wallets natively with WebAssembly (Wasm). By eliminating the RPC wallet intermediary, monero-javascript's Wasm wallet lets developers implement completely trustless, client-side wallet operations.

Monero-javascript can also communicate with the three Monero networks through an RPC daemon server (node).

![Monero-javascript hierarchy](img/paste.png?raw=true)*Monero-javascript can communicate through three channels: RPC wallet servers, RPC daemon servers, and Wasm wallets.*  

# Initial Setup

## Install node.js and npm
You need to install node.js and the node package manager (npm) to obtain and use the monero-javascript library. 

### Windows
1. [Download the node.js Windows installer](https://nodejs.org/en/download/) from the node.js website.
2. Open the installer.
3. Click “next”.
4. Click the checkbox next to “I accept the terms in this license agreement.” and click “next”.
5. Click “next” to install node.js to the default directory.
6. Make sure that npm is listed as one of the installation packages, then click “next”.
7. Click “next”.
8. Click “Install”.
9. Click “Finish” after the installation process completes.

### Linux
  #### Debian (Ubuntu, etc.)
  1. Install node.js:
    `$ sudo apt-get install nodejs`
  2. Install npm:
    `$ sudo apt-get install npm`
  #### Fedora
  1. Install node.js:
    `$ sudo dnf install nodejs`
  2. Install npm:
    `$ sudo dnf install npm`

## Install the monero-javascript libary

To install the libary, open the command prompt (Windows) or a terminal (linux) and enter the command `npm install monero-javascript`.

# Write a monero-javascript program
## Creating an offline wallet generator

An offline wallet generator creates and displays a new wallet address along with that address's associated view key, spend key, and mnemonic seed phrase. Offline wallet generators do not need to communicate with a Monero network, transfer XMR or track a wallet's balance or outputs. This makes the keys-only wallet the ideal basis for an offline wallet generator in monero-javascript.

Monero-javascript provides a minimal Wasm wallet implementation called a keys-only wallet. Keys-only wallets can not initiate transfers, report their balances, or communication with a Monero network. The trade off for these limitations is a small file size - just under 1/5 that of a standard Wasm wallet. These characteristics make it the ideal basis for an offline wallet.

## Essential code

This program requires two essential components:
1. A "require" statement to import the monero-javascript library:
```require("monero-javascript");```
2. An asynchronous "main" function
```async mainFunction() {}```

The asynchronous "main" function allows the program to <u>await</u> the results of the monero-javascript methods that create keys-only wallets.

### Building a keys-only wallet

Monero-javscript implements keys-only wallets in the MoneroWalletKeys class. You can create a random keys-only wallet by calling the MoneroWalletKeys class's `createWalletRandom()` method as follows:
```
// create a random keys-only (offline) stagenet wallet
var keysOnlyWallet = await MoneroWalletKeys.createWallet({networkType: MoneroNetworkType.STAGENET, language: "English"});
```

The createWalletRandom method accepts two arguments: the network type and the seed phrase language. 

---
### Why is it necessary to specify a network type for an offline wallet?

**The Three Monero Networks**
Each Monero network has unique rules for defining valid wallet addresses, so wallets are not compatible across the networks. Therefore, the Monero software needs to know which network to create a wallet _for_ in order to generate an address, a seed phrase, and private keys that are valid on that network.

There are three distinct Monero networks:
* mainnet
* stagenet
* testnet

*mainnet* is the main Monero network. XMR traded on mainnet has real-world monetary value.
*stagenet* is designed for learning how to use Monero and interact with the blockchain. Use this network for learning, experimentation, and application testing.
*testnet* is like stagenet for the Monero development team. It is meant for testing updates and additions to the Monero source code. If you are not a member of the Monero developent team then you probably have no need to use testnet.

---

The monero-javascript wallet provides straightforward getter methods for obtaining wallet attributes. Log the relevant attributes - the seed phrase, address, spend key, and view key - to the console:

```
console.log("Seed phrase: " + await(walletKeys.getMnemonic()));
console.log("Address: " + await(walletKeys.getAddress(0,0))); // MoneroWallet.getAddress(accountIndex, subAddress)
console.log("Spend key: " + await(walletKeys.getPrivateSpendKey()));
console.log("View key: " + await(walletKeys.getPrivateViewKey()));
```

The finished program should match the following:

```
require("monero-javascript");

await mainFunction();

async function mainFunction() {
  // create a random keys-only (offline) stagenet wallet
  var walletKeys = await MoneroWalletKeys.createWallet({networkType: MoneroNetworkType.STAGENET, language: "English"});
  
  console.log("Seed phrase: " + await(walletKeys.getMnemonic()));
  console.log("Address: " + await(walletKeys.getAddress(0,0))); // MoneroWallet.getAddress(accountIndex, subAddress)
  console.log("Spend key: " + await(walletKeys.getPrivateSpendKey()));
  console.log("View key: " + await(walletKeys.getPrivateViewKey()));
}
```
Save the file as "offline_wallet_generator.js" and run the program with node:

```
node offline_wallet_generator.js
```

The output should look similar to the following:
```
Seed phrase: darted oatmeal toenail launching frown empty agenda apply unnoticed blip waist ashtray threaten deftly sawmill rotate skirting origin ahead obtains makeup bakery bounced dagger apply
Address: 5ATdKTGQpETCHbBHgDhwd1Wi7oo52PVZYjk2ucf5fnkn9T5yKau2UXkbm7Mo23SAx4MRdyvAaVq75LY9EjSPQnorCGebFqg
Spend key: 7bf64c44ecb5ecf02261e6d721d6201d138d0891f0fcf4d613dc27ec84bc070e
View key: b4e167b76888bf6ad4c1ab23b4d1bb2e57e7c082ac96478bcda4a9af7fd19507
```

# Next steps

Browse the specialized monero-javascript guides to learn how to perform more advanced tasks with the monero-javascript library.
* [Getting started with monero-javascript web browser applications](dummy_link)
* [Connecting to Monero nodes and RPC wallet servers](dummy_link)
* [Initiating transfers](dummy_link)
* [Building client-side wallets with MoneroWalletWasm](dummy_link)
* [Managing view-only wallets](dummy_link)
* [Using multisig wallets](dummy_link)
* [Analyzing the blockchain](dummy_link)