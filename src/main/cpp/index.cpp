#include <stdio.h>
#include <emscripten/bind.h>
//#include <emscripten.h>

#include "monero_wasm_bridge.h"

// register bindings from JS to C++ using emscripten
EMSCRIPTEN_BINDINGS(module)
{
  // ------------------------------ UTILITIES ---------------------------------

  emscripten::function("validate_address", &monero_wasm_bridge::validate_address);
  emscripten::function("get_exception_message", &monero_wasm_bridge::get_exception_message);
  emscripten::function("malloc_binary_from_json", &monero_wasm_bridge::malloc_binary_from_json);
  emscripten::function("binary_to_json", &monero_wasm_bridge::binary_to_json);
  emscripten::function("binary_blocks_to_json", &monero_wasm_bridge::binary_blocks_to_json);

  // --------------------------- WALLET CREATION ------------------------------

  emscripten::function("open_full_wallet", &monero_wasm_bridge::open_full_wallet);
  emscripten::function("create_full_wallet_random", &monero_wasm_bridge::create_full_wallet_random);
  emscripten::function("create_full_wallet_from_mnemonic", &monero_wasm_bridge::create_full_wallet_from_mnemonic);
  emscripten::function("create_full_wallet_from_keys", &monero_wasm_bridge::create_full_wallet_from_keys);
  emscripten::function("get_full_wallet_mnemonic_languages", &monero_wasm_bridge::get_full_wallet_mnemonic_languages);

  emscripten::function("create_keys_wallet_random", &monero_wasm_bridge::create_keys_wallet_random);
  emscripten::function("create_keys_wallet_from_mnemonic", &monero_wasm_bridge::create_keys_wallet_from_mnemonic);
  emscripten::function("create_keys_wallet_from_keys", &monero_wasm_bridge::create_keys_wallet_from_keys);
  emscripten::function("get_keys_wallet_mnemonic_languages", &monero_wasm_bridge::get_keys_wallet_mnemonic_languages);

  // ----------------------- WALLET INSTANCE METHODS --------------------------

  emscripten::function("is_view_only", &monero_wasm_bridge::is_view_only);
  emscripten::function("set_daemon_connection", &monero_wasm_bridge::set_daemon_connection);
  emscripten::function("get_daemon_connection", &monero_wasm_bridge::get_daemon_connection);
  emscripten::function("is_connected", &monero_wasm_bridge::is_connected);
  emscripten::function("get_daemon_max_peer_height", &monero_wasm_bridge::get_daemon_max_peer_height);
  emscripten::function("get_version", &monero_wasm_bridge::get_version);
  emscripten::function("get_mnemonic", &monero_wasm_bridge::get_mnemonic);
  emscripten::function("get_mnemonic_language", &monero_wasm_bridge::get_mnemonic_language);
  emscripten::function("get_private_spend_key", &monero_wasm_bridge::get_private_spend_key);
  emscripten::function("get_private_view_key", &monero_wasm_bridge::get_private_view_key);
  emscripten::function("get_public_view_key", &monero_wasm_bridge::get_public_view_key);
  emscripten::function("get_public_spend_key", &monero_wasm_bridge::get_public_spend_key);
  emscripten::function("get_address", &monero_wasm_bridge::get_address);
  emscripten::function("get_address_index", &monero_wasm_bridge::get_address_index);
  emscripten::function("get_integrated_address", &monero_wasm_bridge::get_integrated_address);
  emscripten::function("decode_integrated_address", &monero_wasm_bridge::decode_integrated_address);
  emscripten::function("get_height", &monero_wasm_bridge::get_height);
  emscripten::function("get_daemon_height", &monero_wasm_bridge::get_daemon_height);
  emscripten::function("get_height_by_date", &monero_wasm_bridge::get_height_by_date);
  emscripten::function("is_daemon_synced", &monero_wasm_bridge::is_daemon_synced);
  emscripten::function("is_synced", &monero_wasm_bridge::is_synced);
  emscripten::function("get_network_type", &monero_wasm_bridge::get_network_type);
  emscripten::function("get_sync_height", &monero_wasm_bridge::get_sync_height);
  emscripten::function("set_sync_height", &monero_wasm_bridge::set_sync_height);
  emscripten::function("set_listener", &monero_wasm_bridge::set_listener);
  emscripten::function("sync", &monero_wasm_bridge::sync);
  emscripten::function("stop_syncing", &monero_wasm_bridge::stop_syncing);
  emscripten::function("rescan_spent", &monero_wasm_bridge::rescan_spent);
  emscripten::function("rescan_blockchain", &monero_wasm_bridge::rescan_blockchain);
  emscripten::function("get_balance_wallet", &monero_wasm_bridge::get_balance_wallet);
  emscripten::function("get_balance_account", &monero_wasm_bridge::get_balance_account);
  emscripten::function("get_balance_subaddress", &monero_wasm_bridge::get_balance_subaddress);
  emscripten::function("get_unlocked_balance_wallet", &monero_wasm_bridge::get_unlocked_balance_wallet);
  emscripten::function("get_unlocked_balance_account", &monero_wasm_bridge::get_unlocked_balance_account);
  emscripten::function("get_unlocked_balance_subaddress", &monero_wasm_bridge::get_unlocked_balance_subaddress);
  emscripten::function("get_accounts", &monero_wasm_bridge::get_accounts);
  emscripten::function("get_account", &monero_wasm_bridge::get_account);
  emscripten::function("create_account", &monero_wasm_bridge::create_account);
  emscripten::function("get_subaddresses", &monero_wasm_bridge::get_subaddresses);
  emscripten::function("create_subaddress", &monero_wasm_bridge::create_subaddress);
  emscripten::function("get_txs", &monero_wasm_bridge::get_txs);
  emscripten::function("get_transfers", &monero_wasm_bridge::get_transfers);
  emscripten::function("get_outputs", &monero_wasm_bridge::get_outputs);
  emscripten::function("export_outputs", &monero_wasm_bridge::export_outputs);
  emscripten::function("import_outputs", &monero_wasm_bridge::import_outputs);
  emscripten::function("get_key_images", &monero_wasm_bridge::get_key_images);
  emscripten::function("import_key_images", &monero_wasm_bridge::import_key_images);
//  emscripten::function("get_new_key_images_from_last_import", &monero_wasm_bridge::get_new_key_images_from_last_import);
  emscripten::function("create_txs", &monero_wasm_bridge::create_txs);
  emscripten::function("sweep_output", &monero_wasm_bridge::sweep_output);
  emscripten::function("sweep_unlocked", &monero_wasm_bridge::sweep_unlocked);
  emscripten::function("sweep_dust", &monero_wasm_bridge::sweep_dust);
  emscripten::function("relay_txs", &monero_wasm_bridge::relay_txs);
  emscripten::function("describe_tx_set", &monero_wasm_bridge::describe_tx_set);
  emscripten::function("sign_txs", &monero_wasm_bridge::sign_txs);
  emscripten::function("submit_txs", &monero_wasm_bridge::submit_txs);
  emscripten::function("sign_message", &monero_wasm_bridge::sign_message);
  emscripten::function("verify_message", &monero_wasm_bridge::verify_message);
  emscripten::function("get_tx_key", &monero_wasm_bridge::get_tx_key);
  emscripten::function("check_tx_key", &monero_wasm_bridge::check_tx_key);
  emscripten::function("get_tx_proof", &monero_wasm_bridge::get_tx_proof);
  emscripten::function("check_tx_proof", &monero_wasm_bridge::check_tx_proof);
  emscripten::function("get_spend_proof", &monero_wasm_bridge::get_spend_proof);
  emscripten::function("check_spend_proof", &monero_wasm_bridge::check_spend_proof);
  emscripten::function("get_reserve_proof_wallet", &monero_wasm_bridge::get_reserve_proof_wallet);
  emscripten::function("get_reserve_proof_account", &monero_wasm_bridge::get_reserve_proof_account);
  emscripten::function("check_reserve_proof", &monero_wasm_bridge::check_reserve_proof);
  emscripten::function("get_tx_notes", &monero_wasm_bridge::get_tx_notes);
  emscripten::function("set_tx_notes", &monero_wasm_bridge::set_tx_notes);
  emscripten::function("get_address_book_entries", &monero_wasm_bridge::get_address_book_entries);
  emscripten::function("add_address_book_entry", &monero_wasm_bridge::add_address_book_entry);
  emscripten::function("edit_address_book_entry", &monero_wasm_bridge::edit_address_book_entry);
  emscripten::function("delete_address_book_entry", &monero_wasm_bridge::delete_address_book_entry);
  emscripten::function("tag_accounts", &monero_wasm_bridge::tag_accounts);
  emscripten::function("untag_accounts", &monero_wasm_bridge::untag_accounts);
  emscripten::function("get_account_tags", &monero_wasm_bridge::get_account_tags);
  emscripten::function("set_account_tag_label", &monero_wasm_bridge::set_account_tag_label);
  emscripten::function("create_payment_uri", &monero_wasm_bridge::create_payment_uri);
  emscripten::function("parse_payment_uri", &monero_wasm_bridge::parse_payment_uri);
  emscripten::function("get_attribute", &monero_wasm_bridge::get_attribute);
  emscripten::function("set_attribute", &monero_wasm_bridge::set_attribute);
  emscripten::function("is_multisig_import_needed", &monero_wasm_bridge::is_multisig_import_needed);
  emscripten::function("get_multisig_info", &monero_wasm_bridge::get_multisig_info);
  emscripten::function("prepare_multisig", &monero_wasm_bridge::prepare_multisig);
  emscripten::function("make_multisig", &monero_wasm_bridge::make_multisig);
  emscripten::function("exchange_multisig_keys", &monero_wasm_bridge::exchange_multisig_keys);
  emscripten::function("get_multisig_hex", &monero_wasm_bridge::get_multisig_hex);
  emscripten::function("import_multisig_hex", &monero_wasm_bridge::import_multisig_hex);
  emscripten::function("sign_multisig_tx_hex", &monero_wasm_bridge::sign_multisig_tx_hex);
  emscripten::function("submit_multisig_tx_hex", &monero_wasm_bridge::submit_multisig_tx_hex);
  emscripten::function("get_keys_file_buffer", &monero_wasm_bridge::get_keys_file_buffer);
  emscripten::function("get_cache_file_buffer", &monero_wasm_bridge::get_cache_file_buffer);
  emscripten::function("close", &monero_wasm_bridge::close);
}
extern "C"
{
}
