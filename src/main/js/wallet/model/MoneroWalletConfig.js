const GenUtils = require("../../common/GenUtils");
const MoneroRpcConnection = require("../../common/MoneroRpcConnection");

/**
 * Configuration to create a Monero wallet.
 */
class MoneroWalletConfig {
  
  /**
   * Construct a configuration to open or create a wallet.
   * 
   * @param {object|MoneroWalletConfig} config - MoneroWalletConfig or equivalent config object
   * @param {string} config.path - path of the wallet to open or create
   * @param {string} config.password - password of the wallet to open
   * @param {string|number} config.networkType - network type of the wallet to open (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
   * @param {string} config.serverUri - uri of the wallet's server (optional)
   * @param {string} config.serverUsername - username of the wallet's server (optional)
   * @param {string} config.serverPassword - password of the wallet's server (optional)
   * @param {boolean} config.rejectUnauthorized - reject self-signed server certificates if true (defaults to true)
   * @param {MoneroRpcConnection|object} config.server - MoneroRpcConnection or equivalent JS object configuring the server connection (optional)
   * @param {Uint8Array} config.keysData - wallet keys data to open (optional)
   * @param {Uint8Array} config.cacheData - wallet cache data to open (optional)
   * @param {boolean} config.proxyToWorker - proxies wallet operations to a web worker in order to not block the browser's main thread (default: false)
   * @param {fs} config.fs - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
   * @param {boolean} config.saveCurrent - specifies if the current RPC wallet should be saved before being closed
   */
  constructor(config) {
    
    // initialize internal config
    if (!config) config = {};
    else if (config instanceof MoneroWalletConfig) config = config.toJson();
    else if (typeof config === "object") config = Object.assign({}, config);
    else throw new MoneroError("config must be a MoneroWalletConfig or JavaScript object");
    this.config = config;
    
    // normalize config
    this.setNetworkType(config.networkType);
    if (config.server) this.setServer(config.server);
    delete this.config.server;
    
    // check for unsupported fields
    for (let key of Object.keys(this.config)) {
      if (!GenUtils.arrayContains(MoneroWalletConfig.SUPPORTED_FIELDS, key)) {
        throw new MoneroError("Wallet config includes unsupported field: '" + key + "'");
      }
    }
  }
  
  toJson() {
    return Object.assign({}, this.config);
  }
  
  getPath() {
    return this.config.path;
  }
  
  setPath(path) {
    this.config.path = path;
    return this;
  }
  
  getPassword() {
    return this.config.password;
  }
  
  setPassword(password) {
    this.config.password = password;
    return this;
  }
  
  getNetworkType() {
    return this.config.networkType;
  }
  
  setNetworkType(networkTypeOrStr) {
    this.config.networkType = typeof networkTypeOrStr === "string" ? MoneroNetworkType.parse(networkTypeOrStr) : networkTypeOrStr;
    return this;
  }
  
  getServer() {
    return !this.config.serverUri ? undefined : new MoneroRpcConnection({uri: this.config.serverUri, username: this.config.serverUsername, password: this.config.serverPassword, rejectUnauthorized: this.config.rejectUnauthorized})
  }
  
  setServer(server) {
    if (server && !(server instanceof MoneroRpcConnection)) server = new MoneroRpcConnection(server);
    this.config.serverUri = server === undefined ? undefined : server.getUri();
    this.config.serverUsername = server === undefined ? undefined : server.getUsername();
    this.config.serverPassword = server === undefined ? undefined : server.getPassword();
    this.config.rejectUnauthorized = server === undefined ? undefined : server.getRejectUnauthorized();
    return this;
  }
  
  getServerUri() {
    return this.config.serverUri;
  }
  
  setServerUri(serverUri) {
    this.config.serverUri = serverUri;
    return this;
  }
  
  getServerUsername() {
    return this.config.serverUsername;
  }
  
  setServerUsername(serverUsername) {
    this.config.serverUsername = serverUsername;
    return this;
  }
  
  getServerPassword() {
    return this.config.serverPassword;
  }
  
  setServerPassword(serverPassword) {
    this.config.serverPassword = serverPassword;
    return this;
  }
  
  getRejectUnauthorized() {
    return this.config.rejectUnauthorized;
  }
  
  setRejectUnauthorized(rejectUnauthorized) {
    this.config.rejectUnauthorized = rejectUnauthorized;
    return this;
  }
  
  getMnemonic() {
    return this.config.mnemonic;
  }
  
  setMnemonic(mnemonic) {
    this.config.mnemonic = mnemonic;
    return this;
  }
  
  getSeedOffset() {
    return this.config.seedOffset;
  }
  
  setSeedOffset(seedOffset) {
    this.config.seedOffset = seedOffset;
    return this;
  }
  
  getPrimaryAddress() {
    return this.config.primaryAddress;
  }
  
  setPrimaryAddress(primaryAddress) {
    this.config.primaryAddress = primaryAddress;
    return this;
  }
  
  getPrivateViewKey() {
    return this.config.privateViewKey;
  }
  
  setPrivateViewKey(privateViewKey) {
    this.config.privateViewKey = privateViewKey;
    return this;
  }
  
  getPrivateSpendKey() {
    return this.config.privateSpendKey;
  }
  
  setPrivateSpendKey(privateSpendKey) {
    this.config.privateSpendKey = privateSpendKey;
    return this;
  }
  
  getRestoreHeight() {
    return this.config.restoreHeight;
  }
  
  setRestoreHeight(restoreHeight) {
    this.config.restoreHeight = restoreHeight;
    return this;
  }
  
  getLanguage() {
    return this.config.language;
  }
  
  setLanguage(language) {
    this.config.language = language;
    return this;
  }
  
  getSaveCurrent() {
    return this.config.saveCurrent;
  }
  
  setSaveCurrent(saveCurrent) {
    this.config.saveCurrent = saveCurrent;
    return this;
  }
  
  getProxyToWorker() {
    return this.config.proxyToWorker;
  }
  
  setProxyToWorker(proxyToWorker) {
    this.config.proxyToWorker = proxyToWorker;
    return this;
  }
  
  getFs() {
    return this.config.fs;
  }
  
  setFs(fs) {
    this.config.fs = fs;
    return this;
  }
  
  getKeysData() {
    return this.config.keysData;
  }
  
  setKeysData(keysData) {
    this.config.keysData = keysData;
    return this;
  }
  
  getCacheData() {
    return this.config.cacheData;
  }
  
  setCacheData(cacheData) {
    this.config.cacheData = cacheData;
    return this;
  }
}

MoneroWalletConfig.SUPPORTED_FIELDS = ["path", "password", "networkType", "serverUri", "serverUsername", "serverPassword", "rejectUnauthorized", "mnemonic", "seedOffset", "primaryAddress", "privateViewKey", "privateSpendKey", "restoreHeight", "language", "saveCurrent", "proxyToWorker", "fs", "keysData", "cacheData"];

module.exports = MoneroWalletConfig;