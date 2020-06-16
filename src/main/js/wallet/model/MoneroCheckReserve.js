const BigInteger = require("../../common/biginteger").BigInteger;
const MoneroCheck = require("./MoneroCheck");

/**
 * Results from checking a reserve proof.
 * 
 * @extends {MoneroCheck}
 */
class MoneroCheckReserve extends MoneroCheck {
  
  constructor(state) {
    super(state);
    if (this.state.totalAmount !== undefined && !(this.state.totalAmount instanceof BigInteger)) this.state.totalAmount = BigInteger.parse(this.state.totalAmount);
    if (this.state.unconfirmedSpentAmount !== undefined && !(this.state.unconfirmedSpentAmount instanceof BigInteger)) this.state.unconfirmedSpentAmount = BigInteger.parse(this.state.unconfirmedSpentAmount);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getTotalAmount()) json.totalAmount = this.getTotalAmount().toString();
    if (this.getUnconfirmedSpentAmount()) json.unconfirmedSpentAmount = this.getUnconfirmedSpentAmount().toString();
    return json;
  }
  
  getTotalAmount() {
    return this.state.totalAmount;
  }

  setTotalAmount(totalAmount) {
    this.state.totalAmount = totalAmount;
    return this;
  }
  
  getUnconfirmedSpentAmount() {
    return this.state.unconfirmedSpentAmount;
  }

  setUnconfirmedSpentAmount(unconfirmedSpentAmount) {
    this.state.unconfirmedSpentAmount = unconfirmedSpentAmount;
    return this;
  }
}

module.exports = MoneroCheckReserve;