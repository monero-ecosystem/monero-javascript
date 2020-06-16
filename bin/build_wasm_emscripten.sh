#!/bin/sh

#EMCC_DEBUG=1

export BOOSTROOT="build/boost/lib"
export BOOST_ROOT=$BOOSTROOT
export BOOST_LIB=$BOOSTROOT/lib
export BOOST_IGNORE_SYSTEM_PATHS=1
export BOOST_LIBRARYDIR=$BOOSTROOT/lib

# delete emscripten cache (enable if modifying em_js or its dependencies for full refresh)
rm -rf ~/.emscripten_cache || exit 1

# build wasm files
HOST_NCORES=$(nproc 2>/dev/null || shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)
[ -d build ] || mkdir -p build || exit 1
cd build || exit 1
emcmake cmake .. || exit 1
emmake cmake --build . -j$HOST_NCORES || exit 1

# move available wasm files to ./dist
cd ..
mkdir -p ./dist || exit 1
[ -f ./build/monero_core_keys.js ] \
  && {
    mv ./build/monero_core_keys.js ./dist/
  }

[ -f ./build/monero_core_keys.wasm ] \
  && {
    mv ./build/monero_core_keys.wasm ./dist/
  }

[ -f ./build/monero_core.js ] \
  && {
    mv ./build/monero_core.js ./dist/
  }

[ -f ./build/monero_core.wasm ] \
  && {
    mv ./build/monero_core.wasm ./dist/
  }