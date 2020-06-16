const MoneroCheck = require("./MoneroCheck");
const BigInteger = require("../../common/biginteger").BigInteger;

/**
 * Results from checking a transaction key.
 * 
 * @extends {MoneroCheck}
 */
class MoneroCheckTx extends MoneroCheck {
  
  constructor(state) {
    super(state);
    if (this.state.receivedAmount !== undefined && !(this.state.receivedAmount instanceof BigInteger)) this.state.receivedAmount = BigInteger.parse(this.state.receivedAmount);
  }
  
  toJson() {
    let json = Object.assign({}, state);
    if (this.getReceivedAmount()) json.receivedAmount = this.getReceivedAmount().toString();
    return json;
  }

  inTxPool() {
    return this.state.inTxPool;
  }
  
  setInTxPool(inTxPool) {
    this.state.inTxPool = inTxPool;
    return this;
  }
  
  getNumConfirmations() {
    return this.state.numConfirmations;
  }
  
  setNumConfirmations(numConfirmations) {
    this.state.numConfirmations = numConfirmations;
    return this;
  }
  
  getReceivedAmount() {
    return this.state.receivedAmount;
  }
  
  setReceivedAmount(receivedAmount) {
    this.state.receivedAmount = receivedAmount;
    return this;
  }
}

module.exports = MoneroCheckTx;