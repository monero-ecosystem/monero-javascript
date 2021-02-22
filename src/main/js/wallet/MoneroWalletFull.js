const assert = require("assert");
const BigInteger = require("../common/biginteger").BigInteger;
const GenUtils = require("../common/GenUtils");
const LibraryUtils = require("../common/LibraryUtils");
const MoneroAccount = require("./model/MoneroAccount");
const MoneroAddressBookEntry = require("./model/MoneroAddressBookEntry");
const MoneroBlock = require("../daemon/model/MoneroBlock");
const MoneroCheckTx = require("./model/MoneroCheckTx");
const MoneroDaemonRpc = require("../daemon/MoneroDaemonRpc");
const MoneroError = require("../common/MoneroError");
const MoneroIntegratedAddress = require("./model/MoneroIntegratedAddress");
const MoneroKeyImage = require("../daemon/model/MoneroKeyImage");
const MoneroKeyImageImportResult = require("./model/MoneroKeyImageImportResult");
const MoneroMultisigInfo = require("./model/MoneroMultisigInfo");
const MoneroMultisigInitResult = require("./model/MoneroMultisigInitResult");
const MoneroMultisigSignResult = require("./model/MoneroMultisigSignResult");
const MoneroNetworkType = require("../daemon/model/MoneroNetworkType");
const MoneroOutputWallet = require("./model/MoneroOutputWallet");
const MoneroRpcConnection = require("../common/MoneroRpcConnection");
const MoneroSubaddress = require("./model/MoneroSubaddress");
const MoneroSyncResult = require("./model/MoneroSyncResult");
const MoneroTxConfig = require("./model/MoneroTxConfig");
const MoneroTxSet = require("./model/MoneroTxSet");
const MoneroTxWallet = require("./model/MoneroTxWallet");
const MoneroUtils = require("../common/MoneroUtils");
const MoneroWallet = require("./MoneroWallet");
const MoneroWalletConfig = require("./model/MoneroWalletConfig");
const MoneroWalletKeys = require("./MoneroWalletKeys");
const MoneroWalletListener = require("./model/MoneroWalletListener");
const MoneroMessageSignatureType = require("./model/MoneroMessageSignatureType");
const MoneroMessageSignatureResult = require("./model/MoneroMessageSignatureResult");

/**
 * Implements a Monero wallet using fully client-side WebAssembly bindings to monero-project's wallet2 in C++.
 * 
 * @extends {MoneroWalletKeys}
 * @implements {MoneroWallet}
 * @hideconstructor
 */
class MoneroWalletFull extends MoneroWalletKeys {
  
  // --------------------------- STATIC UTILITIES -----------------------------
  
  /**
   * Check if a wallet exists at a given path.
   * 
   * @param {string} path - path of the wallet on the file system
   * @param {fs} - Node.js compatible file system to use (optional, defaults to disk if nodejs)
   * @return {boolean} true if a wallet exists at the given path, false otherwise
   */
  static walletExists(path, fs) {
    assert(path, "Must provide a path to look for a wallet");
    if (!fs) fs = MoneroWalletFull._getFs();
    if (!fs) throw new MoneroError("Must provide file system to check if wallet exists");
    let exists = fs.existsSync(path); // TODO: look for keys file
    console.log("Wallet exists at " + path + ": " + exists);
    return exists;
  }
  
  /**
   * <p>Open an existing wallet using WebAssembly bindings to wallet2.h.</p>
   * 
   * <p>Examples:<p>
   * 
   * <code>
   * let wallet1 = await MoneroWalletFull.openWallet(<br>
   * &nbsp;&nbsp; "./wallets/wallet1",<br>
   * &nbsp;&nbsp; "supersecretpassword",<br>
   * &nbsp;&nbsp; MoneroNetworkType.STAGENET,<br>
   * &nbsp;&nbsp; "http://localhost:38081" // daemon uri<br>
   * );<br><br>
   * 
   * let wallet2 = await MoneroWalletFull.openWallet({<br>
   * &nbsp;&nbsp; path: "./wallets/wallet2",<br>
   * &nbsp;&nbsp; password: "supersecretpassword",<br>
   * &nbsp;&nbsp; networkType: MoneroNetworkType.STAGENET,<br>
   * &nbsp;&nbsp; serverUri: "http://localhost:38081", // daemon configuration<br>
   * &nbsp;&nbsp; serverUsername: "superuser",<br>
   * &nbsp;&nbsp; serverPassword: "abctesting123"<br>
   * });
   * </code>
   * 
   * @param {MoneroWalletConfig|object|string} configOrPath - MoneroWalletConfig or equivalent config object or a path to a wallet to open
   * @param {string} configOrPath.path - path of the wallet to open (optional if 'keysData' provided)
   * @param {string} configOrPath.password - password of the wallet to open
   * @param {string|number} configOrPath.networkType - network type of the wallet to open (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
   * @param {Uint8Array} configOrPath.keysData - wallet keys data to open (optional if path provided)
   * @param {Uint8Array} configOrPath.cacheData - wallet cache data to open (optional)
   * @param {string} configOrPath.serverUri - uri of the wallet's daemon (optional)
   * @param {string} configOrPath.serverUsername - username to authenticate with the daemon (optional)
   * @param {string} configOrPath.serverPassword - password to authenticate with the daemon (optional)
   * @param {boolean} configOrPath.rejectUnauthorized - reject self-signed server certificates if true (defaults to true)
   * @param {MoneroRpcConnection|object} configOrPath.server - MoneroRpcConnection or equivalent JS object configuring the daemon connection (optional)
   * @param {boolean} configOrPath.proxyToWorker - proxies wallet operations to a web worker in order to not block the browser's main thread (default true if browser, false otherwise)
   * @param {fs} configOrPath.fs - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
   * @param {string} password - password of the wallet to open
   * @param {string|number} networkType - network type of the wallet to open
   * @param {string|MoneroRpcConnection} daemonUriOrConnection - daemon URI or MoneroRpcConnection
   * @param {boolean} proxyToWorker - proxies wallet operations to a web worker in order to not block the browser's main thread (default true if browser, false otherwise)
   * @param {fs} fs - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
   * @return {MoneroWalletFull} the opened wallet
   */
  static async openWallet(configOrPath, password, networkType, daemonUriOrConnection, proxyToWorker, fs) {

    // normalize and validate config
    let config;
    if (typeof configOrPath === "object") {
      config = configOrPath instanceof MoneroWalletConfig ? configOrPath : new MoneroWalletConfig(configOrPath);
      if (password !== undefined || networkType !== undefined || daemonUriOrConnection !== undefined || proxyToWorker !== undefined || fs !== undefined) throw new MoneroError("Can specify config object or params but not both when opening WASM wallet")
    } else {
      config = new MoneroWalletConfig().setPath(configOrPath).setPassword(password).setNetworkType(networkType).setProxyToWorker(proxyToWorker).setFs(fs);
      if (typeof daemonUriOrConnection === "object") config.setServer(daemonUriOrConnection);
      else config.setServerUri(daemonUriOrConnection);
    }
    if (config.getProxyToWorker() === undefined) config.setProxyToWorker(GenUtils.isBrowser());
    if (config.getMnemonic() !== undefined) throw new MoneroError("Cannot specify mnemonic when opening wallet");
    if (config.getSeedOffset() !== undefined) throw new MoneroError("Cannot specify seed offset when opening wallet");
    if (config.getPrimaryAddress() !== undefined) throw new MoneroError("Cannot specify primary address when opening wallet");
    if (config.getPrivateViewKey() !== undefined) throw new MoneroError("Cannot specify private view key when opening wallet");
    if (config.getPrivateSpendKey() !== undefined) throw new MoneroError("Cannot specify private spend key when opening wallet");
    if (config.getRestoreHeight() !== undefined) throw new MoneroError("Cannot specify restore height when opening wallet");
    if (config.getLanguage() !== undefined) throw new MoneroError("Cannot specify language when opening wallet");
    if (config.getSaveCurrent() === true) throw new MoneroError("Cannot save current wallet when opening JNI wallet");
    
    // read wallet data from disk if not provided
    if (!config.getKeysData()) {
      let fs = config.getFs() ? config.getFs() : MoneroWalletFull._getFs();
      if (!fs) throw new MoneroError("Must provide file system to read wallet data from");
      if (!await this.walletExists(config.getPath(), fs)) throw new MoneroError("Wallet does not exist at path: " + config.getPath());
      config.setKeysData(fs.readFileSync(config.getPath() + ".keys"));
      config.setCacheData(fs.readFileSync(config.getPath()));
    }
    
    // open wallet from data
    return MoneroWalletFull._openWalletData(config.getPath(), config.getPassword(), config.getNetworkType(), config.getKeysData(), config.getCacheData(), config.getServer(), config.getProxyToWorker(), config.getFs());
  }
  
  /**
   * <p>Create a wallet using WebAssembly bindings to wallet2.h.<p>
   * 
   * <p>Example:</p>
   * 
   * <code>
   * let wallet = await MoneroWalletFull.createWallet({<br>
   * &nbsp;&nbsp; path: "./test_wallets/wallet1", // leave blank for in-memory wallet<br>
   * &nbsp;&nbsp; password: "supersecretpassword",<br>
   * &nbsp;&nbsp; networkType: MoneroNetworkType.STAGENET,<br>
   * &nbsp;&nbsp; mnemonic: "coexist igloo pamphlet lagoon...",<br>
   * &nbsp;&nbsp; restoreHeight: 1543218,<br>
   * &nbsp;&nbsp; server: new MoneroRpcConnection("http://localhost:38081", "daemon_user", "daemon_password_123"),<br>
   * });
   * </code>
   * 
   * @param {object|MoneroWalletConfig} config - MoneroWalletConfig or equivalent config object
   * @param {string} config.path - path of the wallet to create (optional, in-memory wallet if not given)
   * @param {string} config.password - password of the wallet to create
   * @param {string|number} config.networkType - network type of the wallet to create (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
   * @param {string} config.mnemonic - mnemonic of the wallet to create (optional, random wallet created if neither mnemonic nor keys given)
   * @param {string} config.seedOffset - the offset used to derive a new seed from the given mnemonic to recover a secret wallet from the mnemonic phrase
   * @param {string} config.primaryAddress - primary address of the wallet to create (only provide if restoring from keys)
   * @param {string} config.privateViewKey - private view key of the wallet to create (optional)
   * @param {string} config.privateSpendKey - private spend key of the wallet to create (optional)
   * @param {number} config.restoreHeight - block height to start scanning from (defaults to 0 unless generating random wallet)
   * @param {string} config.language - language of the wallet's mnemonic phrase (defaults to "English" or auto-detected)
   * @param {string} config.serverUri - uri of the wallet's daemon (optional)
   * @param {string} config.serverUsername - username to authenticate with the daemon (optional)
   * @param {string} config.serverPassword - password to authenticate with the daemon (optional)
   * @param {boolean} config.rejectUnauthorized - reject self-signed server certificates if true (defaults to true)
   * @param {MoneroRpcConnection|object} config.server - MoneroRpcConnection or equivalent JS object providing daemon configuration (optional)
   * @param {boolean} config.proxyToWorker - proxies wallet operations to a web worker in order to not block the browser's main thread (default true if browser, false otherwise)
   * @param {fs} config.fs - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
   * @return {MoneroWalletFull} the created wallet
   */
  static async createWallet(config) {
    
    // normalize and validate config
    if (config === undefined) throw new MoneroError("Must provide config to create wallet");
    config = config instanceof MoneroWalletConfig ? config : new MoneroWalletConfig(config);
    if (config.getMnemonic() !== undefined && (config.getPrimaryAddress() !== undefined || config.getPrivateViewKey() !== undefined || config.getPrivateSpendKey() !== undefined)) {
      throw new MoneroError("Wallet may be initialized with a mnemonic or keys but not both");
    } // TODO: factor this much out to common
    if (config.getNetworkType() === undefined) throw new MoneroError("Must provide a networkType: 'mainnet', 'testnet' or 'stagenet'");
    if (config.getSaveCurrent() === true) throw new MoneroError("Cannot save current wallet when creating full WASM wallet");
    
    // create wallet
    if (config.getMnemonic() !== undefined) {
      if (config.getLanguage() !== undefined) throw new MoneroError("Cannot provide language when creating wallet from mnemonic");
      return MoneroWalletFull._createWalletFromMnemonic(config.getPath(), config.getPassword(), config.getNetworkType(), config.getMnemonic(), config.getServer(), config.getRestoreHeight(), config.getSeedOffset(), config.getProxyToWorker(), config.getFs());
    } else if (config.getPrimaryAddress() !== undefined) {
      if (config.getSeedOffset() !== undefined) throw new MoneroError("Cannot provide seedOffset when creating wallet from keys");
      return MoneroWalletFull._createWalletFromKeys(config.getPath(), config.getPassword(), config.getNetworkType(), config.getPrimaryAddress(), config.getPrivateViewKey(), config.getPrivateSpendKey(), config.getServer(), config.getRestoreHeight(), config.getLanguage(), config.getProxyToWorker(), config.getFs());
    } else {
      if (config.getSeedOffset() !== undefined) throw new MoneroError("Cannot provide seedOffset when creating random wallet");
      if (config.getRestoreHeight() !== undefined) throw new MoneroError("Cannot provide restoreHeight when creating random wallet");
      return MoneroWalletFull._createWalletRandom(config.getPath(), config.getPassword(), config.getNetworkType(), config.getServer(), config.getLanguage(), config.getProxyToWorker(), config.getFs());
    }
  }
  
  static async _createWalletRandom(path, password, networkType, daemonUriOrConnection, language, proxyToWorker, fs) {
    if (proxyToWorker === undefined) proxyToWorker = GenUtils.isBrowser();
    if (proxyToWorker) return MoneroWalletFullProxy._createWalletRandom(path, password, networkType, daemonUriOrConnection, language, fs);
    
    // validate and normalize params
    if (path === undefined) path = "";
    if (path && await MoneroWalletFull.walletExists(path, fs)) throw new Error("Wallet already exists: " + path);
    assert(password, "Must provide a password to create the wallet with");
    MoneroNetworkType.validate(networkType);
    if (language === undefined) language = "English";
    let daemonConnection = typeof daemonUriOrConnection === "string" ? new MoneroRpcConnection(daemonUriOrConnection) : daemonUriOrConnection;
    let daemonUri = daemonConnection && daemonConnection.getUri() ? daemonConnection.getUri() : "";
    let daemonUsername = daemonConnection && daemonConnection.getUsername() ? daemonConnection.getUsername() : "";
    let daemonPassword = daemonConnection && daemonConnection.getPassword() ? daemonConnection.getPassword() : "";
    let rejectUnauthorized = daemonConnection ? daemonConnection.getRejectUnauthorized() : true;
    
    // load wasm module
    let module = await LibraryUtils.loadFullModule();
    
    // create wallet in queue
    let wallet = await module.queueTask(async function() {
      return new Promise(function(resolve, reject) {
        
        // register fn informing if unauthorized reqs should be rejected
        let rejectUnauthorizedFnId = GenUtils.getUUID();
        LibraryUtils.setRejectUnauthorizedFn(rejectUnauthorizedFnId, function() { return rejectUnauthorized });
      
        // define callback for wasm
        let callbackFn = async function(cppAddress) {
          if (typeof cppAddress === "string") reject(new MoneroError(cppAddress));
          else resolve(new MoneroWalletFull(cppAddress, path, password, fs, rejectUnauthorized, rejectUnauthorizedFnId));
        };
        
        // create wallet in wasm and invoke callback when done
        module.create_full_wallet_random(password, networkType, daemonUri, daemonUsername, daemonPassword, rejectUnauthorizedFnId, language, callbackFn);
      });
    });
    
    // save wallet
    if (path) await wallet.save();
    return wallet;
  }
  
  static async _createWalletFromMnemonic(path, password, networkType, mnemonic, daemonUriOrConnection, restoreHeight, seedOffset, proxyToWorker, fs) {
    if (proxyToWorker === undefined) proxyToWorker = GenUtils.isBrowser();
    if (proxyToWorker) return MoneroWalletFullProxy._createWalletFromMnemonic(path, password, networkType, mnemonic, daemonUriOrConnection, restoreHeight, seedOffset, fs);
    
    // validate and normalize params
    if (path === undefined) path = "";
    if (path && await MoneroWalletFull.walletExists(path, fs)) throw new Error("Wallet already exists: " + path);
    assert(password, "Must provide a password to create the wallet with");
    MoneroNetworkType.validate(networkType);
    let daemonConnection = typeof daemonUriOrConnection === "string" ? new MoneroRpcConnection(daemonUriOrConnection) : daemonUriOrConnection;
    let daemonUri = daemonConnection && daemonConnection.getUri() ? daemonConnection.getUri() : "";
    let daemonUsername = daemonConnection && daemonConnection.getUsername() ? daemonConnection.getUsername() : "";
    let daemonPassword = daemonConnection && daemonConnection.getPassword() ? daemonConnection.getPassword() : "";
    let rejectUnauthorized = daemonConnection ? daemonConnection.getRejectUnauthorized() : true;
    if (restoreHeight === undefined) restoreHeight = 0;
    if (seedOffset === undefined) seedOffset = "";
    
    // load full wasm module
    let module = await LibraryUtils.loadFullModule();
    
    // create wallet in queue
    let wallet = await module.queueTask(async function() {
      return new Promise(function(resolve, reject) {
        
        // register fn informing if unauthorized reqs should be rejected
        let rejectUnauthorizedFnId = GenUtils.getUUID();
        LibraryUtils.setRejectUnauthorizedFn(rejectUnauthorizedFnId, function() { return rejectUnauthorized });
      
        // define callback for wasm
        let callbackFn = async function(cppAddress) {
          if (typeof cppAddress === "string") reject(new MoneroError(cppAddress));
          else resolve(new MoneroWalletFull(cppAddress, path, password, fs, rejectUnauthorized, rejectUnauthorizedFnId));
        };
        
        // create wallet in wasm and invoke callback when done
        module.create_full_wallet_from_mnemonic(password, networkType, mnemonic, daemonUri, daemonUsername, daemonPassword, rejectUnauthorizedFnId, restoreHeight, seedOffset, callbackFn);
      });
    });
    
    // save wallet
    if (path) await wallet.save();
    return wallet;
  }
  
  static async _createWalletFromKeys(path, password, networkType, address, viewKey, spendKey, daemonUriOrConnection, restoreHeight, language, proxyToWorker, fs) {
    if (proxyToWorker === undefined) proxyToWorker = GenUtils.isBrowser();
    if (proxyToWorker) return MoneroWalletFullProxy._createWalletFromKeys(path, password, networkType, address, viewKey, spendKey, daemonUriOrConnection, restoreHeight, language, fs);
    
    // validate and normalize params
    if (path === undefined) path = "";
    if (path && await MoneroWalletFull.walletExists(path, fs)) throw new Error("Wallet already exists: " + path);
    assert(password, "Must provide a password to create the wallet with");
    MoneroNetworkType.validate(networkType);
    if (address === undefined) address = "";
    if (viewKey === undefined) viewKey = "";
    if (spendKey === undefined) spendKey = "";
    let daemonConnection = typeof daemonUriOrConnection === "string" ? new MoneroRpcConnection(daemonUriOrConnection) : daemonUriOrConnection;
    let daemonUri = daemonConnection && daemonConnection.getUri() ? daemonConnection.getUri() : "";
    let daemonUsername = daemonConnection && daemonConnection.getUsername() ? daemonConnection.getUsername() : "";
    let daemonPassword = daemonConnection && daemonConnection.getPassword() ? daemonConnection.getPassword() : "";
    let rejectUnauthorized = daemonConnection ? daemonConnection.getRejectUnauthorized() : true;
    if (restoreHeight === undefined) restoreHeight = 0;
    if (language === undefined) language = "English";
    
    // load full wasm module
    let module = await LibraryUtils.loadFullModule();
    
    // create wallet in queue
    let wallet = await module.queueTask(async function() {
      return new Promise(function(resolve, reject) {
        
        // register fn informing if unauthorized reqs should be rejected
        let rejectUnauthorizedFnId = GenUtils.getUUID();
        LibraryUtils.setRejectUnauthorizedFn(rejectUnauthorizedFnId, function() { return rejectUnauthorized });
      
        // define callback for wasm
        let callbackFn = async function(cppAddress) {
          if (typeof cppAddress === "string") reject(new MoneroError(cppAddress));
          else resolve(new MoneroWalletFull(cppAddress, path, password, fs, rejectUnauthorized, rejectUnauthorizedFnId));
        };
        
        // create wallet in wasm and invoke callback when done
        module.create_full_wallet_from_keys(password, networkType, address, viewKey, spendKey, daemonUri, daemonUsername, daemonPassword, rejectUnauthorizedFnId, restoreHeight, language, callbackFn);
      });
    });
    
    // save wallet
    if (path) await wallet.save();
    return wallet;
  }
  
  static async getMnemonicLanguages() {
    let module = await LibraryUtils.loadFullModule();
    return module.queueTask(async function() {
      return JSON.parse(module.get_keys_wallet_mnemonic_languages()).languages;
    });
  }
  
  // --------------------------- INSTANCE METHODS -----------------------------
  
  /**
   * Internal constructor which is given the memory address of a C++ wallet
   * instance.
   * 
   * This method should not be called externally but should be called through
   * static wallet creation utilities in this class.
   * 
   * @param {int} cppAddress - address of the wallet instance in C++
   * @param {string} path - path of the wallet instance
   * @param {string} password - password of the wallet instance
   * @param {FileSystem} fs - node.js-compatible file system to read/write wallet files
   * @param {boolean} rejectUnauthorized - specifies if unauthorized requests (e.g. self-signed certificates) should be rejected
   * @param {string} rejectUnauthorizedFnId - unique identifier for http_client_wasm to query rejectUnauthorized
   */
  constructor(cppAddress, path, password, fs, rejectUnauthorized, rejectUnauthorizedFnId) {
    super(cppAddress);
    this._path = path;
    this._password = password;
    this._listeners = [];
    this._fs = fs ? fs : (path ? MoneroWalletFull._getFs() : undefined);
    this._isClosed = false;
    this._fullListener = new WalletFullListener(this); // receives notifications from wasm c++
    this._fullListenerHandle = 0;                      // memory address of the wallet listener in c++
    this._rejectUnauthorized = rejectUnauthorized;
    this._rejectUnauthorizedConfigId = rejectUnauthorizedFnId;
    this._syncPeriodInMs = MoneroWalletFull.DEFAULT_SYNC_PERIOD_IN_MS;
    let that = this;
    LibraryUtils.setRejectUnauthorizedFn(rejectUnauthorizedFnId, function() { return that._rejectUnauthorized }); // register fn informing if unauthorized reqs should be rejected
  }
  
  // ------------ WALLET METHODS SPECIFIC TO WASM IMPLEMENTATION --------------
  
  /**
   * Get the maximum height of the peers the wallet's daemon is connected to.
   *
   * @return {number} the maximum height of the peers the wallet's daemon is connected to
   */
  async getDaemonMaxPeerHeight() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
      
        // define callback for wasm
        let callbackFn = function(resp) {
          resolve(resp);
        }
        
        // call wasm and invoke callback when done
        that._module.get_daemon_max_peer_height(that._cppAddress, callbackFn);
      });
    });
  }
  
  /**
   * Indicates if the wallet's daemon is synced with the network.
   * 
   * @return {boolean} true if the daemon is synced with the network, false otherwise
   */
  async isDaemonSynced() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
      
        // define callback for wasm
        let callbackFn = function(resp) {
          resolve(resp);
        }
        
        // call wasm and invoke callback when done
        that._module.is_daemon_synced(that._cppAddress, callbackFn);
      });
    });
  }
  
  /**
   * Indicates if the wallet is synced with the daemon.
   * 
   * @return {boolean} true if the wallet is synced with the daemon, false otherwise
   */
  async isSynced() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
      
        // define callback for wasm
        let callbackFn = function(resp) {
          resolve(resp);
        }
        
        // call wasm and invoke callback when done
        that._module.is_synced(that._cppAddress, callbackFn);
      });
    });
  }
  
  /**
   * Get the wallet's network type (mainnet, testnet, or stagenet).
   * 
   * @return {MoneroNetworkType} the wallet's network type
   */
  async getNetworkType() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return that._module.get_network_type(that._cppAddress);
    });
  }
  
  /**
   * Get the height of the first block that the wallet scans.
   * 
   * @return {number} the height of the first block that the wallet scans
   */
  async getSyncHeight() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return that._module.get_sync_height(that._cppAddress);
    });
  }
  
  /**
   * Set the height of the first block that the wallet scans.
   * 
   * @param {number} syncHeight - height of the first block that the wallet scans
   */
  async setSyncHeight(syncHeight) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return that._module.set_sync_height(that._cppAddress, syncHeight);
    });
  }
  
  /**
   * Move the wallet from its current path to the given path.
   * 
   * @param {string} path - the wallet's destination path
   */
  async moveTo(path) {
    return MoneroWalletFull._moveTo(path, this);
  }
  
  // -------------------------- COMMON WALLET METHODS -------------------------
  
  async addListener(listener) {
    this._assertNotClosed();
    assert(listener instanceof MoneroWalletListener, "Listener must be instance of MoneroWalletListener");
    this._listeners.push(listener);
    await this._setIsListening(true);
  }
  
  async removeListener(listener) {
    this._assertNotClosed();
    let idx = this._listeners.indexOf(listener);
    if (idx > -1) this._listeners.splice(idx, 1);
    else throw new MoneroError("Listener is not registered with wallet");
    if (this._listeners.length === 0) await this._setIsListening(false);
  }
  
  getListeners() {
    this._assertNotClosed();
    return this._listeners;
  }
  
  async setDaemonConnection(uriOrRpcConnection, username, password, rejectUnauthorized) {
    this._assertNotClosed();
    
    // normalize connection
    let connection = new MoneroRpcConnection(uriOrRpcConnection, username, password, rejectUnauthorized);
    let uri = connection.getUri();
    username = connection.getUsername();
    password = connection.getPassword();
    rejectUnauthorized = connection.getRejectUnauthorized();
    if (!uri) uri = "";
    if (!username) username = "";
    if (!password) password = "";
    this._rejectUnauthorized = rejectUnauthorized;  // persist locally
    
    // set connection in queue
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
      
        // define callback for wasm
        let callbackFn = function(resp) { resolve(); }
        
        // call wasm and invoke callback when done
        that._module.set_daemon_connection(that._cppAddress, uri, username, password, callbackFn);
      });
    });
  }
  
  async getDaemonConnection() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        let connectionContainerStr = that._module.get_daemon_connection(that._cppAddress);
        if (!connectionContainerStr) resolve();
        else {
          let jsonConnection = JSON.parse(connectionContainerStr);
          resolve(new MoneroRpcConnection(jsonConnection.uri, jsonConnection.username, jsonConnection.password, that._rejectUnauthorized));
        }
      });
    });
  }
  
  async isConnected() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
      
        // define callback for wasm
        let callbackFn = function(resp) {
          resolve(resp);
        }
        
        // call wasm and invoke callback when done
        that._module.is_connected(that._cppAddress, callbackFn);
      });
    });
  }
  
  async getVersion() {
    this._assertNotClosed();
    throw new Error("Not implemented");
  }
  
  async getPath() {
    this._assertNotClosed();
    return this._path;
  }
  
  async getIntegratedAddress(paymentId) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try {
        return new MoneroIntegratedAddress(JSON.parse(that._module.get_integrated_address(that._cppAddress, "", paymentId ? paymentId : "")));
      } catch (err) {
        throw new MoneroError("Invalid payment ID: " + paymentId);
      }
    });
  }
  
  async decodeIntegratedAddress(integratedAddress) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try {
        return new MoneroIntegratedAddress(JSON.parse(that._module.decode_integrated_address(that._cppAddress, integratedAddress)));
      } catch (err) {
        throw new MoneroError("Invalid integrated address: " + integratedAddress);
      }
    });
  }
  
  async getHeight() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        
        // define callback for wasm
        let callbackFn = function(resp) {
          resolve(resp);
        }
        
        // call wasm and invoke callback when done
        that._module.get_height(that._cppAddress, callbackFn);
      });
    });
  }
  
  async getDaemonHeight() {
    this._assertNotClosed();
    if (!(await this.isConnected())) throw new MoneroError("Wallet is not connected to daemon");
    
    // schedule task
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        
        // define callback for wasm
        let callbackFn = function(resp) {
          resolve(resp);
        }
        
        // call wasm and invoke callback when done
        that._module.get_daemon_height(that._cppAddress, callbackFn);
      });
    });
  }
  
  async getHeightByDate(year, month, day) {
    this._assertNotClosed();
    if (!(await this.isConnected())) throw new MoneroError("Wallet is not connected to daemon");
    
    // schedule task
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        
        // define callback for wasm
        let callbackFn = function(resp) {
          if (typeof resp === "string") reject(new MoneroError(resp));
          else resolve(resp);
        }
        
        // call wasm and invoke callback when done
        that._module.get_height_by_date(that._cppAddress, year, month, day, callbackFn);
      });
    });
  }
  
  async sync(listenerOrStartHeight, startHeight) {
    this._assertNotClosed();
    if (!(await this.isConnected())) throw new MoneroError("Wallet is not connected to daemon");
    
    // normalize params
    startHeight = listenerOrStartHeight instanceof MoneroWalletListener ? startHeight : listenerOrStartHeight;
    let listener = listenerOrStartHeight instanceof MoneroWalletListener ? listenerOrStartHeight : undefined;
    if (startHeight === undefined) startHeight = Math.max(await this.getHeight(), await this.getSyncHeight());
    
    // register listener if given
    if (listener) await this.addListener(listener);
    
    // sync wallet
    let err;
    let result;
    try {
      let that = this;
      result = await that._module.queueTask(async function() {
        that._assertNotClosed();
        return new Promise(function(resolve, reject) {
        
          // define callback for wasm
          let callbackFn = async function(resp) {
            if (resp.charAt(0) !== "{") reject(new MoneroError(resp));
            else {
              let respJson = JSON.parse(resp);
              resolve(new MoneroSyncResult(respJson.numBlocksFetched, respJson.receivedMoney));
            }
          }
          
          // sync wallet in wasm and invoke callback when done
          that._module.sync(that._cppAddress, startHeight, callbackFn);
        });
      });
    } catch (e) {
      err = e;
    }
    
    // unregister listener
    if (listener) await this.removeListener(listener);
    
    // throw error or return
    if (err) throw err;
    return result;
  }
  
  async startSyncing(syncPeriodInMs) {
    this._assertNotClosed();
    if (!(await this.isConnected())) throw new MoneroError("Wallet is not connected to daemon");
    this._syncPeriodInMs = syncPeriodInMs === undefined ? MoneroWalletFull.DEFAULT_SYNC_PERIOD_IN_MS : syncPeriodInMs;
    if (!this._syncingEnabled) {
      this._syncingEnabled = true;
      this._runSyncLoop();  // sync wallet on loop in background // TODO: switch to c++ sync loop if possible when single-threaded
    }
  }
    
  async stopSyncing() {
    this._assertNotClosed();
    this._syncingEnabled = false;
    this._module.stop_syncing(this._cppAddress); // task is not queued so wallet stops immediately
  }
  
  async rescanSpent() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        let callbackFn = function() { resolve(); }
        that._module.rescan_spent(that._cppAddress, callbackFn);
      });
    });
  }
  
  async rescanBlockchain() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        let callbackFn = function() { resolve(); }
        that._module.rescan_blockchain(that._cppAddress, callbackFn);
      });
    });
  }
  
  async getBalance(accountIdx, subaddressIdx) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      
      // get balance encoded in json string
      let balanceStr;
      if (accountIdx === undefined) {
        assert(subaddressIdx === undefined, "Subaddress index must be undefined if account index is undefined");
        balanceStr = that._module.get_balance_wallet(that._cppAddress);
      } else if (subaddressIdx === undefined) {
        balanceStr = that._module.get_balance_account(that._cppAddress, accountIdx);
      } else {
        balanceStr = that._module.get_balance_subaddress(that._cppAddress, accountIdx, subaddressIdx);
      }
      
      // parse json string to BigInteger
      return BigInteger.parse(JSON.parse(GenUtils.stringifyBIs(balanceStr)).balance);
    });
  }
  
  async getUnlockedBalance(accountIdx, subaddressIdx) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      
      // get balance encoded in json string
      let unlockedBalanceStr;
      if (accountIdx === undefined) {
        assert(subaddressIdx === undefined, "Subaddress index must be undefined if account index is undefined");
        unlockedBalanceStr = that._module.get_unlocked_balance_wallet(that._cppAddress);
      } else if (subaddressIdx === undefined) {
        unlockedBalanceStr = that._module.get_unlocked_balance_account(that._cppAddress, accountIdx);
      } else {
        unlockedBalanceStr = that._module.get_unlocked_balance_subaddress(that._cppAddress, accountIdx, subaddressIdx);
      }
      
      // parse json string to BigInteger
      return BigInteger.parse(JSON.parse(GenUtils.stringifyBIs(unlockedBalanceStr)).unlockedBalance);
    });
  }
  
  async getAccounts(includeSubaddresses, tag) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      let accountsStr = that._module.get_accounts(that._cppAddress, includeSubaddresses ? true : false, tag ? tag : "");
      let accounts = [];
      for (let accountJson of JSON.parse(GenUtils.stringifyBIs(accountsStr)).accounts) {
        accounts.push(MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson)));
      }
      return accounts;
    });
  }
  
  async getAccount(accountIdx, includeSubaddresses) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      let accountStr = that._module.get_account(that._cppAddress, accountIdx, includeSubaddresses ? true : false);
      let accountJson = JSON.parse(GenUtils.stringifyBIs(accountStr));
      return MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson));
    });

  }
  
  async createAccount(label) {
    if (label === undefined) label = "";
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      let accountStr = that._module.create_account(that._cppAddress, label);
      let accountJson = JSON.parse(GenUtils.stringifyBIs(accountStr));
      return MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson));
    });
  }
  
  async getSubaddresses(accountIdx, subaddressIndices) {
    let args = {accountIdx: accountIdx, subaddressIndices: subaddressIndices === undefined ? [] : GenUtils.listify(subaddressIndices)};
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      let subaddressesJson = JSON.parse(GenUtils.stringifyBIs(that._module.get_subaddresses(that._cppAddress, JSON.stringify(args)))).subaddresses;
      let subaddresses = [];
      for (let subaddressJson of subaddressesJson) subaddresses.push(MoneroWalletFull._sanitizeSubaddress(new MoneroSubaddress(subaddressJson)));
      return subaddresses;
    });
  }
  
  async createSubaddress(accountIdx, label) {
    if (label === undefined) label = "";
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      let subaddressStr = that._module.create_subaddress(that._cppAddress, accountIdx, label);
      let subaddressJson = JSON.parse(GenUtils.stringifyBIs(subaddressStr));
      return MoneroWalletFull._sanitizeSubaddress(new MoneroSubaddress(subaddressJson));
    });
  }
  
  async getTxs(query, missingTxHashes) {
    this._assertNotClosed();
    
    // copy and normalize query up to block
    query = MoneroWallet._normalizeTxQuery(query);
    
    // schedule task
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        
        // define callback for wasm
        let callbackFn = function(blocksJsonStr) {
            
          // check for error
          if (blocksJsonStr.charAt(0) !== "{") {
            reject(new MoneroError(blocksJsonStr));
            return;
          }
          
          // resolve with deserialized txs
          try {
            resolve(MoneroWalletFull._deserializeTxs(query, blocksJsonStr, missingTxHashes));
          } catch (err) {
            reject(err);
          }
        }
        
        // call wasm and invoke callback when done
        that._module.get_txs(that._cppAddress, JSON.stringify(query.getBlock().toJson()), callbackFn);
      });
    });
  }
  
  async getTransfers(query) {
    this._assertNotClosed();
    
    // copy and normalize query up to block
    query = MoneroWallet._normalizeTransferQuery(query);
    
    // return promise which resolves on callback
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        
        // define callback for wasm
        let callbackFn = function(blocksJsonStr) {
            
          // check for error
          if (blocksJsonStr.charAt(0) !== "{") {
            reject(new MoneroError(blocksJsonStr));
            return;
          }
           
          // resolve with deserialized transfers 
          try {
            resolve(MoneroWalletFull._deserializeTransfers(query, blocksJsonStr));
          } catch (err) {
            reject(err);
          }
        }
        
        // call wasm and invoke callback when done
        that._module.get_transfers(that._cppAddress, JSON.stringify(query.getTxQuery().getBlock().toJson()), callbackFn);
      });
    });
  }
  
  async getOutputs(query) {
    this._assertNotClosed();
    
    // copy and normalize query up to block
    query = MoneroWallet._normalizeOutputQuery(query);
    
    // return promise which resolves on callback
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        
        // define callback for wasm
        let callbackFn = function(blocksJsonStr) {
          
          // check for error
          if (blocksJsonStr.charAt(0) !== "{") {
            reject(new MoneroError(blocksJsonStr));
            return;
          }
          
          // resolve with deserialized outputs
          try {
            resolve(MoneroWalletFull._deserializeOutputs(query, blocksJsonStr));
          } catch (err) {
            reject(err);
          }
        }
        
        // call wasm and invoke callback when done
        that._module.get_outputs(that._cppAddress, JSON.stringify(query.getTxQuery().getBlock().toJson()), callbackFn);
      });
    });
  }
  
  async getOutputsHex() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        that._module.get_outputs_hex(that._cppAddress, function(outputsHex) { resolve(outputsHex); });
      });
    });
  }
  
  async importOutputsHex(outputsHex) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        that._module.import_outputs_hex(that._cppAddress, outputsHex, function(numImported) { resolve(numImported); });
      });
    });
  }
  
  async getKeyImages() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        let callback = function(keyImagesStr) {
          let keyImages = [];
          for (let keyImageJson of JSON.parse(GenUtils.stringifyBIs(keyImagesStr)).keyImages) keyImages.push(new MoneroKeyImage(keyImageJson));
          resolve(keyImages);
        }
        that._module.get_key_images(that._cppAddress, callback);
      });
    });
  }
  
  async importKeyImages(keyImages) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        let callback = function(keyImageImportResultStr) {
          resolve(new MoneroKeyImageImportResult(JSON.parse(GenUtils.stringifyBIs(keyImageImportResultStr))));
        }
        that._module.import_key_images(that._cppAddress, JSON.stringify({keyImages: keyImages.map(keyImage => keyImage.toJson())}), callback);
      });
    });
  }
  
  async getNewKeyImagesFromLastImport() {
    this._assertNotClosed();
    throw new MoneroError("Not implemented");
  }
  
  async createTxs(config) {
    this._assertNotClosed();
    
    // validate, copy, and normalize config
    config = MoneroWallet._normalizeCreateTxsConfig(config);
    if (config.getCanSplit() === undefined) config.setCanSplit(true);
    
    // check for payment id to avoid error in wasm 
    if (config.getPaymentId()) throw new MoneroError("Standalone payment IDs are obsolete. Use subaddresses or integrated addresses instead"); // TODO: this should no longer be necessary, remove and re-test
    
    // return promise which resolves on callback
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        
        // define callback for wasm
        let callbackFn = function(txSetJsonStr) {
          if (txSetJsonStr.charAt(0) !== '{') reject(new MoneroError(txSetJsonStr)); // json expected, else error
          else resolve(new MoneroTxSet(JSON.parse(GenUtils.stringifyBIs(txSetJsonStr))).getTxs());
        }
        
        // create txs in wasm and invoke callback when done
        that._module.create_txs(that._cppAddress, JSON.stringify(config.toJson()), callbackFn);
      });
    });
  }
  
  async sweepOutput(config) {
    this._assertNotClosed();
    
    // normalize and validate config
    config = MoneroWallet._normalizeSweepOutputConfig(config);
    
    // return promise which resolves on callback
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        
        // define callback for wasm
        let callbackFn = function(txSetJsonStr) {
          if (txSetJsonStr.charAt(0) !== '{') reject(new MoneroError(txSetJsonStr)); // json expected, else error
          else resolve(new MoneroTxSet(JSON.parse(GenUtils.stringifyBIs(txSetJsonStr))).getTxs()[0]);
        }
        
        // sweep output in wasm and invoke callback when done
        that._module.sweep_output(that._cppAddress, JSON.stringify(config.toJson()), callbackFn);
      });
    });
  }

  async sweepUnlocked(config) {
    this._assertNotClosed();
    
    // validate and normalize config
    config = MoneroWallet._normalizeSweepUnlockedConfig(config);
    
    // return promise which resolves on callback
    let that = this;
    return that._module.queueTask(async function() { // TODO: could factor this pattern out, invoked with module params and callback handler
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        
        // define callback for wasm
        let callbackFn = function(txSetsJson) {
          if (txSetsJson.charAt(0) !== '{') reject(new MoneroError(txSetsJson)); // json expected, else error
          else {
            let txSets = [];
            for (let txSetJson of JSON.parse(GenUtils.stringifyBIs(txSetsJson)).txSets) txSets.push(new MoneroTxSet(txSetJson));
            let txs = [];
            for (let txSet of txSets) for (let tx of txSet.getTxs()) txs.push(tx);
            resolve(txs);
          }
        }
        
        // sweep unlocked in wasm and invoke callback when done
        that._module.sweep_unlocked(that._cppAddress, JSON.stringify(config.toJson()), callbackFn);
      });
    });
  }
  
  async sweepDust(relay) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        
        // define callback for wasm
        let callbackFn = function(txSetJsonStr) {
          if (txSetJsonStr.charAt(0) !== '{') reject(new MoneroError(txSetJsonStr)); // json expected, else error
          else resolve(new MoneroTxSet(JSON.parse(GenUtils.stringifyBIs(txSetJsonStr))).getTxs());
        }
        
        // call wasm and invoke callback when done
        that._module.sweep_dust(that._cppAddress, relay, callbackFn);
      });
    });
  }
  
  async relayTxs(txsOrMetadatas) {
    this._assertNotClosed();
    assert(Array.isArray(txsOrMetadatas), "Must provide an array of txs or their metadata to relay");
    let txMetadatas = [];
    for (let txOrMetadata of txsOrMetadatas) txMetadatas.push(txOrMetadata instanceof MoneroTxWallet ? txOrMetadata.getMetadata() : txOrMetadata);
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        let callback = function(txHashesJson) {
          if (txHashesJson.charAt(0) !== "{") reject(new MoneroError(txHashesJson));
          else resolve(JSON.parse(txHashesJson).txHashes);
        }
        that._module.relay_txs(that._cppAddress, JSON.stringify({txMetadatas: txMetadatas}), callback);
      });
    });
  }
  
  async parseTxSet(txSet) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return new MoneroTxSet(JSON.parse(GenUtils.stringifyBIs(that._module.parse_tx_set(that._cppAddress, JSON.stringify(txSet.toJson()))))); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async signTxs(unsignedTxHex) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return that._module.sign_txs(that._cppAddress, unsignedTxHex); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async submitTxs(signedTxHex) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        let callbackFn = function(resp) {
          if (resp.charAt(0) !== "{") reject(new MoneroError(resp));
          else resolve(JSON.parse(resp).txHashes);
        }
        that._module.submit_txs(that._cppAddress, signedTxHex, callbackFn);
      });
    });
  }
  
  async signMessage(message, signatureType, accountIdx, subaddressIdx) {
    
    // assign defaults
    signatureType = signatureType || MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY;
    accountIdx = accountIdx || 0;
    subaddressIdx = subaddressIdx || 0;
    
    // queue task to sign message
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return that._module.sign_message(that._cppAddress, message, signatureType === MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY ? 0 : 1, accountIdx, subaddressIdx); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async verifyMessage(message, address, signature) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      let resultJson;
      try {
        MoneroUtils.validateAddress(address);   // avoid tools::dns_utils::get_account_address_as_str_from_url() on bad address
        resultJson = JSON.parse(that._module.verify_message(that._cppAddress, message, address, signature));
      } catch (err) {
        resultJson = {isGood: false};
      }
      let result = new MoneroMessageSignatureResult(
        resultJson.isGood,
        !resultJson.isGood ? undefined : resultJson.isOld,
        !resultJson.isGood ? undefined : resultJson.signatureType === "spend" ? MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY : MoneroMessageSignatureType.SIGN_WITH_VIEW_KEY,
        !resultJson.isGood ? undefined : resultJson.version);
      return result;
    });
  }
  
  async getTxKey(txHash) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return that._module.get_tx_key(that._cppAddress, txHash); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async checkTxKey(txHash, txKey, address) {
    //throw new Error("MoneroWalletFull.checkTxKey() not supported because of possible bug in emscripten: https://www.mail-archive.com/emscripten-discuss@googlegroups.com/msg08964.html")
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      let result = that._module.check_tx_key(that._cppAddress, txHash, txKey, address);
      try { return new MoneroCheckTx(JSON.parse(GenUtils.stringifyBIs(result))); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async getTxProof(txHash, address, message) {
    throw new Error("MoneroWalletFull.checkTxKey() not supported because of possible bug in emscripten: https://www.mail-archive.com/emscripten-discuss@googlegroups.com/msg08964.html")
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return that._module.get_tx_proof(that._cppAddress, txHash, address, message); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async checkTxProof(txHash, address, message, signature) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return new MoneroCheckTx(JSON.parse(GenUtils.stringifyBIs(that._module.check_tx_proof(that._cppAddress, txHash, address, message, signature)))); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async getSpendProof(txHash, message) {
    throw new Error("MoneroWalletFull.getSpendProof() not supported because of possible bug in emscripten: https://www.mail-archive.com/emscripten-discuss@googlegroups.com/msg08964.html");  // TODO
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return that._module.get_spend_proof(that._cppAddress, txHash, message); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async checkSpendProof(txHash, message, signature) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return that._module.check_spend_proof(that._cppAddress, txHash, message, signature); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async getReserveProofWallet(message) {
    throw new Error("MoneroWalletFull.getReserveProofWallet() not supported because of possible bug in emscripten: https://www.mail-archive.com/emscripten-discuss@googlegroups.com/msg08964.html");  // TODO
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return that._module.get_reserve_proof_wallet(that._cppAddress, message); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async getReserveProofAccount(accountIdx, amount, message) {
    throw new Error("MoneroWalletFull.getReserveProofAccount() not supported because of possible bug in emscripten: https://www.mail-archive.com/emscripten-discuss@googlegroups.com/msg08964.html"); // TODO
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return that._module.get_reserve_proof_account(that._cppAddress, accountIdx, amount.toString(), message); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }

  async checkReserveProof(address, message, signature) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return new MoneroCheckReserve(JSON.parse(GenUtils.stringifyBIs(that._module.check_reserve_proof(that._cppAddress, address, message, signature)))); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async getTxNotes(txHashes) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { return JSON.parse(that._module.get_tx_notes(that._cppAddress, JSON.stringify({txHashes: txHashes}))).txNotes; }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async setTxNotes(txHashes, notes) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try { that._module.set_tx_notes(that._cppAddress, JSON.stringify({txHashes: txHashes, txNotes: notes})); }
      catch (err) { throw new Error(that._module.get_exception_message(err)); }
    });
  }
  
  async getAddressBookEntries(entryIndices) {
    if (!entryIndices) entryIndices = [];
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      let entries = [];
      for (let entryJson of JSON.parse(that._module.get_address_book_entries(that._cppAddress, JSON.stringify({entryIndices: entryIndices}))).entries) {
        entries.push(new MoneroAddressBookEntry(entryJson));
      }
      return entries;
    });
  }
  
  async addAddressBookEntry(address, description) {
    if (!address) address = "";
    if (!description) description = "";
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return that._module.add_address_book_entry(that._cppAddress, address, description);
    });
  }
  
  async editAddressBookEntry(index, setAddress, address, setDescription, description) {
    if (!setAddress) setAddress = false;
    if (!address) address = "";
    if (!setDescription) setDescription = false;
    if (!description) description = "";
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      that._module.edit_address_book_entry(that._cppAddress, index, setAddress, address, setDescription, description);
    });
  }
  
  async deleteAddressBookEntry(entryIdx) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      that._module.delete_address_book_entry(that._cppAddress, entryIdx);
    });
  }
  
  async tagAccounts(tag, accountIndices) {
    if (!tag) tag = "";
    if (!accountIndices) accountIndices = [];
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      that._module.tag_accounts(that._cppAddress, JSON.stringify({tag: tag, accountIndices: accountIndices}));
    });
  }

  async untagAccounts(accountIndices) {
    if (!accountIndices) accountIndices = [];
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      that._module.tag_accounts(that._cppAddress, JSON.stringify({accountIndices: accountIndices}));
    });
  }
  
  async getAccountTags() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      let accountTags = [];
      for (let accountTagJson of JSON.parse(that._module.get_account_tags(that._cppAddress)).accountTags) accountTags.push(new MoneroAccountTag(accountTagJson));
      return accountTags;
    });
  }

  async setAccountTagLabel(tag, label) {
    if (!tag) tag = "";
    if (!llabel) label = "";
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      that._module.set_account_tag_label(that._cppAddress, tag, label);
    });
  }
  
  async createPaymentUri(config) {
    config = MoneroWallet._normalizeCreateTxsConfig(config);
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try {
        return that._module.create_payment_uri(that._cppAddress, JSON.stringify(config.toJson()));
      } catch (err) {
        throw new MoneroError("Cannot make URI from supplied parameters");
      }
    });
  }
  
  async parsePaymentUri(uri) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      try {
        return new MoneroTxConfig(JSON.parse(GenUtils.stringifyBIs(that._module.parse_payment_uri(that._cppAddress, uri))));
      } catch (err) {
        throw new MoneroError(err.message);
      }
    });
  }
  
  async getAttribute(key) {
    this._assertNotClosed();
    assert(typeof key === "string", "Attribute key must be a string");
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      let value = that._module.get_attribute(that._cppAddress, key);
      return value === "" ? null : value;
    });
  }
  
  async setAttribute(key, val) {
    this._assertNotClosed();
    assert(typeof key === "string", "Attribute key must be a string");
    assert(typeof val === "string", "Attribute value must be a string");
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      that._module.set_attribute(that._cppAddress, key, val);
    });
  }
  
  async startMining(numThreads, backgroundMining, ignoreBattery) {
    this._assertNotClosed();
    let daemon = new MoneroDaemonRpc(await this.getDaemonConnection());
    await daemon.startMining(await this.getPrimaryAddress(), numThreads, backgroundMining, ignoreBattery);
  }
  
  async stopMining() {
    this._assertNotClosed();
    let daemon = new MoneroDaemonRpc(await this.getDaemonConnection());
    await daemon.stopMining();
  }
  
  async isMultisigImportNeeded() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return that._module.is_multisig_import_needed(that._cppAddress);
    });
  }
  
  async isMultisig() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return that._module.is_multisig(that._cppAddress);
    });
  }
  
  async getMultisigInfo() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new MoneroMultisigInfo(JSON.parse(that._module.get_multisig_info(that._cppAddress)));
    });
  }
  
  async prepareMultisig() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return that._module.prepare_multisig(that._cppAddress);
    });
  }
  
  async makeMultisig(multisigHexes, threshold, password) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new MoneroMultisigInitResult(JSON.parse(that._module.make_multisig(that._cppAddress, JSON.stringify({multisigHexes: multisigHexes, threshold: threshold, password: password}))));
    });
  }
  
  async exchangeMultisigKeys(multisigHexes, password) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new MoneroMultisigInitResult(JSON.parse(that._module.exchange_multisig_keys(that._cppAddress, JSON.stringify({multisigHexes: multisigHexes, password: password}))));
    });
  }
  
  async getMultisigHex() {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return that._module.get_multisig_hex(that._cppAddress);
    });
  }
  
  async importMultisigHex(multisigHexes) {
    if (!GenUtils.isArray(multisigHexes)) throw new MoneroError("Must provide string[] to importMultisigHex()")
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        let callbackFn = function(resp) {
          if (typeof resp === "string") reject(new MoneroError(resp));
          else resolve(resp);
        }
        that._module.import_multisig_hex(that._cppAddress, JSON.stringify({multisigHexes: multisigHexes}), callbackFn);
      });
    });
  }
  
  async signMultisigTxHex(multisigTxHex) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        let callbackFn = async function(resp) {
          if (resp.charAt(0) !== "{") reject(new MoneroError(resp));
          else resolve(new MoneroMultisigSignResult(JSON.parse(resp)));
        }
        that._module.sign_multisig_tx_hex(that._cppAddress, multisigTxHex, callbackFn)
      });
    });
  }
  
  async submitMultisigTxHex(signedMultisigTxHex) {
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      return new Promise(function(resolve, reject) {
        let callbackFn = function(resp) { resolve(JSON.parse(resp).txHashes); }
        that._module.submit_multisig_tx_hex(that._cppAddress, signedMultisigTxHex, callbackFn);
      });
    });
  }
  
  /**
   * Get the wallet's keys and cache data.
   * 
   * @return {DataView[]} is the keys and cache data respectively
   */
  async getData() {
    this._assertNotClosed();
    
    // queue call to wasm module
    let viewOnly = await this.isViewOnly();
    let that = this;
    return that._module.queueTask(async function() {
      that._assertNotClosed();
      
      // store views in array
      let views = [];
      
      // malloc cache buffer and get buffer location in c++ heap
      let cacheBufferLoc = JSON.parse(that._module.get_cache_file_buffer(that._cppAddress, that._password));
      
      // read binary data from heap to DataView
      let view = new DataView(new ArrayBuffer(cacheBufferLoc.length));
      for (let i = 0; i < cacheBufferLoc.length; i++) {
        view.setInt8(i, that._module.HEAPU8[cacheBufferLoc.pointer / Uint8Array.BYTES_PER_ELEMENT + i]);
      }
      
      // free binary on heap
      that._module._free(cacheBufferLoc.pointer);
      
      // write cache file
      views.push(Buffer.from(view.buffer));
      
      // malloc keys buffer and get buffer location in c++ heap
      let keysBufferLoc = JSON.parse(that._module.get_keys_file_buffer(that._cppAddress, that._password, viewOnly));
      
      // read binary data from heap to DataView
      view = new DataView(new ArrayBuffer(keysBufferLoc.length));
      for (let i = 0; i < keysBufferLoc.length; i++) {
        view.setInt8(i, that._module.HEAPU8[keysBufferLoc.pointer / Uint8Array.BYTES_PER_ELEMENT + i]);
      }
      
      // free binary on heap
      that._module._free(keysBufferLoc.pointer);
      
      // prepend keys file
      views.unshift(Buffer.from(view.buffer));
      return views;
    });
  }

  async save() {
    return MoneroWalletFull._save(this);
  }
  
  async close(save) {
    if (this._isClosed) return; // no effect if closed
    this._syncingEnabled = false;
    await this._setIsListening(false);
    await this.stopSyncing();
    await super.close(save);
    delete this._path;
    delete this._password;
    delete this._listeners;
    delete this._fullListener;
    LibraryUtils.setRejectUnauthorizedFn(this._rejectUnauthorizedConfigId, undefined); // unregister fn informing if unauthorized reqs should be rejected
  }
  
  // ----------- ADD JSDOC FOR SUPPORTED DEFAULT IMPLEMENTATIONS --------------
  
  async getNumBlocksToUnlock() { return super.getNumBlocksToUnlock(...arguments); }
  async getTx() { return super.getTx(...arguments); }
  async getIncomingTransfers() { return super.getIncomingTransfers(...arguments); }
  async getOutgoingTransfers() { return super.getOutgoingTransfers(...arguments); }
  async createTx() { return super.createTx(...arguments); }
  async relayTx() { return super.relayTx(...arguments); }
  async getTxNote() { return super.getTxNote(...arguments); }
  async setTxNote() { return super.setTxNote(...arguments); }
  
  // ---------------------------- PRIVATE HELPERS ----------------------------
  
  static _getFs() {
    if (!MoneroWalletFull.FS) MoneroWalletFull.FS = GenUtils.isBrowser() ? undefined : require('fs');
    return MoneroWalletFull.FS;
  }
  
  static async _openWalletData(path, password, networkType, keysData, cacheData, daemonUriOrConnection, proxyToWorker, fs) {
    if (proxyToWorker) return MoneroWalletFullProxy.openWalletData(path, password, networkType, keysData, cacheData, daemonUriOrConnection, fs);
    
    // validate and normalize parameters
    assert(password, "Must provide a password to open the wallet");
    if (networkType === undefined) throw new MoneroError("Must provide the wallet's network type");
    MoneroNetworkType.validate(networkType);
    let daemonConnection = typeof daemonUriOrConnection === "string" ? new MoneroRpcConnection(daemonUriOrConnection) : daemonUriOrConnection;
    let daemonUri = daemonConnection && daemonConnection.getUri() ? daemonConnection.getUri() : "";
    let daemonUsername = daemonConnection && daemonConnection.getUsername() ? daemonConnection.getUsername() : "";
    let daemonPassword = daemonConnection && daemonConnection.getPassword() ? daemonConnection.getPassword() : "";
    let rejectUnauthorized = daemonConnection ? daemonConnection.getRejectUnauthorized() : true;
    
    // load wasm module
    let module = await LibraryUtils.loadFullModule();
    
    // open wallet in queue
    return module.queueTask(async function() {
      return new Promise(function(resolve, reject) {
        
        // register fn informing if unauthorized reqs should be rejected
        let rejectUnauthorizedFnId = GenUtils.getUUID();
        LibraryUtils.setRejectUnauthorizedFn(rejectUnauthorizedFnId, function() { return rejectUnauthorized });
      
        // define callback for wasm
        let callbackFn = async function(cppAddress) {
          if (typeof cppAddress === "string") reject(new MoneroError(cppAddress));
          else resolve(new MoneroWalletFull(cppAddress, path, password, fs, rejectUnauthorized, rejectUnauthorizedFnId));
        };
        
        // create wallet in wasm and invoke callback when done
        module.open_full_wallet(password, networkType, keysData, cacheData, daemonUri, daemonUsername, daemonPassword, rejectUnauthorizedFnId, callbackFn);
      });
    });
  }
  
  /**
   * Loop while syncing enabled.
   */
  async _runSyncLoop() {
    if (this._syncLoopRunning) return; // only run one loop at a time
    this._syncLoopRunning = true;
    
    // sync while enabled
    let label = this._path ? this._path : (this._browserMainPath ? this._browserMainPath : "in-memory wallet"); // label for log
    while (this._syncingEnabled) {
      let start = Date.now();
      console.log("Background synchronizing " + label);
      try { await this.sync(); }
      catch (err) { if (!this._isClosed) console.log("Failed to background synchronize " + label + ": " + err.message); }
      let sleepTime = this._syncPeriodInMs - (Date.now() - start); // target regular sync period by accounting for poll time
      if (this._syncingEnabled) await new Promise(function(resolve) { setTimeout(resolve, sleepTime); });
    }
    
    this._syncLoopRunning = false;
  }
  
  /**
   * Enables or disables listening in the c++ wallet.
   */
  async _setIsListening(isEnabled) {
    let that = this;
    return that._module.queueTask(async function() {
      if (isEnabled) {
        that._fullListenerHandle = that._module.set_listener(
            that._cppAddress,
            that._fullListenerHandle,
            async function(height, startHeight, endHeight, percentDone, message) { await that._fullListener.onSyncProgress(height, startHeight, endHeight, percentDone, message); },
            async function(height) { await that._fullListener.onNewBlock(height); },
            async function(newBalanceStr, newUnlockedBalanceStr) { await that._fullListener.onBalancesChanged(newBalanceStr, newUnlockedBalanceStr); },
            async function(height, txHash, amountStr, accountIdx, subaddressIdx, version, unlockHeight, isLocked) { await that._fullListener.onOutputReceived(height, txHash, amountStr, accountIdx, subaddressIdx, version, unlockHeight, isLocked); },
            async function(height, txHash, amountStr, accountIdx, subaddressIdx, version) { await that._fullListener.onOutputSpent(height, txHash, amountStr, accountIdx, subaddressIdx, version); });
      } else {
        that._fullListenerHandle = that._module.set_listener(that._cppAddress, that._fullListenerHandle, undefined, undefined, undefined, undefined, undefined);
      }
    });
  }
  
  static _sanitizeBlock(block) {
    for (let tx of block.getTxs()) MoneroWalletFull._sanitizeTxWallet(tx);
    return block;
  }
  
  static _sanitizeTxWallet(tx) {
    assert(tx instanceof MoneroTxWallet);
    return tx;
  }
  
  static _sanitizeAccount(account) {
    if (account.getSubaddresses()) {
      for (let subaddress of account.getSubaddresses()) MoneroWalletFull._sanitizeSubaddress(subaddress);
    }
    return account;
  }
  
  static _sanitizeSubaddress(subaddress) {
    if (subaddress.getLabel() === "") subaddress.setLabel(undefined);
    return subaddress
  }
  
  static _deserializeBlocks(blocksJsonStr) {
    let blocksJson = JSON.parse(GenUtils.stringifyBIs(blocksJsonStr));
    let deserializedBlocks = {};
    deserializedBlocks.blocks = [];
    deserializedBlocks.missingTxHashes = [];
    if (blocksJson.blocks) for (let blockJson of blocksJson.blocks) deserializedBlocks.blocks.push(MoneroWalletFull._sanitizeBlock(new MoneroBlock(blockJson, MoneroBlock.DeserializationType.TX_WALLET)));
    if (blocksJson.missingTxHashes) for (let missingTxHash of blocksJson.missingTxHashes) deserializedBlocks.missingTxHashes.push(missingTxHash);
    return deserializedBlocks;
  }
  
  static _deserializeTxs(query, blocksJsonStr, missingTxHashes) {
    
    // deserialize blocks
    let deserializedBlocks = MoneroWalletFull._deserializeBlocks(blocksJsonStr);
    if (missingTxHashes === undefined && deserializedBlocks.missingTxHashes.length > 0) throw new MoneroError("Wallet missing requested tx hashes: " + deserializedBlocks.missingTxHashes);
    for (let missingTxHash of deserializedBlocks.missingTxHashes) missingTxHashes.push(missingTxHash);
    let blocks = deserializedBlocks.blocks;
    
    // collect txs
    let txs = [];
    for (let block of blocks) {
      MoneroWalletFull._sanitizeBlock(block);
      for (let tx of block.getTxs()) {
        if (block.getHeight() === undefined) tx.setBlock(undefined); // dereference placeholder block for unconfirmed txs
        txs.push(tx);
      }
    }
    
    // re-sort txs which is lost over wasm serialization  // TODO: confirm that order is lost
    if (query.getHashes() !== undefined) {
      let txMap = new Map();
      for (let tx of txs) txMap[tx.getHash()] = tx;
      let txsSorted = [];
      for (let txHash of query.getHashes()) if (txMap[txHash] !== undefined) txsSorted.push(txMap[txHash]);
      txs = txsSorted;
    }
    
    return txs;
  }
  
  static _deserializeTransfers(query, blocksJsonStr) {
    
    // deserialize blocks
    let deserializedBlocks = MoneroWalletFull._deserializeBlocks(blocksJsonStr);
    if (deserializedBlocks.missingTxHashes.length > 0) throw new MoneroError("Wallet missing requested tx hashes: " + deserializedBlocks.missingTxHashes);
    let blocks = deserializedBlocks.blocks;
    
    // collect transfers
    let transfers = [];
    for (let block of blocks) {
      for (let tx of block.getTxs()) {
        if (block.getHeight() === undefined) tx.setBlock(undefined); // dereference placeholder block for unconfirmed txs
        if (tx.getOutgoingTransfer() !== undefined) transfers.push(tx.getOutgoingTransfer());
        if (tx.getIncomingTransfers() !== undefined) {
          for (let transfer of tx.getIncomingTransfers()) transfers.push(transfer);
        }
      }
    }
    
    return transfers;
  }
  
  static _deserializeOutputs(query, blocksJsonStr) {
    
    // deserialize blocks
    let deserializedBlocks = MoneroWalletFull._deserializeBlocks(blocksJsonStr);
    if (deserializedBlocks.missingTxHashes.length > 0) throw new MoneroError("Wallet missing requested tx hashes: " + deserializedBlocks.missingTxHashes);
    let blocks = deserializedBlocks.blocks;
    
    // collect outputs
    let outputs = [];
    for (let block of blocks) {
      for (let tx of block.getTxs()) {
        for (let output of tx.getOutputs()) outputs.push(output);
      }
    }
    
    return outputs;
  }
  
  /**
   * Set the path of the wallet on the browser main thread if run as a web worker.
   * 
   * @param {string} browserMainPath - path of the wallet on the browser main thread
   */
  _setBrowserMainPath(browserMainPath) {
    this._browserMainPath = browserMainPath;
  }
  
  // TODO: accessing wallet._fs and wallet._path breaks encapcapsulation, getter and setter?
  static async _moveTo(path, wallet) {
    if (await wallet.isClosed()) throw new MoneroError("Wallet is closed");
    if (!path) throw new MoneroError("Must provide path of destination wallet");
    
    // save and return if same path
    const Path = require("path");
    if (Path.normalize(wallet._path) === Path.normalize(path)) {
      await wallet.save();
      return;
    }
    
    // create destination directory if it doesn't exist
    let walletDir = Path.dirname(path);
    if (!wallet._fs.existsSync(walletDir)) {
      try { wallet._fs.mkdirSync(walletDir); }
      catch (err) { throw new MoneroError("Destination path " + path + " does not exist and cannot be created: " + err.message); }
    }
    
    // write new wallet files
    let data = await wallet.getData();
    wallet._fs.writeFileSync(path + ".keys", data[0], "binary");
    wallet._fs.writeFileSync(path, data[1], "binary");
    wallet._fs.writeFileSync(path + ".address.txt", await wallet.getPrimaryAddress());
    let oldPath = wallet._path;
    wallet._path = path;
    
    // delete old wallet files
    if (oldPath) {
      wallet._fs.unlinkSync(oldPath + ".address.txt");
      wallet._fs.unlinkSync(oldPath + ".keys");
      wallet._fs.unlinkSync(oldPath);
    }
  }
  
  // TODO: accessing wallet._fs breaks encapcapsulation, getter?
  static async _save(wallet) {
    if (await wallet.isClosed()) throw new MoneroError("Wallet is closed");
        
    // path must be set
    let path = await wallet.getPath();
    if (!path) throw new MoneroError("Cannot save wallet because path is not set");
    
    // write wallet files
    let data = await wallet.getData();
    wallet._fs.writeFileSync(path + ".keys", data[0], "binary");
    wallet._fs.writeFileSync(path, data[1], "binary");
    wallet._fs.writeFileSync(path + ".address.txt", await wallet.getPrimaryAddress());
  }
}

// ------------------------------- LISTENERS --------------------------------

/**
 * Receives notifications directly from wasm c++.
 * 
 * @private
 */
class WalletFullListener {
  
  constructor(wallet) {
    this._wallet = wallet;
  }
  
  async onSyncProgress(height, startHeight, endHeight, percentDone, message) {
    for (let listener of this._wallet.getListeners()) await listener.onSyncProgress(height, startHeight, endHeight, percentDone, message);
  }
  
  async onNewBlock(height) {
    for (let listener of this._wallet.getListeners()) await listener.onNewBlock(height);
  }
  
  async onBalancesChanged(newBalanceStr, newUnlockedBalanceStr) {
    for (let listener of this._wallet.getListeners()) await listener.onBalancesChanged(BigInteger.parse(newBalanceStr), BigInteger.parse(newUnlockedBalanceStr));
  }
  
  async onOutputReceived(height, txHash, amountStr, accountIdx, subaddressIdx, version, unlockHeight, isLocked) {
    
    // build received output
    let output = new MoneroOutputWallet();
    output.setAmount(BigInteger.parse(amountStr));
    output.setAccountIndex(accountIdx);
    output.setSubaddressIndex(subaddressIdx);
    let tx = new MoneroTxWallet();
    tx.setHash(txHash);
    tx.setVersion(version);
    tx.setUnlockHeight(unlockHeight);
    output.setTx(tx);
    tx.setOutputs([output]);
    tx.setIsIncoming(true);
    tx.setIsLocked(isLocked);
    if (height > 0) {
      let block = new MoneroBlock().setHeight(height);
      block.setTxs([tx]);
      tx.setBlock(block);
      tx.setIsConfirmed(true);
      tx.setInTxPool(false);
      tx.setIsFailed(false);
    } else {
      tx.setIsConfirmed(false);
      tx.setInTxPool(true);
    }
    
    // announce output
    for (let listener of this._wallet.getListeners()) await listener.onOutputReceived(tx.getOutputs()[0]);
  }
  
  async onOutputSpent(height, txHash, amountStr, accountIdx, subaddressIdx, version) {
    
    // build spent output
    let output = new MoneroOutputWallet();
    output.setAmount(BigInteger.parse(amountStr));
    output.setAccountIndex(accountIdx);
    output.setSubaddressIndex(subaddressIdx);
    let tx = new MoneroTxWallet();
    tx.setHash(txHash);
    tx.setVersion(version);
    output.setTx(tx);
    tx.setInputs([output]);
    if (height > 0) {
      let block = new MoneroBlock().setHeight(height);
      block.setTxs([tx]);
      tx.setBlock(block);
      tx.setIsConfirmed(true);
      tx.setInTxPool(false);
      tx.setIsFailed(false);
    } else {
      tx.setIsConfirmed(false);
      tx.setInTxPool(true);
    }
    
    // notify wallet listeners
    for (let listener of this._wallet.getListeners()) await listener.onOutputSpent(tx.getInputs()[0]);
  }
}

/**
 * Implements a MoneroWallet by proxying requests to a web worker which runs a full wallet.
 * 
 * TODO: sort these methods according to master sort in MoneroWallet.js
 * TODO: probably only allow one listener to web worker then propogate to registered listeners for performance
 * TODO: ability to recycle worker for use in another wallet
 * TODO: using LibraryUtils.WORKER_OBJECTS directly breaks encapsulation
 * 
 * @private
 */
class MoneroWalletFullProxy extends MoneroWallet {
  
  // -------------------------- WALLET STATIC UTILS ---------------------------
  
  static async openWalletData(path, password, networkType, keysData, cacheData, daemonUriOrConnection, fs) {
    let walletId = GenUtils.getUUID();
    let daemonUriOrConfig = daemonUriOrConnection instanceof MoneroRpcConnection ? daemonUriOrConnection.getConfig() : daemonUriOrConnection;
    await LibraryUtils.invokeWorker(walletId, "openWalletData", [path, password, networkType, keysData, cacheData, daemonUriOrConfig]);
    let wallet = new MoneroWalletFullProxy(walletId, LibraryUtils.getWorker(), path, fs);
    if (path) await wallet.save();
    return wallet;
  }
  
  static async _createWalletRandom(path, password, networkType, daemonUriOrConnection, language, fs) {
    if (path && await MoneroWalletFull.walletExists(path, fs)) throw new Error("Wallet already exists: " + path);
    let walletId = GenUtils.getUUID();
    let daemonUriOrConfig = daemonUriOrConnection instanceof MoneroRpcConnection ? daemonUriOrConnection.getConfig() : daemonUriOrConnection;
    await LibraryUtils.invokeWorker(walletId, "_createWalletRandom", [path, password, networkType, daemonUriOrConfig, language]);
    let wallet = new MoneroWalletFullProxy(walletId, LibraryUtils.getWorker(), path, fs);
    if (path) await wallet.save();
    return wallet;
  }
  
  static async _createWalletFromMnemonic(path, password, networkType, mnemonic, daemonUriOrConnection, restoreHeight, seedOffset, fs) {
    if (path && await MoneroWalletFull.walletExists(path, fs)) throw new Error("Wallet already exists: " + path);
    let walletId = GenUtils.getUUID();
    let daemonUriOrConfig = daemonUriOrConnection instanceof MoneroRpcConnection ? daemonUriOrConnection.getConfig() : daemonUriOrConnection;
    await LibraryUtils.invokeWorker(walletId, "_createWalletFromMnemonic", [path, password, networkType, mnemonic, daemonUriOrConfig, restoreHeight, seedOffset]);
    let wallet = new MoneroWalletFullProxy(walletId, LibraryUtils.getWorker(), path, fs);
    if (path) await wallet.save();
    return wallet;
  }
  
  static async _createWalletFromKeys(path, password, networkType, address, viewKey, spendKey, daemonUriOrConnection, restoreHeight, language, fs) {
    if (path && await MoneroWalletFull.walletExists(path, fs)) throw new Error("Wallet already exists: " + path);
    let walletId = GenUtils.getUUID();
    let daemonUriOrConfig = daemonUriOrConnection instanceof MoneroRpcConnection ? daemonUriOrConnection.getConfig() : daemonUriOrConnection;
    await LibraryUtils.invokeWorker(walletId, "_createWalletFromKeys", [path, password, networkType, address, viewKey, spendKey, daemonUriOrConfig, restoreHeight, language]);
    let wallet = new MoneroWalletFullProxy(walletId, LibraryUtils.getWorker(), path, fs);
    if (path) await wallet.save();
    return wallet;
  }
  
  // --------------------------- INSTANCE METHODS ----------------------------
  
  /**
   * Internal constructor which is given a worker to communicate with via messages.
   * 
   * This method should not be called externally but should be called through
   * static wallet creation utilities in this class.
   * 
   * @param {string} walletId - identifies the wallet with the worker
   * @param {Worker} worker - web worker to communicate with via messages
   */
  constructor(walletId, worker, path, fs) {
    super();
    this._walletId = walletId;
    this._worker = worker;
    this._path = path;
    this._fs = fs ? fs : (path ? MoneroWalletFull._getFs() : undefined);
    this._wrappedListeners = [];
  }
  
  async isViewOnly() {
    return this._invokeWorker("isViewOnly");
  }
  
  async getNetworkType() {
    return this._invokeWorker("getNetworkType");
  }
  
  async getVersion() {
    throw new Error("Not implemented");
  }
  
  getPath() {
    return this._path;
  }
  
  async getMnemonic() {
    return this._invokeWorker("getMnemonic");
  }
  
  async getMnemonicLanguage() {
    return this._invokeWorker("getMnemonicLanguage");
  }
  
  async getMnemonicLanguages() {
    return this._invokeWorker("getMnemonicLanguages");
  }
  
  async getPrivateSpendKey() {
    return this._invokeWorker("getPrivateSpendKey");
  }
  
  async getPrivateViewKey() {
    return this._invokeWorker("getPrivateViewKey");
  }
  
  async getPublicViewKey() {
    return this._invokeWorker("getPublicViewKey");
  }
  
  async getPublicSpendKey() {
    return this._invokeWorker("getPublicSpendKey");
  }
  
  async getAddress(accountIdx, subaddressIdx) {
    return this._invokeWorker("getAddress", Array.from(arguments));
  }
  
  async getAddressIndex(address) {
    let subaddressJson = await this._invokeWorker("getAddressIndex", Array.from(arguments));
    return MoneroWalletFull._sanitizeSubaddress(new MoneroSubaddress(subaddressJson));
  }
  
  async getIntegratedAddress(paymentId) {
    return new MoneroIntegratedAddress(await this._invokeWorker("getIntegratedAddress", Array.from(arguments)));
  }
  
  async decodeIntegratedAddress(integratedAddress) {
    return new MoneroIntegratedAddress(await this._invokeWorker("decodeIntegratedAddress", Array.from(arguments)));
  }
  
  async setDaemonConnection(uriOrRpcConnection, username, password) {
    if (!uriOrRpcConnection) await this._invokeWorker("setDaemonConnection");
    else {
      let connection = uriOrRpcConnection instanceof MoneroRpcConnection? uriOrRpcConnection : new MoneroRpcConnection({uri: uriOrRpcConnection, username: username, password: password});
      await this._invokeWorker("setDaemonConnection", connection.getConfig());
    }
  }
  
  async getDaemonConnection() {
    let rpcConfig = await this._invokeWorker("getDaemonConnection");
    return rpcConfig ? new MoneroRpcConnection(rpcConfig) : undefined;
  }
  
  async isConnected() {
    return this._invokeWorker("isConnected");
  }
  
  async getSyncHeight() {
    return this._invokeWorker("getSyncHeight");
  }
  
  async setSyncHeight(syncHeight) {
    return this._invokeWorker("setSyncHeight", [syncHeight]);
  }
  
  async getDaemonHeight() {
    return this._invokeWorker("getDaemonHeight");
  }
  
  async getDaemonMaxPeerHeight() {
    return this._invokeWorker("getDaemonMaxPeerHeight");
  }
  
  async getHeightByDate(year, month, day) {
    return this._invokeWorker("getHeightByDate", [year, month, day]);
  }
  
  async isDaemonSynced() {
    return this._invokeWorker("isDaemonSynced");
  }
  
  async getHeight() {
    return this._invokeWorker("getHeight");
  }
  
  async addListener(listener) {
    let wrappedListener = new WalletWorkerListener(listener);
    let listenerId = wrappedListener.getId();
    LibraryUtils.WORKER_OBJECTS[this._walletId].callbacks["onSyncProgress_" + listenerId] = [wrappedListener.onSyncProgress, wrappedListener];
    LibraryUtils.WORKER_OBJECTS[this._walletId].callbacks["onNewBlock_" + listenerId] = [wrappedListener.onNewBlock, wrappedListener];
    LibraryUtils.WORKER_OBJECTS[this._walletId].callbacks["onBalancesChanged_" + listenerId] = [wrappedListener.onBalancesChanged, wrappedListener];
    LibraryUtils.WORKER_OBJECTS[this._walletId].callbacks["onOutputReceived_" + listenerId] = [wrappedListener.onOutputReceived, wrappedListener];
    LibraryUtils.WORKER_OBJECTS[this._walletId].callbacks["onOutputSpent_" + listenerId] = [wrappedListener.onOutputSpent, wrappedListener];
    this._wrappedListeners.push(wrappedListener);
    return this._invokeWorker("addListener", [listenerId]);
  }
  
  async removeListener(listener) {
    for (let i = 0; i < this._wrappedListeners.length; i++) {
      if (this._wrappedListeners[i].getListener() === listener) {
        let listenerId = this._wrappedListeners[i].getId();
        await this._invokeWorker("removeListener", [listenerId]);
        delete LibraryUtils.WORKER_OBJECTS[this._walletId].callbacks["onSyncProgress_" + listenerId];
        delete LibraryUtils.WORKER_OBJECTS[this._walletId].callbacks["onNewBlock_" + listenerId];
        delete LibraryUtils.WORKER_OBJECTS[this._walletId].callbacks["onBalancesChanged_" + listenerId];
        delete LibraryUtils.WORKER_OBJECTS[this._walletId].callbacks["onOutputReceived_" + listenerId];
        delete LibraryUtils.WORKER_OBJECTS[this._walletId].callbacks["onOutputSpent_" + listenerId];
        this._wrappedListeners.splice(i, 1);
        return;
      }
    }
    throw new MoneroError("Listener is not registered with wallet");
  }
  
  getListeners() {
    let listeners = [];
    for (let wrappedListener of this._wrappedListeners) listeners.push(wrappedListener.getListener());
    return listeners;
  }
  
  async isSynced() {
    return this._invokeWorker("isSynced");
  }
  
  async sync(listenerOrStartHeight, startHeight) {
    
    // normalize params
    startHeight = listenerOrStartHeight instanceof MoneroWalletListener ? startHeight : listenerOrStartHeight;
    let listener = listenerOrStartHeight instanceof MoneroWalletListener ? listenerOrStartHeight : undefined;
    if (startHeight === undefined) startHeight = Math.max(await this.getHeight(), await this.getSyncHeight());
    
    // register listener if given
    if (listener) await this.addListener(listener);
    
    // sync wallet in worker 
    let err;
    let result;
    try {
      let resultJson = await this._invokeWorker("sync", [startHeight]);
      result = new MoneroSyncResult(resultJson.numBlocksFetched, resultJson.receivedMoney);
    } catch (e) {
      err = e;
    }
    
    // unregister listener
    if (listener) await this.removeListener(listener);
    
    // throw error or return
    if (err) throw err;
    return result;
  }
  
  async startSyncing(syncPeriodInMs) {
    return this._invokeWorker("startSyncing", Array.from(arguments));
  }
    
  async stopSyncing() {
    return this._invokeWorker("stopSyncing");
  }
  
  async rescanSpent() {
    return this._invokeWorker("rescanSpent");
  }
    
  async rescanBlockchain() {
    return this._invokeWorker("rescanBlockchain");
  }
  
  async getBalance(accountIdx, subaddressIdx) {
    return BigInteger.parse(await this._invokeWorker("getBalance", Array.from(arguments)));
  }
  
  async getUnlockedBalance(accountIdx, subaddressIdx) {
    let unlockedBalanceStr = await this._invokeWorker("getUnlockedBalance", Array.from(arguments));
    return BigInteger.parse(unlockedBalanceStr);
  }
  
  async getAccounts(includeSubaddresses, tag) {
    let accounts = [];
    for (let accountJson of (await this._invokeWorker("getAccounts", Array.from(arguments)))) {
      accounts.push(MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson)));
    }
    return accounts;
  }
  
  async getAccount(accountIdx, includeSubaddresses) {
    let accountJson = await this._invokeWorker("getAccount", Array.from(arguments));
    return MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson));
  }
  
  async createAccount(label) {
    let accountJson = await this._invokeWorker("createAccount", Array.from(arguments));
    return MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson));
  }
  
  async getSubaddresses(accountIdx, subaddressIndices) {
    let subaddresses = [];
    for (let subaddressJson of (await this._invokeWorker("getSubaddresses", Array.from(arguments)))) {
      subaddresses.push(MoneroWalletFull._sanitizeSubaddress(new MoneroSubaddress(subaddressJson)));
    }
    return subaddresses;
  }
  
  async createSubaddress(accountIdx, label) {
    let subaddressJson = await this._invokeWorker("createSubaddress", Array.from(arguments));
    return MoneroWalletFull._sanitizeSubaddress(new MoneroSubaddress(subaddressJson));
  }
  
  async getTxs(query, missingTxHashes) {
    query = MoneroWallet._normalizeTxQuery(query);
    let respJson = await this._invokeWorker("getTxs", [query.getBlock().toJson(), missingTxHashes]);
    return MoneroWalletFull._deserializeTxs(query, JSON.stringify({blocks: respJson.blocks, missingTxHashes: respJson.missingTxHashes}), missingTxHashes); // initialize txs from blocks json string TODO: this stringifies then utility parses, avoid
  }
  
  async getTransfers(query) {
    query = MoneroWallet._normalizeTransferQuery(query);
    let blockJsons = await this._invokeWorker("getTransfers", [query.getTxQuery().getBlock().toJson()]);
    return MoneroWalletFull._deserializeTransfers(query, JSON.stringify({blocks: blockJsons})); // initialize transfers from blocks json string TODO: this stringifies then utility parses, avoid
  }
  
  async getOutputs(query) {
    query = MoneroWallet._normalizeOutputQuery(query);
    let blockJsons = await this._invokeWorker("getOutputs", [query.getTxQuery().getBlock().toJson()]);
    return MoneroWalletFull._deserializeOutputs(query, JSON.stringify({blocks: blockJsons})); // initialize transfers from blocks json string TODO: this stringifies then utility parses, avoid
  }
  
  async getOutputsHex() {
    return this._invokeWorker("getOutputsHex");
  }
  
  async importOutputsHex(outputsHex) {
    return this._invokeWorker("importOutputsHex", [outputsHex]);
  }
  
  async getKeyImages() {
    let keyImages = [];
    for (let keyImageJson of await this._invokeWorker("getKeyImages")) keyImages.push(new MoneroKeyImage(keyImageJson));
    return keyImages;
  }
  
  async importKeyImages(keyImages) {
    let keyImagesJson = [];
    for (let keyImage of keyImages) keyImagesJson.push(keyImage.toJson());
    return new MoneroKeyImageImportResult(await this._invokeWorker("importKeyImages", [keyImagesJson]));
  }
  
  async getNewKeyImagesFromLastImport() {
    throw new MoneroError("MoneroWalletFull.getNewKeyImagesFromLastImport() not implemented");
  }
  
  async createTxs(config) {
    config = MoneroWallet._normalizeCreateTxsConfig(config);
    let txSetJson = await this._invokeWorker("createTxs", [config.toJson()]);
    return new MoneroTxSet(txSetJson).getTxs();
  }
  
  async sweepOutput(config) {
    config = MoneroWallet._normalizeSweepOutputConfig(config);
    let txSetJson = await this._invokeWorker("sweepOutput", [config.toJson()]);
    return new MoneroTxSet(txSetJson).getTxs()[0];
  }

  async sweepUnlocked(config) {
    config = MoneroWallet._normalizeSweepUnlockedConfig(config);
    let txSetsJson = await this._invokeWorker("sweepUnlocked", [config.toJson()]);
    let txs = [];
    for (let txSetJson of txSetsJson) for (let tx of new MoneroTxSet(txSetJson).getTxs()) txs.push(tx);
    return txs;
  }
  
  async sweepDust(relay) {
    return new MoneroTxSet(await this._invokeWorker("sweepDust", [relay])).getTxs();
  }
  
  async relayTxs(txsOrMetadatas) {
    assert(Array.isArray(txsOrMetadatas), "Must provide an array of txs or their metadata to relay");
    let txMetadatas = [];
    for (let txOrMetadata of txsOrMetadatas) txMetadatas.push(txOrMetadata instanceof MoneroTxWallet ? txOrMetadata.getMetadata() : txOrMetadata);
    return this._invokeWorker("relayTxs", [txMetadatas]);
  }
  
  async parseTxSet(txSet) {
    return new MoneroTxSet(await this._invokeWorker("parseTxSet", [txSet.toJson()]));
  }
  
  async signTxs(unsignedTxHex) {
    return this._invokeWorker("signTxs", Array.from(arguments));
  }
  
  async submitTxs(signedTxHex) {
    return this._invokeWorker("submitTxs", Array.from(arguments));
  }
  
  async signMessage(message, signatureType, accountIdx, subaddressIdx) {
    return this._invokeWorker("signMessage", Array.from(arguments));
  }
  
  async verifyMessage(message, address, signature) {
    return new MoneroMessageSignatureResult(await this._invokeWorker("verifyMessage", Array.from(arguments)));
  }
  
  async getTxKey(txHash) {
    return this._invokeWorker("getTxKey", Array.from(arguments));
  }
  
  async checkTxKey(txHash, txKey, address) {
    return new MoneroCheckTx(await this._invokeWorker("checkTxKey", Array.from(arguments)));
  }
  
  async getTxProof(txHash, address, message) {
    return this._invokeWorker("getTxProof", Array.from(arguments));
  }
  
  async checkTxProof(txHash, address, message, signature) {
    return new MoneroCheckTx(await this._invokeWorker("checkTxProof", Array.from(arguments)));
  }
  
  async getSpendProof(txHash, message) {
    return this._invokeWorker("getSpendProof", Array.from(arguments));
  }
  
  async checkSpendProof(txHash, message, signature) {
    return this._invokeWorker("checkSpendProof", Array.from(arguments));
  }
  
  async getReserveProofWallet(message) {
    return this._invokeWorker("getReserveProofWallet", Array.from(arguments));
  }
  
  async getReserveProofAccount(accountIdx, amount, message) {
    return this._invokeWorker("getReserveProofAccount", Array.from(arguments));
  }

  async checkReserveProof(address, message, signature) {
    return new MoneroCheckReserve(await this._invokeWorker("checkReserveProof", Array.from(arguments)));
  }
  
  async getTxNotes(txHashes) {
    return this._invokeWorker("getTxNotes", Array.from(arguments));
  }
  
  async setTxNotes(txHashes, notes) {
    return this._invokeWorker("setTxNotes", Array.from(arguments));
  }
  
  async getAddressBookEntries(entryIndices) {
    if (!entryIndices) entryIndices = [];
    let entries = [];
    for (let entryJson of await this._invokeWorker("getAddressBookEntries", Array.from(arguments))) {
      entries.push(new MoneroAddressBookEntry(entryJson));
    }
    return entries;
  }
  
  async addAddressBookEntry(address, description) {
    return this._invokeWorker("addAddressBookEntry", Array.from(arguments));
  }
  
  async editAddressBookEntry(index, setAddress, address, setDescription, description) {
    return this._invokeWorker("editAddressBookEntry", Array.from(arguments));
  }
  
  async deleteAddressBookEntry(entryIdx) {
    return this._invokeWorker("deleteAddressBookEntry", Array.from(arguments));
  }
  
  async tagAccounts(tag, accountIndices) {
    return this._invokeWorker("tagAccounts", Array.from(arguments));
  }

  async untagAccounts(accountIndices) {
    return this._invokeWorker("untagAccounts", Array.from(arguments));
  }
  
  async getAccountTags() {
    return this._invokeWorker("getAccountTags", Array.from(arguments));
  }

  async setAccountTagLabel(tag, label) {
    return this._invokeWorker("setAccountTagLabel", Array.from(arguments));
  }
  
  async createPaymentUri(config) {
    config = MoneroWallet._normalizeCreateTxsConfig(config);
    return this._invokeWorker("createPaymentUri", [config.toJson()]);
  }
  
  async parsePaymentUri(uri) {
    return new MoneroTxConfig(await this._invokeWorker("parsePaymentUri", Array.from(arguments)));
  }
  
  async getAttribute(key) {
    return this._invokeWorker("getAttribute", Array.from(arguments));
  }
  
  async setAttribute(key, val) {
    return this._invokeWorker("setAttribute", Array.from(arguments));
  }
  
  async startMining(numThreads, backgroundMining, ignoreBattery) {
    return this._invokeWorker("startMining", Array.from(arguments));
  }
  
  async stopMining() {
    return this._invokeWorker("stopMining", Array.from(arguments));
  }
  
  async isMultisigImportNeeded() {
    return this._invokeWorker("isMultisigImportNeeded");
  }
  
  async isMultisig() {
    return this._invokeWorker("isMultisig");
  }
  
  async getMultisigInfo() {
    return new MoneroMultisigInfo(await this._invokeWorker("getMultisigInfo"));
  }
  
  async prepareMultisig() {
    return this._invokeWorker("prepareMultisig");
  }
  
  async makeMultisig(multisigHexes, threshold, password) {
    return new MoneroMultisigInitResult(await this._invokeWorker("makeMultisig", Array.from(arguments)));
  }
  
  async exchangeMultisigKeys(multisigHexes, password) {
    return new MoneroMultisigInitResult(await this._invokeWorker("exchangeMultisigKeys", Array.from(arguments)));
  }
  
  async getMultisigHex() {
    return this._invokeWorker("getMultisigHex");
  }
  
  async importMultisigHex(multisigHexes) {
    return this._invokeWorker("importMultisigHex", Array.from(arguments));
  }
  
  async signMultisigTxHex(multisigTxHex) {
    return new MoneroMultisigSignResult(await this._invokeWorker("signMultisigTxHex", Array.from(arguments)));
  }
  
  async submitMultisigTxHex(signedMultisigTxHex) {
    return this._invokeWorker("submitMultisigTxHex", Array.from(arguments));
  }
  
  async getData() {
    return this._invokeWorker("getData");
  }
  
  async moveTo(path) {
    return MoneroWalletFull._moveTo(path, this);
  }
  
  async save() {
    return MoneroWalletFull._save(this);
  }
  
  async close(save) {
    if (save) await this.save();
    while (this._wrappedListeners.length) await this.removeListener(this._wrappedListeners[0].getListener());
    await this._invokeWorker("close");
    delete LibraryUtils.WORKER_OBJECTS[this._walletId];
  }
  
  async isClosed() {
    return this._invokeWorker("isClosed");
  }
  
  // --------------------------- PRIVATE HELPERS ------------------------------
  
  async _invokeWorker(fnName, args) {
    return LibraryUtils.invokeWorker(this._walletId, fnName, args);
  }
}

/**
 * Internal listener to bridge notifications to external listeners.
 * 
 * @private
 */
class WalletWorkerListener {
  
  constructor(listener) {
    this._id = GenUtils.getUUID();
    this._listener = listener;
  }
  
  getId() {
    return this._id;
  }
  
  getListener() {
    return this._listener;
  }
  
  onSyncProgress(height, startHeight, endHeight, percentDone, message) {
    this._listener.onSyncProgress(height, startHeight, endHeight, percentDone, message);
  }

  async onNewBlock(height) {
    await this._listener.onNewBlock(height);
  }
  
  async onBalancesChanged(newBalanceStr, newUnlockedBalanceStr) {
    await this._listener.onBalancesChanged(BigInteger.parse(newBalanceStr), BigInteger.parse(newUnlockedBalanceStr));
  }

  async onOutputReceived(blockJson) {
    let block = new MoneroBlock(blockJson, MoneroBlock.DeserializationType.TX_WALLET);
    await this._listener.onOutputReceived(block.getTxs()[0].getOutputs()[0]);
  }
  
  async onOutputSpent(blockJson) {
    let block = new MoneroBlock(blockJson, MoneroBlock.DeserializationType.TX_WALLET);
    await this._listener.onOutputSpent(block.getTxs()[0].getInputs()[0]);
  }
}

MoneroWalletFull.DEFAULT_SYNC_PERIOD_IN_MS = 10000; // 10 second sync period by default

module.exports = MoneroWalletFull;