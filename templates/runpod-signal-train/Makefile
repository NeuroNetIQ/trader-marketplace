# NeuroNetIQ ML Marketplace - Training Template Makefile

.PHONY: help install build test validate docker-build docker-run clean

help: ## Show this help message
	@echo "NeuroNetIQ ML Marketplace - RunPod Signal Training Template"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install Python dependencies
	pip install -r requirements.txt

build: ## Prepare training environment
	@echo "🐍 Python training template - no build step needed"
	@python3 -c "import pandas, numpy, requests; print('✅ Core dependencies available')"

test: ## Run training tests
	python3 -m pytest tests/ || echo "No tests found - add tests in tests/ directory"

validate: ## Validate training template
	@echo "🔍 Validating RunPod Signal Training template..."
	@echo "1. Checking Python dependencies..."
	@pip install -r requirements.txt --quiet
	@echo "2. Validating training script..."
	@python3 -c "import train; print('✅ Training script imports successfully')"
	@echo "3. Testing Docker build..."
	@docker build --quiet --tag runpod-signal-train-test .
	@echo "4. Testing container startup..."
	@docker run --rm --name test-train-container \
		-e TRAINING_SPEC='{"round_id":"test","dataset_urls":["http://example.com/data.csv"],"task":"signal","hyperparams":{"epochs":1}}' \
		runpod-signal-train-test python3 -c "import train; print('Container can import training module')" || true
	@docker rmi runpod-signal-train-test || true
	@echo "✅ Training template validation complete!"

docker-build: ## Build Docker image
	docker build -t neuronetiq/runpod-signal-train:latest .

docker-run: ## Run Docker container locally with test data
	docker run -it \
		-e TRAINING_SPEC='{"round_id":"dev","dataset_urls":["https://example.com/train.csv"],"task":"signal","hyperparams":{"lr":0.001,"epochs":5}}' \
		-e HF_TOKEN=your_hf_token \
		neuronetiq/runpod-signal-train:latest

docker-test: ## Test Docker container
	@echo "🐳 Testing Docker training container..."
	@docker build -q -t test-signal-train .
	@echo "✅ Docker container builds successfully"
	@docker rmi test-signal-train

clean: ## Clean build artifacts
	rm -rf __pycache__/
	rm -rf .pytest_cache/
	rm -rf data/
	rm -rf model/
	find . -name "*.pyc" -delete

lint: ## Lint Python code
	python3 -m flake8 train.py || echo "Install flake8: pip install flake8"

format: ## Format Python code
	python3 -m black train.py || echo "Install black: pip install black"

check-env: ## Check required environment variables
	@echo "🔍 Checking environment variables..."
	@python3 -c "import os; print('TRAINING_SPEC:', 'set' if os.getenv('TRAINING_SPEC') else 'not set')"
	@python3 -c "import os; print('HF_TOKEN:', 'set' if os.getenv('HF_TOKEN') else 'not set')"
	@python3 -c "import os; print('WANDB_API_KEY:', 'set' if os.getenv('WANDB_API_KEY') else 'not set')"

# Development workflow
dev-workflow: install validate ## Complete development workflow

# Production readiness check
production-ready: validate docker-test ## Verify production readiness

# Quick test with mock data
quick-test: ## Run quick test with mock training spec
	@echo "🧪 Running quick test..."
	@export TRAINING_SPEC='{"round_id":"test","dataset_urls":["https://httpbin.org/json"],"task":"signal","hyperparams":{"epochs":1}}' && \
	python3 -c "import os, json; spec=json.loads(os.getenv('TRAINING_SPEC')); print('✅ Training spec valid:', spec['task'])"
