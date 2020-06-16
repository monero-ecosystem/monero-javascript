const assert = require("assert");
const BigInteger = require("../../common/biginteger").BigInteger;
const GenUtils = require("../../common/GenUtils");

/**
 * Models a Monero block header which contains information about the block.
 * 
 * @class
 */
class MoneroBlockHeader {
  
  /**
   * Construct the model.
   * 
   * @param {MoneroBlockHeader|object} state is existing state to initialize from (optional)
   */
  constructor(state) {
    
    // initialize internal state
    if (!state) state = {};
    else if (state instanceof MoneroBlockHeader) state = state.toJson();
    else if (typeof state === "object") state = Object.assign({}, state);
    else throw new MoneroError("state must be a MoneroBlockHeader or JavaScript object");
    this.state = state;
    
    // deserialize BigIntegers
    if (state.difficulty !== undefined && !(state.difficulty instanceof BigInteger)) state.difficulty = BigInteger.parse(state.difficulty);
    if (state.cumulativeDifficulty !== undefined && !(state.cumulativeDifficulty instanceof BigInteger)) state.cumulativeDifficulty = BigInteger.parse(state.cumulativeDifficulty);
    if (state.reward !== undefined && !(state.reward instanceof BigInteger)) state.reward = BigInteger.parse(state.reward);
  }
  
  copy() {
    return new MoneroBlockHeader(this);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getDifficulty()) json.difficulty = this.getDifficulty().toString();
    if (this.getCumulativeDifficulty()) json.cumulativeDifficulty = this.getCumulativeDifficulty().toString();
    if (this.getReward()) json.reward = this.getReward().toString();
    return json;
  }
  
  getHash() {
    return this.state.hash;
  }
  
  setHash(hash) {
    this.state.hash = hash;
    return this;
  }
  
  /**
   * Return the block's height which is the total number of blocks that have occurred before.
   * 
   * @return {number} the block's height
   */
  getHeight() {
    return this.state.height;
  }
  
  /**
   * Set the block's height which is the total number of blocks that have occurred before.
   * 
   * @param {number} height is the block's height to set
   * @return {MoneroBlockHeader} a reference to this header for chaining
   */
  setHeight(height) {
    this.state.height = height;
    return this;
  }
  
  getTimestamp() {
    return this.state.timestamp;
  }
  
  setTimestamp(timestamp) {
    this.state.timestamp = timestamp;
    return this;
  }
  
  getSize() {
    return this.state.size;
  }
  
  setSize(size) {
    this.state.size = size;
    return this;
  }
  
  getWeight() {
    return this.state.weight;
  }
  
  setWeight(weight) {
    this.state.weight = weight;
    return this;
  }
  
  getLongTermWeight() {
    return this.state.longTermWeight;
  }
  
  setLongTermWeight(longTermWeight) {
    this.state.longTermWeight = longTermWeight;
    return this;
  }
  
  getDepth() {
    return this.state.depth;
  }
  
  setDepth(depth) {
    this.state.depth = depth;
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
  
  getMajorVersion() {
    return this.state.majorVersion;
  }
  
  setMajorVersion(majorVersion) {
    this.state.majorVersion = majorVersion;
    return this;
  }
  
  getMinorVersion() {
    return this.state.minorVersion;
  }
  
  setMinorVersion(minorVersion) {
    this.state.minorVersion = minorVersion;
    return this;
  }
  
  getNonce() {
    return this.state.nonce;
  }
  
  setNonce(nonce) {
    this.state.nonce = nonce;
    return this;
  }
  
  getMinerTxHash() {
    return this.state.minerTxHash;
  }
  
  setMinerTxHash(minerTxHash) {
    this.state.minerTxHash = minerTxHash;
    return this;
  }
  
  getNumTxs() {
    return this.state.numTxs;
  }
  
  setNumTxs(numTxs) {
    this.state.numTxs = numTxs;
    return this;
  }
  
  getOrphanStatus() {
    return this.state.orphanStatus;
  }
  
  setOrphanStatus(orphanStatus) {
    this.state.orphanStatus = orphanStatus;
    return this;
  }
  
  getPrevHash() {
    return this.state.prevHash;
  }
  
  setPrevHash(prevHash) {
    this.state.prevHash = prevHash;
    return this;
  }
  
  getReward() {
    return this.state.reward;
  }
  
  setReward(reward) {
    this.state.reward = reward;
    return this;
  }
  
  getPowHash() {
    return this.state.powHash;
  }
  
  setPowHash(powHash) {
    this.state.powHash = powHash;
    return this;
  }
  
  merge(header) {
    assert(header instanceof MoneroBlockHeader);
    if (this === header) return this;
    this.setHash(GenUtils.reconcile(this.getHash(), header.getHash()));
    this.setHeight(GenUtils.reconcile(this.getHeight(), header.getHeight(), {resolveMax: true}));  // height can increase
    this.setTimestamp(GenUtils.reconcile(this.getTimestamp(), header.getTimestamp(), {resolveMax: true}));  // block timestamp can increase
    this.setSize(GenUtils.reconcile(this.getSize(), header.getSize()));
    this.setWeight(GenUtils.reconcile(this.getWeight(), header.getWeight()));
    this.setDepth(GenUtils.reconcile(this.getDepth(), header.getDepth()));
    this.setDifficulty(GenUtils.reconcile(this.getDifficulty(), header.getDifficulty()));
    this.setCumulativeDifficulty(GenUtils.reconcile(this.getCumulativeDifficulty(), header.getCumulativeDifficulty()));
    this.setMajorVersion(GenUtils.reconcile(this.getMajorVersion(), header.getMajorVersion()));
    this.setMinorVersion(GenUtils.reconcile(this.getMinorVersion(), header.getMinorVersion()));
    this.setNonce(GenUtils.reconcile(this.getNonce(), header.getNonce()));
    this.setMinerTxHash(GenUtils.reconcile(this.getMinerTxHash(), header.getMinerTxHash()));
    this.setNumTxs(GenUtils.reconcile(this.getNumTxs(), header.getNumTxs()));
    this.setOrphanStatus(GenUtils.reconcile(this.getOrphanStatus(), header.getOrphanStatus()));
    this.setPrevHash(GenUtils.reconcile(this.getPrevHash(), header.getPrevHash()));
    this.setReward(GenUtils.reconcile(this.getReward(), header.getReward()));
    this.setPowHash(GenUtils.reconcile(this.getPowHash(), header.getPowHash()));
    return this;
  }
  
  toString(indent = 0) {
    let str = "";
    str += GenUtils.kvLine("Hash", this.getHash(), indent);
    str += GenUtils.kvLine("Height", this.getHeight(), indent);
    str += GenUtils.kvLine("Timestamp", this.getTimestamp(), indent);
    str += GenUtils.kvLine("Size", this.getSize(), indent);
    str += GenUtils.kvLine("Weight", this.getWeight(), indent);
    str += GenUtils.kvLine("Depth", this.getDepth(), indent);
    str += GenUtils.kvLine("Difficulty", this.getDifficulty(), indent);
    str += GenUtils.kvLine("Cumulative difficulty", this.getCumulativeDifficulty(), indent);
    str += GenUtils.kvLine("Major version", this.getMajorVersion(), indent);
    str += GenUtils.kvLine("Minor version", this.getMinorVersion(), indent);
    str += GenUtils.kvLine("Nonce", this.getNonce(), indent);
    str += GenUtils.kvLine("Miner tx hash", this.getMinerTxHash(), indent);
    str += GenUtils.kvLine("Num txs", this.getNumTxs(), indent);
    str += GenUtils.kvLine("Orphan status", this.getOrphanStatus(), indent);
    str += GenUtils.kvLine("Prev hash", this.getPrevHash(), indent);
    str += GenUtils.kvLine("Reward", this.getReward(), indent);
    str += GenUtils.kvLine("Pow hash", this.getPowHash(), indent);
    return str[str.length - 1] === "\n" ? str.slice(0, str.length - 1) : str  // strip last newline
  }
}

module.exports = MoneroBlockHeader;