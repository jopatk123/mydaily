.PHONY: help install dev dev-local dev-backend dev-frontend test test-backend test-frontend lint lint-backend lint-frontend format build ci install-hooks clean docker-up docker-down docker-logs

help:
	@echo "MyDaily Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  install        Install all dependencies"
	@echo "  dev            Start development servers with Docker"
	@echo "  dev-local      Start both backend & frontend locally (no Docker)"
	@echo "  dev-backend    Start backend server locally"
	@echo "  dev-frontend   Start frontend server locally"
	@echo "  test           Run all tests"
	@echo "  test-backend   Run backend tests"
	@echo "  test-frontend  Run frontend tests"
	@echo "  lint           Run linters"
	@echo "  format         Format code"
	@echo "  build          Build for production"
	@echo "  ci             Run the same checks as GitHub Actions"
	@echo "  install-hooks  Install the pre-push hook that runs make ci"
	@echo "  clean          Clean build artifacts"
	@echo "  docker-up      Start Docker containers (detached)"
	@echo "  docker-down    Stop Docker containers"
	@echo "  docker-logs    View Docker container logs"

install: install-hooks
	cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt
	cd backend && ./venv/bin/pip install pytest pytest-cov httpx black isort flake8
	cd frontend && npm install

dev:
	docker-compose up

dev-local:
	@echo "Starting local development servers..."
	@echo "Backend will run on http://localhost:8000"
	@echo "Frontend will run on http://localhost:5173"
	@bash start.sh

dev-backend:
	@echo "Starting backend server on http://localhost:8000"
	cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "Starting frontend server on http://localhost:5173"
	cd frontend && npm run dev

test: test-backend test-frontend

test-backend:
	@if [ -x backend/venv/bin/pytest ]; then \
		cd backend && ./venv/bin/pytest -v --cov=. --cov-report=term-missing; \
	else \
		cd backend && python3 -m pytest -v --cov=. --cov-report=term-missing; \
	fi

test-frontend:
	cd frontend && npm run test

lint: lint-backend lint-frontend

lint-backend:
	@if [ -x backend/venv/bin/black ]; then \
		cd backend && ./venv/bin/black --check . && \
		./venv/bin/isort --check-only --profile black . && \
		./venv/bin/flake8 --max-line-length=120 --ignore=E501,W503 .; \
	else \
		cd backend && black --check . && isort --check-only --profile black . && \
		flake8 --max-line-length=120 --ignore=E501,W503 .; \
	fi

lint-frontend:
	cd frontend && npm run lint && npm run format:check

format:
	@if [ -x backend/venv/bin/black ]; then \
		cd backend && ./venv/bin/black . && ./venv/bin/isort --profile black .; \
	else \
		cd backend && black . && isort --profile black .; \
	fi
	cd frontend && npm run format

build:
	cd frontend && npm run build

# 与 .github/workflows/ci.yml 相同的检查（后端 lint/测试、前端 lint/格式/测试/构建、pre-commit）。
ci:
	bash scripts/ci-local.sh

install-hooks:
	mkdir -p .git/hooks
	ln -sfn ../../.githooks/pre-push .git/hooks/pre-push
	chmod +x .githooks/pre-push scripts/ci-local.sh

clean:
	rm -rf frontend/dist
	rm -rf frontend/node_modules
	rm -rf backend/__pycache__
	rm -rf backend/.pytest_cache
	rm -rf backend/*.db
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f
