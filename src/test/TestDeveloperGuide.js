const assert = require("assert");
const TestUtils = require("./utils/TestUtils");
const BigInteger = require("../main/js/common/biginteger").BigInteger;
const monerojs = require("monero-javascript");
const MoneroWalletWasm = monerojs.MoneroWalletWasm;

/**
 * Test the code in the developer guide.
 */
class TestDeveloperGuide {
  
  runTests() {
    describe("Test developer guide", function() {
      let that = this;
      let wallet;
      
      // initialize wallet
      before(async function() {
        try {
          wallet = await TestUtils.getWalletWasm();
        } catch (e) {
          console.log(e);
        }
      });
      
      // save wallet
      after(async function() {
        await wallet.close(true);
      });
      
      it("Test developer guide transaction queries", async function() {
        
        // get a transaction by hash
        let tx = await wallet.getTx("48db7afb1e9eecb11303d4f49c955ffdee2ffc2fa513b8f05da35ff537744096");
        
        // get unconfirmed transactions
        let txs = await wallet.getTxs({
          isConfirmed: false
        });
        for (let tx of txs) {
          assert(!tx.isConfirmed());
        }
        
        // get transactions since height 582106 with incoming transfers to
        // account 0, subaddress 0
        txs = await wallet.getTxs({
          minHeight: 582106,
          transferQuery: {
            isIncoming: true,
            accountIndex: 0,
            subaddressIndex: 1
          }
        });
        for (let tx of txs) {
          assert(tx.isConfirmed());
          assert(tx.getHeight() >= 582106)
          let found = false;
          for (let transfer of tx.getTransfers()) {
            if (transfer.isIncoming() && transfer.getAccountIndex() === 0 && transfer.getSubaddressIndex() === 1) {
              found = true;
              break;
            }
          }
          assert(found);
        }
        
        // get transactions with available outputs
        txs = await wallet.getTxs({
          isLocked: false,
          outputQuery: {
            isSpent: false,
          }
        });
        for (let tx of txs) {
          assert(!tx.isLocked());
          assert(tx.getOutputs().length > 0);
          let found = false;
          for (let output of tx.getOutputs()) {
            if (!output.isSpent()) {
              found = true;
              break;
            }
          }
          if (!found) {
            console.log(tx.getOutputs());
          }
          assert(found);
        }
      });
      
      it("Test developer guide transfer queries", async function() {
        
        // get all transfers
        let transfers = await wallet.getTransfers();
        
        // get incoming transfers to account 0, subaddress 1
        transfers = await wallet.getTransfers({
          isIncoming: true,
          accountIndex: 0,
          subaddressIndex: 1
        });
        for (let transfer of transfers) {
          assert.equal(transfer.isIncoming(), true);
          assert.equal(transfer.getAccountIndex(), 0);
          assert.equal(transfer.getSubaddressIndex(), 1);
        }
        
        // get transfers in the tx pool
        transfers = await wallet.getTransfers({
          txQuery: {
            inTxPool: true
          }
        });
        for (let transfer of transfers) {
          assert.equal(transfer.getTx().inTxPool(), true);
        }
        
        // get confirmed outgoing transfers since a block height
        transfers = await wallet.getTransfers({
          isOutgoing: true,
          txQuery: {
            isConfirmed: true,
            minHeight: 582106,
          }
        });
        assert(transfers.length > 0);
        for (let transfer of transfers) {
          assert(transfer.isOutgoing());
          assert(transfer.getTx().isConfirmed());
          assert(transfer.getTx().getHeight() >= 582106);
        }
      });
      
      it("Test developer guide output queries", async function() {
        
        // get all outputs
        let outputs = await wallet.getOutputs();
        assert(outputs.length > 0);
        
        // get outputs available to be spent
        outputs = await wallet.getOutputs({
          isSpent: false,
          txQuery: {
            isLocked: false
          }
        });
        assert(outputs.length > 0);
        for (let output of outputs) {
          assert(!output.isSpent());
          assert(!output.getTx().isLocked());
        }
        
        // get outputs received to a specific subaddress
        outputs = await wallet.getOutputs({
          accountIndex: 0,
          subaddressIndex: 1
        });
        assert(outputs.length > 0);
        for (let output of outputs) {
          assert.equal(output.getAccountIndex(), 0);
          assert.equal(output.getSubaddressIndex(), 1);
        }
        
        // get output by key image
        let keyImage = outputs[0].getKeyImage().getHex();
        outputs = await wallet.getOutputs({
          keyImage: keyImage
        });
        assert.equal(outputs.length, 1);
        assert.equal(outputs[0].getKeyImage().getHex(), keyImage);
      });
      
      it("Test developer guide send funds", async function() {
        
        // create in-memory test wallet with randomly generated mnemonic
        let wallet = await MoneroWalletWasm.createWallet({
          password: "abctesting123",
          networkType: "stagenet",
          serverUri: "http://localhost:38081",
          serverUsername: "superuser",
          serverPassword: "abctesting123"
        });
        
        try {
          // create a transaction to send funds to an address, but do not relay
          let tx = await wallet.createTx({
            accountIndex: 0,  // source account to send funds from
            address: "55bcxMRhBWea6xxsot8moF1rdPprjJR2x4mfnNnTGgBJFgXa4gWXmWAYdUBKiRcJxy9AUAGJEg28DejvWdJU2VgUDrUvCHG",
            amount: new BigInteger("1000000000000") // send 1 XMR (denominated in atomic units)
          });
          
          // can confirm with the user
          let fee = tx.getFee();  // "Are you sure you want to send... ?"
          
          // relay the transaction
          let hash = await wallet.relayTx(tx);
        } catch (e) {
          assert.equal(e.message, "not enough money");
        }
        
        try {
          // send funds to a single destination
          let tx = await wallet.createTx({
            accountIndex: 0,  // source account to send funds from
            address: "55bcxMRhBWea6xxsot8moF1rdPprjJR2x4mfnNnTGgBJFgXa4gWXmWAYdUBKiRcJxy9AUAGJEg28DejvWdJU2VgUDrUvCHG",
            amount: new BigInteger("1000000000000"), // send 1 XMR (denominated in atomic units)
            relay: true // relay the transaction to the network
          });
        } catch (e) {
          assert.equal(e.message, "not enough money");
        }
        
        try {
          // send funds from a specific subaddress to multiple destinations,
          // allowing transfers to be split across multiple transactions if needed
          let txs = await wallet.createTxs({
            accountIndex: 0,    // source account to send funds from
            subaddressIndex: 1, // source subaddress to send funds from
            destinations: [{
                address: "55bcxMRhBWea6xxsot8moF1rdPprjJR2x4mfnNnTGgBJFgXa4gWXmWAYdUBKiRcJxy9AUAGJEg28DejvWdJU2VgUDrUvCHG",
                amount: new BigInteger("500000000000"), // send 0.5 XMR (denominated in atomic units)
              }, {
                address: "52f7hei1UMrbvYUNtDMKZJMQjcfVyufYnezER8wVK271VmGbzE2kN7cMMG6qFjrb6Ub6qPkNt815a98kJmo874qG9GYZKD5",
                amount: new BigInteger("500000000000"), // send 0.5 XMR (denominated in atomic units)
              }],
            priority: MoneroTxPriority.IMPORTANT,
            relay: true // relay the transaction to the network
          });
        } catch (e) {
          assert.equal(e.message, "not enough money");
        }
        
        try {
          // sweep an output
          let tx = await wallet.sweepOutput({
            address: "55bcxMRhBWea6xxsot8moF1rdPprjJR2x4mfnNnTGgBJFgXa4gWXmWAYdUBKiRcJxy9AUAGJEg28DejvWdJU2VgUDrUvCHG",
            keyImage: "b7afd6afbb1615c98b1c0350b81c98a77d6d4fc0ab92020d25fd76aca0914f1e",
            relay: true
          });
        } catch (e) {
          assert.equal(e.message, "No outputs found");
        }
        
        try {
          // sweep all unlocked funds in a wallet
          let txs = await wallet.sweepUnlocked({
            address: "55bcxMRhBWea6xxsot8moF1rdPprjJR2x4mfnNnTGgBJFgXa4gWXmWAYdUBKiRcJxy9AUAGJEg28DejvWdJU2VgUDrUvCHG",
            relay: true
          });
        } catch (e) {
          assert.equal(e.message, "No unlocked balance in the entire wallet");
        }
        
        try {
          // sweep unlocked funds in an account
          let txs = await wallet.sweepUnlocked({
            accountIndex: 0,
            address: "55bcxMRhBWea6xxsot8moF1rdPprjJR2x4mfnNnTGgBJFgXa4gWXmWAYdUBKiRcJxy9AUAGJEg28DejvWdJU2VgUDrUvCHG",
            relay: true
          });
        } catch (e) {
          assert.equal(e.message, "No unlocked balance in the entire wallet");
        }
        
        try {
          // sweep unlocked funds in a subaddress
          let txs = await wallet.sweepUnlocked({
            accountIndex: 0,
            subaddressIndex: 0,
            address: "55bcxMRhBWea6xxsot8moF1rdPprjJR2x4mfnNnTGgBJFgXa4gWXmWAYdUBKiRcJxy9AUAGJEg28DejvWdJU2VgUDrUvCHG",
            relay: true
          });
        } catch (e) {
          assert.equal(e.message, "No unlocked balance in the entire wallet");
        }
      });
    });
  }
}

module.exports = TestDeveloperGuide;