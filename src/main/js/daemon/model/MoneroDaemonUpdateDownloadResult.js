const MoneroDaemonUpdateCheckResult = require("./MoneroDaemonUpdateCheckResult");

/**
 * Models the result of downloading an update.
 */
class MoneroDaemonUpdateDownloadResult extends MoneroDaemonUpdateCheckResult {
  
  /**
   * Construct a download result.
   * 
   * @param {MoneroDaemonUpdateCheckResult} is an existing result to copy from
   */
  constructor(result) {
    super(result);
  }
  
  /**
   * Get the path the update was downloaded to.
   * 
   * @return {string} is the path the update was downloaded to
   */
  getDownloadPath() {
    return this.state.downloadPath;
  }
  
  setDownloadPath(downloadPath) {
    this.state.downloadPath = downloadPath;
    return this;
  }
}

module.exports = MoneroDaemonUpdateDownloadResult;