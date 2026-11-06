.PHONY: help install dev api web build test test-api test-web lint typecheck clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install Python and web dependencies
	python3 -m venv .venv
	.venv/bin/pip install -r requirements.txt
	npm install

api: ## Run the customer API on :8000
	.venv/bin/uvicorn app.main:app --reload --port 8000

web: ## Run the customer web app on :5173
	npm run dev:web

dev: ## Reminder: run `make api` and `make web` in two terminals
	@echo "Run 'make api' in one terminal and 'make web' in another."

build: ## Build the web app
	npm run build:web

test-api: ## Run Python tests
	.venv/bin/pytest

test-web: ## Run web tests
	npm run test:web --if-present

test: test-api test-web ## Run all tests

lint: ## Lint the web app
	npm run lint --if-present

typecheck: ## Type-check the web app
	npm run typecheck --if-present

clean: ## Remove build artifacts
	rm -rf apps/web/dist .venv __pycache__ .pytest_cache
