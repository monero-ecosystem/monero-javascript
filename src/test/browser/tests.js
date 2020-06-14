// import library models
require("monero-javascript");

/**
 * Run tests when document ready.
 */
document.addEventListener("DOMContentLoaded", function() {
  runTests();
});

/**
 * Run Monero tests.
 */
function runTests() {
  
  // mocha setup
  mocha.setup({
    ui: 'bdd',
    timeout: 3000000
  });
  mocha.checkLeaks();
  
  // override default to run daemon and wallets on main thread
  //TestUtils.PROXY_TO_WORKER = false;
  
  // run tests
  require("../TestAll");
  mocha.run();
}