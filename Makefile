.PHONY: help sui-deploy sui-test dev clean

## Show this help
help:
	@grep -E '^##' Makefile | sed 's/## //'

## Publish Sui contracts to devnet (requires sui CLI)
sui-deploy:
	cd sui && sui client publish --gas-budget 100000000

## Run Sui Move tests
sui-test:
	cd sui && sui move test

## Start Next.js app in dev mode
dev:
	npm run dev

## Run all tests (Move)
test-all: sui-test

## Simulate end-to-end recall drill
recall-drill:
	@echo "Starting recall drill..."
	@node infra/scripts/recall-drill.js

## Clean all build artifacts
clean:
	rm -rf .next node_modules
	find . -name "dist" -type d -prune -exec rm -rf '{}' +
