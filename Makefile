.PHONY: help fabric-up fabric-down deploy-cc sui-deploy dev test recall-drill clean

## Show this help
help:
	@grep -E '^##' Makefile | sed 's/## //'

## Start local Hyperledger Fabric network (Docker)
fabric-up:
	cd fabric/network && docker-compose -f docker-compose.fabric.yml up -d
	@echo "Waiting for Fabric to be ready..."
	@sleep 5
	@echo "Fabric network is up. Run 'make deploy-cc' to deploy chaincode."

## Stop and remove Fabric network (keeps crypto material)
fabric-down:
	cd fabric/network && docker-compose -f docker-compose.fabric.yml down

## Stop and remove Fabric network AND wipe all volumes/crypto material
fabric-clean:
	cd fabric/network && docker-compose -f docker-compose.fabric.yml down -v
	rm -rf fabric/network/crypto-config fabric/network/channel-artifacts

## Generate Fabric crypto material and deploy chaincode
deploy-cc: fabric/network/crypto-config
	bash fabric/network/scripts/deployCC.sh

## Generate crypto material only (run once before fabric-up)
fabric/network/crypto-config:
	bash fabric/network/scripts/bootstrap.sh

## Publish Sui contracts to devnet (requires sui CLI)
sui-deploy:
	cd sui && sui client publish --gas-budget 100000000

## Run Sui Move tests
sui-test:
	cd sui && sui move test

## Run Go chaincode tests
cc-test:
	cd fabric/chaincode/dawaTrace && go test ./... -v

## Start API + bridge in dev mode
dev-backend:
	pnpm dev --filter @dawaTrace/api --filter @dawaTrace/bridge

## Start web dashboard in dev mode
dev-web:
	pnpm dev --filter @dawaTrace/web

## Run all TypeScript tests
test:
	pnpm test

## Run all tests (Go + Move + TypeScript)
test-all: cc-test sui-test test

## Simulate end-to-end recall drill (tests <60s SLA)
recall-drill:
	@echo "Starting recall drill..."
	@node infra/scripts/recall-drill.js

## Clean all build artifacts
clean:
	pnpm exec turbo run build --force
	rm -rf node_modules
	find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
	find . -name "dist" -type d -prune -exec rm -rf '{}' +
