const BigInteger = require("../../common/biginteger").BigInteger;

/**
 * Model for the summation of miner emissions and fees.
 */
class MoneroMinerTxSum {
  
  constructor(state) {
    state = Object.assign({}, state);
    this.state = state;
    
    // deserialize BigIntegers
    if (state.emissionSum !== undefined && !(state.emissionSum instanceof BigInteger)) state.emissionSum = BigInteger.parse(state.emissionSum);
    if (state.feeSum !== undefined && !(state.feeSum instanceof BigInteger)) state.feeSum = BigInteger.parse(state.feeSum);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getEmissionSum()) json.emissionSum = this.getEmissionSum().toString();
    if (this.getFeeSum()) json.feeSum = this.getFeeSum().toString();
    return json;
  }
  
  getEmissionSum() {
    return this.state.emissionSum;
  }
  
  setEmissionSum(emissionSum) {
    this.state.emissionSum = emissionSum;
    return this;
  }
  
  getFeeSum() {
    return this.state.feeSum;
  }
  
  setFeeSum(feeSum) {
    this.state.feeSum = feeSum;
    return this;
  }
}

module.exports = MoneroMinerTxSum;