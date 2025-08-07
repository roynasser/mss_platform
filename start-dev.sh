#!/bin/bash

# MSS Platform Development Environment Startup Script

echo "🚀 Starting MSS Platform Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop first."
    exit 1
fi

print_success "Docker is running"

# Check if docker compose is available (modern Docker CLI)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    print_success "Modern Docker Compose (docker compose) is available"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    print_success "Legacy Docker Compose (docker-compose) is available"
else
    print_error "Docker Compose could not be found. Please install Docker Compose."
    exit 1
fi

# Stop any existing containers
print_status "Stopping any existing containers..."
$COMPOSE_CMD down > /dev/null 2>&1

# Build and start the development environment
print_status "Building and starting development environment..."
if $COMPOSE_CMD up -d --build; then
    print_success "Development environment started successfully!"
else
    print_error "Failed to start development environment"
    exit 1
fi

echo ""
echo "🎉 MSS Platform is now running!"
echo ""
echo "📊 Services Status:"
echo "┌─────────────────────┬─────────────────────┐"
echo "│ Service             │ URL                 │"
echo "├─────────────────────┼─────────────────────┤"
echo "│ Frontend (Next.js)  │ http://localhost:80 │"
echo "│ Backend API         │ http://localhost:80/api │"
echo "│ Direct Frontend     │ http://localhost:3000 │"
echo "│ Direct Backend      │ http://localhost:3001 │"
echo "│ PostgreSQL          │ localhost:5432      │"
echo "│ Redis               │ localhost:6379      │"
echo "└─────────────────────┴─────────────────────┘"
echo ""
echo "🔧 Useful Commands:"
echo "  npm run dev:logs    - View all container logs"
echo "  npm run dev:stop    - Stop development environment"
echo "  npm run dev:clean   - Stop and remove all data"
echo "  npm run migrate     - Run database migrations"
echo "  npm run seed        - Seed database with sample data"
echo ""
echo "📝 Notes:"
echo "  - Frontend hot reload is enabled"
echo "  - Backend hot reload is enabled (nodemon)"
echo "  - PostgreSQL data is persisted in Docker volumes"
echo "  - Redis data is persisted in Docker volumes"
echo ""

# Show container status
print_status "Container Status:"
$COMPOSE_CMD ps

echo ""
print_status "Waiting for services to be ready..."
sleep 5

# Check if services are responding
if curl -s http://localhost:3000 > /dev/null; then
    print_success "Frontend is responding"
else
    print_warning "Frontend might still be starting up"
fi

if curl -s http://localhost:3001/api/health > /dev/null; then
    print_success "Backend is responding"
else
    print_warning "Backend might still be starting up or health endpoint not implemented"
fi

echo ""
print_success "Setup complete! You can now start developing."
print_status "To view logs: npm run dev:logs"