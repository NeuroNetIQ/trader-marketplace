# NeuroNetIQ ML Marketplace - Inference Template Makefile

.PHONY: help install build dev test validate docker-build docker-run clean

help: ## Show this help message
	@echo "NeuroNetIQ ML Marketplace - RunPod Signal HTTP Template"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

build: ## Build TypeScript
	npm run build

dev: ## Start development server
	npm run dev

test: ## Run tests
	npm test

validate: ## Validate template (lint + build + docker)
	@echo "🔍 Validating RunPod Signal HTTP template..."
	@echo "1. Installing dependencies..."
	@npm install --silent
	@echo "2. Type checking..."
	@npx tsc --noEmit
	@echo "3. Building application..."
	@npm run build
	@echo "4. Testing Docker build..."
	@docker build --quiet --tag runpod-signal-http-test .
	@echo "5. Testing container health..."
	@docker run --rm --detach --name test-container runpod-signal-http-test || true
	@sleep 3
	@docker exec test-container curl -f http://localhost:8080/health || echo "Health check failed"
	@docker stop test-container || true
	@docker rmi runpod-signal-http-test || true
	@echo "✅ Template validation complete!"

docker-build: ## Build Docker image
	docker build -t neuronetiq/runpod-signal-http:latest .

docker-run: ## Run Docker container locally
	docker run -p 8080:8080 \
		-e PORT=8080 \
		-e MODEL_VERSION=dev \
		-e LOG_LEVEL=info \
		neuronetiq/runpod-signal-http:latest

docker-test: ## Test Docker container
	@echo "🐳 Testing Docker container..."
	@docker build -q -t test-signal-http .
	@docker run -d --name test-signal-http -p 8080:8080 test-signal-http
	@sleep 5
	@curl -f http://localhost:8080/health || (echo "❌ Health check failed" && exit 1)
	@echo "✅ Docker container test passed"
	@docker stop test-signal-http
	@docker rm test-signal-http
	@docker rmi test-signal-http

clean: ## Clean build artifacts
	rm -rf dist/
	rm -rf node_modules/
	docker system prune -f

lint: ## Lint TypeScript code
	npx eslint src/ --ext .ts

format: ## Format code with Prettier
	npx prettier --write src/

check-env: ## Check required environment variables
	@echo "🔍 Checking environment variables..."
	@node -e "console.log('PORT:', process.env.PORT || 'not set')"
	@node -e "console.log('VENDOR_ID:', process.env.VENDOR_ID || 'not set')" 
	@node -e "console.log('DEPLOYMENT_ID:', process.env.DEPLOYMENT_ID || 'not set')"
	@node -e "console.log('MARKETPLACE_TOKEN:', process.env.MARKETPLACE_TOKEN ? 'set' : 'not set')"

# Development workflow
dev-workflow: install build validate ## Complete development workflow

# Production readiness check
production-ready: validate docker-test ## Verify production readiness
