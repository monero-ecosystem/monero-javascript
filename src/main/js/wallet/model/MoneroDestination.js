const BigInteger = require("../../common/biginteger").BigInteger;
const GenUtils = require("../../common/GenUtils");

/**
 * Models an outgoing transfer destination.
 */
class MoneroDestination {
  
  /**
   * Construct the model.
   * 
   * @param {MoneroDestination|object|string} stateOrAddress is a MoneroDestination, JS object, or hex string to initialize from (optional)
   */
  constructor(stateOrAddress, amount) {
    
    // initialize internal state
    if (!stateOrAddress) this.state = {};
    else if (stateOrAddress instanceof MoneroDestination) this.state = stateOrAddress.toJson();
    else if (typeof stateOrAddress === "object") this.state = Object.assign({}, stateOrAddress);
    else if (typeof stateOrAddress === "string")  {
      this.state = {};
      this.setAddress(stateOrAddress);
      this.setAmount(amount);
    } else {
      throw new MoneroError("stateOrAddress must be a MoneroDestination, JavaScript object, or hex string");
    }
      
    // deserialize amount  
    if (this.state.amount !== undefined && !(this.state.amount instanceof BigInteger)) this.state.amount = BigInteger.parse(this.state.amount);
  }
  
  getAddress() {
    return this.state.address;
  }

  setAddress(address) {
    this.state.address = address;
    return this;
  }
  
  getAmount() {
    return this.state.amount;
  }

  setAmount(amount) {
    this.state.amount = amount;
    return this;
  }

  copy() {
    return new MoneroDestination(this);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getAmount()) json.amount = this.getAmount().toString();
    return json;
  }
  
  toString(indent = 0) {
    let str = GenUtils.kvLine("Address", this.getAddress(), indent);
    str += GenUtils.kvLine("Amount", this.getAmount() ? this.getAmount().toString() : undefined, indent);
    return str.slice(0, str.length - 1);  // strip last newline
  }
}

module.exports = MoneroDestination;