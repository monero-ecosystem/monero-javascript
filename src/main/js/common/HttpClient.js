const MoneroUtils = require("./MoneroUtils");
const PromiseThrottle = require("promise-throttle");
const Request = require("request-promise");

/**
 * Handle HTTP requests with a uniform interface.
 * 
 * @hideconstructor
 */
class HttpClient {
  
  /**
   * <p>Make a HTTP request.<p>
   * 
   * @param {object} request - configures the request to make
   * @param {string} request.method - HTTP method ("GET", "PUT", "POST", "DELETE", etc)
   * @param {string} request.uri - uri to request
   * @param {string|object|Uint8Array} request.body - request body
   * @param {string} request.username - username to authenticate the request (optional)
   * @param {string} request.password - password to authenticate the request (optional)
   * @param {object} request.headers - headers to add to the request (optional)
   * @param {string} request.requestApi - one of "fetch" or "xhr" (default "fetch")
   * @param {boolean} request.resolveWithFullResponse - return full response if true, else body only (default false)
   * @param {boolean} request.rejectUnauthorized - whether or not to reject self-signed certificates (default true)
   * @returns {object} response - the response object
   * @returns {string|object|Uint8Array} response.body - the response body
   * @returns {number} response.statusCode - the response code
   * @returns {number} response.statusText - the response message
   * @returns {object} response.headers - the response headers
   */
  static async request(request) {
    
    // assign defaults
    request = Object.assign(HttpClient.DEFAULT_REQUEST, request);
    
    // validate request
    try { new URL(request.uri); } catch (e) { throw new Error("Invalid request URL: " + request.uri); }
    if (request.body && !(typeof request.body === "string" || typeof request.body === "object")) {
      throw new Error("Request body type is not string or object");
    }
    
    // initialize promise throttle one time
    if (!HttpClient.PROMISE_THROTTLE) {
      HttpClient.PROMISE_THROTTLE = new PromiseThrottle({
        requestsPerSecond: MoneroUtils.MAX_REQUESTS_PER_SECOND,
        promiseImplementation: Promise
      });
    }
    
    // request using fetch or xhr
    return request.requestApi === "fetch" ? HttpClient._requestFetch(request) : HttpClient._requestXhr(request);
  }
  
  // ----------------------------- PRIVATE HELPERS ----------------------------
  
  static async _requestFetch(req) {
    
    // build request options
    let opts = {
      method: req.method,
      uri: req.uri,
      body: req.body,
      agent: req.uri.startsWith("https") ? HttpClient._getHttpsAgent() : HttpClient._getHttpAgent(),
      rejectUnauthorized: req.rejectUnauthorized,
      resolveWithFullResponse: req.resolveWithFullResponse,
      requestCert: true // TODO: part of config?
    };
    if (req.username) {
      opts.forever = true;
      opts.auth = {
        user: req.username,
        pass: req.password,
        sendImmediately: false
      }
    }
    if (req.body instanceof Uint8Array) opts.encoding = null;
    
    // queue and throttle request to execute in serial and rate limited
    let resp = await HttpClient._queueTask(async function() {
      return HttpClient.PROMISE_THROTTLE.add(function(opts) { return Request(opts); }.bind(this, opts));
    });
    
    // normalize response
    let normalizedResponse = {};
    if (req.resolveWithFullResponse) {
      normalizedResponse.statusCode = resp.statusCode;
      normalizedResponse.statusText = resp.statusMessage;
      normalizedResponse.headers = resp.headers;
      normalizedResponse.body = resp.body;
    } else {
      normalizedResponse.body = resp;
    }
    return normalizedResponse;
  }
  
  static async _requestXhr(req) {
    if (req.headers) throw new Error("Custom headers not implemented in XHR request");  // TODO
    
    // collect params from request which change on await
    let method = req.method;
    let uri = req.uri;
    let username = req.username;
    let password = req.password;
    let body = req.body;
    let isBinary = body instanceof Uint8Array;
    
    // queue and throttle request to execute in serial and rate limited
    let resp = await HttpClient._queueTask(async function() {
      return HttpClient.PROMISE_THROTTLE.add(function() {
        return new Promise(function(resolve, reject) {
          let digestAuthRequest = new HttpClient.digestAuthRequest(method, uri, username, password);
          digestAuthRequest.request(function(resp) {
            resolve(resp);
          }, function(resp) {
            if (resp.status) resolve(resp);
            else reject(new Error("Request failed without response: " + method + " " + uri));
          }, body);
        });
      }.bind(this));
    });
    
    // normalize response
    let normalizedResponse = {};
    normalizedResponse.statusCode = resp.status;
    normalizedResponse.statusText = resp.statusText;
    normalizedResponse.headers = HttpClient._parseXhrResponseHeaders(resp.getAllResponseHeaders());
    normalizedResponse.body = isBinary ? new Uint8Array(resp.response) : resp.response;
    if (normalizedResponse.body instanceof ArrayBuffer) normalizedResponse.body = new Uint8Array(normalizedResponse.body);  // handle empty binary request
    return normalizedResponse;
  }
  
  /**
   * Executes given tasks serially (first in, first out).
   * 
   * @param {function} asyncFn is an asynchronous function to execute after previously given tasks
   */
  static async _queueTask(asyncFn) {
    
    // initialize task queue one time
    if (!HttpClient.TASK_QUEUE) {
      const async = require("async");
      HttpClient.TASK_QUEUE = async.queue(function(asyncFn, callback) {
        if (asyncFn.then) asyncFn.then(resp => { callback(resp); }).catch(err => { callback(undefined, err); });
        else asyncFn().then(resp => { callback(resp); }).catch(err => { callback(undefined, err); });
      }, 1);
    }
    
    // return promise which resolves when task is executed
    return new Promise(function(resolve, reject) {
      HttpClient.TASK_QUEUE.push(asyncFn, function(resp, err) {
        if (err !== undefined) reject(err);
        else resolve(resp);
      });
    });
  }
  
  /**
   * Get a singleton instance of an HTTP client to share.
   * 
   * @return {http.Agent} a shared agent for network requests among library instances
   */
  static _getHttpAgent() {
    if (!HttpClient.HTTP_AGENT) {
      let http = require('http');
      HttpClient.HTTP_AGENT = new http.Agent({keepAlive: true});
    }
    return HttpClient.HTTP_AGENT;
  }
  
  /**
   * Get a singleton instance of an HTTPS client to share.
   * 
   * @return {https.Agent} a shared agent for network requests among library instances
   */
  static _getHttpsAgent() {
    if (!HttpClient.HTTPS_AGENT) {
      let https = require('https');
      HttpClient.HTTPS_AGENT = new https.Agent({keepAlive: true});
    }
    return HttpClient.HTTPS_AGENT;
  }
  
  
  static _parseXhrResponseHeaders(headersStr) {
    let headerMap = {};
    let headers = headersStr.trim().split(/[\r\n]+/);
    for (let header of headers) {
      let headerVals = header.split(": ");
      headerMap[headerVals[0]] = headerVals[1];
    }
    return headerMap;
  }
}

// default request config
HttpClient.DEFAULT_REQUEST = {
  method: "GET",
  requestApi: "fetch",
  resolveWithFullResponse: false,
  rejectUnauthorized: true
}

/**
 * Modification of digest auth request by @inorganik.
 * 
 * Dependent on CryptoJS MD5 hashing: http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/md5.js
 * 
 * MIT licensed.
 */
HttpClient.digestAuthRequest = function(method, url, username, password) {
  var self = this;

  if (typeof CryptoJS === 'undefined' && typeof require === 'function') {
    var CryptoJS = require('crypto-js');
  }

  this.scheme = null; // we just echo the scheme, to allow for 'Digest', 'X-Digest', 'JDigest' etc
  this.nonce = null; // server issued nonce
  this.realm = null; // server issued realm
  this.qop = null; // "quality of protection" - '' or 'auth' or 'auth-int'
  this.response = null; // hashed response to server challenge
  this.opaque = null; // hashed response to server challenge
  this.nc = 1; // nonce count - increments with each request used with the same nonce
  this.cnonce = null; // client nonce

  // settings
  this.timeout = 60000; // timeout
  this.loggingOn = false; // toggle console logging

  // determine if a post, so that request will send data
  this.post = false;
  if (method.toLowerCase() === 'post' || method.toLowerCase() === 'put') {
    this.post = true;
  }

  // start here
  // successFn - will be passed JSON data
  // errorFn - will be passed the failed authenticatedRequest
  // data - optional, for POSTS
  this.request = function(successFn, errorFn, data) {
    
    // stringify json
    if (data) {
      try {
        self.data = data instanceof Uint8Array || typeof data === "string" ? data : JSON.stringify(data);
      } catch (e) {
        console.error(e);
        throw e;
      }
    }
    self.successFn = successFn;
    self.errorFn = errorFn;

    if (!self.nonce) {
      self.makeUnauthenticatedRequest(self.data);
    } else {
      self.makeAuthenticatedRequest();
    }
  }
  this.makeUnauthenticatedRequest = function(data) {
    self.firstRequest = new XMLHttpRequest();
    self.firstRequest.open(method, url, true);
    self.firstRequest.timeout = self.timeout;
    // if we are posting, add appropriate headers
    if (self.post && data) {
      if (typeof data === "string") {
        self.firstRequest.setRequestHeader('Content-type', 'text/plain');
      } else {
        self.firstRequest.responseType = "arraybuffer";
      }
    }

    self.firstRequest.onreadystatechange = function() {

      // 2: received headers,  3: loading, 4: done
      if (self.firstRequest.readyState === 2) {

        var responseHeaders = self.firstRequest.getAllResponseHeaders();
        responseHeaders = responseHeaders.split('\n');
        // get authenticate header
        var digestHeaders;
        for(var i = 0; i < responseHeaders.length; i++) {
          if (responseHeaders[i].match(/www-authenticate/i) != null) {
            digestHeaders = responseHeaders[i];
          }
        }

        if (digestHeaders != null) {
          // parse auth header and get digest auth keys
          digestHeaders = digestHeaders.slice(digestHeaders.indexOf(':') + 1, -1);
          digestHeaders = digestHeaders.split(',');
          self.scheme = digestHeaders[0].split(/\s/)[1];
          for (var i = 0; i < digestHeaders.length; i++) {
            var equalIndex = digestHeaders[i].indexOf('='),
              key = digestHeaders[i].substring(0, equalIndex),
              val = digestHeaders[i].substring(equalIndex + 1);
            val = val.replace(/['"]+/g, '');
            // find realm
            if (key.match(/realm/i) != null) {
              self.realm = val;
            }
            // find nonce
            if (key.match(/nonce/i) != null) {
              self.nonce = val;
            }
            // find opaque
            if (key.match(/opaque/i) != null) {
              self.opaque = val;
            }
            // find QOP
            if (key.match(/qop/i) != null) {
              self.qop = val;
            }
          }
          // client generated keys
          self.cnonce = self.generateCnonce();
          self.nc++;
          // if logging, show headers received:
          self.log('received headers:');
          self.log('  realm: '+self.realm);
          self.log('  nonce: '+self.nonce);
          self.log('  opaque: '+self.opaque);
          self.log('  qop: '+self.qop);
          // now we can make an authenticated request
          self.makeAuthenticatedRequest();
        }
      }
      if (self.firstRequest.readyState === 4) {
        if (self.firstRequest.status === 200) {
          self.log('Authentication not required for '+url);
          if (data instanceof Uint8Array) {
            console.log("BINARY RESPONSE 1");
            self.successFn(self.firstRequest);
          } else {
            if (self.firstRequest.responseText !== 'undefined') {
              if (self.firstRequest.responseText.length > 0) {
                // If JSON, parse and return object
                if (self.isJson(self.firstRequest.responseText)) {  // TODO: redundant
                  self.successFn(self.firstRequest);
                } else {
                  self.successFn(self.firstRequest);
                }
              }
            } else {
              self.successFn();
            }
          }
        }
      }
    }
    // send
    if (self.post) {
      // in case digest auth not required
      self.firstRequest.send(self.data);
    } else {
      self.firstRequest.send();
    }
    self.log('Unauthenticated request to '+url);

    // handle error
    self.firstRequest.onerror = function() {
      if (self.firstRequest.status !== 401) {
        self.log('Error ('+self.firstRequest.status+') on unauthenticated request to '+url);
        self.errorFn(self.firstRequest);
      }
    }
  }
  this.makeAuthenticatedRequest= function() {

    self.response = self.formulateResponse();
    self.authenticatedRequest = new XMLHttpRequest();
    self.authenticatedRequest.open(method, url, true);
    self.authenticatedRequest.timeout = self.timeout;
    var digestAuthHeader = self.scheme+' '+
      'username="'+username+'", '+
      'realm="'+self.realm+'", '+
      'nonce="'+self.nonce+'", '+
      'uri="'+url+'", '+
      'response="'+self.response+'", '+
      'opaque="'+self.opaque+'", '+
      'qop='+self.qop+', '+
      'nc='+('00000000' + self.nc).slice(-8)+', '+
      'cnonce="'+self.cnonce+'"';
    self.authenticatedRequest.setRequestHeader('Authorization', digestAuthHeader);
    self.log('digest auth header response to be sent:');
    self.log(digestAuthHeader);
    // if we are posting, add appropriate headers
    if (self.post && self.data) {
      if (typeof self.data === "string") {
        self.authenticatedRequest.setRequestHeader('Content-type', 'text/plain');
      } else {
        self.authenticatedRequest.responseType = "arraybuffer";        
      }
    }
    self.authenticatedRequest.onload = function() {
      // success
      if (self.authenticatedRequest.status >= 200 && self.authenticatedRequest.status < 400) {
        // increment nonce count
        self.nc++;
        // return data
        if (self.data instanceof Uint8Array) {
          self.successFn(self.authenticatedRequest);
        } else {
          if (self.authenticatedRequest.responseText !== 'undefined' && self.authenticatedRequest.responseText.length > 0 ) {
            // If JSON, parse and return object
            if (self.isJson(self.authenticatedRequest.responseText)) {  // TODO: redundant from not parsing
              self.successFn(self.authenticatedRequest);
            } else {
              self.successFn(self.authenticatedRequest);
            }
          } else {
           self.successFn();
          }
        }
      }
      // failure
      else {
        self.nonce = null;
        self.errorFn(self.authenticatedRequest);
      }
    }
    // handle errors
    self.authenticatedRequest.onerror = function() {
      self.log('Error ('+self.authenticatedRequest.status+') on authenticated request to '+url);
      self.nonce = null;
      self.errorFn(self.authenticatedRequest);
    };
    // send
    if (self.post) {
      self.authenticatedRequest.send(self.data);
    } else {
      self.authenticatedRequest.send();
    }
    self.log('Authenticated request to '+url);
  }
  // hash response based on server challenge
  this.formulateResponse = function() {
    var HA1 = CryptoJS.MD5(username+':'+self.realm+':'+password).toString();
    var HA2 = CryptoJS.MD5(method+':'+url).toString();
    var response = CryptoJS.MD5(HA1+':'+
      self.nonce+':'+
      ('00000000' + self.nc).slice(-8)+':'+
      self.cnonce+':'+
      self.qop+':'+
      HA2).toString();
    return response;
  }
  // generate 16 char client nonce
  this.generateCnonce = function() {
    var characters = 'abcdef0123456789';
    var token = '';
    for (var i = 0; i < 16; i++) {
      var randNum = Math.round(Math.random() * characters.length);
      token += characters.substr(randNum, 1);
    }
    return token;
  }
  this.abort = function() {
    self.log('[digestAuthRequest] Aborted request to '+url);
    if (self.firstRequest != null) {
      if (self.firstRequest.readyState != 4) self.firstRequest.abort();
    }
    if (self.authenticatedRequest != null) {
      if (self.authenticatedRequest.readyState != 4) self.authenticatedRequest.abort();
    }
  }
  this.isJson = function(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }
  this.log = function(str) {
    if (self.loggingOn) {
      console.log('[digestAuthRequest] '+str);
    }
  }
  this.version = function() { return '0.8.0' }
}

module.exports = HttpClient;