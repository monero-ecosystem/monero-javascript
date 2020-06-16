const assert = require("assert");
const GenUtils = require("../../common/GenUtils");
const MoneroBlockHeader = require("./MoneroBlockHeader");
const MoneroTx = require("./MoneroTx");
const MoneroTxQuery = require("../../wallet/model/MoneroTxQuery");
const MoneroTxWallet = require("../../wallet/model/MoneroTxWallet");

/**
 * Models a Monero block in the blockchain.
 * 
 * @extends {MoneroBlockHeader}
 */
class MoneroBlock extends MoneroBlockHeader {
  
  /**
   * Construct the model.
   * 
   * @param {MoneroBlock|MoneroBlockHeader|object} state is existing state to initialize from (optional)
   * @param {MoneroBlock.DeserializationType} txType informs the tx deserialization type (MoneroTx, MoneroTxWallet, MoneroTxQuery)
   */
  constructor(state, txType) {
    super(state);
    state = this.state;
    
    // deserialize miner tx
    if (state.minerTx && !(state.minerTx instanceof MoneroTx)) state.minerTx = new MoneroTx(state.minerTx).setBlock(this);
    
    // deserialize non-miner txs
    if (state.txs) {
      for (let i = 0; i < state.txs.length; i++) {
        if (txType === MoneroBlock.DeserializationType.TX || txType === undefined) {
          if (!(state.txs[i] instanceof MoneroTx)) state.txs[i] = new MoneroTx(state.txs[i]).setBlock(this);
        } else if (txType === MoneroBlock.DeserializationType.TX_WALLET) {
          if (!(state.txs[i] instanceof MoneroTxWallet)) state.txs[i] = new MoneroTxWallet(state.txs[i]).setBlock(this);
        } else if (txType === MoneroBlock.DeserializationType.TX_QUERY) {
          if (!(state.txs[i] instanceof MoneroTxQuery)) state.txs[i] = new MoneroTxQuery(state.txs[i]).setBlock(this);
        } else {
          throw new Error("Unrecognized tx deserialization type: " + txType);
        }
      }
    }
  }
  
  getHex() {
    return this.state.hex;
  }
  
  setHex(hex) {
    this.state.hex = hex;
    return this;
  }
  
  getMinerTx() {
    return this.state.minerTx;
  }
  
  setMinerTx(minerTx) {
    this.state.minerTx = minerTx;
    return this;
  }
  
  getTxs() {
    return this.state.txs;
  }
  
  setTxs(txs) {
    this.state.txs = txs;
    return this;
  }
  
  getTxHashes() {
    return this.state.txHashes;
  }
  
  setTxHashes(txHashes) {
    this.state.txHashes = txHashes;
    return this;
  }
  
  copy() {
    return new MoneroBlock(this);
  }
  
  toJson() {
    let json = super.toJson();
    if (this.getMinerTx()) json.minerTx = this.getMinerTx().toJson();
    if (this.getTxs()) {
      json.txs = [];
      for (let tx of this.getTxs()) json.txs.push(tx.toJson());
    }
    return json;
  }
  
  merge(block) {
    assert(block instanceof MoneroBlock);
    if (this === block) return this;
    
    // merge header fields
    super.merge(block);
    
    // merge reconcilable block extensions
    this.setHex(GenUtils.reconcile(this.getHex(), block.getHex()));
    this.setTxHashes(GenUtils.reconcile(this.getTxHashes(), block.getTxHashes()));
    
    // merge miner tx
    if (this.getMinerTx() === undefined) this.setMinerTx(block.getMinerTx());
    if (block.getMinerTx() !== undefined) {
      block.getMinerTx().setBlock(this);
      minerTx.merge(block.getMinerTx());
    }
    
    // merge non-miner txs
    if (block.getTxs() !== undefined) {
      for (let tx of block.getTxs()) {
        tx.setBlock(this);
        MoneroBlock._mergeTx(this.getTxs(), tx);
      }
    }

    return this;
  }
  
  toString(indent = 0) {
    let str = super.toString(indent) + "\n";
    str += GenUtils.kvLine("Hex", this.getHex(), indent);
    if (this.getTxs()) {
      str += GenUtils.kvLine("Txs", "", indent);
      for (let tx of this.getTxs()) {
        str += tx.toString(indent + 1) + "\n";
      }
    }
    if (this.getMinerTx()) {
      str += GenUtils.kvLine("Miner tx", "", indent);
      str += this.getMinerTx().toString(indent + 1) + "\n";
    }
    str += GenUtils.kvLine("Txs hashes", this.getTxHashes(), indent);
    return str[str.length - 1] === "\n" ? str.slice(0, str.length - 1) : str  // strip last newline
  }
  
  // private helper to merge txs
  static _mergeTx(txs, tx) {
    for (let aTx of txs) {
      if (aTx.getHash() === tx.getHash()) {
        aTx.merge(tx);
        return;
      }
    }
    txs.push(tx);
  }
}

MoneroBlock.DeserializationType = {
    TX: 0,
    TX_WALLET: 1,
    TX_QUERY: 2
}

module.exports = MoneroBlock;