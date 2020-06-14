const assert = require("assert");
const GenUtils = require("../../common/GenUtils");
const BigInteger = require("../../common/biginteger").BigInteger;
const MoneroKeyImage = require("./MoneroKeyImage");

/**
 * Models a Monero transaction output.
 * 
 * @class
 */
class MoneroOutput {
  
  /**
   * Construct the model.
   * 
   * @param {MoneroOutput|object} state is existing state to initialize from (optional)
   */
  constructor(state) {
    
    // initialize internal state
    if (!state) state = {};
    else if (state instanceof MoneroOutput) state = state.toJson();
    else if (typeof state === "object") state = Object.assign({}, state);
    else throw new MoneroError("state must be a MoneroOutput or JavaScript object");
    this.state = state;
    
    // deserialize fields if necessary
    if (state.amount !== undefined && !(state.amount instanceof BigInteger)) state.amount = BigInteger.parse(state.amount);
    if (state.keyImage && !(state.keyImage instanceof MoneroKeyImage)) state.keyImage = new MoneroKeyImage(state.keyImage);
  }
  
  getTx() {
    return this.state.tx;
  }
  
  setTx(tx) {
    this.state.tx = tx;
    return this;
  }
  
  getKeyImage() {
    return this.state.keyImage;
  }

  setKeyImage(keyImage) {
    assert(keyImage === undefined || keyImage instanceof MoneroKeyImage);
    this.state.keyImage = keyImage;
    return this;
  }
  
  getAmount() {
    return this.state.amount;
  }

  setAmount(amount) {
    this.state.amount = amount;
    return this;
  }
  
  getIndex() {
    return this.state.index;
  }
  
  setIndex(index) {
    this.state.index = index;
    return this;
  }
  
  getRingOutputIndices() {
    return this.state.ringOutputIndices;
  }
  
  setRingOutputIndices(ringOutputIndices) {
    this.state.ringOutputIndices = ringOutputIndices;
    return this;
  }
  
  getStealthPublicKey() {
    return this.state.stealthPublicKey;
  }
  
  setStealthPublicKey(stealthPublicKey) {
    this.state.stealthPublicKey = stealthPublicKey;
    return this;
  }
  
  copy() {
    return new MoneroOutput(this);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getAmount()) json.amount = this.getAmount() ? this.getAmount().toString() : undefined;
    if (this.getKeyImage()) json.keyImage = this.getKeyImage() ? this.getKeyImage().toJson() : undefined;
    delete json.tx;
    return json;
  }
  
  merge(output) {
    assert(output instanceof MoneroOutput);
    if (this === output) return this;
    
    // merge txs if they're different which comes back to merging outputs
    if (this.getTx() !== output.getTx()) this.getTx().merge(output.getTx());
    
    // otherwise merge output fields
    else {
      if (this.getKeyImage() === undefined) this.setKeyImage(output.getKeyImage());
      else if (output.getKeyImage() !== undefined) this.getKeyImage().merge(output.getKeyImage());
      this.setAmount(GenUtils.reconcile(this.getAmount(), output.getAmount()));
      this.setIndex(GenUtils.reconcile(this.getIndex(), output.getIndex()));
    }

    return this;
  }
  
  toString(indent = 0) {
    let str = "";
    if (this.getKeyImage()) {
      str += GenUtils.kvLine("Key image", "", indent);
      str += this.getKeyImage().toString(indent + 1) + "\n";
    }
    str += GenUtils.kvLine("Amount", this.getAmount(), indent);
    str += GenUtils.kvLine("Index", this.getIndex(), indent);
    str += GenUtils.kvLine("Ring output indices", this.getRingOutputIndices(), indent);
    str += GenUtils.kvLine("Stealth public key", this.getStealthPublicKey(), indent);
    return str === "" ? str : str.slice(0, str.length - 1);  // strip last newline
  }
}

module.exports = MoneroOutput;