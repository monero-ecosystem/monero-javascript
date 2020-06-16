const assert = require("assert");
const monerojs = require("../../index");
const MoneroUtils = monerojs.MoneroUtils;
const LibraryUtils = monerojs.LibraryUtils;

/**
 * Test utilities including those implemented in WebAssembly.
 */
class TestMoneroUtils {
  
  runTests() {
    describe("TEST MONERO UTILITIES", function() {
      
      // initialize utils to test
      before(async function() {
        await LibraryUtils.loadKeysModule();
      });
      
      describe("Binary Serialization", function() {
        
        it("Can serialize heights with small numbers", function() {
          let json = { heights: [111, 222, 333] };
          let binary = MoneroUtils.jsonToBinary(json);
          assert(binary);
          let json2 = MoneroUtils.binaryToJson(binary);
          assert.deepEqual(json2, json);
        });
        
        it("Can serialize heights with big numbers", function() {
          let json = { heights: [123456, 1234567, 870987] };
          let binary = MoneroUtils.jsonToBinary(json);
          assert(binary);
          let json2 = MoneroUtils.binaryToJson(binary);
          assert.deepEqual(json2, json);
        });
        
        it("Can serialize json with text", function() {
          let json = { msg: 'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!' };
          let binary = MoneroUtils.jsonToBinary(json);
          assert(binary);
          let json2 = MoneroUtils.binaryToJson(binary);
          assert.deepEqual(json2, json);
        });
        
        it("Can serialize json with long text", function() {
          let json = { msg: 'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' +
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n' + 
              'Hello there my good man lets make a nice long text to test with lots of exclamation marks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n'};
          let binary = MoneroUtils.jsonToBinary(json);
          assert(binary);
          let json2 = MoneroUtils.binaryToJson(binary);
          assert.deepEqual(json2, json);
        });
      });
    });
  }
}

module.exports = TestMoneroUtils;