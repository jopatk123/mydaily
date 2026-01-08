#!/bin/bash

# MyDaily Local Development Server Script
# 同时启动后端和前端开发服务器

set -euo pipefail

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${GREEN}Starting MyDaily Development Servers${NC}"
echo ""

die() {
    echo -e "${YELLOW}Error: $*${NC}" >&2
    exit 1
}

check_dependencies() {
    command -v python3 >/dev/null 2>&1 || die "python3 not found"
    command -v npm >/dev/null 2>&1 || die "npm not found"
}

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" >/dev/null 2>&1; then
        kill "${FRONTEND_PID}" >/dev/null 2>&1 || true
    fi
    if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
        kill "${BACKEND_PID}" >/dev/null 2>&1 || true
    fi
}

trap cleanup EXIT

ensure_backend() {
    pushd "${ROOT_DIR}/backend" >/dev/null

    if [ ! -d "venv" ]; then
        echo -e "${GREEN}Creating backend venv (without pip)...${NC}"
        python3 -m venv venv --without-pip || die "failed to create venv"
        
        # Bootstrap pip using get-pip.py
        echo -e "${GREEN}Bootstrapping pip...${NC}"
        ./venv/bin/python -m ensurepip --default-pip || {
            # If ensurepip fails, try downloading get-pip.py
            curl -s https://bootstrap.pypa.io/get-pip.py | ./venv/bin/python || \
            die "failed to install pip in venv"
        }
    fi

    echo -e "${GREEN}Installing backend dependencies...${NC}"
    ./venv/bin/python -m pip install --upgrade pip >/dev/null 2>&1 || true
    ./venv/bin/python -m pip install -r requirements.txt

    popd >/dev/null
}

ensure_frontend() {
    pushd "${ROOT_DIR}/frontend" >/dev/null

    if [ ! -d "node_modules" ]; then
        echo -e "${GREEN}Installing frontend dependencies...${NC}"
        if [ -f "package-lock.json" ]; then
            npm ci
        else
            npm install
        fi
    fi

    popd >/dev/null
}

start_backend() {
    echo -e "${GREEN}Starting backend server...${NC}"
    pushd "${ROOT_DIR}/backend" >/dev/null

    ./venv/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!

    popd >/dev/null

    sleep 2
    if ! kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
        die "backend failed to start"
    fi
}

start_frontend() {
    echo -e "${GREEN}Starting frontend server...${NC}"
    pushd "${ROOT_DIR}/frontend" >/dev/null

    npm run dev &
    FRONTEND_PID=$!

    popd >/dev/null

    sleep 1
    if ! kill -0 "${FRONTEND_PID}" >/dev/null 2>&1; then
        die "frontend failed to start"
    fi
}

check_dependencies
ensure_backend
ensure_frontend
start_backend
start_frontend

echo ""
echo -e "${GREEN}Development servers are running:${NC}"
echo -e "  Backend:  http://localhost:8000"
echo -e "  API Docs: http://localhost:8000/docs"
echo -e "  Frontend: http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

wait
