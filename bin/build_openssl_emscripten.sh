#!/bin/sh

. $(dirname $0)/emsdk_inc.sh
[ -f $(dirname $0)/colors.sh ] && . $(dirname $0)/colors.sh

PLATFORM="emscripten"

SRC_DIR="external/monero-cpp/external/openssl-sdk"
INSTALL_DIR="build/openssl"

SRC_PATH="$(pwd)/$SRC_DIR"
INSTALL_PATH="$(pwd)/$INSTALL_DIR"


[ ! -d ${SRC_PATH} -o $# -ge 1 ] \
  && {
    case "$1" in
      "github"|"clone")
        shift
        [ -d ${SRC_PATH} -a "$1" != "force" ] \
        && {
          echo "${RED}Target directory exists.${WHITE} Will not proceed without ${YELLOW}'force'${RESTORE}"
          exit 1
        }
        [ ! -d ${SRC_PATH} -o "$1" = "force" ] \
        && {
          get_openssl_github ${SRC_PATH} || exit 1
        }
        ;;
      "archive"|"source")
        shift
        [ -d ${SRC_PATH} -a "$1" != "force" ] \
        && {
          echo "${RED}Target directory exists.${WHITE} Will not proceed without ${YELLOW}'force'${RESTORE}"
          exit 1
        }
        [ ! -d ${SRC_PATH} -o "$1" = "force" ] \
        && {
          get_openssl_source ${SRC_PATH} || exit 1
        }
        ;;
      "")
        [ -d ${SRC_PATH} ] \
        || {
          echo "* Missing $(basename ${SRC_PATH}) Downloading..."
          get_openssl_source ${SRC_PATH} || exit 1
        }
        ;;
      *)
        echo "Unknown parameter: $1"
        exit 1
        ;;
    esac
  }

if [ ! -d "$SRC_PATH" ]; then
  echo "SOURCE NOT FOUND!"
  exit 1
fi

if [ -z "$EMSCRIPTEN" ]; then
  echo "EMSCRIPTEN MUST BE DEFINED!"
  exit -1  
fi

cd "$SRC_PATH"

emcmake perl ./Configure \
	linux-generic32 \
	-no-asm no-ssl2 no-ssl3 no-comp no-engine no-deprecated no-tests no-dso no-shared no-threads disable-shared \
	--prefix="$INSTALL_PATH" \
	--openssldir="$INSTALL_PATH" \
	2>&1

if [ $? != 0 ]; then
  echo "ERROR: OpenSSL Configure FAILED!"
  exit 1
fi

echo "* set CROSS_COMPILE to blank"
to_cross_compile_line='CROSS_COMPILE='
sed -i.bak 's/^CROSS_COMPILE=\/.*$/'"$to_cross_compile_line"'/' Makefile #must match whole line with start char or we might do it repeatedly .. though this particular one would be idempotent anyway
# ^-- not 'g' b/c we only expect one

echo "* set define_atomics"
[ ! -f include/internal/refcount.h ] \
  && {
    echo "openssl - wrong version. We need openssl >= 1.1.1"
    exit 1
  }

to_defined_atomics_line='\&\& !defined(__STDC_NO_ATOMICS__) \&\& !defined(__EMSCRIPTEN__)'
sed -i.bak 's/\&\&\ !defined(__STDC_NO_ATOMICS__)$/'"$to_defined_atomics_line"'/' include/internal/refcount.h #the pattern is relying here on the fact the "ATOMICS__)" comes at the end of the line
# ^-- not 'g' b/c we only expect one


# ---
# Clean 
rm -rf "$INSTALL_PATH"
mkdir "$INSTALL_PATH"

HOST_NCORES=$(nproc 2>/dev/null|| shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)

emmake make -j${HOST_NCORES} \
|| {
  echo "Make openssl failed..."
  exit 1
}

# now we must move build products by manually calling make install

make install_sw \
	2>&1

