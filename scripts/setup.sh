#!/bin/bash

# MSS Platform Setup Script
# This script sets up the development environment for the MSS Platform monorepo

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in correct directory
if [[ ! -f "package.json" ]] || [[ ! -d "apps" ]] || [[ ! -d "packages" ]]; then
    log_error "This script must be run from the root of the MSS Platform project"
    exit 1
fi

log_info "Setting up MSS Platform Development Environment..."

# Check Node.js version
log_info "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js 20 or higher."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ $NODE_VERSION -lt 20 ]]; then
    log_warning "Node.js version $NODE_VERSION detected. Recommended version is 20 or higher."
fi

# Check npm version
log_info "Checking npm version..."
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install npm."
    exit 1
fi

# Check Docker
log_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    log_warning "Docker is not installed. Some features may not work without Docker."
else
    if ! docker info &> /dev/null; then
        log_warning "Docker is installed but not running. Please start Docker Desktop."
    else
        log_success "Docker is installed and running"
    fi
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    log_success "Docker Compose is available"
else
    log_warning "Docker Compose is not available. Some features may not work."
fi

# Install root dependencies
log_info "Installing root dependencies..."
npm install

# Install workspace dependencies
log_info "Installing workspace dependencies..."
npm run install:all

# Setup Git hooks
log_info "Setting up Git hooks with Husky..."
npm run prepare

# Copy environment files
log_info "Setting up environment files..."
for app in apps/*/; do
    if [[ -f "${app}.env.example" ]] && [[ ! -f "${app}.env" ]]; then
        cp "${app}.env.example" "${app}.env"
        log_success "Created ${app}.env from template"
    fi
done

# Setup database (if Docker is available)
if command -v docker &> /dev/null && docker info &> /dev/null; then
    log_info "Starting database containers..."
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 10
    
    # Run database migrations
    log_info "Running database migrations..."
    if npm run migrate; then
        log_success "Database migrations completed successfully"
    else
        log_warning "Database migrations failed. You may need to run them manually."
    fi
    
    # Seed database (optional)
    read -p "Would you like to seed the database with sample data? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Seeding database..."
        if npm run seed; then
            log_success "Database seeded successfully"
        else
            log_warning "Database seeding failed"
        fi
    fi
else
    log_warning "Docker is not available. Skipping database setup."
    log_info "You will need to manually set up PostgreSQL and Redis."
fi

# Build packages
log_info "Building shared packages..."
npm run build:packages

# Run initial linting and type checking
log_info "Running initial code quality checks..."
if npm run lint; then
    log_success "Linting passed"
else
    log_warning "Linting issues found. Run 'npm run lint:fix' to auto-fix some issues."
fi

if npm run type-check; then
    log_success "Type checking passed"
else
    log_warning "Type checking issues found. Please review and fix TypeScript errors."
fi

# Create development directories if they don't exist
log_info "Creating development directories..."
mkdir -p logs
mkdir -p temp
mkdir -p uploads

# Set proper permissions for scripts
log_info "Setting script permissions..."
chmod +x scripts/*.sh

# Summary
echo
log_success "MSS Platform setup completed!"
echo
log_info "Next steps:"
echo "  1. Review and update .env files in apps/ directories"
echo "  2. Start development servers: npm run dev"
echo "  3. View logs: npm run dev:logs"
echo "  4. Run tests: npm run test"
echo
log_info "Useful commands:"
echo "  - Start development: npm run dev"
echo "  - Build everything: npm run build"
echo "  - Run tests: npm run test"
echo "  - Lint code: npm run lint"
echo "  - Format code: npm run format"
echo "  - Clean up: npm run dev:clean"
echo
log_info "For more information, see README.md or run individual workspace commands:"
echo "  - Frontend: npm run dev --workspace=apps/frontend"
echo "  - API: npm run dev --workspace=apps/api"
echo

# Check if everything is working
log_info "Running quick health check..."
if npm run build:packages > /dev/null 2>&1; then
    log_success "Health check passed - ready for development!"
else
    log_warning "Health check failed - some issues may need attention"
fi