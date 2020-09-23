cmake_minimum_required(VERSION 3.4.1)

project(monero-javascript-wasm)

# build with exception whitelist from file
file(STRINGS wasm_exception_whitelist.txt WASM_EXCEPTION_WHITELIST)
string(REPLACE ";" "," WASM_EXCEPTION_WHITELIST "${WASM_EXCEPTION_WHITELIST}")
SET(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11 -Oz --bind -s DISABLE_EXCEPTION_CATCHING=2 -s EXCEPTION_CATCHING_WHITELIST='[${WASM_EXCEPTION_WHITELIST}]'")
add_definitions(-DAUTO_INITIALIZE_EASYLOGGINGPP -DNO_AES)

set(BUILD_MONERO_CORE_WASM ON)
set(BUILD_MONERO_CORE_KEYS_WASM ON)

##############
# C++ bridge
##############

include_directories("src/cpp")

#####################
# monero-cpp
#####################

set(MONERO_CPP "external/monero-cpp")
set(MONERO_CPP_SRC "${MONERO_CPP}/src")

# headers
include_directories("${MONERO_CPP_SRC}")
include_directories("${MONERO_CPP}/external/libsodium/include")
include_directories("${MONERO_CPP}/external/libsodium/include/sodium")

##################
# monero-project
##################

set(MONERO_CORE "${MONERO_CPP}/external/monero-core")
set(MONERO_CORE_SRC "${MONERO_CORE}/src")

# headers
include_directories("src/main/cpp")
include_directories("${MONERO_CORE_SRC}/")
include_directories("${MONERO_CORE_SRC}/checkpoints")
include_directories("${MONERO_CORE_SRC}/common")
#include_directories("${MONERO_CORE_SRC}/crypto")
#include_directories("${MONERO_CORE_SRC}/crypto/crypto_ops_builder/include/")	# DISABLED?
#include_directories("${MONERO_CORE_SRC}/crypto/crypto_ops_builder/include/sodium")	# DISABLED?
include_directories("${MONERO_CORE_SRC}/cryptonote_basic")
#include_directories("${MONERO_CORE_SRC}/multisig")
#include_directories("${MONERO_CORE_SRC}/cryptonote_core")
#include_directories("${MONERO_CORE_SRC}/cryptonote_protocol")
#include_directories("${MONERO_CORE_SRC}/wallet")
#include_directories("${MONERO_CORE_SRC}/rpc")
#include_directories("${MONERO_CORE_SRC}/mnemonics")
include_directories("${MONERO_CORE}/external/")
include_directories("${MONERO_CORE}/external/easylogging++")
include_directories("${MONERO_CORE}/external/rapidjson/include")
include_directories("${MONERO_CORE}/external/unbound/libunbound")
include_directories("${MONERO_CORE}/external/db_drivers/liblmdb")
include_directories("${MONERO_CORE}/external/supercop/include")
include_directories("${MONERO_CORE}/contrib/epee/include")
include_directories("${MONERO_CORE}/contrib/epee/include/net")

#include_directories("${CMAKE_CURRENT_BINARY_DIR}")
#include_directories("${MONERO_CORE_SRC}/wallet/api")

include_directories("${MONERO_CORE}/build/release/translations")
include_directories("${MONERO_CORE}/build/release/generated_include")

#############
# OpenSSL
#############

#find_package(OpenSSL REQUIRED)
#message(STATUS "Using OpenSSL include dir at ${OPENSSL}")

set(OPENSSL ${CMAKE_SOURCE_DIR}/build/openssl)
include_directories("${OPENSSL}")
include_directories("${OPENSSL}/include") # must exist already - run bin/build-openssl-emscripten.sh

add_library(openssl_crypto STATIC IMPORTED)
set_target_properties(
    openssl_crypto PROPERTIES IMPORTED_LOCATION
    ${OPENSSL}/lib/libcrypto.a
)

add_library(openssl_ssl STATIC IMPORTED)
set_target_properties(
    openssl_ssl PROPERTIES IMPORTED_LOCATION
    ${OPENSSL}/lib/libssl.a
)

#############
# Boost
#############

set(BOOST ${CMAKE_SOURCE_DIR}/build/boost)
include_directories("${BOOST}")
include_directories("${BOOST}/include") # must exist already - run bin/build-boost-emscripten.sh

add_library(boost_chrono STATIC IMPORTED)
set_target_properties(
    boost_chrono PROPERTIES IMPORTED_LOCATION
    ${BOOST}/lib/libboost_chrono.a
)

add_library(boost_system STATIC IMPORTED)
set_target_properties(
    boost_system PROPERTIES IMPORTED_LOCATION
    ${BOOST}/lib/libboost_system.a
)

add_library(boost_thread STATIC IMPORTED)
set_target_properties(
    boost_thread PROPERTIES IMPORTED_LOCATION
    ${BOOST}/lib/libboost_thread.a
)

add_library(boost_serialization STATIC IMPORTED)
set_target_properties(
    boost_serialization PROPERTIES IMPORTED_LOCATION
    ${BOOST}/lib/libboost_serialization.a
)

add_library(boost_filesystem STATIC IMPORTED)
set_target_properties(
    boost_filesystem PROPERTIES IMPORTED_LOCATION
    ${BOOST}/lib/libboost_filesystem.a
)

add_library(boost_regex STATIC IMPORTED)
set_target_properties(
    boost_regex PROPERTIES IMPORTED_LOCATION
    ${BOOST}/lib/libboost_regex.a
)

#add_library(boost_atomic STATIC IMPORTED)
#set_target_properties(
    #boost_atomic PROPERTIES IMPORTED_LOCATION
    #${BOOST}/lib/libboost_atomic.a
#)

################################
# Keys-only wallet source files
################################

set(
    MONERO_CORE_KEYS_SRC_FILES
    
    # monero-javascript WASM bridge
    src/main/cpp/index.cpp
    src/main/cpp/monero_wasm_bridge.cpp
    
    # monero-cpp (modified for WASM)
    ${MONERO_CPP_SRC}/utils/monero_utils.cpp
    ${MONERO_CPP_SRC}/daemon/monero_daemon_model.cpp
    ${MONERO_CPP_SRC}/wallet/monero_wallet_model.cpp
    ${MONERO_CPP_SRC}/wallet/monero_wallet_keys.cpp
    ${MONERO_CPP}/external/libsodium/src/crypto_verify/verify.c
    
    # monero-project (modified for WASM)
    ${MONERO_CORE_SRC}/cryptonote_basic/cryptonote_basic_impl.cpp
    ${MONERO_CORE_SRC}/cryptonote_basic/account.cpp
    ${MONERO_CORE_SRC}/cryptonote_basic/cryptonote_format_utils.cpp
    ${MONERO_CORE_SRC}/crypto/crypto.cpp
    ${MONERO_CORE_SRC}/crypto/hash.c
    ${MONERO_CORE_SRC}/crypto/slow-hash.c
    ${MONERO_CORE_SRC}/crypto/oaes_lib.c
    ${MONERO_CORE_SRC}/crypto/crypto-ops.c
    ${MONERO_CORE_SRC}/crypto/crypto-ops-data.c
    ${MONERO_CORE_SRC}/crypto/keccak.c
    ${MONERO_CORE_SRC}/crypto/chacha.c
    ${MONERO_CORE_SRC}/crypto/random.c
    ${MONERO_CORE_SRC}/crypto/aesb.c
    ${MONERO_CORE_SRC}/crypto/tree-hash.c
    ${MONERO_CORE_SRC}/crypto/hash-extra-blake.c
    ${MONERO_CORE_SRC}/crypto/blake256.c
    ${MONERO_CORE_SRC}/crypto/hash-extra-groestl.c
    ${MONERO_CORE_SRC}/crypto/hash-extra-jh.c
    ${MONERO_CORE_SRC}/crypto/hash-extra-skein.c
    ${MONERO_CORE_SRC}/crypto/groestl.c
    ${MONERO_CORE_SRC}/crypto/jh.c
    ${MONERO_CORE_SRC}/crypto/skein.c
    ${MONERO_CORE_SRC}/cryptonote_core/cryptonote_tx_utils.cpp
    ${MONERO_CORE}/contrib/epee/src/hex.cpp
    ${MONERO_CORE}/contrib/epee/src/string_tools.cpp
    ${MONERO_CORE}/contrib/epee/src/memwipe.c
    ${MONERO_CORE}/contrib/epee/src/mlocker.cpp
    ${MONERO_CORE}/contrib/epee/src/wipeable_string.cpp
    ${MONERO_CORE_SRC}/common/base58.cpp
    ${MONERO_CORE_SRC}/device/device.cpp
    ${MONERO_CORE_SRC}/device/device_default.cpp
    ${MONERO_CORE_SRC}/multisig/multisig.cpp
    ${MONERO_CORE_SRC}/ringct/rctOps.cpp
    ${MONERO_CORE_SRC}/ringct/rctTypes.cpp
    ${MONERO_CORE_SRC}/ringct/rctCryptoOps.c
    ${MONERO_CORE_SRC}/ringct/rctSigs.cpp
    ${MONERO_CORE_SRC}/ringct/bulletproofs.cc
    ${MONERO_CORE_SRC}/ringct/multiexp.cc
    ${MONERO_CORE_SRC}/mnemonics/electrum-words.cpp
    ${MONERO_CORE}/external/easylogging++/easylogging++.cc
)

################################
# Core wallet source files
################################

set(
    MONERO_CORE_SRC_FILES
    
    # monero-javascript WASM bridge
    src/main/cpp/http_client_wasm.cpp
    
    # monero-cpp (modified for WASM)
    ${MONERO_CPP_SRC}/wallet/monero_wallet_core.cpp
    
    # monero-project (modified for WASM)
    ${MONERO_CORE}/external/db_drivers/liblmdb/mdb.c
    ${MONERO_CORE}/external/db_drivers/liblmdb/midl.c
    ${MONERO_CORE}/contrib/epee/src/abstract_http_client.cpp
    #${MONERO_CORE}/contrib/epee/src/http_auth.cpp
    ${MONERO_CORE_SRC}/wallet/wallet2.cpp
    ${MONERO_CORE_SRC}/wallet/message_store.cpp
    ${MONERO_CORE_SRC}/wallet/message_transporter.cpp
    ${MONERO_CORE_SRC}/wallet/node_rpc_proxy.cpp
    ${MONERO_CORE_SRC}/wallet/wallet_rpc_payments.cpp
    #${MONERO_CORE_SRC}/blockchain_db/lmdb/db_lmdb.cpp
    ${MONERO_CORE_SRC}/cryptonote_core/cryptonote_tx_utils.cpp
    ${MONERO_CORE_SRC}/checkpoints/checkpoints.cpp
    ${MONERO_CORE_SRC}/common/perf_timer.cpp
    ${MONERO_CORE_SRC}/common/threadpool.cpp
    ${MONERO_CORE_SRC}/common/aligned.c
    ${MONERO_CORE_SRC}/common/util.cpp
    ${MONERO_CORE_SRC}/common/i18n.cpp
    ${MONERO_CORE_SRC}/common/combinator.cpp
    ${MONERO_CORE_SRC}/rpc/rpc_payment_signature.cpp
    ${MONERO_CORE_SRC}/wallet/ringdb.cpp
    ${MONERO_CORE_SRC}/cryptonote_basic/miner.cpp
    ${MONERO_CORE_SRC}/cryptonote_basic/difficulty.cpp
    ${MONERO_CORE_SRC}/cryptonote_core/tx_sanity_check.cpp
)

####################
# Build parameters
####################

#-s USE_PTHREADS=1 \
#-s PTHREAD_POOL_SIZE=2 \
#-s PROXY_TO_PTHREAD \
#-s DISABLE_EXCEPTION_CATCHING=0 \
#-s ASYNCIFY=1 \
#-s 'ASYNCIFY_IMPORTS=[\"js_send_json_request\",\"js_send_binary_request\",\"emscripten_sleep\"]' \
#-s ALLOW_MEMORY_GROWTH=0 \
#-s INITIAL_MEMORY=1536MB \

set (
EMCC_LINKER_FLAGS_BASE

# unsure if the -I...boost..include is necessary here due to include above
# TODO? does EXPORT_NAME need to be the same for both targets? (or should it be set per-target with …_WASM, …_ASMJS?)

"-Wall -Werror -std=c++11 -Oz \
--bind -s MODULARIZE=1 \
-s 'EXPORT_NAME=\"monero_javascript\"' \
-s ERROR_ON_UNDEFINED_SYMBOLS=0 \
-s ASSERTIONS=2 \
-s EXIT_RUNTIME=0 \
-s PRECISE_F32=1 \
-s EXCEPTION_DEBUG=0 \
-s DEMANGLE_SUPPORT=0 \
-s NO_DYNAMIC_EXECUTION=1 \
-s NODEJS_CATCH_EXIT=0 \
-s RESERVED_FUNCTION_POINTERS=5 \
-s EXTRA_EXPORTED_RUNTIME_METHODS='[\"UTF8ToString\",\"stringToUTF8\",\"lengthBytesUTF8\",\"intArrayToString\",\"makeBigInt\",\"getTempRet0\",\"addFunction\"]' \
-s WASM=1 \
-s ALLOW_MEMORY_GROWTH=1 \
"
    # • Disabling exception catching does not introduce silent failures 
    # • Probably don't need PRECISE_F32 but wouldn't want to not use it
    #
    #
    # -s SAFE_HEAP=1 \
    # -g \
)

set(
EMCC_LINKER_FLAGS_CORE_KEYS
"${EMCC_LINKER_FLAGS_BASE} \
"
)

set(
EMCC_LINKER_FLAGS_CORE
"${EMCC_LINKER_FLAGS_BASE} \
-s ASYNCIFY=1 \
-s 'ASYNCIFY_IMPORTS=[\"js_send_json_request\",\"js_send_binary_request\",\"emscripten_sleep\"]' \
"
)

message(STATUS "EMCC_LINKER_FLAGS_CORE_KEYS ${EMCC_LINKER_FLAGS_CORE_KEYS}")
message(STATUS "EMCC_LINKER_FLAGS_CORE ${EMCC_LINKER_FLAGS_CORE}")

####################
# Build targets
####################

if (BUILD_MONERO_CORE_KEYS_WASM)
	add_executable(monero_core_keys ${MONERO_CORE_KEYS_SRC_FILES})
	set_target_properties(monero_core_keys PROPERTIES LINK_FLAGS "${EMCC_LINKER_FLAGS_CORE_KEYS}")
	target_link_libraries(
	    monero_core_keys
	    #
	    boost_chrono
	    boost_system
	    boost_thread
	    #
	    ${log-lib}
	)
endif()

if (BUILD_MONERO_CORE_WASM)
	add_executable(monero_core ${MONERO_CORE_SRC_FILES} ${MONERO_CORE_KEYS_SRC_FILES})
	set_target_properties(monero_core PROPERTIES LINK_FLAGS "${EMCC_LINKER_FLAGS_CORE}")
	target_compile_definitions(monero_core PRIVATE BUILD_CORE_WALLET=1)
	target_link_libraries(
	    monero_core
	    #
	    #openssl_ssl
	    #openssl_crypto
	    #
	    boost_chrono
	    boost_system
	    boost_thread
	    boost_serialization
	    #boost_filesystem
	    boost_regex
	    #boost_atomic
	    #
	    ${log-lib}
	)
endif()

# build to bitcode instead of wasm
#SET(CMAKE_EXECUTABLE_SUFFIX ".bc")	