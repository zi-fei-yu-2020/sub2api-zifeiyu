.PHONY: build generate test test-unit test-integration test-e2e check-migrations

VERSION ?= $(shell ./scripts/resolve-version.sh)
LDFLAGS ?= -s -w -X main.Version=$(VERSION)
PYTHON ?= python3

build:
	CGO_ENABLED=0 go build -ldflags="$(LDFLAGS)" -trimpath -o bin/server ./cmd/server

generate:
	go generate ./ent
	go generate ./cmd/server

test:
	go test ./...
	golangci-lint run ./...

check-migrations:
	$(PYTHON) ../tools/check_migration_governance.py --migrations-dir migrations --baseline migrations/migration_prefix_collisions.baseline.json
	go test ./migrations -run '^TestMigrationNamingGovernance' -count=1

test-unit:
	go test -tags=unit ./...

test-integration:
	go test -tags=integration ./...

test-e2e:
	./scripts/e2e-test.sh

test-e2e-local:
	go test -tags=e2e -v -timeout=300s ./internal/integration/...
