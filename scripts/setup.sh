#!/bin/bash

# MyDaily Project Setup Script
# 安装所有必要的依赖

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Setting up MyDaily Project${NC}"
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Error: Python 3 is not installed${NC}"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Error: Node.js is not installed${NC}"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}Installing backend dependencies...${NC}"
cd backend
pip install -r requirements.txt
pip install pytest pytest-cov httpx black isort flake8
cd ..

echo ""
echo -e "${GREEN}Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "You can now start the development servers:"
echo "  make dev           - Start with Docker"
echo "  make dev-local     - Start locally (both servers)"
echo "  make dev-backend   - Start backend only"
echo "  make dev-frontend  - Start frontend only"
echo ""
