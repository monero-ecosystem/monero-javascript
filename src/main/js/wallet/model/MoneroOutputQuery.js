const BigInteger = require("../../common/biginteger").BigInteger;
const MoneroOutputWallet = require("./MoneroOutputWallet");

/**
 * Configuration to query wallet outputs.
 * 
 * @extends {MoneroOutputWallet}
 */
class MoneroOutputQuery extends MoneroOutputWallet {
  
  /**
   * <p>Construct the output query.</p>
   * 
   * <p>Example:</p>
   * 
   * <code>
   * &sol;&sol; get available outputs in account 0 with a minimum amount<br>
   * let outputs = await wallet.getOutputs({<br>
   * &nbsp;&nbsp; isSpent: false,<br>
   * &nbsp;&nbsp; isLocked: false,<br>
   * &nbsp;&nbsp; accountIndex: 0,<br>
   * &nbsp;&nbsp; minAmount: new BigInteger("750000")<br>
   * });
   * </code>
   * 
   * <p>All configuration is optional.  All outputs are returned except those that don't meet criteria defined in this query.</p>
   * 
   * @param {object} config - output query configuration (optional)
   * @param {int} config.accountIndex - get outputs in this account index
   * @param {int} config.subaddressIndex - get outputs in this subaddress index
   * @param {int[]} config.subaddressIndices - get outputs in these subaddress indices
   * @param {BigInteger} config.amount - get outputs with this amount
   * @param {BigInteger} config.minAmount - get outputs with amount greater than or equal to this amount
   * @param {BigInteger} config.maxAmount - get outputs with amount less than or equal to this amount
   * @param {boolean} config.isLocked - get locked xor unlocked outputs
   * @param {boolean} config.isSpent - get spent xor unspent outputs
   * @param {object|MoneroKeyImage} config.keyImage - get outputs with a key image matching fields defined in this key image
   * @param {string} config.keyImage.hex - get outputs with this key image hex
   * @param {string} config.keyImage.signature - get outputs with this key image signature
   * @param {object|MoneroTxQuery} config.txQuery - get outputs whose tx match this tx query
   */
  constructor(config) {
    super(config);
    
    // deserialize if necessary
    const MoneroTxQuery = require("./MoneroTxQuery");
    if (this.state.minAmount !== undefined && !(this.state.minAmount instanceof BigInteger)) this.state.minAmount = BigInteger.parse(this.state.minAmount);
    if (this.state.maxAmount !== undefined && !(this.state.maxAmount instanceof BigInteger)) this.state.maxAmount = BigInteger.parse(this.state.maxAmount);
    if (this.state.txQuery && !(this.state.txQuery instanceof MoneroTxQuery)) this.state.txQuery = new MoneroTxQuery(this.state.txQuery);
    if (this.state.txQuery) this.state.txQuery.setOutputQuery(this);
    if (this.state.isLocked !== undefined) this.setIsLocked(this.state.isLocked);
  }
  
  copy() {
    return new MoneroOutputQuery(this);
  }
  
  toJson() {
    let json = Object.assign({}, this.state, super.toJson());
    if (this.getMinAmount()) json.minAmount = this.getMinAmount().toString();
    if (this.getMaxAmount()) json.maxAmount = this.getMaxAmount().toString();
    delete json.txQuery;
    return json;
  }
  
  getMinAmount() {
    return this.state.minAmount;
  }

  setMinAmount(minAmount) {
    this.state.minAmount = minAmount;
    return this;
  }

  getMaxAmount() {
    return this.state.maxAmount;
  }

  setMaxAmount(maxAmount) {
    this.state.maxAmount = maxAmount;
    return this;
  }
  
  getTxQuery() {
    return this.state.txQuery;
  }
  
  setTxQuery(txQuery) {
    this.state.txQuery = txQuery;
    if (txQuery) txQuery.state.outputQuery = this;
    return this;
  }
  
  getSubaddressIndices() {
    return this.state.subaddressIndices;
  }
  
  setSubaddressIndices(subaddressIndices) {
    this.state.subaddressIndices = subaddressIndices;
    return this;
  }
  
  meetsCriteria(output, queryParent) {
    if (!(output instanceof MoneroOutputWallet)) throw new Error("Output not given to MoneroOutputQuery.meetsCriteria(output)");
    if (queryParent === undefined) queryParent = true;
    
    // filter on output
    if (this.getAccountIndex() !== undefined && this.getAccountIndex() !== output.getAccountIndex()) return false;
    if (this.getSubaddressIndex() !== undefined && this.getSubaddressIndex() !== output.getSubaddressIndex()) return false;
    if (this.getAmount() !== undefined && this.getAmount().compare(output.getAmount()) !== 0) return false;
    if (this.isSpent() !== undefined && this.isSpent() !== output.isSpent()) return false;
    
    // filter on output's key image
    if (this.getKeyImage() !== undefined) {
      if (output.getKeyImage() === undefined) return false;
      if (this.getKeyImage().getHex() !== undefined && this.getKeyImage().getHex() !== output.getKeyImage().getHex()) return false;
      if (this.getKeyImage().getSignature() !== undefined && this.getKeyImage().getSignature() !== output.getKeyImage().getSignature()) return false;
    }
    
    // filter on extensions
    if (this.getSubaddressIndices() !== undefined && !this.getSubaddressIndices().includes(output.getSubaddressIndex())) return false;
    
    // filter with tx query
    if (this.getTxQuery() && !this.getTxQuery().meetsCriteria(output.getTx(), false)) return false;
    
    // filter on remaining fields
    if (this.getMinAmount() !== undefined && (output.getAmount() === undefined || output.getAmount().compare(this.getMinAmount()) < 0)) return false;
    if (this.getMaxAmount() !== undefined && (output.getAmount() === undefined || output.getAmount().compare(this.getMaxAmount()) > 0)) return false;
    
    // output meets query
    return true;
  }
}

MoneroOutputQuery._EMPTY_OUTPUT = new MoneroOutputWallet();

module.exports = MoneroOutputQuery;