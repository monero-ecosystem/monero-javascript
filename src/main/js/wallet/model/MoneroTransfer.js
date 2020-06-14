const assert = require("assert");
const BigInteger = require("../../common/biginteger").BigInteger;
const GenUtils = require("../../common/GenUtils");

/**
 * Models a base transfer of funds to or from the wallet.
 * 
 * @class
 */
class MoneroTransfer {
  
  /**
   * Construct the model.
   * 
   * @param {MoneroTransfer|object} state is existing state to initialize from (optional)
   */
  constructor(state) {
    
    // initialize internal state
    if (!state) state = {};
    else if (state instanceof MoneroTransfer) state = state.toJson();
    else if (typeof state === "object") state = Object.assign({}, state);
    else throw new MoneroError("state must be a MoneroTransfer or JavaScript object");
    this.state = state;
    
    // deserialize fields if necessary
    if (state.amount !== undefined && !(state.amount instanceof BigInteger)) state.amount = BigInteger.parse(state.amount);
  }
  
  copy() {
    return new MoneroTransfer(this);
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getAmount()) json.amount = this.getAmount().toString()
    delete json.tx; // parent tx is not serialized
    return json;
  }
  
  getTx() {
    return this.state.tx;
  }
  
  setTx(tx) {
    this.state.tx = tx;
    return this;
  }
  
  isOutgoing() {
    let isIncoming = this.isIncoming();
    assert(typeof isIncoming === "boolean");
    return !isIncoming;
  }
  
  isIncoming() {
    throw new Error("Subclass must implement");
  }

  getAccountIndex() {
    return this.state.accountIndex;
  }

  setAccountIndex(accountIndex) {
    this.state.accountIndex = accountIndex;
    return this;
  }

  getAmount() {
    return this.state.amount;
  }

  setAmount(amount) {
    this.state.amount = amount;
    return this;
  }
  
  /**
   * Updates this transaction by merging the latest information from the given
   * transaction.
   * 
   * Merging can modify or build references to the transfer given so it
   * should not be re-used or it should be copied before calling this method.
   * 
   * @param transfer is the transfer to merge into this one
   * @return {MoneroTransfer} the merged transfer
   */
  merge(transfer) {
    assert(transfer instanceof MoneroTransfer);
    if (this === transfer) return this;
    
    // merge transactions if they're different which comes back to merging transfers
    if (this.getTx() !== transfer.getTx()) {
      this.getTx().merge(transfer.getTx());
      return this;
    }
    
    // otherwise merge transfer fields
    this.setAccountIndex(GenUtils.reconcile(this.getAccountIndex(), transfer.getAccountIndex()));
    
    // TODO monero core: failed tx in pool (after testUpdateLockedDifferentAccounts()) causes non-originating saved wallets to return duplicate incoming transfers but one has amount of 0
    if (this.getAmount() !== undefined && transfer.getAmount() !== undefined && this.getAmount().compare(transfer.getAmount()) !== 0 && (this.getAmount().compare(BigInteger.parse("0")) === 0 || transfer.getAmount().compare(BigInteger.parse("0")) === 0)) {
      throw new Error("failed tx in pool causes non-originating wallets to return duplicate incoming transfers but with one amount/numSuggestedConfirmations of 0");
    } else {
      this.setAmount(GenUtils.reconcile(this.getAmount(), transfer.getAmount()));
    }
    
    return this;
  }
  
  toString(indent = 0) {
    let str = "";
    str += GenUtils.kvLine("Is incoming", this.isIncoming(), indent);
    str += GenUtils.kvLine("Account index", this.getAccountIndex(), indent);
    str += GenUtils.kvLine("Amount", this.getAmount() ? this.getAmount().toString() : undefined, indent);
    return str === "" ? str :  str.slice(0, str.length - 1);  // strip last newline
  }
}

module.exports = MoneroTransfer;