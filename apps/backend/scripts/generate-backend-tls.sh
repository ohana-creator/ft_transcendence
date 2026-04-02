#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TLS_DIR="${ROOT_DIR}/secrets/tls"

mkdir -p "${TLS_DIR}"

cat > "${TLS_DIR}/backend-openssl.cnf" <<'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[dn]
C = PT
ST = Lisboa
L = Lisboa
O = ft_transcendence
OU = Backend
CN = backend.local

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = api-gateway
DNS.3 = auth-service
DNS.4 = campaign-service
DNS.5 = notification-service
DNS.6 = user-service
DNS.7 = wallet-service
DNS.8 = ledger-service
IP.1 = 127.0.0.1
EOF

openssl genrsa -out "${TLS_DIR}/ca.key" 4096
openssl req -x509 -new -nodes -key "${TLS_DIR}/ca.key" -sha256 -days 825 \
  -subj "/C=PT/ST=Lisboa/L=Lisboa/O=ft_transcendence/OU=Backend/CN=ft-trans-backend-ca" \
  -out "${TLS_DIR}/ca.crt"

openssl genrsa -out "${TLS_DIR}/backend.key" 2048
openssl req -new -key "${TLS_DIR}/backend.key" \
  -out "${TLS_DIR}/backend.csr" \
  -config "${TLS_DIR}/backend-openssl.cnf"

openssl x509 -req -in "${TLS_DIR}/backend.csr" -CA "${TLS_DIR}/ca.crt" -CAkey "${TLS_DIR}/ca.key" \
  -CAcreateserial -out "${TLS_DIR}/backend.crt" -days 825 -sha256 \
  -extensions req_ext -extfile "${TLS_DIR}/backend-openssl.cnf"

chmod 600 "${TLS_DIR}"/*.key
chmod 644 "${TLS_DIR}"/*.crt

echo "TLS files generated in ${TLS_DIR}"
echo "Import ${TLS_DIR}/ca.crt in your local trust store if you want the browser to trust it."
