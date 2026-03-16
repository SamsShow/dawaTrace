#!/bin/bash
set -euo pipefail

CHANNEL_NAME="dawaTrace-channel"
CC_NAME="dawaTrace"
CC_VERSION="1.0"
CC_SEQUENCE="1"
CC_PATH="../../chaincode/dawaTrace"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Deploying DawaTrace Chaincode ==="

# Set environment for Org1 (Manufacturer)
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="OrgMfgMSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${NETWORK_DIR}/crypto-config/peerOrganizations/org-mfg.dawaTrace.com/peers/peer0.org-mfg.dawaTrace.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${NETWORK_DIR}/crypto-config/peerOrganizations/org-mfg.dawaTrace.com/users/Admin@org-mfg.dawaTrace.com/msp"
export CORE_PEER_ADDRESS="localhost:7051"
export ORDERER_CA="${NETWORK_DIR}/crypto-config/ordererOrganizations/orderer.dawaTrace.com/orderers/orderer.orderer.dawaTrace.com/msp/tlscacerts/tlsca.orderer.dawaTrace.com-cert.pem"

echo "Step 1: Build and package chaincode..."
cd "${NETWORK_DIR}/${CC_PATH}"
go mod tidy
cd "$NETWORK_DIR"

peer lifecycle chaincode package "${CC_NAME}.tar.gz" \
  --path "${CC_PATH}" \
  --lang golang \
  --label "${CC_NAME}_${CC_VERSION}"

echo "Step 2: Install chaincode on all peers..."
peer lifecycle chaincode install "${CC_NAME}.tar.gz"

# Get package ID
CC_PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "${CC_NAME}_${CC_VERSION}" | awk '{print $3}' | sed 's/,//')
echo "Package ID: ${CC_PACKAGE_ID}"

echo "Step 3: Approve for all orgs..."
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.orderer.dawaTrace.com \
  --channelID "${CHANNEL_NAME}" \
  --name "${CC_NAME}" \
  --version "${CC_VERSION}" \
  --package-id "${CC_PACKAGE_ID}" \
  --sequence "${CC_SEQUENCE}" \
  --tls \
  --cafile "${ORDERER_CA}"

echo "Step 4: Commit chaincode..."
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.orderer.dawaTrace.com \
  --channelID "${CHANNEL_NAME}" \
  --name "${CC_NAME}" \
  --version "${CC_VERSION}" \
  --sequence "${CC_SEQUENCE}" \
  --tls \
  --cafile "${ORDERER_CA}" \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${NETWORK_DIR}/crypto-config/peerOrganizations/org-mfg.dawaTrace.com/peers/peer0.org-mfg.dawaTrace.com/tls/ca.crt"

echo "=== Chaincode deployed successfully ==="
echo "Channel: ${CHANNEL_NAME}, Chaincode: ${CC_NAME} v${CC_VERSION}"
