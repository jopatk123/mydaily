#!/bin/bash

# MyDaily Frontend Development Server Script

set -e

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Starting MyDaily Frontend Server${NC}"
echo ""

cd frontend || exit 1

if [ ! -f "package.json" ]; then
    echo "Error: package.json not found in frontend directory"
    exit 1
fi

echo "Frontend will be available at:"
echo "  http://localhost:5173"
echo ""

npm run dev
