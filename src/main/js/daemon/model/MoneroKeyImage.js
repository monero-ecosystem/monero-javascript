const assert = require("assert");
const GenUtils = require("../../common/GenUtils");

/**
 * Models a Monero key image.
 */
class MoneroKeyImage {
  
  /**
   * Construct the model.
   * 
   * @param {MoneroKeyImage|object|string} stateOrHex is a MoneroKeyImage, JS object, or hex string to initialize from (optional)
   * @param {string} signature is the key image's signature
   */
  constructor(stateOrHex, signature) {
    if (!stateOrHex) this.state = {};
    else if (stateOrHex instanceof MoneroKeyImage) this.state = stateOrHex.toJson();
    else if (typeof stateOrHex === "object") this.state = Object.assign({}, stateOrHex);
    else if (typeof stateOrHex === "string") {
      this.state = {};
      this.setHex(stateOrHex);
      this.setSignature(signature);
    } else {
      throw new MoneroError("stateOrHex must be a MoneroKeyImage, JavaScript object, or string");
    }
  }

  getHex() {
    return this.state.hex;
  }

  setHex(hex) {
    this.state.hex = hex;
    return this;
  }

  getSignature() {
    return this.state.signature;
  }

  setSignature(signature) {
    this.state.signature = signature;
    return this;
  }
  
  copy() {
    return new MoneroKeyImage(this);
  }
  
  toJson() {
    return Object.assign({}, this.state);
  }
  
  merge(keyImage) {
    assert(keyImage instanceof MoneroKeyImage);
    if (keyImage === this) return this;
    this.setHex(GenUtils.reconcile(this.getHex(), keyImage.getHex()));
    this.setSignature(GenUtils.reconcile(this.getSignature(), keyImage.getSignature()));
    return this;
  }
  
  toString(indent = 0) {
    let str = "";
    str += GenUtils.kvLine("Hex", this.getHex(), indent);
    str += GenUtils.kvLine("Signature", this.getSignature(), indent);
    return str.slice(0, str.length - 1);  // strip last newline
  }
}

module.exports = MoneroKeyImage;