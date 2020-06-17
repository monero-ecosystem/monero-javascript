'use strict'

/**
 * Export all library models.
 * 
 * See the full model specification: http://moneroecosystem.org/monero-java/monero-spec.pdf
 */
module.exports = {};

// export common models
module.exports.GenUtils = require("./src/main/js/common/GenUtils");
module.exports.BigInteger = require("./src/main/js/common/biginteger").BigInteger;
module.exports.Filter = require("./src/main/js/common/Filter");
module.exports.MoneroError = require("./src/main/js/common/MoneroError");
module.exports.HttpClient = require("./src/main/js/common/HttpClient");
module.exports.LibraryUtils = require("./src/main/js/common/LibraryUtils");
module.exports.MoneroRpcConnection = require("./src/main/js/common/MoneroRpcConnection");
module.exports.MoneroRpcError = require("./src/main/js/common/MoneroRpcError");
module.exports.SslOptions = require("./src/main/js/common/SslOptions");

// export daemon models
module.exports.ConnectionType = require("./src/main/js/daemon/model/ConnectionType");
module.exports.MoneroAltChain = require("./src/main/js/daemon/model/MoneroAltChain");
module.exports.MoneroBan = require("./src/main/js/daemon/model/MoneroBan");
module.exports.MoneroBlockHeader = require("./src/main/js/daemon/model/MoneroBlockHeader");
module.exports.MoneroBlock = require("./src/main/js/daemon/model/MoneroBlock");
module.exports.MoneroBlockTemplate = require("./src/main/js/daemon/model/MoneroBlockTemplate");
module.exports.MoneroDaemonConnection = require("./src/main/js/daemon/model/MoneroDaemonConnection");
module.exports.MoneroDaemonConnectionSpan = require("./src/main/js/daemon/model/MoneroDaemonConnectionSpan");
module.exports.MoneroDaemonInfo = require("./src/main/js/daemon/model/MoneroDaemonInfo");
module.exports.MoneroDaemonPeer = require("./src/main/js/daemon/model/MoneroDaemonPeer");
module.exports.MoneroDaemonSyncInfo = require("./src/main/js/daemon/model/MoneroDaemonSyncInfo");
module.exports.MoneroDaemonUpdateCheckResult = require("./src/main/js/daemon/model/MoneroDaemonUpdateCheckResult");
module.exports.MoneroDaemonUpdateDownloadResult = require("./src/main/js/daemon/model/MoneroDaemonUpdateDownloadResult");
module.exports.MoneroHardForkInfo = require("./src/main/js/daemon/model/MoneroHardForkInfo");
module.exports.MoneroKeyImage = require("./src/main/js/daemon/model/MoneroKeyImage");
module.exports.MoneroKeyImageSpentStatus = require("./src/main/js/daemon/model/MoneroKeyImageSpentStatus");
module.exports.MoneroMinerTxSum = require("./src/main/js/daemon/model/MoneroMinerTxSum");
module.exports.MoneroMiningStatus = require("./src/main/js/daemon/model/MoneroMiningStatus");
module.exports.MoneroNetworkType = require("./src/main/js/daemon/model/MoneroNetworkType");
module.exports.MoneroOutput = require("./src/main/js/daemon/model/MoneroOutput");
module.exports.MoneroOutputHistogramEntry = require("./src/main/js/daemon/model/MoneroOutputHistogramEntry");
module.exports.MoneroSubmitTxResult = require("./src/main/js/daemon/model/MoneroSubmitTxResult");
module.exports.MoneroTx = require("./src/main/js/daemon/model/MoneroTx");
module.exports.MoneroTxPoolStats = require("./src/main/js/daemon/model/MoneroTxPoolStats");
module.exports.MoneroVersion = require("./src/main/js/daemon/model/MoneroVersion");

// export wallet models
module.exports.MoneroAccount = require("./src/main/js/wallet/model/MoneroAccount");
module.exports.MoneroAccountTag = require("./src/main/js/wallet/model/MoneroAccountTag");
module.exports.MoneroAddressBookEntry = require("./src/main/js/wallet/model/MoneroAddressBookEntry");
module.exports.MoneroCheck = require("./src/main/js/wallet/model/MoneroCheck");
module.exports.MoneroCheckReserve = require("./src/main/js/wallet/model/MoneroCheckReserve");
module.exports.MoneroCheckTx = require("./src/main/js/wallet/model/MoneroCheckTx");
module.exports.MoneroDestination = require("./src/main/js/wallet/model/MoneroDestination");
module.exports.MoneroIntegratedAddress = require("./src/main/js/wallet/model/MoneroIntegratedAddress");
module.exports.MoneroKeyImageImportResult = require("./src/main/js/wallet/model/MoneroKeyImageImportResult");
module.exports.MoneroMultisigInfo = require("./src/main/js/wallet/model/MoneroMultisigInfo");
module.exports.MoneroMultisigInitResult = require("./src/main/js/wallet/model/MoneroMultisigInitResult");
module.exports.MoneroMultisigSignResult = require("./src/main/js/wallet/model/MoneroMultisigSignResult");
module.exports.MoneroOutputWallet = require("./src/main/js/wallet/model/MoneroOutputWallet");
module.exports.MoneroOutputQuery = require("./src/main/js/wallet/model/MoneroOutputQuery");
module.exports.MoneroTxPriority = require("./src/main/js/wallet/model/MoneroTxPriority");
module.exports.MoneroTxConfig = require("./src/main/js/wallet/model/MoneroTxConfig");
module.exports.MoneroSubaddress = require("./src/main/js/wallet/model/MoneroSubaddress");
module.exports.MoneroSyncResult = require("./src/main/js/wallet/model/MoneroSyncResult");
module.exports.MoneroTransfer = require("./src/main/js/wallet/model/MoneroTransfer");
module.exports.MoneroIncomingTransfer = require("./src/main/js/wallet/model/MoneroIncomingTransfer");
module.exports.MoneroOutgoingTransfer = require("./src/main/js/wallet/model/MoneroOutgoingTransfer");
module.exports.MoneroTransferQuery = require("./src/main/js/wallet/model/MoneroTransferQuery");
module.exports.MoneroTxSet = require("./src/main/js/wallet/model/MoneroTxSet");
module.exports.MoneroTxWallet = require("./src/main/js/wallet/model/MoneroTxWallet");
module.exports.MoneroTxQuery = require("./src/main/js/wallet/model/MoneroTxQuery");
module.exports.MoneroWalletListener = require("./src/main/js/wallet/model/MoneroWalletListener");
module.exports.MoneroWalletConfig = require("./src/main/js/wallet/model/MoneroWalletConfig");

// export daemon, wallet, and utils classes
module.exports.MoneroUtils = require("./src/main/js/common/MoneroUtils");
module.exports.MoneroDaemon = require("./src/main/js/daemon/MoneroDaemon");
module.exports.MoneroWallet = require("./src/main/js/wallet/MoneroWallet");
module.exports.MoneroDaemonRpc = require("./src/main/js/daemon/MoneroDaemonRpc");
module.exports.MoneroWalletRpc = require("./src/main/js/wallet/MoneroWalletRpc");
module.exports.MoneroWalletKeys = require("./src/main/js/wallet/MoneroWalletKeys");
module.exports.MoneroWalletWasm = require("./src/main/js/wallet/MoneroWalletWasm");

// ---------------------------- GLOBAL FUNCTIONS ------------------------------

/**
 * <p>Create a client connected to monero-daemon-rpc.<p>
 * 
 * <p>Examples:<p>
 * 
 * <code>
 * let daemon = monerojs.connectToDaemonRpc("http://localhost:38081", "superuser", "abctesting123");<br><br>
 * 
 * let daemon = monerojs.connectToDaemonRpc({<br>
 * &nbsp;&nbsp; uri: "http://localhost:38081",<br>
 * &nbsp;&nbsp; username: "superuser",<br>
 * &nbsp;&nbsp; password: "abctesting123"<br>
 * });
 * </code>
 * 
 * @param {string|object|MoneroRpcConnection} uriOrConfigOrConnection - uri of monero-daemon-rpc or JS config object or MoneroRpcConnection
 * @param {string} username - username to authenticate with monero-daemon-rpc (optional)
 * @param {string} password - password to authenticate with monero-daemon-rpc (optional)
 * @param {boolean} rejectUnauthorized - rejects self-signed certificates if true (default true)
 * @param {number} pollInterval - poll interval to query for updates in ms (default 5000)
 * @param {boolean} proxyToWorker - runs the daemon client in a web worker if true (default true if browser, false otherwise)
 * @return {MoneroDaemonRpc} the daemon RPC client
 */
module.exports.connectToDaemonRpc = function() { return new module.exports.MoneroDaemonRpc(...arguments); }

/**
 * <p>Create a client connected to monero-wallet-rpc.</p>
 * 
 * <p>Examples:</p>
 * 
 * <code>
 * let walletRpc = new MoneroWalletRpc("http://localhost:38081", "superuser", "abctesting123");<br><br>
 * 
 * let walletRpc = new MoneroWalletRpc({<br>
 * &nbsp;&nbsp; uri: "http://localhost:38081",<br>
 * &nbsp;&nbsp; username: "superuser",<br>
 * &nbsp;&nbsp; password: "abctesting123",<br>
 * &nbsp;&nbsp; rejectUnauthorized: false // e.g. local development<br>
 * });
 * </code>
 * 
 * @param {string|object|MoneroRpcConnection} uriOrConfigOrConnection - uri of monero-wallet-rpc or JS config object or MoneroRpcConnection
 * @param {string} uriOrConfigOrConnection.username - username to authenticate with monero-wallet-rpc (optional)
 * @param {string} uriOrConfigOrConnection.password - password to authenticate with monero-wallet-rpc (optional)
 * @param {boolean} uriOrConfigOrConnection.rejectUnauthorized - rejects self-signed certificates if true (default true)
 * @param {string} username - username to authenticate with monero-wallet-rpc (optional)
 * @param {string} password - password to authenticate with monero-wallet-rpc (optional)
 * @param {boolean} rejectUnauthorized - rejects self-signed certificates if true (default true)
 * @return {MoneroWalletRpc} the wallet RPC client
 */
module.exports.connectToWalletRpc = function() { return new module.exports.MoneroWalletRpc(...arguments); }

/**
 * <p>Create a wallet using WebAssembly bindings to monero-core.<p>
 * 
 * <p>Example:</p>
 * 
 * <code>
 * let wallet = await monerojs.createWalletWasm({<br>
 * &nbsp;&nbsp; path: "./test_wallets/wallet1", // leave blank for in-memory wallet<br>
 * &nbsp;&nbsp; password: "supersecretpassword",<br>
 * &nbsp;&nbsp; networkType: MoneroNetworkType.STAGENET,<br>
 * &nbsp;&nbsp; mnemonic: "coexist igloo pamphlet lagoon...",<br>
 * &nbsp;&nbsp; restoreHeight: 1543218,<br>
 * &nbsp;&nbsp; server: new monerojs.MoneroRpcConnection("http://localhost:38081", "daemon_user", "daemon_password_123"),<br>
 * });
 * </code>
 * 
 * @param {object|MoneroWalletConfig} config - MoneroWalletConfig or equivalent config object
 * @param {string} config.path - path of the wallet to create (optional, in-memory wallet if not given)
 * @param {string} config.password - password of the wallet to create
 * @param {string|number} config.networkType - network type of the wallet to create (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
 * @param {string} config.mnemonic - mnemonic of the wallet to create (optional, random wallet created if neither mnemonic nor keys given)
 * @param {string} config.seedOffset - the offset used to derive a new seed from the given mnemonic to recover a secret wallet from the mnemonic phrase
 * @param {string} config.primaryAddress - primary address of the wallet to create (only provide if restoring from keys)
 * @param {string} config.privateViewKey - private view key of the wallet to create (optional)
 * @param {string} config.privateSpendKey - private spend key of the wallet to create (optional)
 * @param {number} config.restoreHeight - block height to start scanning frsom (defaults to 0 unless generating random wallet)
 * @param {string} config.language - language of the wallet's mnemonic phrase (defaults to "English" or auto-detected)
 * @param {string} config.serverUri - uri of the wallet's daemon (optional)
 * @param {string} config.serverUsername - username to authenticate with the daemon (optional)
 * @param {string} config.serverPassword - password to authenticate with the daemon (optional)
 * @param {boolean} config.rejectUnauthorized - reject self-signed server certificates if true (defaults to true)
 * @param {MoneroRpcConnection|object} config.server - MoneroRpcConnection or equivalent JS object providing daemon configuration (optional)
 * @param {boolean} config.proxyToWorker - proxies wallet operations to a web worker in order to not block the browser's main thread (default true if browser, false otherwise)
 * @param {fs} config.fs - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
 * @return {MoneroWalletWasm} the created wallet
 */
module.exports.createWalletWasm = function() { return module.exports.MoneroWalletWasm.createWallet(...arguments); }

/**
 * <p>Open an existing wallet using WebAssembly bindings to monero-core.</p>
 * 
 * <p>Examples:<p>
 * 
 * <code>
 * let wallet1 = await monerojs.openWalletWasm(<br>
 * &nbsp;&nbsp; "./wallets/wallet1",<br>
 * &nbsp;&nbsp; "supersecretpassword",<br>
 * &nbsp;&nbsp; MoneroNetworkType.STAGENET,<br>
 * &nbsp;&nbsp; "http://localhost:38081" // daemon uri<br>
 * );<br><br>
 * 
 * let wallet2 = await monerojs.openWalletWasm({<br>
 * &nbsp;&nbsp; path: "./wallets/wallet2",<br>
 * &nbsp;&nbsp; password: "supersecretpassword",<br>
 * &nbsp;&nbsp; networkType: MoneroNetworkType.STAGENET,<br>
 * &nbsp;&nbsp; serverUri: "http://localhost:38081", // daemon configuration<br>
 * &nbsp;&nbsp; serverUsername: "superuser",<br>
 * &nbsp;&nbsp; serverPassword: "abctesting123"<br>
 * });
 * </code>
 * 
 * @param {MoneroWalletConfig|object|string} configOrPath - MoneroWalletConfig or equivalent config object or a path to a wallet to open
 * @param {string} configOrPath.path - path of the wallet to open (optional if 'keysData' provided)
 * @param {string} configOrPath.password - password of the wallet to open
 * @param {string|number} configOrPath.networkType - network type of the wallet to open (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
 * @param {Uint8Array} configOrPath.keysData - wallet keys data to open (optional if path provided)
 * @param {Uint8Array} configOrPath.cacheData - wallet cache data to open (optional)
 * @param {string} configOrPath.serverUri - uri of the wallet's daemon (optional)
 * @param {string} configOrPath.serverUsername - username to authenticate with the daemon (optional)
 * @param {string} configOrPath.serverPassword - password to authenticate with the daemon (optional)
 * @param {boolean} configOrPath.rejectUnauthorized - reject self-signed server certificates if true (defaults to true)
 * @param {MoneroRpcConnection|object} configOrPath.server - MoneroRpcConnection or equivalent JS object configuring the daemon connection (optional)
 * @param {boolean} configOrPath.proxyToWorker - proxies wallet operations to a web worker in order to not block the browser's main thread (default true if browser, false otherwise)
 * @param {fs} configOrPath.fs - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
 * @param {string} password - password of the wallet to open
 * @param {string|number} networkType - network type of the wallet to open
 * @param {string|MoneroRpcConnection} daemonUriOrConnection - daemon URI or MoneroRpcConnection
 * @param {boolean} proxyToWorker - proxies wallet operations to a web worker in order to not block the browser's main thread (default true if browser, false otherwise)
 * @param {fs} fs - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
 * @return {MoneroWalletWasm} the opened wallet
 */
module.exports.openWalletWasm = function() { return module.exports.MoneroWalletWasm.openWallet(...arguments); }

/**
 * <p>Create a wallet using WebAssembly bindings to monero-core.</p>
 * 
 * <p>Example:</p>
 * 
 * <code>
 * let wallet = await monerojs.createWalletKeys({<br>
 * &nbsp;&nbsp; password: "abc123",<br>
 * &nbsp;&nbsp; networkType: MoneroNetworkType.STAGENET,<br>
 * &nbsp;&nbsp; mnemonic: "coexist igloo pamphlet lagoon..."<br>
 * });
 * </code>
 * 
 * @param {MoneroWalletConfig|object} config - MoneroWalletConfig or equivalent config object
 * @param {string|number} config.networkType - network type of the wallet to create (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
 * @param {string} config.mnemonic - mnemonic of the wallet to create (optional, random wallet created if neither mnemonic nor keys given)
 * @param {string} config.seedOffset - the offset used to derive a new seed from the given mnemonic to recover a secret wallet from the mnemonic phrase
 * @param {string} config.primaryAddress - primary address of the wallet to create (only provide if restoring from keys)
 * @param {string} config.privateViewKey - private view key of the wallet to create (optional)
 * @param {string} config.privateSpendKey - private spend key of the wallet to create (optional)
 * @param {string} config.language - language of the wallet's mnemonic phrase (defaults to "English" or auto-detected)
 * @return {MoneroWalletKeys} the created wallet
 */
module.exports.createWalletKeys = function() { return module.exports.MoneroWalletKeys.createWallet(...arguments); }
