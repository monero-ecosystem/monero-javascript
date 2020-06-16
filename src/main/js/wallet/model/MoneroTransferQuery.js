const MoneroIncomingTransfer = require("./MoneroIncomingTransfer");
const MoneroOutgoingTransfer = require("./MoneroOutgoingTransfer");
const MoneroTransfer = require("./MoneroTransfer");

/**
 * Configuration to query wallet transfers.
 * 
 * @extends {MoneroTransfer}
 */
class MoneroTransferQuery extends MoneroTransfer {
  
  /**
   * <p>Construct the transfer query.</p>
   * 
   * <p>Example:</p>
   * 
   * <code>
   * &sol;&sol; get incoming transfers to account 0, subaddress 1<br>
   * let transfers = await wallet.getTransfers({<br>
   * &nbsp;&nbsp; accountIndex: 0,<br>
   * &nbsp;&nbsp; subaddressIndex: 0<br>
   * });
   * </code>
   * 
   * <p>All configuration is optional.  All transfers are returned except those that don't meet criteria defined in this query.</p>
   * 
   * @param {object} config - transfer query configuration (optional)
   * @param {BigInteger} config.amount - get transfers with this amount
   * @param {int} config.accountIndex - get transfers to/from this account index
   * @param {int} config.subaddressIndex - get transfers to/from this subaddress index
   * @param {int[]} config.subaddressIndices - get transfers to/from these subaddress indices
   * @param {string} config.address - get transfers to/from this wallet address
   * @param {string[]} config.addresses - get transfers to/from these wallet addresses
   * @param {boolean} config.isIncoming - get transfers which are incoming if true
   * @param {boolean} config.isOutgoing - get transfers which are outgoing if true
   * @param {boolean} config.hasDestinations - get transfers with known destinations if true (destinations are only stored locally with the wallet)
   * @param {object|MoneroTxQuery} config.txQuery - get transfers whose tx match this tx query
   */
  constructor(config) {
    super(config);
    
    // deserialize if necessary
    const MoneroTxQuery = require("./MoneroTxQuery");
    if (this.state.txQuery && !(this.state.txQuery instanceof MoneroTxQuery)) this.state.txQuery = new MoneroTxQuery(this.state.txQuery);
    if (this.state.txQuery) this.state.txQuery.setTransferQuery(this);
    
    // alias isOutgoing to isIncoming
    if (this.state.isOutgoing !== undefined) this.state.isIncoming = !this.state.isOutgoing;
  }
  
  copy() {
    return new MoneroTransferQuery(this);
  }
  
  toJson() {
    let json = Object.assign({}, this.state, super.toJson());
    delete json.txQuery;
    return json;
  }
  
  getTxQuery() {
    return this.state.txQuery;
  }
  
  setTxQuery(txQuery) {
    this.state.txQuery = txQuery;
    if (txQuery) txQuery.state.transferQuery = this;
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
    return this.state.isIncoming === undefined ? undefined : !this.state.isIncoming;
  }
  
  setIsOutgoing(isOutgoing) {
    this.state.isIncoming = isOutgoing === undefined ? undefined : !isOutgoing;
    return this;
  }
  
  getAddress() {
    return this.state.address;
  }

  setAddress(address) {
    this.state.address = address;
    return this;
  }
  
  getAddresses() {
    return this.state.addresses;
  }

  setAddresses(addresses) {
    this.state.addresses = addresses;
    return this;
  }
  
  getSubaddressIndex() {
    return this.state.subaddressIndex;
  }
  
  setSubaddressIndex(subaddressIndex) {
    this.state.subaddressIndex = subaddressIndex;
    return this;
  }
  
  getSubaddressIndices() {
    return this.state.subaddressIndices;
  }
  
  setSubaddressIndices(subaddressIndices) {
    this.state.subaddressIndices = subaddressIndices;
    return this;
  }
  
  getDestinations() {
    return this.state.destinations;
  }
  
  setDestinations(destinations) {
    this.state.destinations = destinations;
    return this;
  }
  
  hasDestinations() {
    return this.state.hasDestinations;
  }
  
  setHasDestinations(hasDestinations) {
    this.state.hasDestinations = hasDestinations;
    return this;
  }
  
  /**
   * Convenience method to query outputs by the locked state of their tx.
   * 
   * @param isLocked specifies if the output's tx must be locked or unlocked (optional)
   * @return {MoneroOutputQuery} this query for chaining
   */
  setIsLocked(isLocked) {
    if (this.state.txQuery === undefined) this.state.txQuery = new MoneroTxQuery();
    this.state.txQuery.setIsLocked(isLocked);
    return this;
  }
  
  meetsCriteria(transfer, queryParent) {
    if (!(transfer instanceof MoneroTransfer)) throw new Error("Transfer not given to MoneroTransferQuery.meetsCriteria(transfer)");
    if (queryParent === undefined) queryParent = true;
    
    // filter on common fields
    if (this.isIncoming() !== undefined && this.isIncoming() !== transfer.isIncoming()) return false;
    if (this.isOutgoing() !== undefined && this.isOutgoing() !== transfer.isOutgoing()) return false;
    if (this.getAmount() !== undefined && this.getAmount().compare(transfer.getAmount()) !== 0) return false;
    if (this.getAccountIndex() !== undefined && this.getAccountIndex() !== transfer.getAccountIndex()) return false;
    
    // filter on incoming fields
    if (transfer instanceof MoneroIncomingTransfer) {
      if (this.hasDestinations()) return false;
      if (this.getAddress() !== undefined && this.getAddress() !== transfer.getAddress()) return false;
      if (this.getAddresses() !== undefined && !this.getAddresses().includes(transfer.getAddress())) return false;
      if (this.getSubaddressIndex() !== undefined && this.getSubaddressIndex() !== transfer.getSubaddressIndex()) return false;
      if (this.getSubaddressIndices() !== undefined && !this.getSubaddressIndices().includes(transfer.getSubaddressIndex())) return false;
    }

    // filter on outgoing fields
    else if (transfer instanceof MoneroOutgoingTransfer) {
      
      // filter on addresses which must have overlap
      if (this.getAddress() !== undefined && (transfer.getAddresses() === undefined || !transfer.getAddresses().includes(this.getAddress()))) return false;   // TODO: will filter all transfers that don't contain addresses (outgoing txs might not have this field initialized)
      if (this.getAddresses() !== undefined) {
        if (!transfer.getAddresses()) return false;
        if (!this.getAddresses().some(address => transfer.getAddresses().includes(address))) return false;
      }
      
      // filter on subaddress indices
      if (this.getSubaddressIndex() !== undefined && (transfer.getSubaddressIndices() === undefined || !transfer.getSubaddressIndices().includes(this.getSubaddressIndex()))) return false;
      if (this.getSubaddressIndices() !== undefined) {
        if (!transfer.getSubaddressIndices()) return false;
        if (!this.getSubaddressIndices().some(subaddressIdx => transfer.getSubaddressIndices().includes(subaddressIdx))) return false;
      }
      
      // filter on having destinations
      if (this.hasDestinations() !== undefined) {
        if (this.hasDestinations() && transfer.getDestinations() === undefined) return false;
        if (!this.hasDestinations() && transfer.getDestinations() !== undefined) return false;
      }
      
      // filter on destinations TODO: start with test for this
//    if (this.getDestionations() !== undefined && this.getDestionations() !== transfer.getDestionations()) return false;
    }
    
    // otherwise invalid type
    else throw new Error("Transfer must be MoneroIncomingTransfer or MoneroOutgoingTransfer");
    
    // filter with tx filter
    if (queryParent && this.getTxQuery() !== undefined && !this.getTxQuery().meetsCriteria(transfer.getTx())) return false;    
    return true;
  }
}

module.exports = MoneroTransferQuery;