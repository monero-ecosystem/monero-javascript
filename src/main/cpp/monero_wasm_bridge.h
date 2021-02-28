/**
 * Provides a bridge from WebAssembly to the Monero wallet.
 */
#ifndef monero_wasm_bridge_h
#define monero_wasm_bridge_h

#include <emscripten/bind.h>
#include <string>

using namespace std;
using namespace emscripten;

// override tools::dns_utils::get_account_address_as_str_from_url() so error caught when sending to invalid address
namespace tools {
  namespace dns_utils {
    std::string get_account_address_as_str_from_url(const std::string& url, bool& dnssec_valid, std::function<std::string(const std::string&, const std::vector<std::string>&, bool)> dns_confirm);
  }
}

namespace monero_wasm_bridge
{

  // ------------------------------ UTILITIES ---------------------------------

  string validate_address(const string& address, int network_type);
  string get_exception_message(int exception_ptr);
  string malloc_binary_from_json(const string& args_string);
  string binary_to_json(const string& args_string);
  string binary_blocks_to_json(const string& args_string);

  // ------------------------- STATIC WALLET UTILS ----------------------------

  void open_full_wallet(const string& password, int network_type, const string& keys_data, const string& cache_data, const string& daemon_uri, const string& daemon_username, const string& daemon_password, const string& reject_unauthorized_fn_id, emscripten::val callback);
  void create_full_wallet_random(const string& password, int network_type, const string& daemon_uri, const string& daemon_username, const string& daemon_password, const string& reject_unauthorized_fn_id, const string& language, emscripten::val callback);
  void create_full_wallet_from_mnemonic(const string& password, int network_type, const string& mnemonic, const string& daemon_uri, const string& daemon_username, const string& daemon_password, const string& reject_unauthorized_fn_id, long restore_height, const string& seed_offset, emscripten::val callback);
  void create_full_wallet_from_keys(const string& password, int network_type, const string& address, const string& view_key, const string& spend_key, const string& daemon_uri, const string& daemon_username, const string& daemon_password, const string& reject_unauthorized_fn_id, long restore_height, const string& language, emscripten::val callback);
  string get_full_wallet_mnemonic_languages();

  void create_keys_wallet_random(int network_type, const string& language, emscripten::val callback);
  void create_keys_wallet_from_mnemonic(int network_type, const string& mnemonic, const string& seed_offset, emscripten::val callback);
  void create_keys_wallet_from_keys(int network_type, const string& address, const string& view_key, const string& spend_key, const string& language, emscripten::val callback);
  string get_keys_wallet_mnemonic_languages();

  // ----------------------- WALLET INSTANCE METHODS --------------------------

  bool is_view_only(int handle);
  void set_daemon_connection(int handle, const string& uri, const string& username, const string& password, emscripten::val callback);
  string get_daemon_connection(int handle);
  void is_connected(int handle, emscripten::val callback);
  void get_daemon_max_peer_height(int handle, emscripten::val callback);
  string get_version(int handle);
  string get_mnemonic(int handle);
  string get_mnemonic_language(int handle);
  string get_public_view_key(int handle);
  string get_private_view_key(int handle);
  string get_public_spend_key(int handle);
  string get_private_spend_key(int handle);
  string get_address(int handle, const uint32_t account_idx, const uint32_t subaddress_idx);
  string get_address_index(int handle, const string& address);
  string get_integrated_address(int handle, const string& standard_address = "", const string& payment_id = "");
  string decode_integrated_address(int handle, const string& integrated_address);
  void get_height(int handle, emscripten::val callback);
  void get_daemon_height(int handle, emscripten::val callback);
  void get_height_by_date(int handle, uint16_t year, uint8_t month, uint8_t day, emscripten::val callback);
  void is_daemon_synced(int handle, emscripten::val callback);
  void is_synced(int handle, emscripten::val callback);
  int get_network_type(int handle);
  long get_sync_height(int handle);
  void set_sync_height(int handle, long sync_height);
//  long get_daemon_height(int handle);
//  long get_daemon_max_peer_height(int handle);
  //void add_listener(int handle, monero_wallet_listener& listener);
  //void remove_listener(int handle, monero_wallet_listener& listener);
  //set<monero_wallet_listener*> get_listeners(int handle);
  int set_listener(int wallet_handle, int old_listener_handle, emscripten::val on_sync_progress = emscripten::val::undefined(), emscripten::val on_new_block = emscripten::val::undefined(), emscripten::val on_balances_changed = emscripten::val::undefined(), emscripten::val on_output_received = emscripten::val::undefined(), emscripten::val on_output_spent = emscripten::val::undefined());
  void sync(int handle, long start_height, emscripten::val callback);
  void stop_syncing(int handle);
  void rescan_spent(int handle, emscripten::val callback);
  void rescan_blockchain(int handle, emscripten::val callback);
  string get_balance_wallet(int handle);
  string get_balance_account(int handle, const uint32_t account_idx);
  string get_balance_subaddress(int handle, const uint32_t account_idx, const uint32_t subaddress_idx);
  string get_unlocked_balance_wallet(int handle);
  string get_unlocked_balance_account(int handle, const uint32_t account_idx);
  string get_unlocked_balance_subaddress(int handle, const uint32_t account_idx, const uint32_t subaddress_idx);
  string get_accounts(int handle, bool include_subaddresses = false, const string& tag = "");
  string get_account(int handle, uint32_t account_idx, bool include_subaddresses = false);
  string create_account(int handle, const string& label);
  string get_subaddresses(int handle, const string& args);
  string create_subaddress(int handle, const uint32_t account_idx, const string& label);
  void get_txs(int handle, const string& tx_query_json, emscripten::val callback);
  void get_transfers(int handle, const string& transfer_query_json, emscripten::val callback);
  void get_outputs(int handle, const string& output_query_json, emscripten::val callback);
  void get_outputs_hex(int handle, emscripten::val callback);
  void import_outputs_hex(int handle, const string& outputs_hex, emscripten::val callback);
  void get_key_images(int handle, emscripten::val callback);
  void import_key_images(int handle, const string& key_images_str, emscripten::val callback);
  //  emscripten::function("get_new_key_images_from_last_import", &monero_wasm_bridge::get_new_key_images_from_last_import);
  void create_txs(int handle, const string& config_json, emscripten::val callback);
  void sweep_output(int handle, const string& config_json, emscripten::val callback);
  void sweep_unlocked(int handle, const string& config_json, emscripten::val callback);
  void sweep_dust(int handle, bool relay, emscripten::val callback);
  void relay_txs(int handle, const string& args, emscripten::val callback);
  string describe_tx_set(int handle, const string& tx_set_str);
  string sign_txs(int handle, const string& unsigned_tx_hex);
  void submit_txs(int handle, const string& signed_tx_hex, emscripten::val callback);
  string sign_message(int handle, const string& msg, uint32_t signature_type_num, uint32_t account_idx, uint32_t subaddress_idx);
  string verify_message(int handle, const string& msg, const string& address, const string& signature);
  string get_tx_key(int handle, const string& tx_hash);
  string check_tx_key(int handle, const string& tx_hash, const string& tx_key, const string& address);
  string get_tx_proof(int handle, const string& tx_hash, const string& address, const string& message);
  string check_tx_proof(int handle, const string& tx_hash, const string& address, const string& message, const string& signature);
  string get_spend_proof(int handle, const string& tx_hash, const string& message);
  bool check_spend_proof(int handle, const string& tx_hash, const string& message, const string& signature);
  string get_reserve_proof_wallet(int handle, const string& message);
  string get_reserve_proof_account(int handle, uint32_t account_idx, const string& amount_str, const string& message);
  string check_reserve_proof(int handle, const string& address, const string& message, const string& signature);
  string get_tx_notes(int handle, const string& args);
  void set_tx_notes(int handle, const string& args);
  string get_address_book_entries(int handle, const string& args);
  int add_address_book_entry(int handle, const string& address, const string& description);
  void edit_address_book_entry(int handle, int index, bool setAddress, const string& address, bool setDescription, const string& description);
  void delete_address_book_entry(int handle, int entry_idx);
  void tag_accounts(int handle, const string& args);
  void untag_accounts(int handle, const string& args);
  string get_account_tags(int handle);
  void set_account_tag_label(int handle, const string& tag, const string& label);
  string create_payment_uri(int handle, const string& config_json);
  string parse_payment_uri(int handle, const string& uri);
  string get_attribute(int handle, const string& key);
  void set_attribute(int handle, const string& key, const string& val);
  bool is_multisig_import_needed(int handle);
  string get_multisig_info(int handle);
  string prepare_multisig(int handle);
  string make_multisig(int handle, const string& args);
  string exchange_multisig_keys(int handle, const string& args);
  string get_multisig_hex(int handle);
  void import_multisig_hex(int handle, const string& args, emscripten::val callback);
  void sign_multisig_tx_hex(int handle, const string& multisig_tx_hex, emscripten::val callback);
  void submit_multisig_tx_hex(int handle, const string& signed_multisig_tx_hex, emscripten::val callback);
  void close(int handle, bool save, emscripten::val callback);
  string get_keys_file_buffer(int handle, string password, bool view_only);
  string get_cache_file_buffer(int handle, string password);
}

#endif /* monero_wasm_bridge_h */
