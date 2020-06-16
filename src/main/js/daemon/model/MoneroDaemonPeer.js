const BigInteger = require("../../common/biginteger").BigInteger;

/**
 * Models a peer to the daemon.
 */
class MoneroDaemonPeer {
  
  constructor(state) {
    this.state = Object.assign({}, state);
    if (this.state.rpcCreditsPerHash !== undefined && !(this.state.rpcCreditsPerHash instanceof BigInteger)) this.state.rpcCreditsPerHash = BigInteger.parse(this.state.rpcCreditsPerHash);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (json.rpcCreditsPerHash) json.rpcCreditsPerHash = json.rpcCreditsPerHash.toString();
    return json;
  }
  
  getId() {
    return this.state.id;
  }

  setId(id) {
    this.state.id = id;
    return this;
  }

  getAddress() {
    return this.state.address;
  }

  setAddress(address) {
    this.state.address = address;
    return this;
  }

  getHost() {
    return this.state.host;
  }

  setHost(host) {
    this.state.host = host;
    return this;
  }

  getPort() {
    return this.state.port;
  }

  setPort(port) {
    this.state.port = port;
    return this;
  }
  
  /**
   * Indicates if the peer was online when last checked (aka "white listed" as
   * opposed to "gray listed").
   * 
   * @return {boolean} true if peer was online when last checked, false otherwise
   */
  isOnline() {
    return this.state.isOnline;
  }
  
  setIsOnline(isOnline) {
    this.state.isOnline = isOnline;
    return this;
  }
  
  getLastSeenTimestamp() {
    return this.state.lastSeenTimestamp;
  }
  
  setLastSeenTimestamp(lastSeenTimestamp) {
    this.state.lastSeenTimestamp = lastSeenTimestamp;
    return this;
  }
  
  getPruningSeed() {
    return this.state.pruningSeed;
  }
  
  setPruningSeed(pruningSeed) {
    this.state.pruningSeed = pruningSeed;
    return this;
  }
  
  getRpcPort() {
    return this.state.rpcPort;
  }

  setRpcPort(rpcPort) {
    this.state.rpcPort = rpcPort;
    return this;
  }
  
  getRpcCreditsPerHash() {
    return this.state.rpcCreditsPerHash;
  }
  
  setRpcCreditsPerHash(rpcCreditsPerHash) {
    this.state.rpcCreditsPerHash = rpcCreditsPerHash;
    return this;
  }
}

module.exports = MoneroDaemonPeer;