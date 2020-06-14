const assert = require("assert");
const monerojs = require("monero-javascript");
const GenUtils = monerojs.GenUtils;
const MoneroTxQuery = monerojs.MoneroTxQuery;
const MoneroTransferQuery = monerojs.MoneroTransferQuery;
const MoneroOutputQuery = monerojs.MoneroOutputQuery;
const MoneroOutgoingTransfer = monerojs.MoneroOutgoingTransfer;
const MoneroWalletRpc = monerojs.MoneroWalletRpc;

/**
 * Utilities to deep compare wallets.
 */
class WalletEqualityUtils {
  
  /**
   * Compare the keys of two wallets.
   */
  static async testWalletEqualityKeys(w1, w2) {
    assert.equal(await w2.getMnemonic(), await w1.getMnemonic());
    assert.equal(await w2.getPrimaryAddress(), await w1.getPrimaryAddress());
    assert.equal(await w2.getPrivateViewKey(), await w1.getPrivateViewKey());
  }
  
  /**
   * Compares two wallets for equality using only on-chain data.
   * 
   * This test will sync the two wallets until their height is equal to guarantee equal state.
   * 
   * @param w1 a wallet to compare
   * @param w2 a wallet to compare
   */
  static async testWalletEqualityOnChain(w1, w2) {
    TestUtils.TX_POOL_WALLET_TRACKER.reset(); // all wallets need to wait for txs to confirm to reliably sync
    
    // wait for relayed txs associated with wallets to clear pool
    await TestUtils.TX_POOL_WALLET_TRACKER.waitForWalletTxsToClearPool(w1, w2);
    
    // sync the wallets until same height
    while (await w1.getHeight() !== await w2.getHeight()) {
      await w1.sync();
      await w2.sync();
    }
    
    // test that wallets are equal using only on-chain data
    assert.equal(await w2.getHeight(), await w1.getHeight(), "Wallet heights are not equal after syncing");
    assert.equal(await w2.getMnemonic(), await w1.getMnemonic());
    assert.equal(await w2.getPrimaryAddress(), await w1.getPrimaryAddress());
    assert.equal(await w2.getPrivateViewKey(), await w1.getPrivateViewKey());
    assert.equal(await w2.getPrivateSpendKey(), await w1.getPrivateSpendKey());
    let txQuery = new MoneroTxQuery().setIsConfirmed(true);
    await WalletEqualityUtils._testTxWalletsEqualOnChain(await w1.getTxs(txQuery), await w2.getTxs(txQuery));
    txQuery.setIncludeOutputs(true);
    await WalletEqualityUtils._testTxWalletsEqualOnChain(await w1.getTxs(txQuery), await w2.getTxs(txQuery));  // fetch and compare outputs
    await WalletEqualityUtils._testAccountsEqualOnChain(await w1.getAccounts(true), await w2.getAccounts(true));
    assert.equal((await w2.getBalance()).toString(), (await await w1.getBalance()).toString());
    assert.equal((await w2.getUnlockedBalance()).toString(), (await w1.getUnlockedBalance()).toString());
    let transferQuery = new MoneroTransferQuery().setTxQuery(new MoneroTxQuery().setIsConfirmed(true));
    await WalletEqualityUtils._testTransfersEqualOnChain(await w1.getTransfers(transferQuery), await w2.getTransfers(transferQuery));
    let outputQuery = new MoneroOutputQuery().setTxQuery(new MoneroTxQuery().setIsConfirmed(true));
    await WalletEqualityUtils._testOutputWalletsEqualOnChain(await w1.getOutputs(outputQuery), await w2.getOutputs(outputQuery));
  }
  
  static async _testAccountsEqualOnChain(accounts1, accounts2) {
    for (let i = 0; i < Math.max(accounts1.length, accounts2.length); i++) {
      if (i < accounts1.length && i < accounts2.length) {
        await WalletEqualityUtils._testAccountEqualOnChain(accounts1[i], accounts2[i]);
      } else if (i >= accounts1.length) {
        for (let j = i; j < accounts2.length; j++) {
          assert.equal(accounts2[j].getBalance().toString(), BigInteger.parse("0").toString());
          assert(accounts2[j].getSubaddresses().length >= 1);
          for (let subaddress of accounts2[j].getSubaddresses()) assert(!subaddress.isUsed());
        }
        return;
      } else {
        for (let j = i; j < accounts1.length; j++) {
          assert.equal(accounts1[j].getBalance().toString(), BigInteger.parse("0"));
          assert(accounts1[j].getSubaddresses().length >= 1);
          for (let subaddress of accounts1[j].getSubaddresses()) assert(!subaddress.isUsed());
        }
        return;
      }
    }
  }
  
  static async _testAccountEqualOnChain(account1, account2) {
    
    // nullify off-chain data for comparison
    let subaddresses1 = account1.getSubaddresses();
    let subaddresses2 = account2.getSubaddresses();
    account1.setSubaddresses(undefined);
    account2.setSubaddresses(undefined);
    account1.setTag(undefined);
    account2.setTag(undefined);
    
    // test account equality
    assert(GenUtils.equals(account2, account1));
    await WalletEqualityUtils._testSubaddressesEqualOnChain(subaddresses1, subaddresses2);
  }
  
  static async _testSubaddressesEqualOnChain(subaddresses1, subaddresses2) {
    for (let i = 0; i < Math.max(subaddresses1.length, subaddresses2.length); i++) {
      if (i < subaddresses1.length && i < subaddresses2.length) {
        await WalletEqualityUtils._testSubaddressesEqualOnChain(subaddresses1[i], subaddresses2[i]);
      } else if (i >= subaddresses1.length) {
        for (let j = i; j < subaddresses2.length; j++) {
          assert.equal(BigInteger.parse("0"), subaddresses2[j].getBalance().toString());
          assert(!subaddresses2[j].isUsed());
        }
        return;
      } else {
        for (let j = i; j < subaddresses1.length; j++) {
          assert.equal(BigInteger.parse("0"), subaddresses1[i].getBalance());
          assert(!subaddresses1[j].isUsed());
        }
        return;
      }
    }
  }
  
  static async testSubaddressesEqualOnChain(subaddress1, subaddress2) {
    subaddress1.setLabel(undefined); // nullify off-chain data for comparison
    subaddress2.setLabel(undefined);
    assert(GenUtils.equals(subaddress2, subaddress1));
  }
  
  static async _testTxWalletsEqualOnChain(txs1, txs2) {
    
    // nullify off-chain data for comparison
    let allTxs = [];
    for (let tx1 of txs1) allTxs.push(tx1);
    for (let tx2 of txs2) allTxs.push(tx2);
    for (let tx of allTxs) {
      tx.setNote(undefined);
      if (tx.getOutgoingTransfer() !== undefined) {
        tx.getOutgoingTransfer().setAddresses(undefined);
      }
    }
    
    // compare txs
    assert.equal(txs2.length, txs1.length, "Wallets have different number of txs: " + txs1.length + " vs " + txs2.length);
    for (let tx1 of txs1) {
      let found = false;
      for (let tx2 of txs2) {
        if (tx1.getHash() === tx2.getHash()) {
          
          // transfer destination info if known for comparison
          if (tx1.getOutgoingTransfer() !== undefined && tx1.getOutgoingTransfer().getDestinations() !== undefined) {
            if (tx2.getOutgoingTransfer() === undefined || tx2.getOutgoingTransfer().getDestinations() === undefined) WalletEqualityUtils._transferDestinationInfo(tx1, tx2);
          } else if (tx2.getOutgoingTransfer() !== undefined && tx2.getOutgoingTransfer().getDestinations() !== undefined) {
            WalletEqualityUtils._transferDestinationInfo(tx2, tx1);
          }
          
          // test tx equality by merging
          assert(TestUtils.txsMergeable(tx1, tx2), "Txs are not mergeable");
          found = true;
          
          // test block equality except txs to ignore order
          let blockTxs1 = tx1.getBlock().getTxs();
          let blockTxs2 = tx2.getBlock().getTxs();
          tx1.getBlock().setTxs();
          tx2.getBlock().setTxs();
          assert(GenUtils.equals(tx2.getBlock().toJson(), tx1.getBlock().toJson()), "Tx blocks are not equal");
          tx1.getBlock().setTxs(blockTxs1);
          tx2.getBlock().setTxs(blockTxs2);
        }
      }
      assert(found);  // each tx must have one and only one match
    }
  }
  
  static async _transferDestinationInfo(src, tgt) {
    
    // fill in missing incoming transfers when sending from/to the same account
    if (src.getIncomingTransfers() !== undefined) {
      for (let inTransfer of src.getIncomingTransfers()) {
        if (inTransfer.getAccountIndex() === src.getOutgoingTransfer().getAccountIndex()) {
          tgt.getIncomingTransfers().push(inTransfer);
        }
      }
      // sort transfers
      tgt.getIncomingTransfers().sort(MoneroWalletRpc._compareIncomingTransfers);
    }
    
    // transfer info to outgoing transfer
    if (tgt.getOutgoingTransfer() === undefined) tgt.setOutgoingTransfer(src.getOutgoingTransfer());
    else {
      tgt.getOutgoingTransfer().setDestinations(src.getOutgoingTransfer().getDestinations());
      tgt.getOutgoingTransfer().setAmount(src.getOutgoingTransfer().getAmount());
    }
  }
  
  static async _testTransfersEqualOnChain(transfers1, transfers2) {
    assert.equal(transfers2.length, transfers1.length);
    
    // test and collect transfers per transaction
    let txsTransfers1 = {};
    let txsTransfers2 = {};
    let lastHeight = undefined;
    let lastTx1 = undefined;
    let lastTx2 = undefined;
    for (let i = 0; i < transfers1.length; i++) {
      let transfer1 = transfers1[i];
      let transfer2 = transfers2[i];
      
      // transfers must have same height even if they don't belong to same tx (because tx ordering within blocks is not currently provided by wallet2)
      assert.equal(transfer2.getTx().getHeight(), transfer1.getTx().getHeight());
      
      // transfers must be in ascending order by height
      if (lastHeight === undefined) lastHeight = transfer1.getTx().getHeight();
      else assert(lastHeight <= transfer1.getTx().getHeight());
      
      // transfers must be consecutive per transaction
      if (lastTx1 !== transfer1.getTx()) {
        assert(!txsTransfers1[transfer1.getTx().getHash()]);  // cannot be seen before
        lastTx1 = transfer1.getTx();
      }
      if (lastTx2 !== transfer2.getTx()) {
        assert(!txsTransfers2[transfer2.getTx().getHash()]);  // cannot be seen before
        lastTx2 = transfer2.getTx();
      }
      
      // collect tx1 transfer
      let txTransfers1 = txsTransfers1[transfer1.getTx().getHash()];
      if (txTransfers1 === undefined) {
        txTransfers1 = [];
        txsTransfers1[transfer1.getTx().getHash()] = txTransfers1;
      }
      txTransfers1.push(transfer1);
      
      // collect tx2 transfer
      let txTransfers2 = txsTransfers2[transfer2.getTx().getHash()];
      if (txTransfers2 === undefined) {
        txTransfers2 = [];
        txsTransfers2[transfer2.getTx().getHash()] = txTransfers2;
      }
      txTransfers2.push(transfer2);
    }
    
    // compare collected transfers per tx for equality
    for (let txHash of Object.keys(txsTransfers1)) {
      let txTransfers1 = txsTransfers1[txHash];
      let txTransfers2 = txsTransfers2[txHash];
      assert.equal(txTransfers2.length, txTransfers1.length);
      
      // normalize and compare transfers
      for (let i = 0; i < txTransfers1.length; i++) {
        let transfer1 = txTransfers1[i];
        let transfer2 = txTransfers2[i];
        
        // normalize outgoing transfers
        if (transfer1 instanceof MoneroOutgoingTransfer) {
          let ot1 = transfer1;
          let ot2 = transfer2;
    
          // transfer destination info if known for comparison
          if (ot1.getDestinations() !== undefined) {
            if (ot2.getDestinations() === undefined) await WalletEqualityUtils._transferDestinationInfo(ot1.getTx(), ot2.getTx());
          } else if (ot2.getDestinations() !== undefined) {
            await WalletEqualityUtils._transferDestinationInfo(ot2.getTx(), ot1.getTx());
          }
          
          // nullify other local wallet data
          ot1.setAddresses(undefined);
          ot2.setAddresses(undefined);
        }
        
        // normalize incoming transfers
        else {
          let it1 = transfer1;
          let it2 = transfer2;
          it1.setAddress(undefined);
          it2.setAddress(undefined);
        }
        
        // compare transfer equality
        assert(GenUtils.equals(transfer2.toJson(), transfer1.toJson()));
      }
    }
  }
  
  static async _testOutputWalletsEqualOnChain(outputs1, outputs2) {
    assert.equal(outputs2.length, outputs1.length);
    
    // test and collect outputs per transaction
    let txsOutputs1 = {};
    let txsOutputs2 = {};
    let lastHeight = undefined;
    let lastTx1 = undefined;
    let lastTx2 = undefined;
    for (let i = 0; i < outputs1.length; i++) {
      let output1 = outputs1[i];
      let output2 = outputs2[i];
      
      // outputs must have same height even if they don't belong to same tx (because tx ordering within blocks is not currently provided by wallet2)
      assert.equal(output2.getTx().getHeight(), output1.getTx().getHeight());
      
      // outputs must be in ascending order by height
      if (lastHeight === undefined) lastHeight = output1.getTx().getHeight();
      else assert(lastHeight <= output1.getTx().getHeight());
      
      // outputs must be consecutive per transaction
      if (lastTx1 !== output1.getTx()) {
        assert(!txsOutputs1[output1.getTx().getHash()]);  // cannot be seen before
        lastTx1 = output1.getTx();
      }
      if (lastTx2 !== output2.getTx()) {
        assert(!txsOutputs2[output2.getTx().getHash()]);  // cannot be seen before
        lastTx2 = output2.getTx();
      }
      
      // collect tx1 output
      let txOutputs1 = txsOutputs1[output1.getTx().getHash()];
      if (txOutputs1 === undefined) {
        txOutputs1 = [];
        txsOutputs1[output1.getTx().getHash()] = txOutputs1;
      }
      txOutputs1.push(output1);
      
      // collect tx2 output
      let txOutputs2 = txsOutputs2[output2.getTx().getHash()];
      if (txOutputs2 === undefined) {
        txOutputs2 = [];
        txsOutputs2[output2.getTx().getHash()] = txOutputs2;
      }
      txOutputs2.push(output2);
    }
    
    // compare collected outputs per tx for equality
    for (let txHash of Object.keys(txsOutputs1)) {
      let txOutputs1 = txsOutputs1[txHash];
      let txOutputs2 = txsOutputs2[txHash];
      assert.equal(txOutputs2.length, txOutputs1.length);
      
      // normalize and compare outputs
      for (let i = 0; i < txOutputs1.length; i++) {
        let output1 = txOutputs1[i];
        let output2 = txOutputs2[i];
        assert.equal(output2.getTx().getHash(), output1.getTx().getHash());
        assert(GenUtils.equals(output2.toJson(), output1.toJson()));
      }
    }
  }
}

module.exports = WalletEqualityUtils;
