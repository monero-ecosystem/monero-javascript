const assert = require("assert");
const GenUtils = require("../../common/GenUtils");
const MoneroTransfer = require("./MoneroTransfer");

/**
 * Models an incoming transfer of funds to the wallet.
 * 
 * @extends {MoneroTransfer}
 */
class MoneroIncomingTransfer extends MoneroTransfer {
  
  /**
   * Construct the model.
   * 
   * @param {MoneroTransfer|object} state is existing state to initialize from (optional)
   */
  constructor(state) {
    super(state);
  }
  
  isIncoming() {
    return true;
  }
  
  getSubaddressIndex() {
    return this.state.subaddressIndex;
  }
  
  setSubaddressIndex(subaddressIndex) {
    this.state.subaddressIndex = subaddressIndex;
    return this;
  }
  
  getAddress() {
    return this.state.address;
  }

  setAddress(address) {
    this.state.address = address;
    return this;
  }
  
  /**
   * Return how many confirmations till it's not economically worth re-writing the chain.
   * That is, the number of confirmations before the transaction is highly unlikely to be
   * double spent or overwritten and may be considered settled, e.g. for a merchant to trust
   * as finalized.
   * 
   * @return {number} is the number of confirmations before it's not worth rewriting the chain
   */
  getNumSuggestedConfirmations() {
    return this.state.numSuggestedConfirmations;
  }
  
  setNumSuggestedConfirmations(numSuggestedConfirmations) {
    this.state.numSuggestedConfirmations = numSuggestedConfirmations;
    return this;
  }

  copy() {
    return new MoneroIncomingTransfer(this.toJson());
  }
  
  /**
   * Updates this transaction by merging the latest information from the given
   * transaction.
   * 
   * Merging can modify or build references to the transfer given so it
   * should not be re-used or it should be copied before calling this method.
   * 
   * @param {MoneroIncomingTransfer} transfer is the transfer to merge into this one
   */
  merge(transfer) {
    super.merge(transfer);
    assert(transfer instanceof MoneroIncomingTransfer);
    if (this === transfer) return this;
    this.setSubaddressIndex(GenUtils.reconcile(this.getSubaddressIndex(), transfer.getSubaddressIndex()));
    this.setAddress(GenUtils.reconcile(this.getAddress(), transfer.getAddress()));
    this.setNumSuggestedConfirmations(GenUtils.reconcile(this.getNumSuggestedConfirmations(), transfer.getNumSuggestedConfirmations(), {resolveMax: false}));
    return this;
  }
  
  toString() {
    return this.toString(0);
  }
  
  toString(indent) {
    let str = super.toString(indent) + "\n";
    str += GenUtils.kvLine("Subaddress index", this.getSubaddressIndex(), indent);
    str += GenUtils.kvLine("Address", this.getAddress(), indent);
    str += GenUtils.kvLine("Num suggested confirmations", this.getNumSuggestedConfirmations(), indent);
    return str.slice(0, str.length - 1);  // strip last newline
  }
}

module.exports = MoneroIncomingTransfer;