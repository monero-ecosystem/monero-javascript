const GenUtils = require("./GenUtils");
const HttpClient = require("./HttpClient");
const LibraryUtils = require("./LibraryUtils");
const MoneroError = require("../common/MoneroError");
const MoneroRpcError = require("../common/MoneroRpcError");
const MoneroUtils = require("./MoneroUtils");

/**
 * Maintains a connection and sends requests to a Monero RPC API.
 */
class MoneroRpcConnection {
  
  /**
   * <p>Construct a RPC connection.</p>
   * 
   * <p>Examples:</p>
   * 
   * <code>
   * let connection1 = new MoneroRpcConnection("http://localhost:38081", "daemon_user", "daemon_password_123")<br><br>
   * 
   * let connection2 = new MoneroRpcConnection({<br>
   * &nbsp;&nbsp; uri: http://localhost:38081,<br>
   * &nbsp;&nbsp; username: "daemon_user",<br>
   * &nbsp;&nbsp; password: "daemon_password_123",<br>
   * &nbsp;&nbsp; rejectUnauthorized: false // accept self-signed certificates e.g. for local development<br>
   * });
   * </code>
   * 
   * @param {string|object|MoneroRpcConnection} uriOrConfigOrConnection - RPC endpoint URI, MoneroRpcConnection, or equivalent JS object
   * @param {string} uriOrConfigOrConnection.uri - URI of the RPC endpoint
   * @param {string} uriOrConfigOrConnection.username - username to authenticate with the RPC endpoint (optional)
   * @param {string} uriOrConfigOrConnection.password - password to authenticate with the RPC endpoint (optional)
   * @param {boolean} uriOrConfigOrConnection.rejectUnauthorized - rejects self-signed certificates if true (default true)
   * @param {string} username - username to authenticate with the RPC endpoint (optional)
   * @param {string} password - password to authenticate with the RPC endpoint (optional)
   * @param {boolean} rejectUnauthorized - reject self-signed certificates if true (default true)
   */
  constructor(uriOrConfigOrConnection, username, password, rejectUnauthorized) {
    
    // validate and normalize config
    if (typeof uriOrConfigOrConnection === "string") {
      this.config = {uri: uriOrConfigOrConnection};
      if (username !== undefined) this.config.username = username;
      if (password !== undefined) this.config.password = password;
      if (rejectUnauthorized !== undefined) this.config.rejectUnauthorized = rejectUnauthorized;
    } else if (typeof uriOrConfigOrConnection === "object") {
      if (username !== undefined || password !== undefined || rejectUnauthorized !== undefined) throw new MoneroError("Can provide config object or params but not both");
      if (uriOrConfigOrConnection instanceof MoneroRpcConnection) this.config = Object.assign({}, uriOrConfigOrConnection.getConfig());
      else this.config = Object.assign({}, uriOrConfigOrConnection);
    } else if (uriOrConfigOrConnection !== undefined) {
      throw new MoneroError("Invalid configuration to MoneroRpcConnection; must be string or MoneroRpcConnection or equivalent JS object");
    }
    
    // merge default config
    this.config = Object.assign({}, MoneroRpcConnection.DEFAULT_CONFIG, this.config);
    
    // standardize uri
    if (this.config.uri) this.config.uri = this.config.uri.replace(/\/$/, ""); // strip trailing slash
    
    // fail with friendly message if using old api
    if (this.config.user || this.config.pass) throw new MoneroError("Authentication fields 'user' and 'pass' have been renamed to 'username' and 'password'.  Please update to the new api");
  }
  
  getUri() {
    return this.config.uri;
  }
  
  getUsername() {
    return this.config.username;
  }
  
  getPassword() {
    return this.config.password;
  }
  
  getRejectUnauthorized() {
    return this.config.rejectUnauthorized;
  }
  
  getConfig() {
    return this.config;
  }
  
  /**
   * Sends a JSON RPC request.
   * 
   * @param method is the JSON RPC method to invoke
   * @param params are request parameters
   * @return {object} is the response map
   */
  async sendJsonRequest(method, params) {
    
    try {
      // tx config
      let body = JSON.stringify({  // body is stringified so text/plain is returned so BigIntegers are preserved
        id: "0",
        jsonrpc: "2.0",
        method: method,
        params: params
      });
      //console.log("Sending json request with method '" + method + "' and body: " + body);
      let resp = await HttpClient.request({
        method: "POST",
        uri: this.getUri() + '/json_rpc',
        username: this.getUsername(),
        password: this.getPassword(),
        body: body,
        rejectUnauthorized: this.config.rejectUnauthorized,
        requestApi: GenUtils.isFirefox() ? "xhr" : "fetch"  // firefox issue: https://bugzilla.mozilla.org/show_bug.cgi?id=1491010
      });
      
      // process response
      resp = JSON.parse(resp.body.replace(/("[^"]*"\s*:\s*)(\d{16,})/g, '$1"$2"'));  // replace 16 or more digits with strings and parse
      //console.log("Received response: " + JSON.stringify(resp));
      if (resp.error) throw new MoneroRpcError(resp.error.message, resp.error.code, method, params);
      return resp;
    } catch (e) {
      if (e instanceof MoneroRpcError) throw e;
      else throw new MoneroRpcError(e, undefined, method, params);
    }
  }
  
  /**
   * Sends a RPC request to the given path and with the given paramters.
   * 
   * E.g. "/get_transactions" with params
   */
  async sendPathRequest(path, params) {
    //console.log("sendPathRequest(" + path + ", " + JSON.stringify(params) + ")");
    
    try {
      // tx config
      let resp = await HttpClient.request({
        method: "POST",
        uri: this.getUri() + '/' + path,
        username: this.getUsername(),
        password: this.getPassword(),
        body: JSON.stringify(params),  // body is stringified so text/plain is returned so BigIntegers are preserved
        rejectUnauthorized: this.config.rejectUnauthorized,
        requestApi: GenUtils.isFirefox() ? "xhr" : "fetch"
      });
      
      // process response
      resp = JSON.parse(resp.body.replace(/("[^"]*"\s*:\s*)(\d{16,})/g, '$1"$2"'));  // replace 16 or more digits with strings and parse
      if (typeof resp === "string") resp = JSON.parse(resp);  // TODO: some responses returned as strings?
      if (resp.error) throw new MoneroRpcError(resp.error.message, resp.error.code, path, params);
      return resp;
    } catch (e) {
      if (e instanceof MoneroRpcError) throw e;
      else throw new MoneroRpcError(e, undefined, path, params);
    }
  }
  
  /**
   * Sends a binary RPC request.
   * 
   * @param path is the path of the binary RPC method to invoke
   * @paramm params are the request parameters
   * @return a Uint8Array with the binary response
   */
  async sendBinaryRequest(path, params) {
    //console.log("sendBinaryRequest(" + path + ", " + JSON.stringify(params) + ")");
    
    // load wasm module
    await LibraryUtils.loadKeysModule();
    
    // serialize params
    let paramsBin = MoneroUtils.jsonToBinary(params);
    
    try {
      // tx config
      let resp = await HttpClient.request({
        method: "POST",
        uri: this.getUri() + '/' + path,
        username: this.getUsername(),
        password: this.getPassword(),
        body: paramsBin,
        rejectUnauthorized: this.config.rejectUnauthorized,
        requestApi: GenUtils.isFirefox() ? "xhr" : "fetch"
      });
      
      // process response
      resp = resp.body;
      if (!(resp instanceof Uint8Array)) {
        console.error("resp is not uint8array");
        console.error(resp);
      }
      if (resp.error) throw new MoneroRpcError(resp.error.message, resp.error.code, path, params);
      return resp;
    } catch (e) {
      if (e instanceof MoneroRpcError) throw e;
      else throw new MoneroRpcError(e, undefined, path, params);
    }
  }
}


/**
 * Default RPC configuration.
 */
MoneroRpcConnection.DEFAULT_CONFIG = {
    uri: undefined,
    username: undefined,
    password: undefined,
    rejectUnauthorized: true  // reject self-signed certificates if true
}

MoneroRpcConnection.SUPPORTED_FIELDS = ["uri", "username", "password", "rejectUnauthorized"];

module.exports = MoneroRpcConnection;