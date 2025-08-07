# Cybersecurity MSS Platform - Technical Specification

## Overview
A comprehensive platform for a cybersecurity Managed Security Services (MSS) provider with two main user groups:
1. **Corporate Customers**: View reports and request security interventions
2. **Internal Technicians**: Work on customer environments through the platform with embedded remote access

## User Groups & Access Control

### Corporate Customers (Group 1)
- View security reports and dashboards (vulnerability assessments, incident reports, compliance dashboards)
- Submit requests for security interventions
- Multi-tenant organization structure with role-based permissions:
  - Admin Users (full customer permissions)
  - Report Viewers (read-only reports)
  - Request Users (can submit intervention requests)
  - Basic Users (limited dashboard access)

### Internal Technicians (Group 2)
- Access customer environments remotely through the platform
- Individual technician-to-customer access assignment (not group-based)
- Platform handles all connections and credentials (techs never see actual credentials)
- Complete audit logging of all activities
- MSS Provider structure:
  - Super Admins (platform management)
  - Technicians (individual customer access assignments)
  - Security Analysts (cross-customer reporting)
  - Account Managers (customer relationship management)

## Technical Architecture

### Tech Stack
- **Frontend**: React + TypeScript + Next.js + Material-UI
- **Backend**: Node.js + TypeScript + Express + PostgreSQL + Redis
- **Authentication**: Hybrid system (built-in + enterprise SSO)
- **Remote Access**: Apache Guacamole + Teleport + OpenVPN
- **Security**: Auth0/Keycloak + HashiCorp Vault + JWT
- **Infrastructure**: Docker (dev) + Optional Kubernetes (production)

### Infrastructure Strategy
- **Development**: Docker Compose for local development
- **Production**: Docker + Optional Kubernetes for scaling
- Development workflow: Single command startup with `docker-compose up -d`
- Hot reload for frontend/backend development
- Isolated databases and services

### Authentication System
#### Built-in Authentication (Primary)
- Email/Password with strong password policies
- TOTP MFA (Google Authenticator, Authy, etc.)
- Backup codes for MFA recovery
- Password reset via secure email tokens
- Account lockout after failed attempts
- Session management with secure JWT + refresh tokens

#### Enterprise SSO (Optional)
- SAML 2.0 integration
- OAuth2/OIDC (Azure AD, Google Workspace, Okta)
- Just-in-Time (JIT) provisioning
- Fallback to built-in auth if SSO fails

### Database Schema (Key Tables)
```sql
-- Organizations (customer companies + MSS provider)
organizations:
├── id
├── name
├── type ('customer' | 'mss_provider')
├── sso_enabled
└── created_at

-- Users with organizational roles
users:
├── id
├── org_id
├── email
├── role
├── mfa_enabled
└── created_at

-- Individual technician access (many-to-many)
technician_customer_access:
├── technician_id (user.id where role = 'technician')
├── customer_org_id (organization.id)
├── granted_by (admin user.id)
├── granted_at (timestamp)
├── access_level ('read_only' | 'full_access' | 'emergency')
└── expires_at (optional temporary access)

-- SSO configurations per organization
sso_configurations:
├── org_id
├── provider_type
├── configuration_data
└── enabled
```

## Development Plan & Agent Allocation

### Phase 1: Foundation & Architecture
- **rapid-prototyper**: Initial project scaffolding, directory structure, package setup
- **backend-architect**: API design, database schema, authentication architecture
- **devops-automator**: Multi-environment Docker configuration (dev/staging/prod)

### Phase 2: Core Authentication & Security
- **backend-architect**: JWT implementation, RBAC system, session management, MFA
- **frontend-developer**: Login components, role-based UI routing, MFA setup UI
- **legal-compliance-checker**: SOC2/ISO27001 compliance review

### Phase 3: Multi-Tenant Management
- **backend-architect**: Multi-tenant customer management APIs
- **frontend-developer**: User management interfaces, customer access matrix
- **backend-architect**: Individual technician-to-customer access assignment system

### Phase 4: Customer Portal (Group 1)
- **frontend-developer**: Customer dashboard, report visualization components
- **ui-designer**: Professional MSS interface design
- **backend-architect**: Report APIs, customer data endpoints
- **analytics-reporter**: Dashboard metrics and KPI tracking

### Phase 5: Technician Workspace (Group 2)
- **backend-architect**: Remote access proxy setup, credential management
- **frontend-developer**: Embedded terminal, remote desktop integration
- **devops-automator**: VPN client integration, network isolation
- **infrastructure-maintainer**: Apache Guacamole/Teleport setup

### Phase 6: Audit & Compliance
- **backend-architect**: Comprehensive audit logging system
- **analytics-reporter**: Audit trail reporting and analytics
- **legal-compliance-checker**: Final compliance validation

### Phase 7: Testing & Quality Assurance
- **test-writer-fixer**: Security testing, integration tests
- **api-tester**: Remote access API testing
- **performance-benchmarker**: Load testing for remote access

### Phase 8: Deployment & Monitoring
- **devops-automator**: Production deployment pipeline
- **infrastructure-maintainer**: Monitoring, alerting setup
- **studio-producer**: Launch coordination

## Key Features

### Remote Access Security
- Platform makes VPN connections on server level
- Technicians never have access to customer credentials
- All connections isolated from technician workstations
- Embedded tools: RDP, SSH, VPN connections, web-based terminals

### Audit & Compliance
- Detailed audit logging for all technician activities
- SOC2 and ISO27001 compliance targeted
- Complete access history and permission change tracking
- Emergency access capabilities with full audit trail

### Access Management Features
- Customer Access Matrix: Visual grid showing tech-to-customer assignments
- Quick Assignment: Drag-and-drop or bulk selection interfaces
- Access History: Complete audit log of permission changes
- Customer Handoff: Transfer all access from one tech to another
- Dynamic Permissions: Add/remove customer access without affecting other assignments

## Data Sources
- API connections to existing security products
- Internal data sources for interventions and custom reports
- Multi-format report generation and visualization

## Compliance & Security
- All technician activities logged and auditable
- Credential isolation (technicians never see actual credentials)
- SOC2 and ISO27001 compliance framework
- Secure session management and MFA enforcement
- Enterprise SSO integration capabilities