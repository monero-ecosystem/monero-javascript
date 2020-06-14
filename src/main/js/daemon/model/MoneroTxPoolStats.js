const BigInteger = require("../../common/biginteger").BigInteger;

/**
 * Models transaction pool statistics.
 */
class MoneroTxPoolStats {
  
  constructor(state) {
    this.state = Object.assign({}, state);
    if (this.state.feeTotal !== undefined && !(this.state.feeTotal instanceof BigInteger)) this.state.feeTotal = BigInteger.parse(this.state.feeTotal);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (json.feeTotal) json.feeTotal = json.feeTotal.toString();
    return json;
  }
  
  getNumTxs() {
    return this.state.numTxs;
  }
  
  setNumTxs(numTxs) {
    this.state.numTxs = numTxs;
    return this;
  }
  
  getNumNotRelayed() {
    return this.state.numNotRelayed;
  }
  
  setNumNotRelayed(numNotRelayed) {
    this.state.numNotRelayed = numNotRelayed;
    return this;
  }
  
  getNumFailing() {
    return this.state.numFailing;
  }
  
  setNumFailing(numFailing) {
    this.state.numFailing = numFailing;
    return this;
  }
  
  getNumDoubleSpends() {
    return this.state.numDoubleSpends;
  }
  
  setNumDoubleSpends(numDoubleSpends) {
    this.state.numDoubleSpends = numDoubleSpends;
    return this;
  }
  
  getNum10m() {
    return this.state.num10m;
  }
  
  setNum10m(num10m) {
    this.state.num10m = num10m;
    return this;
  }
  
  getFeeTotal() {
    return this.state.feeTotal;
  }
  
  setFeeTotal(feeTotal) {
    this.state.feeTotal = feeTotal;
    return this;
  }
  
  getBytesMax() {
    return this.state.bytesMax;
  }
  
  setBytesMax(bytesMax) {
    this.state.bytesMax = bytesMax;
    return this;
  }
  
  getBytesMed() {
    return this.state.bytesMed;
  }
  
  setBytesMed(bytesMed) {
    this.state.bytesMed = bytesMed;
    return this;
  }
  
  getBytesMin() {
    return this.state.bytesMin;
  }
  
  setBytesMin(bytesMin) {
    this.state.bytesMin = bytesMin;
    return this;
  }
  
  getBytesTotal() {
    return this.state.bytesTotal;
  }
  
  setBytesTotal(bytesTotal) {
    this.state.bytesTotal = bytesTotal;
    return this;
  }
  
  // TODO: histo... what?
  getHisto() {
    return this.state.histo;
  }
  
  setHisto(histo) {
    this.state.histo = histo;
    return this;
  }
  
  getHisto98pc() {
    return this.state.histo98pc;
  }
  
  setHisto98pc(histo98pc) {
    this.state.histo98pc = histo98pc;
    return this;
  }
  
  getOldestTimestamp() {
    return this.state.oldestTimestamp;
  }
  
  setOldestTimestamp(oldestTimestamp) {
    this.state.oldestTimestamp = oldestTimestamp;
    return this;
  }
}

module.exports = MoneroTxPoolStats;