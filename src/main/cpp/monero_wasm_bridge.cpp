#include <iostream>
#include "monero_wasm_bridge.h"
#include "wallet/monero_wallet_keys.h"
#include "utils/monero_utils.h"
#include "wallet/monero_wallet_full.h"
#include "http_client_wasm.h"

using namespace std;
using namespace monero_wasm_bridge;

// ----------------------------- PRIVATE INNER --------------------------------

static const int DEFAULT_SYNC_INTERVAL_MILLIS = 1000 * 10;   // default refresh interval 10 sec
static const int DEFAULT_CONNECTION_TIMEOUT_MILLIS = 1000 * 30; // default connection timeout 30 sec

string strip_last_char(const string& str) {
  return str.substr(0, str.size() - 1);
}

std::string tools::dns_utils::get_account_address_as_str_from_url(const std::string& url, bool& dnssec_valid, std::function<std::string(const std::string&, const std::vector<std::string>&, bool)> dns_confirm) {
  throw std::runtime_error("Invalid destination address");
}

/**
 * Listens for wallet notifications and notifies the listener in JavaScript.
 */
struct wallet_wasm_listener : public monero_wallet_listener {

  emscripten::val m_on_sync_progress;
  emscripten::val m_on_new_block;
  emscripten::val m_on_balances_changed;
  emscripten::val m_on_output_received;
  emscripten::val m_on_output_spent;

  wallet_wasm_listener(emscripten::val on_sync_progress, emscripten::val on_new_block, emscripten::val on_balances_changed, emscripten::val on_output_received, emscripten::val on_output_spent):
    m_on_sync_progress(on_sync_progress),
    m_on_new_block(on_new_block),
    m_on_balances_changed(on_balances_changed),
    m_on_output_received(on_output_received),
    m_on_output_spent(on_output_spent)
  { }

  ~wallet_wasm_listener() { };

  void on_sync_progress(uint64_t height, uint64_t start_height, uint64_t end_height, double percent_done, const string& message) override {
    m_on_sync_progress((long) height, (long) start_height, (long) end_height, percent_done, message);
  }

  void on_new_block(uint64_t height) override {
    m_on_new_block((long) height);
  }

  void on_balances_changed(uint64_t new_balance, uint64_t new_unlocked_balance) override {
    m_on_balances_changed(to_string(new_balance), to_string(new_unlocked_balance));
  }

  void on_output_received(const monero_output_wallet& output) override {
    boost::optional<uint64_t> height = output.m_tx->get_height();
    int version = output.m_tx->m_version == boost::none ? 1 : *output.m_tx->m_version;  // TODO: version not present in unlocked output notification, defaulting to 1
    bool is_locked = std::static_pointer_cast<monero_tx_wallet>(output.m_tx)->m_is_locked.get();
    m_on_output_received(height == boost::none ? (long) 0 : (long) *height, output.m_tx->m_hash.get(), to_string(*output.m_amount), (int) *output.m_account_index, (int) *output.m_subaddress_index, version, (int) *output.m_tx->m_unlock_height, is_locked);
  }

  void on_output_spent(const monero_output_wallet& output) override {
    boost::optional<uint64_t> height = output.m_tx->get_height();
    m_on_output_spent(height == boost::none ? (long) 0 : (long) *height, output.m_tx->m_hash.get(), to_string(*output.m_amount), (int) *output.m_account_index, (int) *output.m_subaddress_index, (int) *output.m_tx->m_version);
  }
};

// ------------------------------- UTILITIES ----------------------------------

string monero_wasm_bridge::get_exception_message(int exception_ptr)
{
  return std::string(reinterpret_cast<std::exception *>(exception_ptr)->what());
}

string monero_wasm_bridge::malloc_binary_from_json(const std::string &buff_json)
{
  // convert json to binary string
  string buff_bin;
  monero_utils::json_to_binary(buff_json, buff_bin);

  // copy binary string to heap and keep pointer
  std::string* ptr = new std::string(buff_bin.c_str(), buff_bin.length());

  // create object with binary string memory address info
  // TODO: switch to rapidjson
  boost::property_tree::ptree root;
  root.put("ptr", reinterpret_cast<intptr_t>(ptr->c_str()));
  root.put("length", ptr->length());

  // serialize memory info to json str
  return monero_utils::serialize(root); // TODO: move this utility to gen_utils?
}

string monero_wasm_bridge::binary_to_json(const std::string &bin_mem_info_str)
{
  // deserialize memory address info to json
  boost::property_tree::ptree root;
  monero_utils::deserialize(bin_mem_info_str, root);

  // get ptr and length of binary data
  char* ptr = (char*) root.get<int>("ptr"); // TODO: reinterpret_cast<intptr_t>?
  int length = root.get<int>("length");

  // read binary
  std::string buff_bin(ptr, length);

  // convert binary to json and return
  std::string buff_json;
  monero_utils::binary_to_json(buff_bin, buff_json);
  return buff_json;
}

string monero_wasm_bridge::binary_blocks_to_json(const std::string &bin_mem_info_str)
{
  // deserialize memory address info to json
  boost::property_tree::ptree root;
  monero_utils::deserialize(bin_mem_info_str, root);

  // get ptr and length of binary data
  char* ptr = (char*) root.get<int>("ptr"); // TODO: reinterpret_cast<intptr_t>?
  int length = root.get<int>("length");

  // read binary
  std::string buff_bin(ptr, length);

  // convert binary to json and return
  std::string buff_json;
  monero_utils::binary_blocks_to_json(buff_bin, buff_json);
  return buff_json;
}

// -------------------------- STATIC WALLET UTILS -----------------------------

void monero_wasm_bridge::open_full_wallet(const string& password, int network_type, const string& keys_data, const string& cache_data, const string& daemon_uri, const string& daemon_username, const string& daemon_password, const string& reject_unauthorized_fn_id, emscripten::val callback) {
#if defined BUILD_WALLET_FULL
  try {
    monero_rpc_connection daemon_connection = monero_rpc_connection(daemon_uri, daemon_username, daemon_password);
    monero_wallet* wallet = monero_wallet_full::open_wallet_data(password, static_cast<monero_network_type>(network_type), keys_data, cache_data, daemon_connection, std::unique_ptr<http_client_wasm_factory>(new http_client_wasm_factory(reject_unauthorized_fn_id)));
    callback((int) wallet); // callback with wallet memory address
  } catch (exception& e) {
    callback(string(e.what()));
  }
#else
  throw runtime_error("monero_wallet_full not built");
#endif
}

void monero_wasm_bridge::create_full_wallet_random(const string& password, int network_type, const string& daemon_uri, const string& daemon_username, const string& daemon_password, const string& reject_unauthorized_fn_id, const string& language, emscripten::val callback) {
#if defined BUILD_WALLET_FULL
  try {
    monero_rpc_connection daemon_connection = monero_rpc_connection(daemon_uri, daemon_username, daemon_password);
    monero_wallet* wallet = monero_wallet_full::create_wallet_random("", password, static_cast<monero_network_type>(network_type), daemon_connection, language, std::unique_ptr<http_client_wasm_factory>(new http_client_wasm_factory(reject_unauthorized_fn_id)));
    callback((int) wallet); // callback with wallet memory address
  } catch (exception& e) {
    callback(string(e.what()));
  }
#else
  throw runtime_error("monero_wallet_full not built");
#endif
}

void monero_wasm_bridge::create_full_wallet_from_mnemonic(const string& password, int network_type, const string& mnemonic, const string& daemon_uri, const string& daemon_username, const string& daemon_password, const string& reject_unauthorized_fn_id, long restore_height, const string& seed_offset, emscripten::val callback) {
#if defined BUILD_WALLET_FULL
  try {
    monero_rpc_connection daemon_connection = monero_rpc_connection(daemon_uri, daemon_username, daemon_password);
    monero_wallet* wallet = monero_wallet_full::create_wallet_from_mnemonic("", password, static_cast<monero_network_type>(network_type), mnemonic, daemon_connection, restore_height, seed_offset, std::unique_ptr<http_client_wasm_factory>(new http_client_wasm_factory(reject_unauthorized_fn_id)));
    callback((int) wallet); // callback with wallet memory address
  } catch (exception& e) {
    callback(string(e.what()));
  }
#endif
}

void monero_wasm_bridge::create_full_wallet_from_keys(const string& password, int network_type, const string& address, const string& view_key, const string& spend_key, const string& daemon_uri, const string& daemon_username, const string& daemon_password, const string& reject_unauthorized_fn_id, long restore_height, const string& language, emscripten::val callback) {
#if defined BUILD_WALLET_FULL
  try {
    monero_rpc_connection daemon_connection = monero_rpc_connection(daemon_uri, daemon_username, daemon_password);
    monero_wallet* wallet = monero_wallet_full::create_wallet_from_keys("", password, static_cast<monero_network_type>(network_type), address, view_key, spend_key, daemon_connection, restore_height, language, std::unique_ptr<http_client_wasm_factory>(new http_client_wasm_factory(reject_unauthorized_fn_id)));
    callback((int) wallet); // callback with wallet memory address
  } catch (exception& e) {
    callback(string(e.what()));
  }
#else
  throw runtime_error("monero_wallet_full not built");
#endif
}

string monero_wasm_bridge::get_full_wallet_mnemonic_languages() {
#if defined BUILD_WALLET_FULL
  rapidjson::Document doc;
  doc.SetObject();
  doc.AddMember("languages", monero_utils::to_rapidjson_val(doc.GetAllocator(), monero_wallet_full::get_mnemonic_languages()), doc.GetAllocator());
  return monero_utils::serialize(doc);
#else
  throw runtime_error("monero_wallet_full not built");
#endif
}

void monero_wasm_bridge::create_keys_wallet_random(int network_type, const string& language, emscripten::val callback) {
  try {
    monero_wallet* wallet = monero_wallet_keys::create_wallet_random(static_cast<monero_network_type>(network_type), language);
    callback((int) wallet); // callback with wallet memory address
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::create_keys_wallet_from_mnemonic(int network_type, const string& mnemonic, const string& seed_offset, emscripten::val callback) {
  try {
    monero_wallet* wallet = monero_wallet_keys::create_wallet_from_mnemonic(static_cast<monero_network_type>(network_type), mnemonic, seed_offset);
    callback((int) wallet); // callback with wallet memory address
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::create_keys_wallet_from_keys(int network_type, const string& address, const string& view_key, const string& spend_key, const string& language, emscripten::val callback) {
  try {
    monero_wallet* wallet = monero_wallet_keys::create_wallet_from_keys(static_cast<monero_network_type>(network_type), address, view_key, spend_key);
    callback((int) wallet); // callback with wallet memory address
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

string monero_wasm_bridge::get_keys_wallet_mnemonic_languages() {
  rapidjson::Document doc;
  doc.SetObject();
  doc.AddMember("languages", monero_utils::to_rapidjson_val(doc.GetAllocator(), monero_wallet_keys::get_mnemonic_languages()), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

// ------------------------ WALLET INSTANCE METHODS ---------------------------

bool monero_wasm_bridge::is_view_only(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->is_view_only();
}

void monero_wasm_bridge::set_daemon_connection(int handle, const string& uri, const string& username, const string& password, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  wallet->set_daemon_connection(uri, username, password);
  callback();
}

string monero_wasm_bridge::get_daemon_connection(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  boost::optional<monero_rpc_connection> daemon_connection = wallet->get_daemon_connection();
  return daemon_connection == boost::none ? "" : daemon_connection.get().serialize();
}

void monero_wasm_bridge::is_connected(int handle, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  callback((bool) wallet->is_connected());
}

void monero_wasm_bridge::get_daemon_max_peer_height(int handle, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  callback((long) wallet->get_daemon_max_peer_height());
}

//void add_listener(int handle, monero_wallet_listener& listener);
//void remove_listener(int handle, monero_wallet_listener& listener);
//set<monero_wallet_listener*> get_listeners(int handle);
//  int get_network_type(int handle) const;

string monero_wasm_bridge::get_version(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_version().serialize();
}

string monero_wasm_bridge::get_mnemonic(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_mnemonic();
}

string monero_wasm_bridge::get_mnemonic_language(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_mnemonic_language();
}

string monero_wasm_bridge::get_public_view_key(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_public_view_key();
}

string monero_wasm_bridge::get_private_view_key(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_private_view_key();
}

string monero_wasm_bridge::get_public_spend_key(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_public_spend_key();
}

string monero_wasm_bridge::get_private_spend_key(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_private_spend_key();
}

string monero_wasm_bridge::get_address(int handle, const uint32_t account_idx, const uint32_t subaddress_idx) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_address(account_idx, subaddress_idx);
}

string monero_wasm_bridge::get_address_index(int handle, const string& address) {
  monero_wallet* wallet = (monero_wallet*) handle;
  monero_subaddress subaddress = wallet->get_address_index(address);
  return subaddress.serialize();
}

string monero_wasm_bridge::get_integrated_address(int handle, const string& standardAddress, const string& payment_id) {
  monero_wallet* wallet = (monero_wallet*) handle;
  monero_integrated_address integrated_address = wallet->get_integrated_address(standardAddress, payment_id);
  return integrated_address.serialize();
}

string monero_wasm_bridge::decode_integrated_address(int handle, const string& integrated_address_str) {
  monero_wallet* wallet = (monero_wallet*) handle;
  monero_integrated_address integrated_address = wallet->decode_integrated_address(integrated_address_str);
  return integrated_address.serialize();
}

void monero_wasm_bridge::get_height(int handle, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  callback((long) wallet->get_height());
}

void monero_wasm_bridge::get_daemon_height(int handle, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  callback((long) wallet->get_daemon_height());
}

void monero_wasm_bridge::get_height_by_date(int handle, uint16_t year, uint8_t month, uint8_t day, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {
    callback((long) wallet->get_height_by_date(year, month, day));
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::is_daemon_synced(int handle, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  callback(wallet->is_daemon_synced());
}

void monero_wasm_bridge::is_synced(int handle, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  callback(wallet->is_synced());
}

int monero_wasm_bridge::get_network_type(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return (int) wallet->get_network_type();
}

long monero_wasm_bridge::get_sync_height(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return (long) wallet->get_sync_height();
}

void monero_wasm_bridge::set_sync_height(int handle, long sync_height) {
  monero_wallet* wallet = (monero_wallet*) handle;
  wallet->set_sync_height(sync_height);
}

int monero_wasm_bridge::set_listener(int wallet_handle, int old_listener_handle, emscripten::val on_sync_progress, emscripten::val on_new_block, emscripten::val on_balances_changed, emscripten::val on_output_received, emscripten::val on_output_spent) {
  monero_wallet* wallet = (monero_wallet*) wallet_handle;

  // remove old listener
  wallet_wasm_listener* old_listener = (wallet_wasm_listener*) old_listener_handle;
  if (old_listener != nullptr) {
    wallet->remove_listener(*old_listener);
    delete old_listener;
  }

  // add new listener
  if (on_sync_progress == emscripten::val::undefined()) return 0;
  wallet_wasm_listener* listener = new wallet_wasm_listener(on_sync_progress, on_new_block, on_balances_changed, on_output_received, on_output_spent);
  wallet->add_listener(*listener);
  return (int) listener;
}

void monero_wasm_bridge::sync(int handle, long start_height, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {
    monero_sync_result result = wallet->sync(start_height);
    callback(result.serialize());
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::stop_syncing(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  wallet->stop_syncing();
}

void monero_wasm_bridge::rescan_spent(int handle, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  wallet->rescan_spent();
  callback();
}

void monero_wasm_bridge::rescan_blockchain(int handle, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  wallet->rescan_blockchain();
  callback();
}

string monero_wasm_bridge::get_balance_wallet(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // serialize wallet balance to json string {"balance": ...}
  rapidjson::Document doc;
  doc.SetObject();
  rapidjson::Value value;
  doc.AddMember("balance", rapidjson::Value().SetUint64(wallet->get_balance()), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

string monero_wasm_bridge::get_balance_account(int handle, const uint32_t account_idx) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // serialize wallet balance to json string {"balance": ...}
  rapidjson::Document doc;
  doc.SetObject();
  rapidjson::Value value;
  doc.AddMember("balance", rapidjson::Value().SetUint64(wallet->get_balance(account_idx)), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

string monero_wasm_bridge::get_balance_subaddress(int handle, const uint32_t account_idx, const uint32_t subaddress_idx) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // serialize wallet balance to json string {"balance": ...}
  rapidjson::Document doc;
  doc.SetObject();
  rapidjson::Value value;
  doc.AddMember("balance", rapidjson::Value().SetUint64(wallet->get_balance(account_idx, subaddress_idx)), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

string monero_wasm_bridge::get_unlocked_balance_wallet(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // serialize wallet unlocked balance to json string {"unlockedBalance": ...}
  rapidjson::Document doc;
  doc.SetObject();
  rapidjson::Value value;
  doc.AddMember("unlockedBalance", rapidjson::Value().SetUint64(wallet->get_unlocked_balance()), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

string monero_wasm_bridge::get_unlocked_balance_account(int handle, const uint32_t account_idx) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // serialize account unlocked balance to json string {"unlockedBalance": ...}
  rapidjson::Document doc;
  doc.SetObject();
  rapidjson::Value value;
  doc.AddMember("unlockedBalance", rapidjson::Value().SetUint64(wallet->get_unlocked_balance(account_idx)), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

string monero_wasm_bridge::get_unlocked_balance_subaddress(int handle, const uint32_t account_idx, const uint32_t subaddress_idx) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // serialize subaddress unlocked balance to json string {"unlockedBalance": ...}
  rapidjson::Document doc;
  doc.SetObject();
  rapidjson::Value value;
  doc.AddMember("unlockedBalance", rapidjson::Value().SetUint64(wallet->get_unlocked_balance(account_idx, subaddress_idx)), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

string monero_wasm_bridge::get_accounts(int handle, bool include_subaddresses, const string& tag) {

  // get accounts
  monero_wallet* wallet = (monero_wallet*) handle;
  vector<monero_account> accounts = wallet->get_accounts(include_subaddresses, tag);

  // wrap and serialize accounts
  rapidjson::Document doc;
  doc.SetObject();
  doc.AddMember("accounts", monero_utils::to_rapidjson_val(doc.GetAllocator(), accounts), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

string monero_wasm_bridge::get_account(int handle, uint32_t account_idx, bool include_subaddresses) {
  monero_wallet* wallet = (monero_wallet*) handle;
  monero_account account = wallet->get_account(account_idx, include_subaddresses);
  return account.serialize();
}

string monero_wasm_bridge::create_account(int handle, const string& label) {
  monero_wallet* wallet = (monero_wallet*) handle;
  monero_account account = wallet->create_account(label);
  return account.serialize();
}

string monero_wasm_bridge::get_subaddresses(int handle, const string& args) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // deserialize args to property tree
  std::istringstream iss = std::istringstream(args);
  boost::property_tree::ptree node;
  boost::property_tree::read_json(iss, node);

  // get account index argument
  uint32_t account_idx = node.get_child("accountIdx").get_value<uint32_t>();

  // get subaddresses indices argument
  vector<uint32_t> subaddress_indices;
  for (const auto& item : node.get_child("subaddressIndices")) {
    subaddress_indices.push_back(item.second.get_value<uint32_t>());
  }

  // get subaddresses
  vector<monero_subaddress> subaddresses = wallet->get_subaddresses(account_idx, subaddress_indices);

  // wrap and serialize subaddresses
  rapidjson::Document doc;
  doc.SetObject();
  doc.AddMember("subaddresses", monero_utils::to_rapidjson_val(doc.GetAllocator(), subaddresses), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

string monero_wasm_bridge::create_subaddress(int handle, const uint32_t account_idx, const string& label) {
  monero_wallet* wallet = (monero_wallet*) handle;
  monero_subaddress subaddress = wallet->create_subaddress(account_idx, label);
  return subaddress.serialize();
}

void monero_wasm_bridge::get_txs(int handle, const string& tx_query_json, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {

    // deserialize tx query string
    shared_ptr<monero_tx_query> tx_query = monero_tx_query::deserialize_from_block(tx_query_json);

    // get txs
    vector<string> missing_tx_hashes;
    vector<shared_ptr<monero_tx_wallet>> txs = wallet->get_txs(*tx_query, missing_tx_hashes);

    // collect unique blocks to preserve model relationships as trees
    shared_ptr<monero_block> unconfirmed_block = nullptr; // placeholder to store unconfirmed txs in return json
    vector<shared_ptr<monero_block>> blocks;
    unordered_set<shared_ptr<monero_block>> seen_block_ptrs;
    for (const shared_ptr<monero_tx_wallet>& tx : txs) {
      if (tx->m_block == boost::none) {
        if (unconfirmed_block == nullptr) unconfirmed_block = make_shared<monero_block>();
        tx->m_block = unconfirmed_block;
        unconfirmed_block->m_txs.push_back(tx);
      }
      unordered_set<shared_ptr<monero_block>>::const_iterator got = seen_block_ptrs.find(tx->m_block.get());
      if (got == seen_block_ptrs.end()) {
        seen_block_ptrs.insert(tx->m_block.get());
        blocks.push_back(tx->m_block.get());
      }
    }

    // wrap and serialize blocks
    rapidjson::Document doc;
    doc.SetObject();
    doc.AddMember("blocks", monero_utils::to_rapidjson_val(doc.GetAllocator(), blocks), doc.GetAllocator());
    if (!missing_tx_hashes.empty()) doc.AddMember("missingTxHashes", monero_utils::to_rapidjson_val(doc.GetAllocator(), missing_tx_hashes), doc.GetAllocator());
    callback(monero_utils::serialize(doc));

    // free memory
    monero_utils::free(blocks);
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::get_transfers(int handle, const string& transfer_query_json, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {

    // deserialize transfer query
    shared_ptr<monero_transfer_query> transfer_query = monero_transfer_query::deserialize_from_block(transfer_query_json);

  //  // log query
  //  if (transfer_query->m_tx_query != boost::none) {
  //    if ((*transfer_query->m_tx_query)->m_block == boost::none) cout << "Transfer query's tx query rooted at [tx]:" << (*transfer_query->m_tx_query)->serialize() << endl;
  //    else cout << "Transfer query's tx query rooted at [block]: " << (*(*transfer_query->m_tx_query)->m_block)->serialize() << endl;
  //  } else cout << "Transfer query: " << transfer_query->serialize() << endl;

    // get transfers
    vector<shared_ptr<monero_transfer>> transfers = wallet->get_transfers(*transfer_query);

    // collect unique blocks to preserve model relationships as tree
    shared_ptr<monero_block> unconfirmed_block = nullptr; // placeholder to store unconfirmed txs in return json
    vector<shared_ptr<monero_block>> blocks;
    unordered_set<shared_ptr<monero_block>> seen_block_ptrs;
    for (auto const& transfer : transfers) {
      shared_ptr<monero_tx_wallet> tx = transfer->m_tx;
      if (tx->m_block == boost::none) {
        if (unconfirmed_block == nullptr) unconfirmed_block = make_shared<monero_block>();
        tx->m_block = unconfirmed_block;
        unconfirmed_block->m_txs.push_back(tx);
      }
      unordered_set<shared_ptr<monero_block>>::const_iterator got = seen_block_ptrs.find(tx->m_block.get());
      if (got == seen_block_ptrs.end()) {
        seen_block_ptrs.insert(tx->m_block.get());
        blocks.push_back(tx->m_block.get());
      }
    }

    // wrap and serialize blocks
    rapidjson::Document doc;
    doc.SetObject();
    doc.AddMember("blocks", monero_utils::to_rapidjson_val(doc.GetAllocator(), blocks), doc.GetAllocator());
    callback(monero_utils::serialize(doc));

    // free memory
    monero_utils::free(blocks);
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

//  emscripten::function("get_incoming_transfers", &monero_wasm_bridge::TODO);
//  emscripten::function("get_outgoing_transfers", &monero_wasm_bridge::TODO);

void monero_wasm_bridge::get_outputs(int handle, const string& output_query_json, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {

    // deserialize output query
    shared_ptr<monero_output_query> output_query = monero_output_query::deserialize_from_block(output_query_json);

    // get outputs
    vector<shared_ptr<monero_output_wallet>> outputs = wallet->get_outputs(*output_query);

    // collect unique blocks to preserve model relationships as tree
    vector<shared_ptr<monero_block>> blocks;
    unordered_set<shared_ptr<monero_block>> seen_block_ptrs;
    for (auto const& output : outputs) {
      shared_ptr<monero_tx_wallet> tx = static_pointer_cast<monero_tx_wallet>(output->m_tx);
      if (tx->m_block == boost::none) throw runtime_error("Need to handle unconfirmed output");
      unordered_set<shared_ptr<monero_block>>::const_iterator got = seen_block_ptrs.find(*tx->m_block);
      if (got == seen_block_ptrs.end()) {
        seen_block_ptrs.insert(tx->m_block.get());
        blocks.push_back(tx->m_block.get());
      }
    }

    // wrap and serialize blocks
    rapidjson::Document doc;
    doc.SetObject();
    doc.AddMember("blocks", monero_utils::to_rapidjson_val(doc.GetAllocator(), blocks), doc.GetAllocator());
    callback(monero_utils::serialize(doc));

    // free memory
    monero_utils::free(blocks);
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::get_outputs_hex(int handle, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {
    callback(wallet->get_outputs_hex());
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::import_outputs_hex(int handle, const string& outputs_hex, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {
    callback(wallet->import_outputs_hex(outputs_hex));
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::get_key_images(int handle, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {
    vector<shared_ptr<monero_key_image>> key_images = wallet->get_key_images();

    // wrap and serialize key images
    rapidjson::Document doc;
    doc.SetObject();
    doc.AddMember("keyImages", monero_utils::to_rapidjson_val(doc.GetAllocator(), key_images), doc.GetAllocator());
    callback(monero_utils::serialize(doc));
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::import_key_images(int handle, const string& key_images_str, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {
    vector<shared_ptr<monero_key_image>> key_images = monero_key_image::deserialize_key_images(key_images_str);
    callback(wallet->import_key_images(key_images)->serialize());
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

//  emscripten::function("get_new_key_images_from_last_import", &monero_wasm_bridge::get_new_key_images_from_last_import);

void monero_wasm_bridge::create_txs(int handle, const string& config_json, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {

    // deserialize tx config
    shared_ptr<monero_tx_config> config = monero_tx_config::deserialize(config_json);

    // create txs
    vector<shared_ptr<monero_tx_wallet>> txs = wallet->create_txs(*config);

    // serialize and return tx set
    callback(txs[0]->m_tx_set.get()->serialize());
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::sweep_output(int handle, const string& config_json, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {

    // deserialize tx config
    shared_ptr<monero_tx_config> config = monero_tx_config::deserialize(config_json);

    // sweep output
    shared_ptr<monero_tx_wallet> tx = wallet->sweep_output(*config);

    // serialize and return tx set
    callback(tx->m_tx_set.get()->serialize());
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::sweep_unlocked(int handle, const string& config_json, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {

    // deserialize tx config
    shared_ptr<monero_tx_config> config = monero_tx_config::deserialize(config_json);

    // sweep unlocked
    vector<shared_ptr<monero_tx_wallet>> txs = wallet->sweep_unlocked(*config);

    // collect tx sets
    vector<shared_ptr<monero_tx_set>> tx_sets;
    for (int i = 0; i < txs.size(); i++) {
      if (std::find(tx_sets.begin(), tx_sets.end(), txs[i]->m_tx_set) == tx_sets.end()) {
        tx_sets.push_back(txs[i]->m_tx_set.get());
      }
    }

    // wrap and serialize tx sets
    rapidjson::Document doc;
    doc.SetObject();
    doc.AddMember("txSets", monero_utils::to_rapidjson_val(doc.GetAllocator(), tx_sets), doc.GetAllocator());
    callback(monero_utils::serialize(doc));
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::sweep_dust(int handle, bool relay, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {
    vector<shared_ptr<monero_tx_wallet>> txs = wallet->sweep_dust(relay);

    // serialize and return tx set
    callback(txs[0]->m_tx_set.get()->serialize());
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::relay_txs(int handle, const string& args, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {

    // deserialize args to property tree
    std::istringstream iss = std::istringstream(args);
    boost::property_tree::ptree node;
    boost::property_tree::read_json(iss, node);

    // get tx metadatas from args
    vector<string> tx_metadatas;
    boost::property_tree::ptree tx_metadatas_node = node.get_child("txMetadatas");
    for (const auto& child : tx_metadatas_node) tx_metadatas.push_back(child.second.get_value<string>());

    // relay txs
    vector<string> tx_hashes = wallet->relay_txs(tx_metadatas);

    // wrap and serialize tx hashes
    rapidjson::Document doc;
    doc.SetObject();
    doc.AddMember("txHashes", monero_utils::to_rapidjson_val(doc.GetAllocator(), tx_hashes), doc.GetAllocator());
    callback(monero_utils::serialize(doc));
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

string monero_wasm_bridge::parse_tx_set(int handle, const string& tx_set_str) {
  monero_wallet* wallet = (monero_wallet*) handle;
  monero_tx_set tx_set = monero_tx_set::deserialize(tx_set_str);
  monero_tx_set parsed_tx_set = wallet->parse_tx_set(tx_set);
  return parsed_tx_set.serialize();
}

string monero_wasm_bridge::sign_txs(int handle, const string& unsigned_tx_hex) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->sign_txs(unsigned_tx_hex);
}

void monero_wasm_bridge::submit_txs(int handle, const string& signed_tx_hex, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {
    vector<string> tx_hashes = wallet->submit_txs(signed_tx_hex);

    // wrap and serialize tx hashes
    rapidjson::Document doc;
    doc.SetObject();
    doc.AddMember("txHashes", monero_utils::to_rapidjson_val(doc.GetAllocator(), tx_hashes), doc.GetAllocator());
    callback(monero_utils::serialize(doc));
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

string monero_wasm_bridge::sign_message(int handle, const string& msg, uint32_t signature_type_num, uint32_t account_idx, uint32_t subaddress_idx) {
  monero_wallet* wallet = (monero_wallet*) handle;
  monero_message_signature_type signature_type = signature_type_num == 0 ? monero_message_signature_type::SIGN_WITH_SPEND_KEY : monero_message_signature_type::SIGN_WITH_VIEW_KEY;
  return wallet->sign_message(msg, signature_type, account_idx, subaddress_idx);
}

string monero_wasm_bridge::verify_message(int handle, const string& msg, const string& address, const string& signature) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->verify_message(msg, address, signature).serialize();
}

string monero_wasm_bridge::get_tx_key(int handle, const string& tx_hash) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_tx_key(tx_hash);
}

string monero_wasm_bridge::check_tx_key(int handle, const string& tx_hash, const string& tx_key, const string& address) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->check_tx_key(tx_hash, tx_key, address)->serialize();
}

string monero_wasm_bridge::get_tx_proof(int handle, const string& tx_hash, const string& address, const string& message) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_tx_proof(tx_hash, address, message);
}

string monero_wasm_bridge::check_tx_proof(int handle, const string& tx_hash, const string& address, const string& message, const string& signature) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->check_tx_proof(tx_hash, address, message, signature)->serialize();
}

string monero_wasm_bridge::get_spend_proof(int handle, const string& tx_hash, const string& message) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_spend_proof(tx_hash, message);
}

bool monero_wasm_bridge::check_spend_proof(int handle, const string& tx_hash, const string& message, const string& signature) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->check_spend_proof(tx_hash, message, signature);
}

string monero_wasm_bridge::get_reserve_proof_wallet(int handle, const string& message) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_reserve_proof_wallet(message);
}

string monero_wasm_bridge::get_reserve_proof_account(int handle, uint32_t account_idx, const string& amount_str, const string& message) {
  monero_wallet* wallet = (monero_wallet*) handle;
  std::stringstream sstr(amount_str);
  uint64_t amount;
  sstr >> amount;
  return wallet->get_reserve_proof_account(account_idx, amount, message);
}

string monero_wasm_bridge::check_reserve_proof(int handle, const string& address, const string& message, const string& signature) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->check_reserve_proof(address, message, signature)->serialize();
}

string monero_wasm_bridge::get_tx_notes(int handle, const string& args) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // deserialize args to property tree
  std::istringstream iss = std::istringstream(args);
  boost::property_tree::ptree node;
  boost::property_tree::read_json(iss, node);

  // get tx hashes from args
  vector<string> tx_hashes;
  boost::property_tree::ptree tx_hashes_node = node.get_child("txHashes");
  for (const auto& child : tx_hashes_node) tx_hashes.push_back(child.second.get_value<string>());

  // get tx notes
  vector<string> notes = wallet->get_tx_notes(tx_hashes);

  // wrap and serialize notes
  rapidjson::Document doc;
  doc.SetObject();
  doc.AddMember("txNotes", monero_utils::to_rapidjson_val(doc.GetAllocator(), notes), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

void monero_wasm_bridge::set_tx_notes(int handle, const string& args) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // deserialize args to property tree
  std::istringstream iss = std::istringstream(args);
  boost::property_tree::ptree node;
  boost::property_tree::read_json(iss, node);

  // get tx hashes from args
  vector<string> tx_hashes;
  boost::property_tree::ptree tx_hashes_node = node.get_child("txHashes");
  for (const auto& child : tx_hashes_node) tx_hashes.push_back(child.second.get_value<string>());

  // get tx notes from args
  vector<string> tx_notes;
  boost::property_tree::ptree tx_notes_node = node.get_child("txNotes");
  for (const auto& child : tx_notes_node) tx_notes.push_back(child.second.get_value<string>());

  // set tx notes
  wallet->set_tx_notes(tx_hashes, tx_notes);
}

string monero_wasm_bridge::get_address_book_entries(int handle, const string& args) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // deserialize args to property tree
  std::istringstream iss = std::istringstream(args);
  boost::property_tree::ptree node;
  boost::property_tree::read_json(iss, node);

  // get entry indices from args
  vector<uint64_t> entry_indices;
  boost::property_tree::ptree entry_indices_node = node.get_child("entryIndices");
  for (const auto& child : entry_indices_node) entry_indices.push_back(child.second.get_value<uint64_t>());

  // get address book entries
  vector<monero_address_book_entry> entries = wallet->get_address_book_entries(entry_indices);

  // wrap and serialize entries
  rapidjson::Document doc;
  doc.SetObject();
  doc.AddMember("entries", monero_utils::to_rapidjson_val(doc.GetAllocator(), entries), doc.GetAllocator());
  return monero_utils::serialize(doc);
}

int monero_wasm_bridge::add_address_book_entry(int handle, const string& address, const string& description) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->add_address_book_entry(address, description);
}

void monero_wasm_bridge::edit_address_book_entry(int handle, int index, bool set_address, const string& address, bool set_description, const string& description) {
  monero_wallet* wallet = (monero_wallet*) handle;
  wallet->edit_address_book_entry(index, set_address, address, set_description, description);
}

void monero_wasm_bridge::delete_address_book_entry(int handle, int index) {
  monero_wallet* wallet = (monero_wallet*) handle;
  wallet->delete_address_book_entry(index);
}

void monero_wasm_bridge::tag_accounts(int handle, const string& args) {
  cout << "string monero_wasm_bridge::tag_accounts()" << endl;
  throw runtime_error("Not implemented");
}

void monero_wasm_bridge::untag_accounts(int handle, const string& args) {
  cout << "string monero_wasm_bridge::untag_accounts()" << endl;
  throw runtime_error("Not implemented");
}

string monero_wasm_bridge::get_account_tags(int handle) {
  cout << "string monero_wasm_bridge::get_account_tags()" << endl;
  throw runtime_error("Not implemented");
}

void monero_wasm_bridge::set_account_tag_label(int handle, const string& tag, const string& label) {
  cout << "string monero_wasm_bridge::set_account_tag_label()" << endl;
  throw runtime_error("Not implemented");
}

string monero_wasm_bridge::create_payment_uri(int handle, const string& config_json) {
  monero_wallet* wallet = (monero_wallet*) handle;
  shared_ptr<monero_tx_config> config = monero_tx_config::deserialize(config_json);
  return wallet->create_payment_uri(*config);
}

string monero_wasm_bridge::parse_payment_uri(int handle, const string& uri) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->parse_payment_uri(uri)->serialize();
}

string monero_wasm_bridge::get_attribute(int handle, const string& key) {
  monero_wallet* wallet = (monero_wallet*) handle;
  string value;
  if (!wallet->get_attribute(key, value)) return "";
  return value;
}

void monero_wasm_bridge::set_attribute(int handle, const string& key, const string& val) {
  monero_wallet* wallet = (monero_wallet*) handle;
  wallet->set_attribute(key, val);
}

bool monero_wasm_bridge::is_multisig_import_needed(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->is_multisig_import_needed();
}

string monero_wasm_bridge::get_multisig_info(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_multisig_info().serialize();
}

string monero_wasm_bridge::prepare_multisig(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->prepare_multisig();
}

string monero_wasm_bridge::make_multisig(int handle, const string& args) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // deserialize args to property tree
  std::istringstream iss = std::istringstream(args);
  boost::property_tree::ptree node;
  boost::property_tree::read_json(iss, node);

  // get multisig hexes from args
  vector<string> multisig_hexes;
  boost::property_tree::ptree multisig_hexes_node = node.get_child("multisigHexes");
  for (const auto& child : multisig_hexes_node) multisig_hexes.push_back(child.second.get_value<string>());

  // get threshold and password from args
  int threshold = node.get_child("threshold").get_value<int>();
  string password = node.get_child("password").get_value<string>();

  // make multisig
  return wallet->make_multisig(multisig_hexes, threshold, password).serialize();
}

string monero_wasm_bridge::exchange_multisig_keys(int handle, const string& args) {

  monero_wallet* wallet = (monero_wallet*) handle;

  // deserialize args to property tree
  std::istringstream iss = std::istringstream(args);
  boost::property_tree::ptree node;
  boost::property_tree::read_json(iss, node);

  // get multisig hexes from args
  vector<string> multisig_hexes;
  boost::property_tree::ptree multisig_hexes_node = node.get_child("multisigHexes");
  for (const auto& child : multisig_hexes_node) multisig_hexes.push_back(child.second.get_value<string>());

  // get password from args
  string password = node.get_child("password").get_value<string>();

  // exchange multisig keys
  return wallet->exchange_multisig_keys(multisig_hexes, password).serialize();
}

string monero_wasm_bridge::get_multisig_hex(int handle) {
  monero_wallet* wallet = (monero_wallet*) handle;
  return wallet->get_multisig_hex();
}

void monero_wasm_bridge::import_multisig_hex(int handle, const string& args, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {

    // deserialize args to property tree
    std::istringstream iss = std::istringstream(args);
    boost::property_tree::ptree node;
    boost::property_tree::read_json(iss, node);

    // get multisig hexes from args
    vector<string> multisig_hexes;
    boost::property_tree::ptree multisig_hexes_node = node.get_child("multisigHexes");
    for (const auto& child : multisig_hexes_node) multisig_hexes.push_back(child.second.get_value<string>());

    // import multisig hex
    callback(wallet->import_multisig_hex(multisig_hexes));
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::sign_multisig_tx_hex(int handle, const string& multisig_tx_hex, emscripten::val callback) {
  try {
    monero_wallet* wallet = (monero_wallet*) handle;
    monero_multisig_sign_result result = wallet->sign_multisig_tx_hex(multisig_tx_hex);
    callback(result.serialize());
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::submit_multisig_tx_hex(int handle, const string& signed_multisig_tx_hex, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;
  try {
    vector<string> tx_hashes = wallet->submit_multisig_tx_hex(signed_multisig_tx_hex);

    // wrap and serialize tx hashes
    rapidjson::Document doc;
    doc.SetObject();
    doc.AddMember("txHashes", monero_utils::to_rapidjson_val(doc.GetAllocator(), tx_hashes), doc.GetAllocator());
    callback(monero_utils::serialize(doc));
  } catch (exception& e) {
    callback(string(e.what()));
  }
}

void monero_wasm_bridge::close(int handle, bool save, emscripten::val callback) {
  monero_wallet* wallet = (monero_wallet*) handle;

  // TODO: ensure http clients are being deleted
//  // if full wallet, disconnect and delete http client
//  monero_wallet_full* wallet_full = dynamic_cast<const monero_wallet_full*>(wallet);
//  if (full_wallet != nullptr) delete wallet_full->m_http_client;

  if (save) wallet->save();
  delete wallet;
  wallet = nullptr;
  callback();
}

string monero_wasm_bridge::get_keys_file_buffer(int handle, string password, bool view_only) {
#if defined BUILD_WALLET_FULL
  // get wallet
  monero_wallet_full* wallet = (monero_wallet_full*) handle;

  // get keys buffer
  string keys_buf = wallet->get_keys_file_buffer(password, view_only);

  // copy keys buffer to heap and keep pointer
  std::string* keys_buf_ptr = new std::string(keys_buf.c_str(), keys_buf.length());

  // serialize buffer's pointer and length
  rapidjson::Document doc;
  doc.SetObject();
  rapidjson::Value value;
  doc.AddMember("pointer", rapidjson::Value().SetUint64(reinterpret_cast<long>(keys_buf_ptr->c_str())), doc.GetAllocator());
  doc.AddMember("length", rapidjson::Value().SetUint64(keys_buf_ptr->length()), doc.GetAllocator());
  return monero_utils::serialize(doc);
#else
  throw runtime_error("monero_wallet_full not built");
#endif
}

string monero_wasm_bridge::get_cache_file_buffer(int handle, string password) {
#if defined BUILD_WALLET_FULL
  // get wallet
  monero_wallet_full* wallet = (monero_wallet_full*) handle;

  // get cache buffer
  string cache_buf = wallet->get_cache_file_buffer(password);

  // copy cache buffer to heap and keep pointer
  std::string* cache_buf_ptr = new std::string(cache_buf.c_str(), cache_buf.length());

  // serialize buffer's pointer and length
  rapidjson::Document doc;
  doc.SetObject();
  rapidjson::Value value;
  doc.AddMember("pointer", rapidjson::Value().SetUint64(reinterpret_cast<long>(cache_buf_ptr->c_str())), doc.GetAllocator());
  doc.AddMember("length", rapidjson::Value().SetUint64(cache_buf_ptr->length()), doc.GetAllocator());
  return monero_utils::serialize(doc);
#else
  throw runtime_error("monero_wallet_full not built");
#endif
}
