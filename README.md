# MSS Platform - Cybersecurity Managed Security Services

A comprehensive multi-tenant cybersecurity platform that provides managed security services to corporate customers with secure technician access and full audit compliance.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🎯 Overview

The MSS Platform is an enterprise-grade cybersecurity management system designed for Managed Security Service Providers (MSSPs) and their corporate customers. It provides:

- **Multi-tenant architecture** for serving multiple customer organizations
- **Role-based access control** with granular permissions
- **Real-time security monitoring** and threat detection
- **Secure technician remote access** to customer environments
- **Comprehensive audit trail** for SOC2/ISO27001 compliance
- **Advanced authentication** with MFA and session management

## ✨ Features

### 🔐 Authentication & Security
- JWT-based authentication with automatic token refresh
- Multi-Factor Authentication (TOTP + backup codes)
- Role-based access control (RBAC) with organization isolation
- Session management with device fingerprinting
- Password policies and breach prevention
- Risk-based authentication

### 🏢 Multi-Tenant Management
- Separate customer organizations with data isolation
- MSS provider organization management
- User management with organization-scoped permissions
- Flexible role hierarchy (Customer: Admin, Report Viewer, Request User, Basic User)
- Technician-to-customer access assignment

### 📊 Security Operations
- Real-time security dashboard with analytics
- Alert management and incident response
- Security report generation and access
- Intervention request system
- Audit logging for all user actions

### 🛠️ Technician Portal
- Secure remote access preparation
- Customer environment management
- Intervention tracking and resolution
- Access matrix management

### 📈 Monitoring & Compliance
- Comprehensive audit trail
- Real-time notifications via WebSocket
- Security analytics and reporting
- SOC2/ISO27001 compliance features

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Material-UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Redis caching
- **Authentication**: JWT with MFA (TOTP)
- **Real-time**: WebSocket (Socket.IO)
- **Containerization**: Docker with Docker Compose
- **Package Management**: npm workspaces (monorepo)

### Project Structure
```
mss-platform/
├── apps/
│   ├── api/                    # Express backend API
│   ├── frontend/               # Next.js frontend application
│   └── technician-app/         # Specialized technician interface
├── packages/
│   ├── types/                  # Shared TypeScript types
│   ├── auth/                   # Authentication utilities
│   ├── ui/                     # Shared UI components
│   └── api-client/             # API client library
├── infrastructure/
│   ├── database/               # Database migrations & seeds
│   ├── docker/                 # Docker configurations
│   └── kubernetes/             # K8s deployment manifests
├── docs/                       # Documentation
├── scripts/                    # Development scripts
└── tests/                      # Integration tests
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mss-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development environment**
   ```bash
   npm run dev
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   npm run seed
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - API Documentation: http://localhost:8000/api-docs

## 🎯 User Roles & Features

### Corporate Customers
- View security reports and assessments
- Monitor real-time security alerts
- Request security interventions
- Track intervention progress

### Internal Technicians
- Access all customer environments
- Manage security interventions
- Generate and update security reports
- Provide remote support access

### System Administrators
- User management
- System configuration
- Platform monitoring

## 📊 Sample Data

The platform includes sample data for testing:

**Test Users** (password: `password123`):
- `admin@mss-platform.com` - Admin user
- `tech1@mss-platform.com` - Technician
- `customer1@acme.com` - Customer (Acme Corp)
- `customer2@techstart.com` - Customer (TechStart Inc)

## 🛠️ Development

### Local Development (without Docker)

1. **Database Setup**:
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   ```

2. **Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

#### Users
- `GET /api/users/profile` - Get current user profile
- `GET /api/users` - Get all users (admin/technician only)

#### Security Reports
- `GET /api/reports` - Get security reports
- `GET /api/reports/:id` - Get specific report

#### Alerts
- `GET /api/alerts` - Get alerts
- `PATCH /api/alerts/:id/read` - Mark alert as read

#### Interventions
- `GET /api/interventions` - Get interventions
- `POST /api/interventions` - Create intervention (customers)
- `PATCH /api/interventions/:id/status` - Update status (technicians)

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/.env`)
```bash
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/mss_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
```

#### Frontend (`frontend/.env`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

## 🐳 Docker Services

| Service | Port | Description |
|---------|------|-------------|
| frontend | 3000 | Next.js development server |
| backend | 3001 | Express API server |
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Redis cache |
| nginx | 80 | Reverse proxy |

## 📁 Project Structure

```
dome/
├── frontend/           # Next.js frontend application
│   ├── src/
│   │   ├── app/       # Next.js app router
│   │   ├── components/ # React components
│   │   ├── hooks/     # Custom hooks
│   │   ├── services/  # API services
│   │   ├── types/     # TypeScript types
│   │   └── utils/     # Utility functions
│   ├── package.json
│   └── Dockerfile.dev
├── backend/            # Express backend API
│   ├── src/
│   │   ├── controllers/ # Request handlers
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic
│   │   ├── models/     # Data models
│   │   ├── types/      # TypeScript types
│   │   ├── utils/      # Utility functions
│   │   └── database/   # Database connection
│   ├── package.json
│   └── Dockerfile.dev
├── database/           # Database files
│   ├── migrations/     # SQL migrations
│   └── seeds/         # Sample data
├── docker/            # Docker configurations
│   └── nginx.conf     # NGINX configuration
├── docker-compose.yml # Docker Compose setup
└── README.md
```

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- Password hashing with bcrypt

## 📝 API Documentation

### Authentication Required
Most API endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Response Format
All API responses follow this format:
```json
{
  "success": boolean,
  "data": object | array,
  "message": "string",
  "error": "string"
}
```

### Pagination
List endpoints support pagination:
```
GET /api/endpoint?page=1&limit=10
```

## 🚀 Deployment

### Production Build

1. **Build Images**:
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Environment Setup
- Update environment variables for production
- Configure SSL certificates
- Set up monitoring and logging
- Configure backup strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**MSS Platform** - Securing businesses through managed cybersecurity services.