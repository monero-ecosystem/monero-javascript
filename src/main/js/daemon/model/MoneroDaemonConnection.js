const MoneroDaemonPeer = require("./MoneroDaemonPeer");

/**
 * Monero daemon connection.
 */
class MoneroDaemonConnection {
  
  constructor(state) {
    this.state = Object.assign({}, state);
    if (this.state.peer !== undefined && !(this.state.peer instanceof MoneroDaemonPeer)) this.state.peer = new MoneroDaemonPeer(this.state.peer);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (json.peer) json.peer = json.peer.toJson();
    return json;
  }
  
  getPeer() {
    return this.state.peer;
  }

  setPeer(peer) {
    this.state.peer = peer;
    return this;
  }
  
  getId() {
    return this.state.id;
  }

  setId(id) {
    this.state.id = id;
    return this;
  }

  getAvgDownload() {
    return this.state.avgDownload;
  }

  setAvgDownload(avgDownload) {
    this.state.avgDownload = avgDownload;
    return this;
  }

  getAvgUpload() {
    return this.state.avgUpload;
  }

  setAvgUpload(avgUpload) {
    this.state.avgUpload = avgUpload;
    return this;
  }

  getCurrentDownload() {
    return this.state.currentDownload;
  }

  setCurrentDownload(currentDownload) {
    this.state.currentDownload = currentDownload;
    return this;
  }

  getCurrentUpload() {
    return this.state.currentUpload;
  }

  setCurrentUpload(currentUpload) {
    this.state.currentUpload = currentUpload;
    return this;
  }

  getHeight() {
    return this.state.height;
  }

  setHeight(height) {
    this.state.height = height;
    return this;
  }

  isIncoming() {
    return this.state.isIncoming;
  }

  setIsIncoming(isIncoming) {
    this.state.isIncoming = isIncoming;
    return this;
  }

  getLiveTime() {
    return this.state.liveTime;
  }

  setLiveTime(liveTime) {
    this.state.liveTime = liveTime;
    return this;
  }

  isLocalIp() {
    return this.state.isLocalIp;
  }

  setIsLocalIp(isLocalIp) {
    this.state.isLocalIp = isLocalIp;
    return this;
  }

  isLocalHost() {
    return this.state.isLocalHost;
  }

  setIsLocalHost(isLocalHost) {
    this.state.isLocalHost = isLocalHost;
    return this;
  }

  getNumReceives() {
    return this.state.numReceives;
  }

  setNumReceives(numReceives) {
    this.state.numReceives = numReceives;
    return this;
  }

  getNumSends() {
    return this.state.numSends;
  }

  setNumSends(numSends) {
    this.state.numSends = numSends;
    return this;
  }

  getReceiveIdleTime() {
    return this.state.receiveIdleTime;
  }

  setReceiveIdleTime(receiveIdleTime) {
    this.state.receiveIdleTime = receiveIdleTime;
    return this;
  }

  getSendIdleTime() {
    return this.state.sendIdleTime;
  }

  setSendIdleTime(sendIdleTime) {
    this.state.sendIdleTime = sendIdleTime;
    return this;
  }

  getState() {
    return this.state.state;
  }

  setState(state) {
    this.state.state = state;
    return this;
  }

  getNumSupportFlags() {
    return this.state.numSupportFlags;
  }

  setNumSupportFlags(numSupportFlags) {
    this.state.numSupportFlags = numSupportFlags;
    return this;
  }
  
  getType() {
    return this.state.type;
  }
  
  setType(type) {
    this.state.type = type;
    return this;
  }
}

module.exports = MoneroDaemonConnection;