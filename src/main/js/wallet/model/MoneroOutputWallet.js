const assert = require("assert");
const GenUtils = require("../../common/GenUtils");
const MoneroOutput = require("../../daemon/model/MoneroOutput");

/**
 * Models a Monero output with wallet extensions.
 * 
 * @class
 * @extends {MoneroOutput}
 */
class MoneroOutputWallet extends MoneroOutput {
  
  /**
   * Construct the model.
   * 
   * @param {MoneroOutputWallet|object} state is existing state to initialize from (optional)
   */
  constructor(state) {
    super(state);
  }
  
  getAccountIndex() {
    return this.state.accountIndex;
  }

  setAccountIndex(accountIndex) {
    this.state.accountIndex = accountIndex;
    return this;
  }

  getSubaddressIndex() {
    return this.state.subaddressIndex;
  }

  setSubaddressIndex(subaddressIndex) {
    this.state.subaddressIndex = subaddressIndex;
    return this;
  }
  
  isSpent() {
    return this.state.isSpent;
  }

  setIsSpent(isSpent) {
    this.state.isSpent = isSpent;
    return this;
  }
  
  /**
   * Indicates if this output has been deemed 'malicious' and will therefore
   * not be spent by the wallet.
   * 
   * @return Boolean is whether or not this output is frozen
   */
  isFrozen() {
    return this.state.isFrozen;
  }

  setIsFrozen(isFrozen) {
    this.state.isFrozen = isFrozen;
    return this;
  }
  
  isLocked() {
    if (this.getTx() === undefined) return undefined;
    return this.getTx().isLocked();
  }
  
  copy() {
    return new MoneroOutputWallet(this.toJson());
  }
  
  toJson() {
    let json = Object.assign({}, this.state, super.toJson());
    delete json.tx;
    return json;
  }
  
  /**
   * Updates this output by merging the latest information from the given
   * output.
   * 
   * Merging can modify or build references to the output given so it
   * should not be re-used or it should be copied before calling this method.
   * 
   * @param output is the output to merge into this one
   */
  merge(output) {
    assert(output instanceof MoneroOutputWallet);
    if (this === output) return;
    super.merge(output);
    this.setAccountIndex(GenUtils.reconcile(this.getAccountIndex(), output.getAccountIndex()));
    this.setSubaddressIndex(GenUtils.reconcile(this.getSubaddressIndex(), output.getSubaddressIndex()));
    this.setIsSpent(GenUtils.reconcile(this.isSpent(), output.isSpent(), {resolveTrue: true})); // output can become spent
    this.setIsFrozen(GenUtils.reconcile(this.isFrozen(), output.isFrozen()));
    return this;
  }
  
  toString(indent) {
    let str = super.toString(indent) + "\n"
    str += GenUtils.kvLine("Account index", this.getAccountIndex(), indent);
    str += GenUtils.kvLine("Subaddress index", this.getSubaddressIndex(), indent);
    str += GenUtils.kvLine("Is spent", this.isSpent(), indent);
    str += GenUtils.kvLine("Is frozen", this.isFrozen(), indent);
    return str.slice(0, str.length - 1);  // strip last newline
  }
}

module.exports = MoneroOutputWallet;