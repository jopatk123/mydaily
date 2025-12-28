#!/bin/bash

# MyDaily Backend Development Server Script

set -e

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Starting MyDaily Backend Server${NC}"
echo ""

cd backend || exit 1

if [ ! -f "main.py" ]; then
    echo "Error: main.py not found in backend directory"
    exit 1
fi

echo "Backend API will be available at:"
echo "  http://localhost:8000"
echo "  http://localhost:8000/docs (API Documentation)"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000
