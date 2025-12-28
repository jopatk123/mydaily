#!/bin/bash

# MyDaily Quick Start Script
# 一键启动项目

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════╗"
echo "║   Welcome to MyDaily Quick Start!     ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# 检查依赖
check_docker() {
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        return 0
    fi
    return 1
}

check_local_deps() {
    if command -v python3 &> /dev/null && command -v npm &> /dev/null; then
        return 0
    fi
    return 1
}

echo "Checking available options..."
echo ""

HAS_DOCKER=false
HAS_LOCAL=false

if check_docker; then
    HAS_DOCKER=true
    echo -e "${GREEN}✓${NC} Docker is available"
fi

if check_local_deps; then
    HAS_LOCAL=true
    echo -e "${GREEN}✓${NC} Local development tools are available (Python & Node.js)"
fi

echo ""

# 如果两者都不可用
if [ "$HAS_DOCKER" = false ] && [ "$HAS_LOCAL" = false ]; then
    echo -e "${RED}Error: Neither Docker nor local development tools are available.${NC}"
    echo ""
    echo "Please install one of the following:"
    echo "  1. Docker & Docker Compose"
    echo "  2. Python 3.11+ and Node.js 18+"
    exit 1
fi

# 选择启动方式
echo "How would you like to start MyDaily?"
echo ""

OPTIONS=()
if [ "$HAS_DOCKER" = true ]; then
    OPTIONS+=("1" "Docker (recommended - quick & easy)")
fi

if [ "$HAS_LOCAL" = true ]; then
    OPTIONS+=("2" "Local development (faster for development)")
fi

if [ "$HAS_DOCKER" = true ]; then
    echo "  1) Docker (recommended - quick & easy)"
fi

if [ "$HAS_LOCAL" = true ]; then
    echo "  2) Local development (faster for development)"
fi

echo ""
read -p "Enter your choice (1 or 2): " choice

case $choice in
    1)
        if [ "$HAS_DOCKER" = false ]; then
            echo -e "${RED}Docker is not available!${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${BLUE}Starting with Docker...${NC}"
        echo ""
        echo "This will:"
        echo "  - Build Docker images"
        echo "  - Start backend and frontend containers"
        echo ""
        
        docker-compose up --build
        ;;
    2)
        if [ "$HAS_LOCAL" = false ]; then
            echo -e "${RED}Local development tools are not available!${NC}"
            exit 1
        fi
        
        echo ""
        echo -e "${BLUE}Starting local development...${NC}"
        echo ""
        
        # 检查是否需要安装依赖
        NEEDS_INSTALL=false
        
        if [ ! -d "backend/venv" ] && [ ! -f "backend/.deps_installed" ]; then
            NEEDS_INSTALL=true
        fi
        
        if [ ! -d "frontend/node_modules" ]; then
            NEEDS_INSTALL=true
        fi
        
        if [ "$NEEDS_INSTALL" = true ]; then
            echo -e "${YELLOW}Dependencies need to be installed.${NC}"
            echo "This may take a few minutes on first run..."
            echo ""
            ./scripts/setup.sh
        fi
        
        echo ""
        echo -e "${GREEN}Starting development servers...${NC}"
        ./scripts/dev-local.sh
        ;;
    *)
        echo -e "${RED}Invalid choice!${NC}"
        exit 1
        ;;
esac
