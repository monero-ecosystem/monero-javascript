const BigInteger = require("../../common/biginteger").BigInteger;

/**
 * Models an alternative chain seen by the node.
 */
class MoneroAltChain {
  
  constructor(state) {
    state = Object.assign({}, state);
    if (state.difficulty !== undefined && !(state.difficulty instanceof BigInteger)) state.difficulty = BigInteger.parse(state.difficulty);
    this.state = state;
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getDifficulty()) json.difficulty = this.getDifficulty().toString();
    return json;
  }
  
  getBlockHashes(blockHashes) {
    return this.state.blockHashes;
  }
  
  setBlockHashes(blockHashes) {
    this.state.blockHashes = blockHashes;
    return this;
  }
  
  getDifficulty() {
    return this.state.difficulty;
  }
  
  setDifficulty(difficulty) {
    this.state.difficulty = difficulty;
    return this;
  }
  
  getHeight() {
    return this.state.height;
  }
  
  setHeight(height) {
    this.state.height = height;
    return this;
  }
  
  getLength() {
    return this.state.length;
  }
  
  setLength(length) {
    this.state.length = length;
    return this;
  }
  
  getMainChainParentBlockHash() {
    return this.state.mainChainParentBlockHash;
  }
  
  setMainChainParentBlockHash(mainChainParentBlockHash) {
    this.state.mainChainParentBlockHash = mainChainParentBlockHash;
    return this;
  }
}

module.exports = MoneroAltChain;