const BigInteger = require("../../common/biginteger").BigInteger;

/**
 * Entry in a Monero output histogram (see get_output_histogram of Daemon RPC documentation).
 */
class MoneroOutputHistogramEntry {
  
  constructor(state) {
    this.state = Object.assign({}, state);
    if (this.state.amount !== undefined && !(this.state.amount instanceof BigInteger)) this.state.amount = BigInteger.parse(this.state.amount);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (json.amount) json.amount = json.amount.toString();
    return json;
  }
  
  getAmount() {
    return this.state.amount;
  }
  
  setAmount(amount) {
    this.state.amount = amount;
    return this;
  }

  getNumInstances() {
    return this.state.numInstances;
  }

  setNumInstances(numInstances) {
    this.state.numInstances = numInstances;
    return this;
  }

  getNumUnlockedInstances() {
    return this.state.numUnlockedInstances;
  }

  setNumUnlockedInstances(numUnlockedInstances) {
    this.state.numUnlockedInstances = numUnlockedInstances;
    return this;
  }

  getNumRecentInstances() {
    return this.state.numRecentInstances;
  }

  setNumRecentInstances(numRecentInstances) {
    this.state.numRecentInstances = numRecentInstances;
    return this;
  }
}

module.exports = MoneroOutputHistogramEntry;