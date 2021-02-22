#!/bin/sh

EMCC_DEBUG=${EMCC_DEBUG:-0}

[ -z ${EMSDK} ] \
  && {
    echo "Missing EMSDK Environment variable.  Did you remember to run 'source /path/to/emsdk/emsdk_env.sh' ?"
    [ "$(basename $0)" = "bash" ] \
    || { 
      echo "Terminating..."
      exit 1
    }
  }

#unset EMSCRIPTEN
[ -z ${EMSCRIPTEN} ] \
  && {
    [ -d "${EMSDK}/upstream/emscripten" ] \
    && {
      export EMSCRIPTEN="${EMSDK}/upstream/emscripten"
      echo "export EMSCRIPTEN = ${EMSCRIPTEN}"
    } \
    || {
      echo "Missing directory: \${EMSDK}/upstream/emscripten"
    }
  } \
  || {
    echo "EMSCRIPTEN Environment OK"
  }

[ ${EMCC_DEBUG} -ge 1 ] \
  && {
    echo "Running make clean in build directory..."
    make -C ./build clean
  }

get_boost_github() {
  local SDK_PATH=$1
  [ -z ${SDK_PATH} ] && { echo "get_boost_github: Missing SDK_PATH parameter..."; return 1; }

  [ "$(basename ${SDK_PATH})" = "boost-sdk" ] \
  && {
    rm -fr ${SDK_PATH}
    SDK_PATH=$(dirname ${SDK_PATH})
  }
  
  [ -d ${SDK_PATH} ] || { echo "get_boost_github: Missing directory: ${SDK_PATH}"; return 1; }

  echo "Downloading boost from GitHub..."
  git clone --recursive https://github.com/boostorg/boost.git --branch "boost-1.75.0" "${SDK_PATH}/boost-sdk" \
  || {
    echo "Download failed"
    return 1
  }
  return 0
}

get_openssl_github() {
  local SDK_PATH=$1
  [ -z ${SDK_PATH} ] && { echo "get_openssl_github: Missing SDK_PATH parameter..."; return 1; }

  [ "$(basename ${SDK_PATH})" = "openssl-sdk" ] \
  && {
    rm -fr ${SDK_PATH}
    SDK_PATH=$(dirname ${SDK_PATH})
  }
  
  [ -d ${SDK_PATH} ] || { echo "get_openssl_github: Missing directory: ${SDK_PATH}"; return 1; }

  echo "Downloading openssl repository from GitHub..."

  git clone --recursive https://github.com/openssl/openssl.git "${SDK_PATH}/openssl-sdk" \
    && {
      (
        cd "${SDK_PATH}/openssl-sdk"
        git checkout OpenSSL_1_1_1-stable
      )
    } \
    || {
      echo "Download failed"
      return 1
    }

  return 0
}

download_source() { # url, destination
  local DL_URL=$1
  local SDK_PATH=$2

  which wget 2>&1 > /dev/null \
  && {
    wget -N -P ${SDK_PATH} ${DL_URL} \
    && {
      return 0
    } \
    || {
      echo "wget download failed... check download location..."
      return 1
    }
  }

  which curl 2>&1 > /dev/null \
  && {
    (
      cd ${SDK_PATH}
      curl -L -O ${DL_URL} \
      && {
      return 0
      } \
      || {
        echo "curl download failed... check download location..."
        return 1
      }
    )
  }

  [ -f "${SDK_PATH}/$(basename ${DL_URL})" ] \
  || {
    echo "Both wget and curl failed. Don't know how to proseed."
    return 1
  }
}

check_archive() {
  [ -f "$1" ] || return 1

  gzip -t "$1" 2>&1 > /dev/null \
  && return 0 \
  || {
    echo "${RED}Corrupt file detected:${WHITE}Deleting ${YELLOW}$(basename $1)${RESTORE}"
    rm -fr $1
    return 1
  }
}

get_boost_source() {
  local SDK_PATH=$1
  [ -z ${SDK_PATH} ] && { echo "get_boost_source: Missing SDK_PATH parameter..."; return 1; }

  [ "$(basename ${SDK_PATH})" = "boost-sdk" ] \
  && {
    rm -fr ${SDK_PATH}
    SDK_PATH=$(dirname ${SDK_PATH})
  }
  
  [ -d ${SDK_PATH} ] || { echo "get_boost_source: Missing directory: ${SDK_PATH}"; return 1; }

  # Github source is missing stuff
  #local DL_URL="https://github.com/boostorg/boost/archive/boost-1.75.0.tar.gz"
  local DL_URL="https://dl.bintray.com/boostorg/release/1.75.0/source"
  local DL_FILE="boost_1_75_0.tar.gz"

  check_archive "${SDK_PATH}/${DL_FILE}" \
  && {
    echo "${DL_FILE} is already in ${SDK_PATH}"
  } \
  || {
    echo "Downloading boost source..."
    download_source ${DL_URL}/${DL_FILE} ${SDK_PATH} || return 1
  }

  mkdir ${SDK_PATH}/boost-sdk
  tar -C ${SDK_PATH}/boost-sdk --strip-components=1 -xvf "${SDK_PATH}/${DL_FILE}" || return 1

  return 0
}

get_openssl_source() {
  local SDK_PATH=$1
  [ -z ${SDK_PATH} ] && { echo "get_openssl_source: Missing SDK_PATH parameter..."; return 1; }

  [ "$(basename ${SDK_PATH})" = "openssl-sdk" ] \
  && {
    rm -fr ${SDK_PATH}
    SDK_PATH=$(dirname ${SDK_PATH})
  }
  
  [ -d ${SDK_PATH} ] || { echo "get_openssl_source: Missing directory: ${SDK_PATH}"; return 1; }

  local DL_URL="https://github.com/openssl/openssl/archive"
  local DL_FILE="OpenSSL_1_1_1d.tar.gz"

  check_archive "${SDK_PATH}/${DL_FILE}" \
  && {
    echo "${DL_FILE} is already in ${SDK_PATH}"
  } \
  || {
    echo "Downloading openssl source..."
    download_source "${DL_URL}/${DL_FILE}" "${SDK_PATH}"  || return 1
  }

  mkdir ${SDK_PATH}/openssl-sdk
  tar -C ${SDK_PATH}/openssl-sdk --strip-components=1 -xvf ${SDK_PATH}/OpenSSL_1_1_1d.tar.gz || return 1

  return 0
}
