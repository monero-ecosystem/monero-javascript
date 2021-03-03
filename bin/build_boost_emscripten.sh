#!/bin/sh

. $(dirname $0)/emsdk_inc.sh
[ -f $(dirname $0)/colors.sh ] && . $(dirname $0)/colors.sh

PLATFORM="emscripten"

SRC_DIR="external/monero-cpp/external/boost-sdk"
INSTALL_DIR="build/boost"

SRC_PATH="$(pwd)/$SRC_DIR"
INSTALL_PATH="$(pwd)/$INSTALL_DIR"
JAM_CONFIG_PATH="$(pwd)/configs/$PLATFORM.jam"

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
          get_boost_github ${SRC_PATH} || exit 1
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
          get_boost_source ${SRC_PATH} || exit 1
        }
        ;;
      "")
        [ -d ${SRC_PATH} ] \
        || {
          echo "* Missing $(basename ${SRC_PATH}) Downloading..."
          get_boost_source ${SRC_PATH} || exit 1
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

cd $EMSCRIPTEN

python3 ./embuilder.py build zlib \
|| {
  echo "EMSDK build zlib failed.."
  exit 1
}

# ---

cd "$SRC_PATH"

rm -rf bjam
rm -rf b2
rm -rf project-config.jam
rm -rf bootstrap.log
rm -rf bin.v2

export NO_BZIP2=1 #bc it's supplied by emscripten but b2 will fail to find it

#  --with-libraries=atomic,signals,timer,system,filesystem,thread,date_time,chrono,regex,serialization,program_options,locale \


./bootstrap.sh \
  --with-libraries=system,thread,chrono,serialization,regex \
2>&1

if [ $? != 0 ]; then
  echo "ERROR: boostrap FAILED!"
  exit 1
fi

cat "$JAM_CONFIG_PATH" >> project-config.jam

# ---
# Clean 
rm -rf "$INSTALL_PATH"
mkdir "$INSTALL_PATH"


HOST_NCORES=$(nproc 2>/dev/null|| shell nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 1)

./b2 -q -a -j $HOST_NCORES    \
  toolset=clang-emscripten    \
  threading=single            \
  link=static                 \
  optimization=space          \
  variant=release             \
  cxxflags=-no-pthread        \
  stage                       \
  --stagedir="$INSTALL_PATH"  \
  2>&1

unset NO_BZIP2

if [ $? != 0 ]; then
  echo "ERROR: b2 FAILED!"
  exit 1
fi

# ---

cd "$INSTALL_PATH"
ln -s "$SRC_PATH" include