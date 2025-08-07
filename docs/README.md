# MSS Platform Documentation

<!-- Documentation Version: v1.0.0 -->
<!-- Last Updated: 2025-08-07 -->
<!-- Next Review: 2025-09-07 -->

Welcome to the comprehensive documentation for the MSS Platform - a multi-tenant cybersecurity management system.

## 📚 Documentation Index

> **Documentation Version**: v1.0.0 | **Last Updated**: August 7, 2025  
> See [VERSIONING.md](./VERSIONING.md) for complete version history and change management.

### 🚀 Getting Started
- **[Main README](../README.md)** - Project overview, quick start, and features
- **[Development Guide](./DEVELOPMENT.md)** - Complete development setup and workflows
- **[Architecture Overview](./ARCHITECTURE.md)** - System architecture and design patterns
- **[Documentation Versioning](./VERSIONING.md)** - Version control and change management for docs

### 🔒 Security & Compliance
- **[Security Documentation](./SECURITY.md)** - Authentication, authorization, and security features
- **[RBAC Guide](./RBAC.md)** - Role-based access control implementation
- **[Compliance Guide](./COMPLIANCE.md)** - SOC2, ISO27001, and audit requirements

### 🛠️ API Documentation
- **[OpenAPI Specification](./api/openapi.yaml)** - Complete REST API documentation
- **[Postman Collection](./api/MSS-Platform.postman_collection.json)** - API testing collection
- **[API Authentication Guide](./api/AUTHENTICATION.md)** - JWT and MFA implementation details

### 🏗️ Technical Guides
- **[Database Schema](./database/SCHEMA.md)** - Complete database documentation
- **[Multi-Tenant Guide](./MULTI_TENANT.md)** - Multi-tenancy implementation
- **[Testing Guide](./TESTING.md)** - Testing strategies and frameworks
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment procedures

### 📊 Operations & Monitoring
- **[Monitoring Guide](./MONITORING.md)** - Observability and metrics
- **[Performance Guide](./PERFORMANCE.md)** - Optimization strategies
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Backup & Recovery](./BACKUP_RECOVERY.md)** - Data protection procedures

## 📋 Quick Reference

### Key Features
- ✅ **Multi-Tenant Architecture** - Complete organization isolation
- ✅ **JWT + MFA Authentication** - Enterprise-grade security
- ✅ **Role-Based Access Control** - Granular permissions
- ✅ **Real-Time Notifications** - WebSocket integration
- ✅ **Comprehensive Audit Trail** - Full compliance logging
- ✅ **Security Operations Center** - Alert and incident management
- ✅ **Technician Remote Access** - Secure customer environment access

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Material-UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 15+ with Redis caching
- **Authentication**: JWT with TOTP-based MFA
- **Real-time**: WebSocket (Socket.IO)
- **Container**: Docker with Docker Compose
- **Testing**: Jest, React Testing Library, Playwright

### Core Endpoints
```
Authentication:
POST /api/auth/login              - User authentication
POST /api/auth/mfa/complete       - Complete MFA verification
POST /api/auth/refresh            - Refresh access token
POST /api/auth/logout             - Logout and cleanup

User Management:
GET  /api/users                   - List users (org-scoped)
POST /api/users                   - Create user
GET  /api/users/:id               - Get user details
PUT  /api/users/:id               - Update user
DELETE /api/users/:id             - Delete user

Security Operations:
GET  /api/alerts                  - Security alerts
PUT  /api/alerts/:id              - Update alert
GET  /api/reports                 - Security reports
GET  /api/reports/:id/download    - Download report

Interventions:
GET  /api/interventions           - List interventions
POST /api/interventions           - Request intervention
PUT  /api/interventions/:id       - Update intervention status
```

## 🚀 Quick Start

### Installation
```bash
# Clone repository
git clone <repository-url>
cd mss-platform

# Install dependencies
npm install

# Start development environment
npm run dev

# Access applications
# Frontend: http://localhost:3000
# API: http://localhost:8000
# API Docs: http://localhost:8000/api-docs
```

### Development Commands
```bash
npm run dev                       # Start all services
npm run build                     # Build all applications
npm run test                      # Run all tests
npm run lint                      # Lint all code
npm run type-check                # TypeScript checking
npm run migrate                   # Database migrations
npm run seed                      # Seed sample data
```

## 🎯 Platform Purpose

The MSS Platform serves cybersecurity Managed Security Services providers by:

- **Enabling Corporate Customers** to view security reports, request interventions, and manage their security posture
- **Empowering Internal Technicians** with secure remote access to customer environments without credential exposure
- **Maintaining Complete Audit Trails** for compliance with SOC2, ISO27001, and other security standards
- **Providing Multi-Tenant Architecture** supporting multiple customer organizations with role-based access

## 🛡️ Security First

This platform is designed with security as the primary concern:
- All remote access is proxied through secure gateways
- Technicians never have direct access to customer credentials
- Complete audit logging of all activities
- Regular automated security scanning and dependency updates
- Enterprise-grade authentication with MFA support

## 👥 Contributing

Please read our [development setup guide](./03-development-setup.md) before contributing. All contributions must pass security scanning and code review processes.

## 📄 License

This project is proprietary software for [Your Company Name]. See LICENSE file for details.