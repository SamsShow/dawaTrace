#!/bin/bash
# Quick invoke helper for dev/testing

CHANNEL_NAME="dawaTrace-channel"
CC_NAME="dawaTrace"

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="OrgMfgMSP"
export CORE_PEER_ADDRESS="localhost:7051"
export ORDERER_CA="./crypto-config/ordererOrganizations/orderer.dawaTrace.com/orderers/orderer.orderer.dawaTrace.com/msp/tlscacerts/tlsca.orderer.dawaTrace.com-cert.pem"

FUNCTION="${1:-MintBatch}"
ARGS="${2:-}"

echo "Invoking ${CC_NAME}::${FUNCTION} on ${CHANNEL_NAME}"

peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.orderer.dawaTrace.com \
  -C "${CHANNEL_NAME}" \
  -n "${CC_NAME}" \
  --tls \
  --cafile "${ORDERER_CA}" \
  -c "{\"function\":\"${FUNCTION}\",\"Args\":[${ARGS}]}"
