#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== DawaTrace Fabric Bootstrap ==="
echo "Generating crypto material..."

cd "$NETWORK_DIR"

# Generate crypto material using cryptogen
if ! command -v cryptogen &> /dev/null; then
  echo "ERROR: cryptogen not found. Install Hyperledger Fabric binaries."
  echo "Run: curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0"
  exit 1
fi

cryptogen generate --config=crypto-config.yaml --output=crypto-config

echo "Generating channel artifacts..."
mkdir -p channel-artifacts

if ! command -v configtxgen &> /dev/null; then
  echo "ERROR: configtxgen not found. Install Hyperledger Fabric binaries."
  exit 1
fi

# Genesis block
configtxgen \
  -profile DawaTraceGenesis \
  -channelID system-channel \
  -outputBlock channel-artifacts/genesis.block \
  -configPath .

# Channel creation transaction
configtxgen \
  -profile DawaTraceChannel \
  -outputCreateChannelTx channel-artifacts/dawaTrace-channel.tx \
  -channelID dawaTrace-channel \
  -configPath .

# Anchor peer updates for each org
for ORG in OrgMfg OrgDistributor OrgChemist OrgRegulator; do
  configtxgen \
    -profile DawaTraceChannel \
    -outputAnchorPeersUpdate "channel-artifacts/${ORG}Anchor.tx" \
    -channelID dawaTrace-channel \
    -asOrg "${ORG}MSP" \
    -configPath .
done

echo "=== Bootstrap complete ==="
echo "Next: make fabric-up && make deploy-cc"
