// import test types
const TestSampleCode = require("./TestSampleCode");
const TestMoneroUtils = require("./TestMoneroUtils");
const TestMoneroDaemonRpc = require("./TestMoneroDaemonRpc");
const TestMoneroWalletKeys = require("./TestMoneroWalletKeys");
const TestMoneroWalletWasm = require("./TestMoneroWalletWasm");
const TestMoneroWalletRpc = require("./TestMoneroWalletRpc");
const TestDeveloperGuide = require("./TestDeveloperGuide");

// test sample code for readme
new TestSampleCode().runTests();

// test utilitiles
new TestMoneroUtils().runTests();

// test daemon rpc
new TestMoneroDaemonRpc({
  liteMode: false,  // skip lengthy but thorough tests if true
  testNonRelays: true,
  testRelays: true, // creates and relays outgoing txs
  testNotifications: true
}).runTests();

// test keys-only wallet
new TestMoneroWalletKeys({
  liteMode: false,
  testNonRelays: true,
  testRelays: false,
  testResets: false,
  testNotifications: false
}).runTests();

// test wasm wallet
new TestMoneroWalletWasm({
  liteMode: false,
  testNonRelays: true,
  testRelays: true,
  testResets: false,
  testNotifications: true
}).runTests();

// test wallet rpc
new TestMoneroWalletRpc({
  liteMode: false,
  testNonRelays: true,
  testRelays: true,
  testNotifications: false,
  testResets: false
}).runTests();

// test queries for developer guide
new TestDeveloperGuide().runTests();

// test scratchpad
require("./Scratchpad");