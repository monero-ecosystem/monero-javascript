const BigInteger = require("../../common/biginteger").BigInteger;

/**
 * Monero daemon info.
 */
class MoneroDaemonInfo {
  
  constructor(state) {
    state = Object.assign({}, state);
    this.state = state;
    
    // deserialize BigIntegers
    if (state.difficulty !== undefined && !(state.difficulty instanceof BigInteger)) state.difficulty = BigInteger.parse(state.difficulty);
    if (state.cumulativeDifficulty !== undefined && !(state.cumulativeDifficulty instanceof BigInteger)) state.cumulativeDifficulty = BigInteger.parse(state.cumulativeDifficulty);
    if (state.credits !== undefined && !(state.credits instanceof BigInteger)) state.credits = BigInteger.parse(state.credits);
  }
  
  toJson() {
    let json = Object.assign([], this.state);
    if (json.difficulty) json.difficulty = json.difficulty.toString();
    if (json.cumulativeDifficulty) json.cumulativeDifficulty = json.cumulativeDifficulty.toString();
    if (json.credits) json.credits = json.credits.toString();
    return json;
  }
  
  getVersion() {
    return this.state.version;
  }
  
  setVersion(version) {
    this.state.version = version;
    return this;
  }
  
  getNumAltBlocks() {
    return this.state.numAltBlocks;
  }
  
  setNumAltBlocks(numAltBlocks) {
    this.state.numAltBlocks = numAltBlocks;
    return this;
  }
  
  getBlockSizeLimit() {
    return this.state.blockSizeLimit;
  }
  
  setBlockSizeLimit(blockSizeLimit) {
    this.state.blockSizeLimit = blockSizeLimit;
    return this;
  }
  
  getBlockSizeMedian() {
    return this.state.blockSizeMedian;
  }
  
  setBlockSizeMedian(blockSizeMedian) {
    this.state.blockSizeMedian = blockSizeMedian;
    return this;
  }
  
  getBlockWeightLimit() {
    return this.state.blockWeightLimit;
  }
  
  setBlockWeightLimit(blockWeightLimit) {
    this.state.blockWeightLimit = blockWeightLimit;
    return this;
  }
  
  getBlockWeightMedian() {
    return this.state.blockWeightMedian;
  }
  
  setBlockWeightMedian(blockWeightMedian) {
    this.state.blockWeightMedian = blockWeightMedian;
    return this;
  }
  
  getBootstrapDaemonAddress() {
    return this.state.bootstrapDaemonAddress;
  }
  
  setBootstrapDaemonAddress(bootstrapDaemonAddress) {
    this.state.bootstrapDaemonAddress = bootstrapDaemonAddress;
    return this;
  }
  
  getDifficulty() {
    return this.state.difficulty;
  }
  
  setDifficulty(difficulty) {
    this.state.difficulty = difficulty;
    return this;
  }
  
  getCumulativeDifficulty() {
    return this.state.cumulativeDifficulty;
  }
  
  setCumulativeDifficulty(cumulativeDifficulty) {
    this.state.cumulativeDifficulty = cumulativeDifficulty;
    return this;
  }
  
  getFreeSpace() {
    return this.state.freeSpace;
  }
  
  setFreeSpace(freeSpace) {
    this.state.freeSpace = freeSpace;
    return this;
  }
  
  getNumOfflinePeers() {
    return this.state.numOfflinePeers;
  }
  
  setNumOfflinePeers(numOfflinePeers) {
    this.state.numOfflinePeers = numOfflinePeers;
    return this;
  }
  
  getNumOnlinePeers() {
    return this.state.numOnlinePeers;
  }
  
  setNumOnlinePeers(numOnlinePeers) {
    this.state.numOnlinePeers = numOnlinePeers;
    return this;
  }
  
  getHeight() {
    return this.state.height;
  }
  
  setHeight(height) {
    this.state.height = height;
    return this;
  }
  
  getHeightWithoutBootstrap() {
    return this.state.heightWithoutBootstrap;
  }
  
  setHeightWithoutBootstrap(heightWithoutBootstrap) {
    this.state.heightWithoutBootstrap = heightWithoutBootstrap;
    return this;
  }
  
  getNetworkType() {
    return this.state.networkType;
  }

  setNetworkType(networkType) {
    this.state.networkType = networkType;
    return this;
  }

  isOffline() {
    return this.state.isOffline;
  }
  
  setIsOffline(isOffline) {
    this.state.isOffline = isOffline;
    return this;
  }
  
  getNumIncomingConnections() {
    return this.state.numIncomingConnections;
  }
  
  setNumIncomingConnections(numIncomingConnections) {
    this.state.numIncomingConnections = numIncomingConnections;
    return this;
  }
  
  getNumOutgoingConnections() {
    return this.state.numOutgoingConnections;
  }
  
  setNumOutgoingConnections(numOutgoingConnections) {
    this.state.numOutgoingConnections = numOutgoingConnections;
    return this;
  }
  
  getNumRpcConnections() {
    return this.state.numRpcConnections;
  }
  
  setNumRpcConnections(numRpcConnections) {
    this.state.numRpcConnections = numRpcConnections;
    return this;
  }
  
  getStartTimestamp() {
    return this.state.startTimestamp;
  }
  
  setStartTimestamp(startTimestamp) {
    this.state.startTimestamp = startTimestamp;
    return this;
  }
  
  getAdjustedTimestamp() {
    return this.state.adjustedTimestamp;
  }
  
  setAdjustedTimestamp(adjustedTimestamp) {
    this.state.adjustedTimestamp = adjustedTimestamp;
    return this;
  }
  
  getTarget() {
    return this.state.target;
  }
  
  setTarget(target) {
    this.state.target = target;
    return this;
  }
  
  getTargetHeight() {
    return this.state.targetHeight;
  }
  
  setTargetHeight(targetHeight) {
    this.state.targetHeight = targetHeight;
    return this;
  }
  
  getTopBlockHash() {
    return this.state.topBlockHash;
  }
  
  setTopBlockHash(topBlockHash) {
    this.state.topBlockHash = topBlockHash;
    return this;
  }
  
  getNumTxs() {
    return this.state.numTxs;
  }
  
  setNumTxs(numTxs) {
    this.state.numTxs = numTxs;
    return this;
  }
  
  getNumTxsPool() {
    return this.state.numTxsPool;
  }
  
  setNumTxsPool(numTxsPool) {
    this.state.numTxsPool = numTxsPool;
    return this;
  }
  
  getWasBootstrapEverUsed() {
    return this.state.wasBootstrapEverUsed;
  }
  
  setWasBootstrapEverUsed(wasBootstrapEverUsed) {
    this.state.wasBootstrapEverUsed = wasBootstrapEverUsed;
    return this;
  }
  
  getDatabaseSize() {
    return this.state.databaseSize;
  }
  
  setDatabaseSize(databaseSize) {
    this.state.databaseSize = databaseSize;
    return this;
  }
  
  getUpdateAvailable() {
    return this.state.updateAvailable;
  }
  
  setUpdateAvailable(updateAvailable) {
    this.state.updateAvailable = updateAvailable;
    return this;
  }
  
  getCredits() {
    return this.state.credits;
  }
  
  setCredits(credits) {
    this.state.credits = credits;
    return this;
  }
}

module.exports = MoneroDaemonInfo;