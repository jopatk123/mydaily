#!/bin/bash

# MyDaily Local Development Server Script
# 同时启动后端和前端开发服务器

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting MyDaily Development Servers${NC}"
echo ""

# 检查依赖
check_dependencies() {
    if ! command -v python3 &> /dev/null; then
        echo -e "${YELLOW}Warning: python3 not found${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${YELLOW}Warning: npm not found${NC}"
        exit 1
    fi
}

check_dependencies

# 创建 trap 以确保 Ctrl+C 时停止所有子进程
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# 启动后端
echo -e "${GREEN}Starting backend server...${NC}"
cd backend && source venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 等待后端启动
sleep 2

# 启动前端
echo -e "${GREEN}Starting frontend server...${NC}"
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}Development servers are running:${NC}"
echo -e "  Backend:  http://localhost:8000"
echo -e "  API Docs: http://localhost:8000/docs"
echo -e "  Frontend: http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# 等待所有进程
wait
