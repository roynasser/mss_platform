# MSS Platform Development Guide

<!-- Documentation Version: v1.0.0 -->
<!-- Last Updated: 2025-08-07 -->
<!-- Next Review: 2025-08-07 -->

## 🚀 Getting Started

This guide covers development setup, workflows, and best practices for the MSS Platform.

## 📋 Prerequisites

### Required Software

- **Node.js**: Version 20.x or higher
- **npm**: Version 10.x or higher
- **Docker**: Version 24.x or higher
- **Docker Compose**: Version 2.x or higher
- **Git**: Version 2.x or higher
- **PostgreSQL**: Version 15.x or higher (for local development)
- **Redis**: Version 7.x or higher (for local development)

### Recommended Tools

- **VSCode**: With recommended extensions (see `.vscode/extensions.json`)
- **Postman**: For API testing (collection available in `/docs/api/`)
- **pgAdmin** or **DBeaver**: For database management
- **RedisInsight**: For Redis monitoring

## 🏗️ Project Structure

```
mss-platform/
├── apps/                           # Applications
│   ├── api/                        # Express backend API
│   │   ├── src/
│   │   │   ├── controllers/        # Request handlers
│   │   │   ├── database/          # Database connections
│   │   │   ├── middleware/        # Express middleware
│   │   │   ├── routes/            # API route definitions
│   │   │   ├── services/          # Business logic
│   │   │   ├── types/             # TypeScript types
│   │   │   ├── utils/             # Utility functions
│   │   │   └── server.ts          # Application entry point
│   │   ├── __tests__/             # API tests
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── frontend/                   # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/               # Next.js app router
│   │   │   ├── components/        # React components
│   │   │   ├── contexts/          # React contexts
│   │   │   ├── hooks/             # Custom hooks
│   │   │   ├── services/          # API client services
│   │   │   ├── types/             # TypeScript types
│   │   │   └── utils/             # Utility functions
│   │   ├── public/                # Static assets
│   │   ├── tests/                 # Frontend tests
│   │   ├── next.config.js         # Next.js configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── technician-app/             # Specialized technician interface
├── packages/                       # Shared packages
│   ├── types/                      # Shared TypeScript types
│   ├── auth/                       # Authentication utilities
│   ├── ui/                         # Shared UI components
│   └── api-client/                 # API client library
├── infrastructure/                 # Infrastructure as code
│   ├── database/                   # Database migrations & seeds
│   ├── docker/                     # Docker configurations
│   └── kubernetes/                 # K8s deployment manifests
├── docs/                           # Documentation
├── scripts/                        # Development scripts
├── tests/                          # Integration tests
├── .github/                        # GitHub workflows
├── docker-compose.yml              # Development environment
├── package.json                    # Root package configuration
└── tsconfig.json                   # Root TypeScript configuration
```

## 🔧 Development Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone <repository-url>
cd mss-platform

# Install dependencies for all workspaces
npm install

# Verify installation
npm run type-check
```

### 2. Environment Configuration

Create environment files from templates:

```bash
# Root environment
cp .env.example .env

# API environment
cp apps/api/.env.example apps/api/.env

# Frontend environment
cp apps/frontend/.env.example apps/frontend/.env
```

### 3. Database Setup

#### Option A: Docker (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to start
sleep 10

# Run migrations and seed data
npm run migrate
npm run seed
```

#### Option B: Local Installation

```bash
# Install PostgreSQL and Redis locally
# macOS
brew install postgresql@15 redis

# Ubuntu
sudo apt-get install postgresql-15 redis-server

# Start services
brew services start postgresql@15
brew services start redis

# Or on Ubuntu
sudo systemctl start postgresql
sudo systemctl start redis-server

# Create database
createdb mss_platform

# Run migrations and seed data
npm run migrate
npm run seed
```

### 4. Development Environment

```bash
# Start all services in development mode
npm run dev

# Or start individual services
npm run dev:api      # Start API only
npm run dev:frontend # Start frontend only
```

### 5. Verify Setup

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api-docs
- **Database**: localhost:5432 (postgres/postgres123)
- **Redis**: localhost:6379

## 💻 Development Workflow

### Branch Strategy

We use Git Flow with the following branch structure:

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/\***: Feature development branches
- **release/\***: Release preparation branches
- **hotfix/\***: Critical production fixes

### Feature Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/user-management
   ```

2. **Development**
   ```bash
   # Make changes
   npm run dev
   
   # Test changes
   npm run test
   npm run type-check
   npm run lint
   ```

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add user management functionality"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/user-management
   # Create PR via GitHub interface
   ```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```bash
feat(auth): add MFA support for user authentication
fix(api): resolve user creation validation error
docs(readme): update setup instructions
test(auth): add unit tests for login flow
```

## 🧪 Testing

### Testing Strategy

- **Unit Tests**: Individual function/component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete user workflow testing
- **Security Tests**: Authentication/authorization testing

### Running Tests

```bash
# All tests
npm run test

# Individual test suites
npm run test:api        # Backend API tests
npm run test:frontend   # Frontend component tests
npm run test:e2e        # End-to-end tests
npm run test:integration # Integration tests

# Coverage reports
npm run test:coverage
```

### Writing Tests

#### Backend API Tests

```javascript
// apps/api/src/routes/__tests__/auth.test.ts
import request from 'supertest';
import { app } from '../../server';

describe('POST /api/auth/login', () => {
  it('should authenticate valid user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
      
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
  });
  
  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
```

#### Frontend Component Tests

```javascript
// apps/frontend/src/components/auth/__tests__/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  it('should render login form', () => {
    render(<LoginForm onLogin={jest.fn()} />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
  
  it('should handle form submission', async () => {
    const onLogin = jest.fn();
    render(<LoginForm onLogin={onLogin} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});
```

## 🛠️ Development Tools

### Available Scripts

#### Root Level Commands
```bash
npm run dev                 # Start all services
npm run build              # Build all applications
npm run test               # Run all tests
npm run lint               # Lint all code
npm run type-check         # TypeScript type checking
npm run clean              # Clean build artifacts
```

#### Workspace-Specific Commands
```bash
# API commands
npm run dev:api            # Start API development server
npm run build:api          # Build API for production
npm run test:api           # Run API tests

# Frontend commands  
npm run dev:frontend       # Start frontend development server
npm run build:frontend     # Build frontend for production
npm run test:frontend      # Run frontend tests

# Database commands
npm run migrate            # Run database migrations
npm run migrate:rollback   # Rollback last migration
npm run seed               # Seed database with sample data
npm run db:reset           # Reset database (drop, create, migrate, seed)
```

### IDE Configuration

#### VSCode Settings

`.vscode/settings.json`:
```json
{
  "typescript.preferences.useAliasesForRenames": false,
  "typescript.updateImportsOnFileMove.enabled": "always",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "eslint.workingDirectories": [
    "apps/api",
    "apps/frontend",
    "packages/*"
  ],
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  }
}
```

#### Recommended Extensions

`.vscode/extensions.json`:
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.hexeditor"
  ]
}
```

### Debugging

#### Backend Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/apps/api/src/server.ts",
      "outFiles": ["${workspaceFolder}/apps/api/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "protocol": "inspector"
    }
  ]
}
```

#### Frontend Debugging

```bash
# Enable React DevTools
npm install -g react-devtools

# Start with debugging
npm run dev:frontend -- --inspect
```

## 📦 Building & Deployment

### Build Process

```bash
# Build all applications
npm run build

# Build specific applications
npm run build:api       # Build API
npm run build:frontend  # Build frontend
npm run build:packages  # Build shared packages
```

### Docker Build

```bash
# Build development images
docker-compose build

# Build production images
docker-compose -f docker-compose.prod.yml build

# Build specific service
docker-compose build api
```

### Environment-Specific Builds

#### Development
```bash
NODE_ENV=development npm run build
```

#### Staging
```bash
NODE_ENV=staging npm run build
```

#### Production
```bash
NODE_ENV=production npm run build
```

## 🚀 Deployment Guide

### Development Deployment

```bash
# Using Docker Compose
docker-compose up -d

# Or individual services
npm run dev
```

### Staging Deployment

```bash
# Build staging images
docker-compose -f docker-compose.staging.yml build

# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# Run database migrations
docker-compose -f docker-compose.staging.yml exec api npm run migrate
```

### Production Deployment

#### Prerequisites

1. **Production Environment Variables**
   ```bash
   # Set production secrets
   export JWT_SECRET="production-jwt-secret"
   export DATABASE_URL="postgresql://user:pass@prod-db:5432/mss_platform"
   export REDIS_URL="redis://prod-redis:6379"
   ```

2. **SSL Certificates**
   ```bash
   # Obtain SSL certificates
   certbot certonly --nginx -d api.mss-platform.com
   certbot certonly --nginx -d app.mss-platform.com
   ```

#### Deployment Steps

```bash
# 1. Build production images
docker-compose -f docker-compose.prod.yml build

# 2. Run database migrations
docker-compose -f docker-compose.prod.yml run --rm api npm run migrate

# 3. Deploy services
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify deployment
curl -f https://api.mss-platform.com/health || exit 1
curl -f https://app.mss-platform.com || exit 1
```

### Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f infrastructure/kubernetes/

# Verify deployment
kubectl get pods -n mss-platform
kubectl get services -n mss-platform
```

## 🔄 Database Management

### Migrations

#### Creating Migrations

```bash
# Create new migration
npm run migrate:create add_user_preferences_table
```

Migration file example:
```sql
-- infrastructure/database/migrations/003_add_user_preferences.sql
-- Up migration
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Down migration (for rollbacks)
-- DROP TABLE user_preferences;
```

#### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Reset database (USE WITH CAUTION)
npm run db:reset
```

### Database Seeding

```bash
# Seed database with sample data
npm run seed

# Seed specific data
npm run seed:users
npm run seed:organizations
```

Seed file example:
```javascript
// infrastructure/database/seeds/002_sample_users.js
exports.up = async function(knex) {
  await knex('users').insert([
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      org_id: '123e4567-e89b-12d3-a456-426614174001',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      password_hash: '$2a$12$...',
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};

exports.down = async function(knex) {
  await knex('users').del();
};
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different ports
PORT=3001 npm run dev:frontend
PORT=8001 npm run dev:api
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Connect to database directly
docker-compose exec postgres psql -U postgres -d mss_platform
```

#### Node Modules Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove all node_modules
rm -rf node_modules apps/*/node_modules packages/*/node_modules

# Reinstall dependencies
npm install
```

#### TypeScript Issues
```bash
# Check TypeScript configuration
npx tsc --showConfig

# Run type checking with verbose output
npm run type-check -- --verbose
```

### Performance Optimization

#### Development Performance

```bash
# Use faster TypeScript compilation
npm install -D esbuild

# Enable hot module replacement
npm run dev -- --fast-refresh
```

#### Database Performance

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;

-- Analyze slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## 🎯 Best Practices

### Code Style

1. **TypeScript Strict Mode**: Always use strict TypeScript settings
2. **ESLint**: Follow ESLint rules consistently
3. **Prettier**: Use Prettier for consistent formatting
4. **Imports**: Use absolute imports with path aliases
5. **Error Handling**: Always handle errors explicitly

### Security Best Practices

1. **Input Validation**: Validate all inputs on both client and server
2. **SQL Injection**: Use parameterized queries only
3. **Authentication**: Implement proper JWT token handling
4. **Secrets**: Never commit secrets to version control
5. **Dependencies**: Keep dependencies updated

### Performance Best Practices

1. **Database**: Use indexes for frequently queried columns
2. **API**: Implement proper pagination and filtering
3. **Frontend**: Use React.memo and useMemo appropriately
4. **Caching**: Implement Redis caching for frequently accessed data
5. **Bundle Size**: Monitor and optimize bundle sizes

### Testing Best Practices

1. **Coverage**: Maintain >90% test coverage
2. **Unit Tests**: Test individual functions and components
3. **Integration Tests**: Test API endpoints thoroughly
4. **E2E Tests**: Cover critical user workflows
5. **Mocking**: Mock external dependencies appropriately

## 📚 Additional Resources

### Documentation
- [API Documentation](./docs/api/openapi.yaml)
- [Security Documentation](./docs/SECURITY.md)
- [Architecture Decision Records](./docs/adr/)

### External Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Material-UI Documentation](https://mui.com/material-ui/)

### Community
- [GitHub Issues](https://github.com/mss-platform/issues)
- [Development Team](mailto:dev-team@mss-platform.com)
- [Architecture Discussions](mailto:architecture@mss-platform.com)

---

Happy coding! 🚀