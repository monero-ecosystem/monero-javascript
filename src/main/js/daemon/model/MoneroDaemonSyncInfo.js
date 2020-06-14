const BigInteger = require("../../common/biginteger").BigInteger;

/**
 * Models daemon synchronization information.
 */
class MoneroDaemonSyncInfo {
  
  constructor(state) {
    
    // copy state
    state = Object.assign({}, state);
    
    // deserialize if necessary
    if (state.connections) {
      for (let i = 0; i < state.connections.length; i++) {
        if (!(state.connections[i] instanceof MoneroDaemonConnection)) {
          state.connections[i] = new MoneroDaemonConnection(state.connections[i]);
        }
      }
    }
    if (state.spans) {
      for (let i = 0; i < state.spans.length; i++) {
        if (!(state.spans[i] instanceof MoneroDaemonConnectionSpan)) {
          state.spans[i] = new MoneroDaemonConnectionSpan(state.spans[i]);
        }
      }
    }
    if (state.credits !== undefined && !(state.credits instanceof BigInteger)) state.credits = BigInteger.parse(state.credits);
    
    // assign internal state
    this.state = state;
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (json.connections) {
      for (let i = 0; i < json.connections.length; i++) {
        json.connections[i] = json.connections[i].toJson();
      }
    }
    if (json.spans) {
      for (let i = 0; i < json.spans.length; i++) {
        json.spans[i] = json.spans[i].toJson();
      }
    }
    if (json.credits) json.credits = json.credits.toString();
    return json;
  }
  
  getHeight() {
    return this.state.height;
  }
  
  setHeight(height) {
    this.state.height = height;
    return this;
  }
  
  getConnections() {
    return this.state.connections;
  }
  
  setConnections(connections) {
    this.state.connections = connections;
    return this;
  }
  
  getSpans() {
    return this.state.spans;
  }
  
  setSpans(spans) {
    this.state.spans = spans;
    return this;
  }
  
  getTargetHeight() {
    return this.state.targetHeight;
  }
  
  setTargetHeight(targetHeight) {
    this.state.targetHeight = targetHeight;
    return this;
  }
  
  getNextNeededPruningSeed() {
    return this.state.nextNeededPruningSeed;
  }
  
  setNextNeededPruningSeed(nextNeededPruningSeed) {
    this.state.nextNeededPruningSeed = nextNeededPruningSeed;
    return this;
  }
  
  getOverview() {
    return this.state.overview;
  }
  
  setOverview(overview) {
    this.state.overview = overview;
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

module.exports = MoneroDaemonSyncInfo;