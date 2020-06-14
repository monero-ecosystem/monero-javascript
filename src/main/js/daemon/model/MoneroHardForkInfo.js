const BigInteger = require("../../common/biginteger").BigInteger;

/**
 * Monero hard fork info.
 */
class MoneroHardForkInfo {
  
  constructor(state) {
    this.state = Object.assign({}, state);
    if (this.state.credits !== undefined && !(this.state.credits instanceof BigInteger)) this.state.credits = BigInteger.parse(this.state.credits);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (json.credits) json.credits = json.credits.toString();
    return json;
  }
  
  getEarliestHeight() {
    return this.state.earliestHeight;
  }

  setEarliestHeight(earliestHeight) {
    this.state.earliestHeight = earliestHeight;
    return this;
  }

  isEnabled() {
    return this.state.isEnabled;
  }

  setIsEnabled(isEnabled) {
    this.state.isEnabled = isEnabled;
    return this;
  }

  getState() {
    return this.state.state;
  }

  setState(state) {
    this.state.state = state;
    return this;
  }

  getThreshold() {
    return this.state.threshold;
  }

  setThreshold(threshold) {
    this.state.threshold = threshold;
    return this;
  }

  getVersion() {
    return this.state.version;
  }

  setVersion(version) {
    this.state.version = version;
    return this;
  }

  getNumVotes() {
    return this.state.numVotes;
  }

  setNumVotes(numVotes) {
    this.state.numVotes = numVotes;
    return this;
  }

  getWindow() {
    return this.state.window;
  }

  setWindow(window) {
    this.state.window = window;
    return this;
  }

  getVoting() {
    return this.state.voting;
  }

  setVoting(voting) {
    this.state.voting = voting;
    return this;
  }
  
  getCredits() {
    return this.state.credits;
  }
  
  setCredits(credits) {
    this.state.credits = credits;
    return this;
  }
  
  getTopBlockHash() {
    return this.state.topBlockHash;
  }
  
  setTopBlockHash(topBlockHash) {
    this.state.topBlockHash = topBlockHash;
    return this;
  }
}

module.exports = MoneroHardForkInfo;