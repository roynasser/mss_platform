# Technical Architecture

## Architecture Decisions & Rationale

### Technology Stack Selection

The technology stack was chosen to prioritize security, scalability, and rapid development cycles while ensuring enterprise-grade compliance and performance.

#### Frontend Stack
**Next.js 14 + TypeScript + Material-UI**

**Rationale:**
- **Next.js 14**: Server-side rendering for better SEO and performance, built-in API routes, excellent TypeScript support
- **TypeScript**: Type safety crucial for security-sensitive application, better developer experience, reduced runtime errors
- **Material-UI**: Professional enterprise-grade components, accessibility compliance, consistent design system

**Alternative Considered:** React + Vite was considered but Next.js provides better SSR capabilities needed for dashboard applications.

#### Backend Stack
**Node.js + Express + TypeScript**

**Rationale:**
- **Node.js**: JavaScript ecosystem alignment with frontend, excellent async I/O for real-time features, strong security libraries
- **Express**: Mature, lightweight, extensive middleware ecosystem for security (helmet, cors, etc.)
- **TypeScript**: End-to-end type safety, shared type definitions between frontend and backend

**Alternative Considered:** Go was considered for performance but Node.js was chosen for team velocity and shared language benefits.

#### Database Stack
**PostgreSQL + Redis**

**Rationale:**
- **PostgreSQL**: ACID compliance essential for audit trails, excellent JSON support, strong security features, compliance-ready
- **Redis**: Session management, real-time features, caching for performance, pub/sub for notifications

**Alternative Considered:** MongoDB was considered but PostgreSQL's ACID guarantees are crucial for financial and compliance data.

#### Infrastructure Stack
**Docker + Optional Kubernetes**

**Rationale:**
- **Docker**: Consistent development/production environments, easy local development, container security
- **Kubernetes (Optional)**: Scalability for enterprise deployment while keeping development simple with Docker Compose

**Alternative Considered:** Serverless was considered but the need for persistent connections (remote access) made containers more suitable.

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (NGINX)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
    ┌─────▼─────┐           ┌─────▼─────┐
    │ Frontend  │           │ Backend   │
    │ (Next.js) │◄──────────┤ (Express) │
    └───────────┘           └─────┬─────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
              │PostgreSQL │ │   Redis   │ │  Remote   │
              │Database   │ │   Cache   │ │  Access   │
              └───────────┘ └───────────┘ │  Gateway  │
                                         └───────────┘
```

### Detailed Component Architecture

#### Frontend Architecture (Next.js)
```
apps/frontend/
├── src/
│   ├── app/                    # App Router (Next.js 13+)
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Role-based dashboards
│   │   │   ├── customer/      # Customer dashboard
│   │   │   ├── technician/    # Technician workspace
│   │   │   └── admin/         # Admin interface
│   │   └── layout.tsx         # Root layout with providers
│   │
│   ├── components/            # Reusable UI components
│   │   ├── auth/              # Authentication components
│   │   ├── layout/            # Layout components
│   │   └── dashboard/         # Dashboard-specific components
│   │
│   ├── contexts/              # React contexts for state
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # API communication
│   ├── types/                 # TypeScript definitions
│   └── utils/                 # Utility functions
```

#### Backend Architecture (Express)
```
apps/api/
├── src/
│   ├── controllers/           # Route handlers
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── reports.controller.ts
│   │   └── interventions.controller.ts
│   │
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── audit.middleware.ts
│   │
│   ├── models/                # Database models
│   ├── routes/                # Route definitions
│   ├── services/              # Business logic
│   └── utils/                 # Utility functions
```

#### Database Schema Design
```sql
-- Multi-tenant organization structure
organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('customer', 'mss_provider'),
    settings JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

-- User management with role-based access
users (
    id UUID PRIMARY KEY,
    org_id UUID REFERENCES organizations(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    last_login TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

-- Individual technician-to-customer access mapping
technician_customer_access (
    id UUID PRIMARY KEY,
    technician_id UUID REFERENCES users(id),
    customer_org_id UUID REFERENCES organizations(id),
    granted_by UUID REFERENCES users(id),
    access_level VARCHAR(50) DEFAULT 'full_access',
    granted_at TIMESTAMP,
    expires_at TIMESTAMP NULL,
    revoked_at TIMESTAMP NULL
)

-- Comprehensive audit logging
audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    org_id UUID REFERENCES organizations(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP
)
```

## Security Architecture

### Authentication & Authorization Flow
```
1. User Authentication
   ├── Built-in (Email + Password + MFA)
   └── Enterprise SSO (SAML/OAuth2)
   
2. Token Management
   ├── JWT Access Token (15 min expiry)
   ├── Refresh Token (7 day expiry)
   └── Session Storage in Redis

3. Authorization
   ├── Role-Based Access Control (RBAC)
   ├── Organization-level isolation
   └── Resource-level permissions
```

### Remote Access Security Model
```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│ Technician  │────┤   Platform   │────┤ Customer Env    │
│ Browser     │    │   Gateway    │    │ (RDP/SSH/VPN)   │
└─────────────┘    └──────────────┘    └─────────────────┘
                          │
                    ┌─────▼─────┐
                    │Credential │
                    │  Vault    │
                    │(HashiCorp)│
                    └───────────┘
```

**Key Security Features:**
- **Credential Isolation**: Technicians never see actual customer credentials
- **Session Recording**: All remote access sessions recorded for audit
- **Network Isolation**: Customer environments isolated from technician workstations
- **Access Logging**: Complete audit trail of all access attempts and activities

### Data Security
- **Encryption at Rest**: AES-256 encryption for database and file storage
- **Encryption in Transit**: TLS 1.3 for all communications
- **Secret Management**: HashiCorp Vault for credential storage
- **Data Classification**: Sensitive data tagged and handled according to compliance requirements

## Scalability Architecture

### Horizontal Scaling Strategy
```
Production Deployment:
┌─────────────────────────────────────────────────────────┐
│                Load Balancer                            │
├─────────────────────────────────────────────────────────┤
│  Frontend Pods (3x)    │    API Pods (3x)             │
├────────────────────────┼───────────────────────────────┤
│         Database Cluster (Primary + 2 Replicas)        │
├─────────────────────────────────────────────────────────┤
│         Redis Cluster (3 nodes + 3 replicas)           │
└─────────────────────────────────────────────────────────┘
```

### Performance Optimization
- **Database Indexing**: Optimized indexes for common query patterns
- **Caching Strategy**: Multi-level caching (Redis, CDN, application)
- **Connection Pooling**: Efficient database connection management
- **Asset Optimization**: CDN delivery for static assets

## Monitoring & Observability

### Logging Strategy
```
Application Logs:
├── Structured JSON logging
├── Correlation IDs for request tracing
├── Security event logging
└── Performance metrics

Infrastructure Logs:
├── Container logs (Docker/Kubernetes)
├── Database query logs
├── Network access logs
└── System metrics
```

### Monitoring Stack
- **Application Monitoring**: Custom metrics and health checks
- **Infrastructure Monitoring**: Container and system metrics
- **Security Monitoring**: Real-time security event detection
- **Compliance Monitoring**: Audit trail completeness validation

## Integration Architecture

### External Service Integration
```
MSS Platform
├── Security Tools
│   ├── SIEM Platforms (Splunk, QRadar)
│   ├── Vulnerability Scanners (Nessus, Qualys)
│   └── Threat Intelligence Feeds
│
├── Enterprise Systems
│   ├── SSO Providers (Auth0, Okta, Azure AD)
│   ├── Directory Services (Active Directory)
│   └── Ticketing Systems (ServiceNow, Jira)
│
└── Communication
    ├── Email Services (SendGrid, SES)
    ├── SMS/Voice (Twilio)
    └── Chat Platforms (Slack, Teams)
```

### API Design Principles
- **RESTful Design**: Standard HTTP methods and status codes
- **API Versioning**: Support for multiple API versions
- **Rate Limiting**: Protection against API abuse
- **Documentation**: OpenAPI/Swagger documentation
- **Security**: API key authentication, request validation, CORS configuration

## Development Architecture

### Monorepo Structure Benefits
- **Code Sharing**: Shared types, utilities, and components
- **Atomic Deployments**: Deploy related changes together
- **Consistent Tooling**: Unified linting, testing, and building
- **Type Safety**: End-to-end type checking across all services

### Build & Deployment Pipeline
```
1. Code Commit
   ↓
2. CI Pipeline (GitHub Actions)
   ├── Linting & Type Checking
   ├── Unit & Integration Tests
   ├── Security Scanning
   └── Build Artifacts
   ↓
3. Deployment Pipeline
   ├── Staging Environment (Auto)
   ├── Production Environment (Manual)
   └── Rollback Capability
```

This architecture provides a secure, scalable foundation for the MSS platform while maintaining development velocity and operational simplicity.