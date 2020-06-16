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

// export functions
module.exports.connectToDaemonRpc = function() { return new module.exports.MoneroDaemonRpc(...arguments); }
module.exports.connectToWalletRpc = function() { return new module.exports.MoneroWalletRpc(...arguments); }
module.exports.createWalletWasm = function() { return module.exports.MoneroWalletWasm.createWallet(...arguments); }
module.exports.openWalletWasm = function() { return module.exports.MoneroWalletWasm.openWallet(...arguments); }
module.exports.createWalletKeys = function() { return module.exports.MoneroWalletKeys.createWallet(...arguments); }

