# Development Setup Guide

## Prerequisites

### Required Software
- **Docker Desktop** - Latest version with Compose V2 support
- **Node.js** - Version 18 or higher (LTS recommended)
- **npm** - Version 8 or higher (comes with Node.js)
- **Git** - Latest version

### Recommended Tools
- **VSCode** - IDE with recommended extensions (see `.vscode/extensions.json`)
- **GitHub CLI** - For repository management
- **Postman** - For API testing

## Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/mss-platform.git
cd mss-platform
```

### 2. Initial Setup
```bash
# Run the automated setup script
npm run setup
```

This script will:
- Install all dependencies for the monorepo
- Set up environment files from templates
- Initialize the database
- Build shared packages
- Verify Docker configuration

### 3. Start Development Environment
```bash
# Start all services
npm run dev

# Alternative: use the shell script directly
./start-dev.sh
```

### 4. Verify Installation
The platform will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Full Platform**: http://localhost:80 (via NGINX)

## Development Workflow

### Daily Development Process
1. **Start Services**: `npm run dev`
2. **View Logs**: `npm run dev:logs`
3. **Make Changes**: Edit code with hot reload
4. **Run Tests**: `npm run test:all`
5. **Stop Services**: `npm run dev:stop`

### Available Scripts
```bash
# Development
npm run dev                 # Start development environment
npm run dev:logs           # View all service logs
npm run dev:stop           # Stop all services
npm run dev:clean          # Stop and remove all data
npm run dev:rebuild        # Full rebuild of all services

# Building
npm run build:all          # Build all apps and packages
npm run build:frontend     # Build frontend only
npm run build:api          # Build API only

# Testing
npm run test:all           # Run all tests
npm run test:frontend      # Run frontend tests
npm run test:api           # Run API tests

# Code Quality
npm run lint:all           # Lint all code
npm run lint:fix:all       # Fix linting issues
npm run type-check         # TypeScript type checking

# Database
npm run db:migrate         # Run database migrations
npm run db:seed            # Seed database with sample data
npm run db:reset           # Reset database (destructive)
```

## Project Structure

### Monorepo Organization
```
mss-platform/
├── apps/
│   ├── frontend/          # Next.js customer/admin interface
│   ├── api/               # Express.js backend API
│   └── technician-app/    # Future: specialized technician interface
│
├── packages/
│   ├── ui/                # Shared UI components
│   ├── auth/              # Authentication library
│   ├── api-client/        # Shared API client
│   └── types/             # TypeScript type definitions
│
├── services/
│   ├── remote-access/     # Future: remote access proxy
│   └── audit/             # Future: audit logging service
│
├── infrastructure/
│   ├── docker/            # Docker configurations
│   ├── database/          # Database migrations and seeds
│   └── kubernetes/        # Future: K8s configurations
│
├── .github/               # GitHub Actions workflows
├── docs/                  # Documentation
└── scripts/               # Development scripts
```

### Key Configuration Files
- **Root `package.json`**: Workspace configuration and scripts
- **`docker-compose.yml`**: Development services configuration
- **`.github/workflows/`**: CI/CD pipeline definitions
- **`.vscode/`**: VSCode workspace settings and debugging

## Environment Configuration

### Environment Variables
Each service has its own environment configuration:

#### Frontend (`apps/frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_NAME="MSS Platform"
```

#### Backend (`apps/api/.env`)
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/mss_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret
```

### Docker Services Configuration

#### Services Included
- **PostgreSQL**: Database (port 5432)
- **Redis**: Cache and sessions (port 6379)
- **Frontend**: Next.js development server (port 3000)
- **API**: Express server (port 3001)
- **NGINX**: Reverse proxy (port 80)

#### Service Health Checks
All services include health checks for reliable startup:
```bash
# Check service status
docker compose ps

# View service logs
docker compose logs -f [service-name]

# Restart specific service
docker compose restart [service-name]
```

## Development Tools

### VSCode Integration

#### Recommended Extensions
The `.vscode/extensions.json` file includes:
- **TypeScript**: Enhanced TypeScript support
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Docker**: Container management
- **GitLens**: Git integration
- **Thunder Client**: API testing

#### Debug Configuration
Launch configurations for debugging:
- **Debug Frontend**: Debug Next.js application
- **Debug API**: Debug Express server
- **Debug Tests**: Debug test suites

### Code Quality Tools

#### ESLint Configuration
- **Shared ESLint config** across all packages
- **Security rules** for vulnerability detection
- **Accessibility rules** for WCAG compliance
- **TypeScript rules** for type safety

#### Prettier Configuration
- **Consistent formatting** across the codebase
- **Automatic formatting** on save
- **Git hooks** for pre-commit formatting

### Testing Setup

#### Testing Stack
- **Frontend**: Jest + React Testing Library
- **Backend**: Jest + Supertest
- **E2E**: Playwright (future implementation)

#### Test Commands
```bash
# Run all tests
npm run test:all

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.ts
```

## Database Development

### Database Management
```bash
# Run migrations
npm run db:migrate

# Create new migration
npm run db:migration:create -- add_new_table

# Seed database with sample data
npm run db:seed

# Reset database (development only)
npm run db:reset
```

### Database Tools
- **Adminer**: Web-based database management (http://localhost:8080)
- **pgAdmin**: Desktop PostgreSQL management tool
- **Database migrations**: Version-controlled schema changes

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check if ports are in use
lsof -i :3000  # Frontend
lsof -i :3001  # API
lsof -i :5432  # PostgreSQL

# Kill processes using ports
kill -9 $(lsof -ti:3000)
```

#### Docker Issues
```bash
# Clean up Docker
docker compose down -v --remove-orphans
docker system prune -f

# Rebuild containers
npm run dev:rebuild
```

#### Permission Issues (macOS/Linux)
```bash
# Make scripts executable
chmod +x scripts/*.sh
chmod +x start-dev.sh
```

#### Node.js Version Issues
```bash
# Check Node.js version
node --version  # Should be 18+

# Using nvm to manage Node versions
nvm install 18
nvm use 18
```

### Getting Help

#### Log Analysis
```bash
# View all logs
npm run dev:logs

# View specific service logs
docker compose logs -f frontend
docker compose logs -f api
docker compose logs -f postgres
```

#### Health Checks
```bash
# Check service health
curl http://localhost:3001/api/health
curl http://localhost:3000/api/health
```

#### Reset Development Environment
```bash
# Complete reset (removes all data)
npm run dev:clean
npm run setup
npm run dev
```

## Production Considerations

### Environment Differences
- **Production**: Uses optimized builds and production databases
- **Staging**: Mirrors production with test data
- **Development**: Hot reload, debug tools, sample data

### Security Notes
- **Environment Variables**: Never commit secrets to git
- **Local Development**: Uses insecure defaults for convenience
- **Production Deployment**: Requires secure configuration management

### Performance Notes
- **Development**: Hot reload causes slower performance
- **Database**: Development uses local PostgreSQL for speed
- **Assets**: Development serves assets locally (no CDN)

This development setup provides a complete, consistent environment for building and testing the MSS platform while maintaining security best practices and development efficiency.