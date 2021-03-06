#ifndef http_client_wasm_h
#define http_client_wasm_h

#pragma once

#include "net/abstract_http_client.h"
#include <string>

using namespace std;
using namespace epee::net_utils::http;

namespace epee
{
  namespace net_utils
  {
    namespace http
    {
      /**
       * Implements an abstract_http_client using a WebAssembly bridge.
       */
      class http_client_wasm : public abstract_http_client
      {
      public:
        http_client_wasm(const string& reject_unauthorized_fn_id) : m_reject_unauthorized_fn_id(reject_unauthorized_fn_id), m_user(boost::none), m_is_connected(false), m_response_info() { }
        ~http_client_wasm() {
          disconnect();
        }

        bool set_proxy(const std::string& address) override;
        void set_server(std::string host, std::string port, boost::optional<login> user, ssl_options_t ssl_options = ssl_support_t::e_ssl_support_autodetect) override;
        void set_auto_connect(bool auto_connect) override;
        bool connect(std::chrono::milliseconds timeout) override;
        bool disconnect() override;
        bool is_connected(bool *ssl = NULL) override;
        bool invoke(const boost::string_ref uri, const boost::string_ref method, const boost::string_ref body, std::chrono::milliseconds timeout, const http_response_info** ppresponse_info = NULL, const fields_list& additional_params = fields_list()) override;
        bool invoke_get(const boost::string_ref uri, std::chrono::milliseconds timeout, const string& body = string(), const http_response_info** ppresponse_info = NULL, const fields_list& additional_params = fields_list()) override;
        bool invoke_post(const boost::string_ref uri, const string& body, std::chrono::milliseconds timeout, const http_response_info** ppresponse_info = NULL, const fields_list& additional_params = fields_list()) override;
        uint64_t get_bytes_sent() const override;
        uint64_t get_bytes_received() const override;

      private:
        string m_host;
        string m_port;
        boost::optional<login> m_user;
        string m_reject_unauthorized_fn_id;
        bool m_ssl_enabled;
        bool m_is_connected;
        http_response_info m_response_info;
        bool m_auto_connect;

        bool invoke_json(const boost::string_ref uri, const boost::string_ref method, const std::string& body, std::chrono::milliseconds timeout, const http_response_info** ppresponse_info, const fields_list& additional_params);
        bool invoke_binary(const boost::string_ref uri, const boost::string_ref method, const std::string& body, std::chrono::milliseconds timeout, const http_response_info** ppresponse_info, const fields_list& additional_params);
      };

      /**
       * Factory for WebAssembly http client.
       */
      class http_client_wasm_factory : public http_client_factory
      {
      public:
        http_client_wasm_factory(const string& reject_unauthorized_fn_id) : m_reject_unauthorized_fn_id(reject_unauthorized_fn_id) { }
        std::unique_ptr<abstract_http_client> create() override {
          return std::unique_ptr<epee::net_utils::http::abstract_http_client>(new http_client_wasm(m_reject_unauthorized_fn_id));
        }
      private:
        string m_reject_unauthorized_fn_id; // used to look up in JS if unauthorized certificates should be rejected
      };
    }
  }
}

#endif /* http_client_wasm_h */
