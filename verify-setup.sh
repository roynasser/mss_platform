#!/bin/bash

# MSS Platform Setup Verification Script

echo "🔍 Verifying MSS Platform Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅${NC} $2"
    else
        echo -e "${RED}❌${NC} $2"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check project structure
echo "📁 Checking Project Structure:"

check_dir() {
    if [ -d "$1" ]; then
        print_check 0 "Directory exists: $1"
    else
        print_check 1 "Directory missing: $1"
    fi
}

check_file() {
    if [ -f "$1" ]; then
        print_check 0 "File exists: $1"
    else
        print_check 1 "File missing: $1"
    fi
}

# Essential directories
check_dir "frontend"
check_dir "backend" 
check_dir "database"
check_dir "docker"
check_dir "frontend/src"
check_dir "backend/src"
check_dir "database/migrations"

echo ""

# Essential files
echo "📄 Checking Essential Files:"
check_file "docker-compose.yml"
check_file "package.json"
check_file "frontend/package.json"
check_file "backend/package.json"
check_file "frontend/Dockerfile.dev"
check_file "backend/Dockerfile.dev"
check_file "frontend/tsconfig.json"
check_file "backend/tsconfig.json"
check_file "frontend/.env.example"
check_file "backend/.env.example"
check_file "docker/nginx.conf"

echo ""

# Check Docker availability
echo "🐳 Checking Docker:"
if command -v docker &> /dev/null; then
    print_check 0 "Docker CLI available"
    
    if docker info > /dev/null 2>&1; then
        print_check 0 "Docker daemon running"
    else
        print_check 1 "Docker daemon not running"
    fi
else
    print_check 1 "Docker CLI not found"
fi

if command -v docker-compose &> /dev/null; then
    print_check 0 "Docker Compose available"
else
    print_check 1 "Docker Compose not found"
fi

echo ""

# Check Node.js and npm
echo "📦 Checking Node.js:"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_check 0 "Node.js available ($NODE_VERSION)"
    
    # Check if version is 18 or higher
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ $MAJOR_VERSION -ge 18 ]; then
        print_check 0 "Node.js version is compatible (>= 18)"
    else
        print_check 1 "Node.js version should be >= 18 (current: $NODE_VERSION)"
    fi
else
    print_check 1 "Node.js not found"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_check 0 "npm available ($NPM_VERSION)"
else
    print_check 1 "npm not found"
fi

echo ""

# Check package.json dependencies
echo "📋 Checking Dependencies:"

if [ -f "frontend/package.json" ]; then
    FRONTEND_DEPS=$(jq -r '.dependencies | keys[]' frontend/package.json 2>/dev/null | wc -l)
    print_check 0 "Frontend dependencies listed ($FRONTEND_DEPS packages)"
else
    print_check 1 "Frontend package.json not found"
fi

if [ -f "backend/package.json" ]; then
    BACKEND_DEPS=$(jq -r '.dependencies | keys[]' backend/package.json 2>/dev/null | wc -l)
    print_check 0 "Backend dependencies listed ($BACKEND_DEPS packages)"
else
    print_check 1 "Backend package.json not found"
fi

echo ""

# Recommendations
echo "💡 Setup Recommendations:"
print_info "1. Copy .env.example to .env in both frontend/ and backend/ directories"
print_info "2. Customize environment variables as needed"
print_info "3. Run 'npm run install:all' to install dependencies locally (optional)"
print_info "4. Run './start-dev.sh' or 'npm run dev' to start development environment"
print_info "5. Access the application at http://localhost:80 (via NGINX)"
print_info "6. Direct service access: Frontend (3000), Backend (3001)"

echo ""
echo "🎯 Setup verification complete!"
echo ""

# Check if .env files exist
if [ ! -f "frontend/.env" ]; then
    echo -e "${YELLOW}⚠️${NC} Frontend .env file not found. Copy from .env.example"
fi

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️${NC} Backend .env file not found. Copy from .env.example"
fi

echo ""
echo "🚀 Ready to start developing!"