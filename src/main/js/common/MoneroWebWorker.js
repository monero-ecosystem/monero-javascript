const assert = require("assert");
const GenUtils = require("./GenUtils");
const LibraryUtils = require("./LibraryUtils");
const MoneroBan = require("../daemon/model/MoneroBan");
const MoneroBlock = require("../daemon/model/MoneroBlock");
const MoneroDaemonRpc = require("../daemon/MoneroDaemonRpc");
const MoneroError = require("./MoneroError");
const MoneroKeyImage = require("../daemon/model/MoneroKeyImage");
const MoneroRpcConnection = require("./MoneroRpcConnection");
const MoneroTxConfig = require("../wallet/model/MoneroTxConfig");
const MoneroTxSet = require("../wallet/model/MoneroTxSet");
const MoneroUtils = require("./MoneroUtils");
const MoneroWalletListener = require("../wallet/model/MoneroWalletListener");
const MoneroWalletWasm = require("../wallet/MoneroWalletWasm");

/**
 * Web worker to manage a daemon and wasm wallet off the main thread with messages.
 * 
 * Required message format: e.data[0] = object id, e.data[1] = function name, e.data[2+] = function args
 *
 * This file must be browserified and placed in the web app root.
 * 
 * @private
 */
onmessage = async function(e) {
  
  // initialize one time
  await self.initOneTime();
  
  // validate params
  let objectId = e.data[0];
  let fnName = e.data[1];
  assert(objectId, "Must provide object id to apply function to");
  assert(fnName.length >= 2, "Must provide a function name with length >= 2");
  if (!self[fnName]) throw new Error("Method '" + fnName + "' is not registered with worker");
  e.data.splice(1, 1); // remove function name
  
  // execute worker function and post result to callback
  let callbackFn = "on" + fnName.charAt(0).toUpperCase() + fnName.substring(1);
  try {
    postMessage([objectId, callbackFn, {result: await self[fnName].apply(null, e.data)}]);
  } catch (e) {
    postMessage([objectId, callbackFn, {error: e.message}]);
  }
}

self.initOneTime = async function() {
  if (!self.isInitialized) {
    self.WORKER_OBJECTS = {};
    self.isInitialized = true;
  }
}

// --------------------------- STATIC UTILITIES -------------------------------

self.getWasmMemoryUsed = async function(objectId) {	// TODO: object id not needed for static utilites, using throwaway uuid
  return LibraryUtils.getWasmModule() && LibraryUtils.getWasmModule().HEAP8 ? LibraryUtils.getWasmModule().HEAP8.length : undefined;
}

// ---------------------------- DAEMON METHODS --------------------------------

self.connectDaemonRpc = async function(daemonId, config) {
  self.WORKER_OBJECTS[daemonId] = new MoneroDaemonRpc(config);
}

self.daemonGetRpcConnection = async function(daemonId) {
  let connection = await self.WORKER_OBJECTS[daemonId].getRpcConnection();
  return connection ? connection.getConfig() : undefined;
}

self.daemonIsConnected = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].isConnected();
}

self.daemonGetVersion = async function(daemonId) {
  return (await self.WORKER_OBJECTS[daemonId].getVersion()).toJson();
}

self.daemonIsTrusted = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].isTrusted();
}

self.daemonGetHeight = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].getHeight();
}

self.daemonGetBlockHash = async function(daemonId, height) {
  return self.WORKER_OBJECTS[daemonId].getBlockHash(height);
}

self.daemonGetBlockTemplate = async function(daemonId, walletAddress, reserveSize) {
  return (await self.WORKER_OBJECTS[daemonId].getBlockTemplate(walletAddress, reserveSize)).toJson();
}

self.daemonGetLastBlockHeader = async function(daemonId) {
  return (await self.WORKER_OBJECTS[daemonId].getLastBlockHeader()).toJson();
}

self.daemonGetBlockHeaderByHash = async function(daemonId, hash) {
  return (await self.WORKER_OBJECTS[daemonId].getBlockHeaderByHash(hash)).toJson();
}

self.daemonGetBlockHeaderByHeight = async function(daemonId, height) {
  return (await self.WORKER_OBJECTS[daemonId].getBlockHeaderByHeight(height)).toJson();
}

self.daemonGetBlockHeadersByRange = async function(daemonId, startHeight, endHeight) {
  let blockHeadersJson = [];
  for (let blockHeader of await self.WORKER_OBJECTS[daemonId].getBlockHeadersByRange(startHeight, endHeight)) blockHeadersJson.push(blockHeader.toJson());
  return blockHeadersJson;
}

self.daemonGetBlockByHash = async function(daemonId, blockHash) {
  return (await self.WORKER_OBJECTS[daemonId].getBlockByHash(blockHash)).toJson();
}

self.daemonGetBlocksByHash = async function(daemonId, blockHashes, startHeight, prune) {
  let blocksJson = [];
  for (let block of await self.WORKER_OBJECTS[daemonId].getBlocksByHash(blockHashes, startHeight, prune)) blocksJson.push(block.toJson());
  return blocksJson;
}

self.daemonGetBlockByHeight = async function(daemonId, height) {
  return (await self.WORKER_OBJECTS[daemonId].getBlockByHeight(height)).toJson();
}

self.daemonGetBlocksByHeight = async function(daemonId, heights) {
  let blocksJson = [];
  for (let block of await self.WORKER_OBJECTS[daemonId].getBlocksByHeight(heights)) blocksJson.push(block.toJson());
  return blocksJson;
}

self.daemonGetBlocksByRange = async function(daemonId, startHeight, endHeight) {
  let blocksJson = [];
  for (let block of await self.WORKER_OBJECTS[daemonId].getBlocksByRange(startHeight, endHeight)) blocksJson.push(block.toJson());
  return blocksJson;
}

self.daemonGetBlocksByRangeChunked = async function(daemonId, startHeight, endHeight, maxChunkSize) {
  let blocksJson = [];
  for (let block of await self.WORKER_OBJECTS[daemonId].getBlocksByRangeChunked(startHeight, endHeight, maxChunkSize)) blocksJson.push(block.toJson());
  return blocksJson;
}

self.daemonGetBlockHashes = async function(daemonId, blockHashes, startHeight) {
  throw new Error("worker.getBlockHashes not implemented");
}

// TODO: factor common code with self.getTxs()
self.daemonGetTxs = async function(daemonId, txHashes, prune) {
  
  // get txs
  let txs = await self.WORKER_OBJECTS[daemonId].getTxs(txHashes, prune);
  
  // collect unique blocks to preserve model relationships as trees (based on monero_wasm_bridge.cpp::get_txs)
  let blocks = [];
  let unconfirmedBlock = undefined
  let seenBlocks = new Set();
  for (let tx of txs) {
    if (!tx.getBlock()) {
      if (!unconfirmedBlock) unconfirmedBlock = new MoneroBlock().setTxs([]);
      tx.setBlock(unconfirmedBlock);
      unconfirmedBlock.getTxs().push(tx);
    }
    if (!seenBlocks.has(tx.getBlock())) {
      seenBlocks.add(tx.getBlock());
      blocks.push(tx.getBlock());
    }
  }
  
  // serialize blocks to json
  for (let i = 0; i < blocks.length; i++) blocks[i] = blocks[i].toJson();
  return blocks;
}

self.daemonGetTxHexes = async function(daemonId, txHashes, prune) {
  return self.WORKER_OBJECTS[daemonId].getTxHexes(txHashes, prune);
}

self.daemonGetMinerTxSum = async function(daemonId, height, numBlocks) {
  return (await self.WORKER_OBJECTS[daemonId].getMinerTxSum(height, numBlocks)).toJson();
}

self.daemonGetFeeEstimate = async function(daemonId, graceBlocks) {
  return (await self.WORKER_OBJECTS[daemonId].getFeeEstimate(graceBlocks)).toString();
}

self.daemonSubmitTxHex = async function(daemonId, txHex, doNotRelay) {
  return (await self.WORKER_OBJECTS[daemonId].submitTxHex(txHex, doNotRelay)).toJson();
}

self.daemonRelayTxsByHash = async function(daemonId, txHashes) {
  return self.WORKER_OBJECTS[daemonId].relayTxsByHash(txHashes);
}

self.daemonGetTxPool = async function(daemonId) {
  let txs = await self.WORKER_OBJECTS[daemonId].getTxPool();
  let block = new MoneroBlock().setTxs(txs);
  for (let tx of txs) tx.setBlock(block)
  return block.toJson();
}

self.daemonGetTxPoolHashes = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].getTxPoolHashes();
}

//async getTxPoolBacklog() {
//  throw new MoneroError("Not implemented");
//}

self.daemonGetTxPoolStats = async function(daemonId) {
  return (await self.WORKER_OBJECTS[daemonId].getTxPoolStats()).toJson();
}

self.daemonFlushTxPool = async function(daemonId, hashes) {
  return self.WORKER_OBJECTS[daemonId].flushTxPool(hashes);
}

self.daemonGetKeyImageSpentStatuses = async function(daemonId, keyImages) {
  return self.WORKER_OBJECTS[daemonId].getKeyImageSpentStatuses(keyImages);
}

//
//async getOutputs(outputs) {
//  throw new MoneroError("Not implemented");
//}

self.daemonGetOutputHistogram = async function(daemonId, amounts, minCount, maxCount, isUnlocked, recentCutoff) {
  let entriesJson = [];
  for (let entry of await self.WORKER_OBJECTS[daemonId].getOutputHistogram(amounts, minCount, maxCount, isUnlocked, recentCutoff)) {
    entriesJson.push(entry.toJson());
  }
  return entriesJson;
}

//
//async getOutputDistribution(amounts, cumulative, startHeight, endHeight) {
//  throw new MoneroError("Not implemented");
//}

self.daemonGetInfo = async function(daemonId) {
  return (await self.WORKER_OBJECTS[daemonId].getInfo()).toJson();
}

self.daemonGetSyncInfo = async function(daemonId) {
  return (await self.WORKER_OBJECTS[daemonId].getSyncInfo()).toJson();
}

self.daemonGetHardForkInfo = async function(daemonId) {
  return (await self.WORKER_OBJECTS[daemonId].getHardForkInfo()).toJson();
}

self.daemonGetAltChains = async function(daemonId) {
  let altChainsJson = [];
  for (let altChain of await self.WORKER_OBJECTS[daemonId].getAltChains()) altChainsJson.push(altChain.toJson());
  return altChainsJson;
}

self.daemonGetAltBlockHashes = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].getAltBlockHashes();
}

self.daemonGetDownloadLimit = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].getDownloadLimit();
}

self.daemonSetDownloadLimit = async function(daemonId, limit) {
  return self.WORKER_OBJECTS[daemonId].setDownloadLimit(limit);
}

self.daemonResetDownloadLimit = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].resetDownloadLimit();
}

self.daemonGetUploadLimit = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].getUploadLimit();
}

self.daemonSetUploadLimit = async function(daemonId, limit) {
  return self.WORKER_OBJECTS[daemonId].setUploadLimit(limit);
}

self.daemonResetUploadLimit = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].resetUploadLimit();
}

self.daemonGetKnownPeers = async function(daemonId) {
  let peersJson = [];
  for (let peer of await self.WORKER_OBJECTS[daemonId].getKnownPeers()) peersJson.push(peer.toJson());
  return peersJson;
}

self.daemonGetConnections = async function(daemonId) {
  let connectionsJson = [];
  for (let connection of await self.WORKER_OBJECTS[daemonId].getConnections()) connectionsJson.push(connection.toJson());
  return connectionsJson;
}

self.daemonSetOutgoingPeerLimit = async function(daemonId, limit) {
  return self.WORKER_OBJECTS[daemonId].setOutgoingPeerLimit(limit);
}

self.daemonSetIncomingPeerLimit = async function(daemonId, limit) {
  return self.WORKER_OBJECTS[daemonId].setIncomingPeerLimit(limit);
}

self.daemonGetPeerBans = async function(daemonId) {
  let bansJson = [];
  for (let ban of await self.WORKER_OBJECTS[daemonId].getPeerBans()) bansJson.push(ban.toJson());
  return bansJson;
}

self.daemonSetPeerBans = async function(daemonId, bansJson) {
  let bans = [];
  for (let banJson of bansJson) bans.push(new MoneroBan(banJson));
  return self.WORKER_OBJECTS[daemonId].setPeerBans(bans);
}

self.daemonStartMining = async function(daemonId, address, numThreads, isBackground, ignoreBattery) {
  return self.WORKER_OBJECTS[daemonId].startMining(address, numThreads, isBackground, ignoreBattery);
}

self.daemonStopMining = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].stopMining();
}

self.daemonGetMiningStatus = async function(daemonId) {
  return (await self.WORKER_OBJECTS[daemonId].getMiningStatus()).toJson();
}

//
//async submitBlocks(blockBlobs) {
//  throw new MoneroError("Not implemented");
//}
//
//async checkForUpdate() {
//  throw new MoneroError("Not implemented");
//}
//
//async downloadUpdate(path) {
//  throw new MoneroError("Not implemented");
//}

self.daemonStop = async function(daemonId) {
  return self.WORKER_OBJECTS[daemonId].stop();
}

self.daemonGetNextBlockHeader = async function(daemonId) {
  return (await self.WORKER_OBJECTS[daemonId].getNextBlockHeader()).toJson();
}

self.daemonAddBlockListener = async function(daemonId, listenerId) {
  let listener = function(blockHeader) {
    self.postMessage([daemonId, "onNewBlockHeader_" + listenerId, blockHeader.toJson()]);
  }
  if (!self.daemonListeners) self.daemonListeners = {};
  self.daemonListeners[listenerId] = listener;
  await self.WORKER_OBJECTS[daemonId].addBlockListener(listener);
}

self.daemonRemoveBlockListener = async function(daemonId, listenerId) {
  if (!self.daemonListeners[listenerId]) throw new MoneroError("No daemon worker listener registered with id: " + listenerId);
  await self.WORKER_OBJECTS[daemonId].removeBlockListener(self.daemonListeners[listenerId]);
  delete self.daemonListeners[listenerId];
}

//------------------------------ WALLET METHODS -------------------------------

self.openWalletData = async function(walletId, path, password, networkType, keysData, cacheData, daemonUriOrConfig) {
  let daemonConnection = daemonUriOrConfig ? new MoneroRpcConnection(daemonUriOrConfig) : undefined;
  self.WORKER_OBJECTS[walletId] = await MoneroWalletWasm.openWallet({path: "", password: password, networkType: networkType, keysData: keysData, cacheData: cacheData, server: daemonConnection, proxyToWorker: false});
  self.WORKER_OBJECTS[walletId]._setBrowserMainPath(path);
}

self._createWalletRandom = async function(walletId, path, password, networkType, daemonUriOrConfig, language) {
  let daemonConnection = daemonUriOrConfig ? new MoneroRpcConnection(daemonUriOrConfig) : undefined;
  self.WORKER_OBJECTS[walletId] = await MoneroWalletWasm._createWalletRandom("", password, networkType, daemonConnection, language, false);
  self.WORKER_OBJECTS[walletId]._setBrowserMainPath(path);
}

self._createWalletFromMnemonic = async function(walletId, path, password, networkType, mnemonic, daemonUriOrConfig, restoreHeight, seedOffset) {
  let daemonConnection = daemonUriOrConfig ? new MoneroRpcConnection(daemonUriOrConfig) : undefined;
  self.WORKER_OBJECTS[walletId] = await MoneroWalletWasm._createWalletFromMnemonic("", password, networkType, mnemonic, daemonConnection, restoreHeight, seedOffset, false);
  self.WORKER_OBJECTS[walletId]._setBrowserMainPath(path);
}

self._createWalletFromKeys = async function(walletId, path, password, networkType, address, viewKey, spendKey, daemonUriOrConfig, restoreHeight, language) {
  let daemonConnection = daemonUriOrConfig ? new MoneroRpcConnection(daemonUriOrConfig) : undefined;
  self.WORKER_OBJECTS[walletId] = await MoneroWalletWasm._createWalletFromKeys("", password, networkType, address, viewKey, spendKey, daemonConnection, restoreHeight, language, false);
  self.WORKER_OBJECTS[walletId]._setBrowserMainPath(path);
}

self.isViewOnly = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].isViewOnly();
}

self.getNetworkType = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getNetworkType();
}

//
//async getVersion() {
//  throw new Error("Not implemented");
//}

self.getMnemonic = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getMnemonic();
}

self.getMnemonicLanguage = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getMnemonicLanguage();
}

self.getMnemonicLanguages = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getMnemonicLanguages();
}

self.getPrivateSpendKey = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getPrivateSpendKey();
}

self.getPrivateViewKey = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getPrivateViewKey();
}

self.getPublicViewKey = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getPublicViewKey();
}

self.getPublicSpendKey = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getPublicSpendKey();
}

self.getAddress = async function(walletId, accountIdx, subaddressIdx) {
  return self.WORKER_OBJECTS[walletId].getAddress(accountIdx, subaddressIdx);
}

self.getAddressIndex = async function(walletId, address) {
  return (await self.WORKER_OBJECTS[walletId].getAddressIndex(address)).toJson();
}

self.getIntegratedAddress = async function(walletId, paymentId) {
  return (await self.WORKER_OBJECTS[walletId].getIntegratedAddress(paymentId)).toJson();
}

self.decodeIntegratedAddress = async function(walletId, integratedAddress) {
  return (await self.WORKER_OBJECTS[walletId].decodeIntegratedAddress(integratedAddress)).toJson();
}

self.setDaemonConnection = async function(walletId, config) {
  return self.WORKER_OBJECTS[walletId].setDaemonConnection(config ? new MoneroRpcConnection(config) : undefined);
}

self.getDaemonConnection = async function(walletId) {
  let connection = await self.WORKER_OBJECTS[walletId].getDaemonConnection();
  return connection ? connection.getConfig() : undefined;
}

self.isConnected = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].isConnected();
}

self.getSyncHeight = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getSyncHeight();
}

self.setSyncHeight = async function(walletId, syncHeight) {
  return self.WORKER_OBJECTS[walletId].setSyncHeight(syncHeight);
}

self.getDaemonHeight = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getDaemonHeight();
}

self.getDaemonMaxPeerHeight = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getDaemonMaxPeerHeight()
}

self.getHeightByDate = async function(walletId, year, month, day) {
  return self.WORKER_OBJECTS[walletId].getHeightByDate(year, month, day);
}

self.isDaemonSynced = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].isDaemonSynced();
}

self.getHeight = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getHeight();
}

self.addListener = async function(walletId, listenerId) {
  
  /**
   * Internal listener to bridge notifications to external listeners.
   * 
   * TODO: MoneroWalletListener is not defined until scripts imported
   * 
   * @private
   */
  class WalletWorkerHelperListener extends MoneroWalletListener {
    
    constructor(walletId, id, worker) {
      super();
      this.walletId = walletId;
      this.id = id;
      this.worker = worker;
    }
    
    getId() {
      return this.id;
    }
    
    onSyncProgress(height, startHeight, endHeight, percentDone, message) {
      this.worker.postMessage([this.walletId, "onSyncProgress_" + this.getId(), height, startHeight, endHeight, percentDone, message]);
    }

    onNewBlock(height) { 
      this.worker.postMessage([this.walletId, "onNewBlock_" + this.getId(), height]);
    }
    
    onBalancesChanged(newBalance, newUnlockedBalance) {
      this.worker.postMessage([this.walletId, "onBalancesChanged_" + this.getId(), newBalance.toString(), newUnlockedBalance.toString()]);
    }

    onOutputReceived(output) {
      let block = output.getTx().getBlock();
      if (block === undefined) block = new MoneroBlock().setTxs([output.getTx()]);
      this.worker.postMessage([this.walletId, "onOutputReceived_" + this.getId(), block.toJson()]);  // serialize from root block
    }
    
    onOutputSpent(output) {
      let block = output.getTx().getBlock();
      if (block === undefined) block = new MoneroBlock().setTxs([output.getTx()]);
      this.worker.postMessage([this.walletId, "onOutputSpent_" + this.getId(), block.toJson()]);     // serialize from root block
    }
  }
  
  let listener = new WalletWorkerHelperListener(walletId, listenerId, self);
  if (!self.listeners) self.listeners = [];
  self.listeners.push(listener);
  await self.WORKER_OBJECTS[walletId].addListener(listener);
}

self.removeListener = async function(walletId, listenerId) {
  for (let i = 0; i < self.listeners.length; i++) {
    if (self.listeners[i].getId() !== listenerId) continue;
    await self.WORKER_OBJECTS[walletId].removeListener(self.listeners[i]);
    self.listeners.splice(i, 1);
    return;
  }
  throw new MoneroError("Listener is not registered with wallet");
}

self.isSynced = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].isSynced();
}

self.sync = async function(walletId, startHeight) {
  return await self.WORKER_OBJECTS[walletId].sync(startHeight);
}

self.startSyncing = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].startSyncing();
}

self.stopSyncing = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].stopSyncing();
}

self.rescanSpent = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].rescanSpent();
}

self.rescanBlockchain = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].rescanBlockchain();
}

self.getBalance = async function(walletId, accountIdx, subaddressIdx) {
  return (await self.WORKER_OBJECTS[walletId].getBalance(accountIdx, subaddressIdx)).toString();
}

self.getUnlockedBalance = async function(walletId, accountIdx, subaddressIdx) {
  return (await self.WORKER_OBJECTS[walletId].getUnlockedBalance(accountIdx, subaddressIdx)).toString();
}

self.getAccounts = async function(walletId, includeSubaddresses, tag) {
  let accountJsons = [];
  for (let account of await self.WORKER_OBJECTS[walletId].getAccounts(includeSubaddresses, tag)) accountJsons.push(account.toJson());
  return accountJsons;
}

self.getAccount = async function(walletId, accountIdx, includeSubaddresses) {
  return (await self.WORKER_OBJECTS[walletId].getAccount(accountIdx, includeSubaddresses)).toJson();
}

self.createAccount = async function(walletId, label) {
  return (await self.WORKER_OBJECTS[walletId].createAccount(label)).toJson();
}

self.getSubaddresses = async function(walletId, accountIdx, subaddressIndices) {
  let subaddressJsons = [];
  for (let subaddress of await self.WORKER_OBJECTS[walletId].getSubaddresses(accountIdx, subaddressIndices)) subaddressJsons.push(subaddress.toJson());
  return subaddressJsons;
}

self.createSubaddress = async function(walletId, accountIdx, label) {
  return (await self.WORKER_OBJECTS[walletId].createSubaddress(accountIdx, label)).toJson();
}

// TODO: easier or more efficient way than serializing from root blocks?
self.getTxs = async function(walletId, blockJsonQuery) {
  
  // deserialize query which is json string rooted at block
  let query = new MoneroBlock(blockJsonQuery, MoneroBlock.DeserializationType.TX_QUERY).getTxs()[0];
  
  // get txs
  let txs = await self.WORKER_OBJECTS[walletId].getTxs(query);
  
  // collect unique blocks to preserve model relationships as trees (based on monero_wasm_bridge.cpp::get_txs)
  let seenBlocks = new Set();
  let unconfirmedBlock = undefined;
  let blocks = [];
  for (let tx of txs) {
    if (!tx.getBlock()) {
      if (!unconfirmedBlock) unconfirmedBlock = new MoneroBlock().setTxs([]);
      tx.setBlock(unconfirmedBlock);
      unconfirmedBlock.getTxs().push(tx);
    }
    if (!seenBlocks.has(tx.getBlock())) {
      seenBlocks.add(tx.getBlock());
      blocks.push(tx.getBlock());
    }
  }
  
  // serialize blocks to json
  for (let i = 0; i < blocks.length; i++) blocks[i] = blocks[i].toJson();
  return blocks;
}

self.getTransfers = async function(walletId, blockJsonQuery) {
  
  // deserialize query which is json string rooted at block
  let query = new MoneroBlock(blockJsonQuery, MoneroBlock.DeserializationType.TX_QUERY).getTxs()[0].getTransferQuery();
  
  // get transfers
  let transfers = await self.WORKER_OBJECTS[walletId].getTransfers(query);
  
  // collect unique blocks to preserve model relationships as tree
  let unconfirmedBlock = undefined;
  let blocks = [];
  let seenBlocks = new Set();
  for (let transfer of transfers) {
    let tx = transfer.getTx();
    if (!tx.getBlock()) {
      if (!unconfirmedBlock) unconfirmedBlock = new MoneroBlock().setTxs([]);
      tx.setBlock(unconfirmedBlock);
      unconfirmedBlock.getTxs().push(tx);
    }
    if (!seenBlocks.has(tx.getBlock())) {
      seenBlocks.add(tx.getBlock());
      blocks.push(tx.getBlock());
    }
  }
  
  // serialize blocks to json
  for (let i = 0; i < blocks.length; i++) blocks[i] = blocks[i].toJson();
  return blocks;
}

self.getOutputs = async function(walletId, blockJsonQuery) {

  // deserialize query which is json string rooted at block
  let query = new MoneroBlock(blockJsonQuery, MoneroBlock.DeserializationType.TX_QUERY).getTxs()[0].getOutputQuery();
  
  // get outputs
  let outputs = await self.WORKER_OBJECTS[walletId].getOutputs(query);
  
  // collect unique blocks to preserve model relationships as tree
  let unconfirmedBlock = undefined;
  let blocks = [];
  let seenBlocks = new Set();
  for (let output of outputs) {
    let tx = output.getTx();
    if (!tx.getBlock()) {
      if (!unconfirmedBlock) unconfirmedBlock = new MoneroBlock().setTxs([]);
      tx.setBlock(unconfirmedBlock);
      unconfirmedBlock.getTxs().push(tx);
    }
    if (!seenBlocks.has(tx.getBlock())) {
      seenBlocks.add(tx.getBlock());
      blocks.push(tx.getBlock());
    }
  }
  
  // serialize blocks to json
  for (let i = 0; i < blocks.length; i++) blocks[i] = blocks[i].toJson();
  return blocks;
}

self.getOutputsHex = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getOutputsHex();
}

self.importOutputsHex = async function(walletId, outputsHex) {
  return self.WORKER_OBJECTS[walletId].importOutputsHex(outputsHex);
}

self.getKeyImages = async function(walletId) {
  let keyImagesJson = [];
  for (let keyImage of await self.WORKER_OBJECTS[walletId].getKeyImages()) keyImagesJson.push(keyImage.toJson());
  return keyImagesJson;
}

self.importKeyImages = async function(walletId, keyImagesJson) {
  let keyImages = [];
  for (let keyImageJson of keyImagesJson) keyImages.push(new MoneroKeyImage(keyImageJson));
  return (await self.WORKER_OBJECTS[walletId].importKeyImages(keyImages)).toJson();
}

//async getNewKeyImagesFromLastImport() {
//  throw new MoneroError("Not implemented");
//}

self.createTxs = async function(walletId, config) {
  if (typeof config === "object") config = new MoneroTxConfig(config);
  let txs = await self.WORKER_OBJECTS[walletId].createTxs(config);
  return txs[0].getTxSet().toJson();
}

self.sweepOutput = async function(walletId, config) {
  if (typeof config === "object") config = new MoneroTxConfig(config);
  let tx = await self.WORKER_OBJECTS[walletId].sweepOutput(config);
  return tx.getTxSet().toJson();
}

self.sweepUnlocked = async function(walletId, config) {
  if (typeof config === "object") config = new MoneroTxConfig(config);
  let txs = await self.WORKER_OBJECTS[walletId].sweepUnlocked(config);
  let txSets = [];
  for (let tx of txs) if (!GenUtils.arrayContains(txSets, tx.getTxSet())) txSets.push(tx.getTxSet());
  let txSetsJson = [];
  for (let txSet of txSets) txSetsJson.push(txSet.toJson());
  return txSetsJson;
}

self.sweepDust = async function(walletId, relay) {
  let txs = await self.WORKER_OBJECTS[walletId].sweepDust(relay);
  return txs[0].getTxSet().toJson();
}

self.relayTxs = async function(walletId, txMetadatas) {
  return self.WORKER_OBJECTS[walletId].relayTxs(txMetadatas);
}

self.parseTxSet = async function(walletId, txSetJson) {
  return (await self.WORKER_OBJECTS[walletId].parseTxSet(new MoneroTxSet(txSetJson))).toJson();
}

self.signTxs = async function(walletId, unsignedTxHex) {
  return self.WORKER_OBJECTS[walletId].signTxs(unsignedTxHex);
}

self.submitTxs = async function(walletId, signedTxHex) {
  return self.WORKER_OBJECTS[walletId].submitTxs(signedTxHex);
}

self.signMessage = async function(walletId, message, signatureType, accountIdx, subaddressIdx) {
  return self.WORKER_OBJECTS[walletId].signMessage(message, signatureType, accountIdx, subaddressIdx);
}

self.verifyMessage = async function(walletId, message, address, signature) {
  return (await self.WORKER_OBJECTS[walletId].verifyMessage(message, address, signature)).toJson();
}

self.getTxKey = async function(walletId, txHash) {
  return self.WORKER_OBJECTS[walletId].getTxKey(txHash);
}

self.checkTxKey = async function(walletId, txHash, txKey, address) {
  return (await self.WORKER_OBJECTS[walletId].checkTxKey(txHash, txKey, address)).toJson();
}

self.getTxProof = async function(walletId, txHash, address, message) {
  return self.WORKER_OBJECTS[walletId].getTxProof(txHash, address, message);
}

self.checkTxProof = async function(walletId, txHash, address, message, signature) {
  return (self.WORKER_OBJECTS[walletId].checkTxProof(txHash, address, message, signature)).toJson();
}

self.getSpendProof = async function(walletId, txHash, message) {
  return self.WORKER_OBJECTS[walletId].getSpendProof(txHash, message);
}

self.checkSpendProof = async function(walletId, txHash, message, signature) {
  return self.WORKER_OBJECTS[walletId].checkSpendProof(txHash, message, signature);
}

self.getReserveProofWallet = async function(walletId, message) {
  return self.WORKER_OBJECTS[walletId].getReserveProofWallet(message);
}

self.getReserveProofAccount = async function(walletId, accountIdx, amount, message) {
  return self.WORKER_OBJECTS[walletId].getReserveProofAccount(accountIdx, amount, message);
}

self.checkReserveProof = async function(walletId, address, message, signature) {
  return (await self.WORKER_OBJECTS[walletId].checkReserveProof(address, message, signature)).toJson();
}

self.getTxNotes = async function(walletId, txHashes) {
  return self.WORKER_OBJECTS[walletId].getTxNotes(txHashes);
}

self.setTxNotes = async function(walletId, txHashes, txNotes) {
  return self.WORKER_OBJECTS[walletId].setTxNotes(txHashes, txNotes);
}

self.getAddressBookEntries = async function(walletId, entryIndices) {
  let entriesJson = [];
  for (let entry of await self.WORKER_OBJECTS[walletId].getAddressBookEntries(entryIndices)) entriesJson.push(entry.toJson());
  return entriesJson;
}

self.addAddressBookEntry = async function(walletId, address, description) {
  return self.WORKER_OBJECTS[walletId].addAddressBookEntry(address, description);
}

self.editAddressBookEntry = async function(walletId, index, setAddress, address, setDescription, description) {
  return self.WORKER_OBJECTS[walletId].editAddressBookEntry(index, setAddress, address, setDescription, description);
}

self.deleteAddressBookEntry = async function(walletId, index) {
  return self.WORKER_OBJECTS[walletId].deleteAddressBookEntry(index);
}

self.tagAccounts = async function(walletId, tag, accountIndices) {
  throw new Error("Not implemented");
}

self.untagAccounts = async function(walletId, accountIndices) {
  throw new Error("Not implemented");
}

self.getAccountTags = async function(walletId) {
  throw new Error("Not implemented");
}

self.setAccountTagLabel = async function(walletId, tag, label) {
  throw new Error("Not implemented");
}

self.createPaymentUri = async function(walletId, configJson) {
  return self.WORKER_OBJECTS[walletId].createPaymentUri(new MoneroTxConfig(configJson));
}

self.parsePaymentUri = async function(walletId, uri) {
  return (await self.WORKER_OBJECTS[walletId].parsePaymentUri(uri)).toJson();
}

self.getAttribute = async function(walletId, key) {
  return self.WORKER_OBJECTS[walletId].getAttribute(key);
}

self.setAttribute = async function(walletId, key, value) {
  return self.WORKER_OBJECTS[walletId].setAttribute(key, value);
}

self.startMining = async function(walletId, numThreads, backgroundMining, ignoreBattery) {
  return self.WORKER_OBJECTS[walletId].startMining(numThreads, backgroundMining, ignoreBattery);
}

self.stopMining = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].stopMining();
}

self.isMultisigImportNeeded = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].isMultisigImportNeeded();
}

self.isMultisig = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].isMultisig();
}

self.getMultisigInfo = async function(walletId) {
  return (await self.WORKER_OBJECTS[walletId].getMultisigInfo()).toJson();
}

self.prepareMultisig = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].prepareMultisig();
}

self.makeMultisig = async function(walletId, multisigHexes, threshold, password) {
  return (await self.WORKER_OBJECTS[walletId].makeMultisig(multisigHexes, threshold, password)).toJson();
}

self.exchangeMultisigKeys = async function(walletId, multisigHexes, password) {
  return (await self.WORKER_OBJECTS[walletId].exchangeMultisigKeys(multisigHexes, password)).toJson();
}

self.getMultisigHex = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getMultisigHex();
}

self.importMultisigHex = async function(walletId, multisigHexes) {
  return self.WORKER_OBJECTS[walletId].importMultisigHex(multisigHexes);
}

self.signMultisigTxHex = async function(walletId, multisigTxHex) {
  return (await self.WORKER_OBJECTS[walletId].signMultisigTxHex(multisigTxHex)).toJson();
}

self.submitMultisigTxHex = async function(walletId, signedMultisigTxHex) {
  return self.WORKER_OBJECTS[walletId].submitMultisigTxHex(signedMultisigTxHex);
}

self.getData = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].getData();
}

self.isClosed = async function(walletId) {
  return self.WORKER_OBJECTS[walletId].isClosed();
}

self.close = async function(walletId, save) {
  return self.WORKER_OBJECTS[walletId].close(save); // TODO: remove listeners and delete wallet from WORKER_OBJECTS
}