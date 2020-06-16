const assert = require("assert");
const BigInteger = require("../../common/biginteger").BigInteger;
const GenUtils = require("../../common/GenUtils");
const MoneroIncomingTransfer = require("./MoneroIncomingTransfer");
const MoneroOutgoingTransfer = require("./MoneroOutgoingTransfer");
const MoneroOutputWallet = require("./MoneroOutputWallet");
const MoneroTx = require("../../daemon/model/MoneroTx");

/**
 * Models a Monero transaction with wallet extensions.
 * 
 * @class
 * @extends {MoneroTx}
 */
class MoneroTxWallet extends MoneroTx {
  
  /**
   * Construct the model.
   * 
   * @param {MoneroTxWallet|object} state is existing state to initialize from (optional)
   */
  constructor(state) {
    super(state);
    if (state instanceof MoneroTxWallet && state.getTxSet()) this.setTxSet(state.getTxSet()); // preserve reference to tx set
    state = this.state;
    
    // deserialize incoming transfers
    if (state.incomingTransfers) {
      for (let i = 0; i < state.incomingTransfers.length; i++) {
        if (!(state.incomingTransfers[i] instanceof MoneroIncomingTransfer)) {
          state.incomingTransfers[i] = new MoneroIncomingTransfer(Object.assign(state.incomingTransfers[i], {tx: this}));
        }
      }
    }
    
    // deserialize outgoing transfer
    if (state.outgoingTransfer && !(state.outgoingTransfer instanceof MoneroOutgoingTransfer)) {
      this.setOutgoingTransfer(new MoneroOutgoingTransfer(Object.assign(state.outgoingTransfer, {tx: this})));
    }
    
    // deserialize inputs
    if (state.inputs) {
      for (let i = 0; i < state.inputs.length; i++) {
        if (!(state.inputs[i] instanceof MoneroOutputWallet)) {
          state.inputs[i] = new MoneroOutputWallet(Object.assign(state.inputs[i].toJson(), {tx: this}));
        }
      }
    }
    
    // deserialize outputs
    if (state.outputs) {
      for (let i = 0; i < state.outputs.length; i++) {
        if (!(state.outputs[i] instanceof MoneroOutputWallet)) {
          state.outputs[i] = new MoneroOutputWallet(Object.assign(state.outputs[i].toJson(), {tx: this}));
        }
      }
    }
    
    // deserialize BigIntegers
    if (state.inputSum !== undefined && !(state.inputSum instanceof BigInteger)) state.inputSum = BigInteger.parse(state.inputSum);
    if (state.outputSum !== undefined && !(state.outputSum instanceof BigInteger)) state.outputSum = BigInteger.parse(state.outputSum);
    if (state.changeAmount !== undefined && !(state.changeAmount instanceof BigInteger)) state.changeAmount = BigInteger.parse(state.changeAmount);
  }
  
  toJson() {
    let json = Object.assign({}, this.state, super.toJson()); // merge json onto inherited state
    if (this.getIncomingTransfers()) {
      json.incomingTransfers = [];
      for (let incomingTransfer of this.getIncomingTransfers()) json.incomingTransfers.push(incomingTransfer.toJson());
    }
    if (this.getOutgoingTransfer()) json.outgoingTransfer = this.getOutgoingTransfer().toJson();
    if (this.getInputSum()) json.inputSum = this.getInputSum().toString();
    if (this.getOutputSum()) json.outputSum = this.getOutputSum().toString();
    if (this.getChangeAmount()) json.changeAmount = this.getChangeAmount().toString();
    delete json.block;  // do not serialize parent block
    delete json.txSet;  // do not serialize parent tx set
    return json;
  }
  
  getTxSet() {
    return this.state.txSet;
  }
  
  setTxSet(txSet) {
    this.state.txSet = txSet;
    return this;
  }
  
  isIncoming() {
    return this.state.isIncoming;
  }
  
  setIsIncoming(isIncoming) {
    this.state.isIncoming = isIncoming;
    return this;
  }
  
  isOutgoing() {
    return this.state.isOutgoing;
  }
  
  setIsOutgoing(isOutgoing) {
    this.state.isOutgoing = isOutgoing;
    return this;
  }
  
  getIncomingAmount() {
    if (this.getIncomingTransfers() === undefined) return undefined;
    let incomingAmt = BigInteger.parse("0");
    for (let transfer of this.getIncomingTransfers()) incomingAmt = incomingAmt.add(transfer.getAmount());
    return incomingAmt;
  }
  
  getOutgoingAmount() {
    return this.getOutgoingTransfer() ? this.getOutgoingTransfer().getAmount() : undefined;
  }
  
  getTransfers(transferQuery) {
    let transfers = [];
    if (this.getOutgoingTransfer() && (!transferQuery || transferQuery.meetsCriteria(this.getOutgoingTransfer()))) transfers.push(this.getOutgoingTransfer());
    if (this.getIncomingTransfers()) {
      for (let transfer of this.getIncomingTransfers()) {
        if (!transferQuery || transferQuery.meetsCriteria(transfer)) transfers.push(transfer);
      }
    }
    return transfers;
  }
  
  filterTransfers(transferQuery) {
    let transfers = [];
    
    // collect outgoing transfer or erase if filtered
    if (this.getOutgoingTransfer() && (!transferQuery || transferQuery.meetsCriteria(this.getOutgoingTransfer()))) transfers.push(this.getOutgoingTransfer());
    else this.setOutgoingTransfer(undefined);
    
    // collect incoming transfers or erase if filtered
    if (this.getIncomingTransfers()) {
      let toRemoves = [];
      for (let transfer of this.getIncomingTransfers()) {
        if (transferQuery.meetsCriteria(transfer)) transfers.push(transfer);
        else toRemoves.push(transfer);
      }
      this.setIncomingTransfers(this.getIncomingTransfers().filter(function(transfer) {
        return !toRemoves.includes(transfer);
      }));
      if (this.getIncomingTransfers().length === 0) this.setIncomingTransfers(undefined);
    }
    
    return transfers;
  }
  
  getIncomingTransfers() {
    return this.state.incomingTransfers;
  }
  
  setIncomingTransfers(incomingTransfers) {
    this.state.incomingTransfers = incomingTransfers;
    return this;
  }
  
  getOutgoingTransfer() {
    return this.state.outgoingTransfer;
  }
  
  setOutgoingTransfer(outgoingTransfer) {
    this.state.outgoingTransfer = outgoingTransfer;
    return this;
  }
  
  getOutputs(outputQuery) {
    if (!outputQuery || !super.getOutputs()) return super.getOutputs();
    let outputs = [];
    for (let output of super.getOutputs()) if (!outputQuery || outputQuery.meetsCriteria(output)) outputs.push(output);
    return outputs;
  }
  
  setOutputs(outputs) {
    
    // validate that all outputs are wallet outputs
    if (outputs) {
      for (let output of outputs) {
        if (!(output instanceof MoneroOutputWallet)) throw new MoneroError("Wallet transaction outputs must be of type MoneroOutputWallet");
      }
    }
    super.setOutputs(outputs);
    return this;
  }
  
  filterOutputs(outputQuery) {
    let outputs = [];
    if (super.getOutputs()) {
      let toRemoves = [];
      for (let output of super.getOutputs()) {
        if (!outputQuery || outputQuery.meetsCriteria(output)) outputs.push(output);
        else toRemoves.push(output);
      }
      this.setOutputs(super.getOutputs().filter(function(output) {
        return !toRemoves.includes(output);
      }));
      if (this.getOutputs().length === 0) this.setOutputs(undefined);
    }
    return outputs;
  }
  
  getNote() {
    return this.state.note;
  }
  
  setNote(note) {
    this.state.note = note;
    return this;
  }
  
  isLocked() {
    return this.state.isLocked;
  }
  
  setIsLocked(isLocked) {
    this.state.isLocked = isLocked;
    return this;
  }
  
  getInputSum() {
    return this.state.inputSum;
  }
  
  setInputSum(inputSum) {
    this.state.inputSum = inputSum;
    return this;
  }
  
  getOutputSum() {
    return this.state.outputSum;
  }
  
  setOutputSum(outputSum) {
    this.state.outputSum = outputSum;
    return this;
  }
  
  getChangeAddress() {
    return this.state.changeAddress;
  }
  
  setChangeAddress(changeAddress) {
    this.state.changeAddress = changeAddress;
    return this;
  }
  
  getChangeAmount() {
    return this.state.changeAmount;
  }
  
  setChangeAmount(changeAmount) {
    this.state.changeAmount = changeAmount;
    return this;
  }
  
  getNumDummyOutputs() {
    return this.state.numDummyOutputs;
  }
  
  setNumDummyOutputs(numDummyOutputs) {
    this.state.numDummyOutputs = numDummyOutputs;
    return this;
  }
  
  getExtraHex() {
    return this.state.extraHex;
  }
  
  setExtraHex(extraHex) {
    this.state.extraHex = extraHex;
    return this;
  }
  
  copy() {
    return new MoneroTxWallet(this);
  }
  
  /**
   * Updates this transaction by merging the latest information from the given
   * transaction.
   * 
   * Merging can modify or build references to the transaction given so it
   * should not be re-used or it should be copied before calling this method.
   * 
   * @param tx is the transaction to merge into this transaction
   */
  merge(tx) {
    assert(tx instanceof MoneroTxWallet);
    if (this === tx) return this;
    
    // merge base classes
    super.merge(tx);
    
    // merge tx set if they're different which comes back to merging txs
    const MoneroTxSet = require("./MoneroTxSet");
    if (this.getTxSet() !== tx.getTxSet()) {
      if (this.getTxSet() == undefined) {
        this.setTxSet(new MoneroTxSet().setTxs([this]));
      }
      if (tx.getTxSet() === undefined) {
        tx.setTxSet(new MoneroTxSet().setTxs([tx]));
      }
      this.getTxSet().merge(tx.getTxSet());
      return this;
    }
    
    // merge incoming transfers
    if (tx.getIncomingTransfers()) {
      if (this.getIncomingTransfers() === undefined) this.setIncomingTransfers([]);
      for (let transfer of tx.getIncomingTransfers()) {
        transfer.setTx(this);
        MoneroTxWallet._mergeIncomingTransfer(this.getIncomingTransfers(), transfer);
      }
    }
    
    // merge outgoing transfer
    if (tx.getOutgoingTransfer()) {
      tx.getOutgoingTransfer().setTx(this);
      if (this.getOutgoingTransfer() === undefined) this.setOutgoingTransfer(tx.getOutgoingTransfer());
      else this.getOutgoingTransfer().merge(tx.getOutgoingTransfer());
    }
    
    // merge simple extensions
    this.setIsIncoming(GenUtils.reconcile(this.isIncoming(), tx.isIncoming()));
    this.setIsOutgoing(GenUtils.reconcile(this.isOutgoing(), tx.isOutgoing()));
    this.setNote(GenUtils.reconcile(this.getNote(), tx.getNote()));
    this.setIsLocked(GenUtils.reconcile(this.isLocked(), tx.isLocked()));
    this.setInputSum(GenUtils.reconcile(this.getInputSum(), tx.getInputSum()));
    this.setOutputSum(GenUtils.reconcile(this.getOutputSum(), tx.getOutputSum()));
    this.setChangeAddress(GenUtils.reconcile(this.getChangeAddress(), tx.getChangeAddress()));
    this.setChangeAmount(GenUtils.reconcile(this.getChangeAmount(), tx.getChangeAmount()));
    this.setNumDummyOutputs(GenUtils.reconcile(this.getNumDummyOutputs(), tx.getNumDummyOutputs()));
    this.setExtraHex(GenUtils.reconcile(this.getExtraHex(), tx.getExtraHex()));
    
    return this;  // for chaining
  }
  
  toString(indent = 0, oneLine) {
    let str = "";
    
    // represent tx with one line string
    // TODO: proper csv export
    if (oneLine) {
      str += this.getHash() + ", ";
      str += (this.isConfirmed() ? this.getBlock().getTimestamp() : this.getReceivedTimestamp()) + ", ";
      str += this.isConfirmed() + ", ";
      str += (this.getOutgoingAmount() ? this.getOutgoingAmount().toString() : "") + ", ";
      str += this.getIncomingAmount() ? this.getIncomingAmount().toString() : "";
      return str;
    }
    
    // otherwise stringify all fields
    str += super.toString(indent) + "\n";
    str += GenUtils.kvLine("Is incoming", this.isIncoming(), indent);
    str += GenUtils.kvLine("Incoming amount", this.getIncomingAmount(), indent);
    if (this.getIncomingTransfers()) {
      str += GenUtils.kvLine("Incoming transfers", "", indent);
      for (let i = 0; i < this.getIncomingTransfers().length; i++) {
        str += GenUtils.kvLine(i + 1, "", indent + 1);
        str += this.getIncomingTransfers()[i].toString(indent + 2) + "\n";
      }
    }
    str += GenUtils.kvLine("Is outgoing", this.isOutgoing(), indent);
    str += GenUtils.kvLine("Outgoing amount", this.getOutgoingAmount(), indent);
    if (this.getOutgoingTransfer()) {
      str += GenUtils.kvLine("Outgoing transfer", "", indent);
      str += this.getOutgoingTransfer().toString(indent + 1) + "\n";
    }
    str += GenUtils.kvLine("Note: ", this.getNote(), indent);
    str += GenUtils.kvLine("Is locked: ", this.isLocked(), indent);
    str += GenUtils.kvLine("Input sum: ", this.getInputSum(), indent);
    str += GenUtils.kvLine("Output sum: ", this.getOutputSum(), indent);
    str += GenUtils.kvLine("Change address: ", this.getChangeAddress(), indent);
    str += GenUtils.kvLine("Change amount: ", this.getChangeAmount(), indent);
    str += GenUtils.kvLine("Num dummy outputs: ", this.getNumDummyOutputs(), indent);
    str += GenUtils.kvLine("Extra hex: ", this.getExtraHex(), indent);
    return str.slice(0, str.length - 1);  // strip last newline
  }
  
  // private helper to merge transfers
  static _mergeIncomingTransfer(transfers, transfer) {
    for (let aTransfer of transfers) {
      if (aTransfer.getAccountIndex() === transfer.getAccountIndex() && aTransfer.getSubaddressIndex() === transfer.getSubaddressIndex()) {
        aTransfer.merge(transfer);
        return;
      }
    }
    transfers.push(transfer);
  }
}

module.exports = MoneroTxWallet;