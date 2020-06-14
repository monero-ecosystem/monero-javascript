const assert = require("assert");
const BigInteger = require("../../common/biginteger").BigInteger;
const MoneroSubaddress = require("./MoneroSubaddress");

/**
 * Monero account model.
 */
class MoneroAccount {
  
  constructor(stateOrIndex, primaryAddress, balance, unlockedBalance, subaddresses) {
    
    // construct from json
    if (typeof stateOrIndex === "object") {
      this.state = stateOrIndex;
      
      // deserialize balances
      if (this.state.balance !== undefined && !(this.state.balance instanceof BigInteger)) this.state.balance = BigInteger.parse(this.state.balance);
      if (this.state.unlockedBalance !== undefined && !(this.state.unlockedBalance instanceof BigInteger)) this.state.unlockedBalance = BigInteger.parse(this.state.unlockedBalance);
      
      // deserialize subaddresses
      if (this.state.subaddresses) {
        for (let i = 0; i < this.state.subaddresses.length; i++) {
          if (!(this.state.subaddresses[i] instanceof MoneroSubaddress)) {
            this.state.subaddresses[i] = new MoneroSubaddress(this.state.subaddresses[i]);
          }
        }
      }
    }
    
    // construct from individual params
    else {
      this.state = {};
      this.setIndex(stateOrIndex);
      this.setPrimaryAddress(primaryAddress);
      this.setBalance(balance);
      this.setUnlockedBalance(unlockedBalance);
      this.setSubaddresses(subaddresses);
    }
  }
  
  toJson() {
    let json = Object.assign({}, this.state);
    if (json.balance) json.balance = json.balance.toString();
    if (json.unlockedBalance) json.unlockedBalance = json.unlockedBalance.toString();
    if (json.subaddresses) {
      for (let i = 0; i < json.subaddresses.length; i++) {
        json.subaddresses[i] = json.subaddresses[i].toJson();
      }
    }
    return json;
  }
  
  getIndex() {
    return this.state.index;
  }
  
  setIndex(index) {
    this.state.index = index;
    return this;
  }
  
  getPrimaryAddress() {
    return this.state.primaryAddress;
  }

  setPrimaryAddress(primaryAddress) {
    this.state.primaryAddress = primaryAddress;
    return this;
  }
  
  getBalance() {
    return this.state.balance;
  }
  
  setBalance(balance) {
    this.state.balance = balance;
    return this;
  }
  
  getUnlockedBalance() {
    return this.state.unlockedBalance;
  }
  
  setUnlockedBalance(unlockedBalance) {
    this.state.unlockedBalance = unlockedBalance;
    return this;
  }
  
  getTag() {
    return this.state.tag;
  }
  
  setTag(tag) {
    this.state.tag = tag;
    return this;
  }
  
  getSubaddresses() {
    return this.state.subaddresses;
  }
  
  setSubaddresses(subaddresses) {
    assert(subaddresses === undefined || Array.isArray(subaddresses), "Given subaddresses must be undefined or an array of subaddresses");
    this.state.subaddresses = subaddresses;
    if (subaddresses) {
      for (let subaddress of subaddresses) {
        subaddress.setAccountIndex(this.state.index);
      }
    }
    return this;
  }
  
  toString(indent = 0) {
    let str = "";
    str += GenUtils.kvLine("Index", this.getIndex(), indent);
    str += GenUtils.kvLine("Primary address", this.getPrimaryAddress(), indent);
    str += GenUtils.kvLine("Balance", this.getBalance(), indent);
    str += GenUtils.kvLine("Unlocked balance", this.getUnlockedBalance(), indent);
    str += GenUtils.kvLine("Tag", this.getTag(), indent);
    if (this.getSubaddresses() != null) {
      sb += GenUtils.kvLine("Subaddresses", "", indent)
      for (let i = 0; i < this.getSubaddresses().size(); i++) {
        str += GenUtils.kvLine(i + 1, "", indent + 1);
        str += this.getSubaddresses()[i].toString(indent + 2) + "\n";
      }
    }
    return str.slice(0, str.length - 1);  // strip last newline
  }
}

module.exports = MoneroAccount;