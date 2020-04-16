/**
 * Configures a request to send/sweep funds or create a payment URI.
 * 
 * TODO: allow setAddress(), setAmount() for default destination?
 */
class MoneroSendRequest {
  
  /**
   * Construct the request.
   * 
   * Examples of invoking this constructor:
   * 
   *  new MoneroSendRequest();
   *  new MoneroSendRequest({accountIndex: 0, address: "59aZULsUF3YN...", amount: BigInteger.parse("5"), priority: MoneroSendPriority.NORMAL});
   *  new MoneroSendRequest(0);  // create request with account 0
   *  new MoneroSendRequest("59aZULsUF3YN..."); // create request with destination with address
   *  new MoneroSendRequest(0, "59aZULsUF3YN...", BigInteger.parse("5"));
   *  new MoneroSendRequest(0, "59aZULsUF3YN...", BigInteger.parse("5"), MoneroSendPriority.NORMAL);
   *  new MoneroSendRequest("59aZULsUF3YN...", BigInteger.parse("5"));
   *  new MoneroSendRequest("59aZULsUF3YN...", BigInteger.parse("5"), MoneroSendPriority.NORMAL);
   * 
   * @param {json|uint|string| param1 is request json, an account index, a string address
   * @param {string|BigInteger} param2 is an address to send to or the requested amount to send
   * @param {BigInteger|int} param3  is the requested amount to send if not already given or priority
   * @param {int} param4 priority is the requested priority
   */
  constructor(param1, param2, param3, param4) {
    
    // handle if first parameter is json
    if (typeof param1 === "object") {
      this.state = Object.assign({}, param1);
      assert.equal(arguments.length, 1, "Send request must be constructed with json or parameters but not both");
      
      // deserialize if necessary
      if (this.state.destinations) {
        assert(this.state.address === undefined && this.state.amount === undefined, "Send request may specify destinations or an address/amount but not both");
        this.setDestinations(this.state.destinations.map(destination => destination instanceof MoneroDestination ? destination : new MoneroDestination(destination)));
      }
      
      // alias 'address' and 'amount' to single destination to support e.g. sendTx({address: "..."})
      if (this.state.address || this.state.amount) {
        assert(!this.state.destinations, "Send configuration may specify destinations or an address/amount but not both");
        this.setDestinations([new MoneroDestination(this.state.address, this.state.amount)]);
        delete this.state.address;
        delete this.state.amount;
      }
      
      // alias 'subaddressIndex' to subaddress indices
      if (this.state.subaddressIndex !== undefined) {
        this.setSubaddressIndices([this.state.subaddressIndex]);
        delete this.state.subaddressIndex;
      }
    }
    
    // otherwise map parameters to request values
    else {
      assert(arguments.length <= 4, "MoneroSendRequest constructor accepts at most 4 parameters");
      this.state = {};
      if (param1 === undefined || typeof param1 === "number") {
        assert(param2 === undefined || typeof param2 === "string", "Second parameter must be the address or undefined");
        assert(param3 === undefined || param3 instanceof BigInteger, "Third parameter must be the amount or undefined");
        assert(param4 === undefined || typeof param4 === "number", "Fourth parameter must the priority or undefined");
        this.setAccountIndex(param1);
        if (param2 !== undefined) this.setDestinations([new MoneroDestination(param2, param3)])
        this.setPriority(param4);
      } else if (typeof param1 === "string") {
        assert(param2 === undefined || param2 instanceof BigInteger, "Second parameter must be the amount or undefined");
        assert(param3 === undefined || typeof param3 === "number", "Third parameter must be the priority or undefined");
        assert(param4 === undefined, "Fourth parameter must be undefined because first parameter is address");
        this.setDestinations([new MoneroDestination(param1, param2)])
        this.setPriority(param3);
      } else {
        throw new MoneroError("First parameter of MoneroSendRequest constructor must be an object, number, string, or undefined: " + param1);
      }
    }
  }
  
  copy() {
    return new MoneroSendRequest(this.state);
  }
  
  toJson() {
    let json = Object.assign({}, this.state); // copy state
    if (this.getDestinations()) {
      json.destinations = [];
      for (let destination of this.getDestinations()) json.destinations.push(destination.toJson());
    }
    if (this.getFee()) json.fee = this.getFee().toString();
    if (this.getBelowAmount()) json.belowAmount = this.getBelowAmount().toString();
    return json;
  }
  
  addDestination(destination) {
    assert(destination instanceof MoneroDestination);
    if (this.state.destinations === undefined) this.state.destinations = [];
    this.state.destinations.push(destination);
    return this;
  }
  
  getDestinations() {
    return this.state.destinations;
  }
  
  setDestinations(destinations) {
    if (arguments.length > 1) destinations = Array.from(arguments);
    this.state.destinations = destinations;
    return this;
  }
  
  setDestination(destination) {
    return this.setDestinations(destination ? [destination] : destination);
  }
  
  getPaymentId() {
    return this.state.paymentId;
  }
  
  setPaymentId(paymentId) {
    this.state.paymentId = paymentId;
    return this;
  }
  
  getPriority() {
    return this.state.priority;
  }
  
  setPriority(priority) {
    this.state.priority = priority;
    return this;
  }
  
  getFee() {
    return this.state.fee;
  }
  
  setFee(fee) {
    this.state.fee = fee;
    return this;
  }
  
  getAccountIndex() {
    return this.state.accountIndex;
  }
  
  setAccountIndex(accountIndex) {
    this.state.accountIndex = accountIndex;
    return this;
  }
  
  setSubaddressIndex(subaddressIndex) {
    this.setSubaddressIndices([subaddressIndex]);
    return this;
  }
  
  getSubaddressIndices() {
    return this.state.subaddressIndices;
  }
  
  setSubaddressIndices(subaddressIndices) {
    if (arguments.length > 1) subaddressIndices = Array.from(arguments);
    this.state.subaddressIndices = subaddressIndices;
    return this;
  }
  
  getUnlockTime() {
    return this.state.unlockTime;
  }
  
  setUnlockTime(unlockTime) {
    this.state.unlockTime = unlockTime;
    return this;
  }
  
  getDoNotRelay() {
    return this.state.doNotRelay;
  }
  
  setDoNotRelay(doNotRelay) {
    this.state.doNotRelay = doNotRelay;
    return this;
  }
  
  getCanSplit() {
    return this.state.canSplit;
  }
  
  setCanSplit(canSplit) {
    this.state.canSplit = canSplit;
    return this;
  }
  
  getNote() {
    return this.state.note;
  }
  
  setNote(note) {
    this.state.note = note;
    return this;
  }
  
  getRecipientName() {
    return this.state.recipientName;
  }
  
  setRecipientName(recipientName) {
    this.state.recipientName = recipientName;
    return this;
  }
  
  // --------------------------- SPECIFIC TO SWEEP ----------------------------
  
  getBelowAmount() {
    return this.state.belowAmount;
  }
  
  setBelowAmount(belowAmount) {
    this.state.belowAmount = belowAmount;
    return this;
  }
  
  getSweepEachSubaddress() {
    return this.state.sweepEachSubaddress;
  }
  
  setSweepEachSubaddress(sweepEachSubaddress) {
    this.state.sweepEachSubaddress = sweepEachSubaddress;
    return this;
  }
  
  /**
   * Get the key image hex of the output to sweep.
   * 
   * return {string} is the key image hex of the output to sweep
   */
  getKeyImage() {
    return this.state.keyImage;
  }
  
  /**
   * Set the key image hex of the output to sweep.
   * 
   * @param {string} keyImage is the key image hex of the output to sweep
   */
  setKeyImage(keyImage) {
    this.state.keyImage = keyImage;
    return this;
  }
}

module.exports = MoneroSendRequest