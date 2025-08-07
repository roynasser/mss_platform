# Cybersecurity MSS Platform - Backend API

## 🎯 Phase 2 Implementation - Production-Ready Authentication System

This is the complete backend API implementation for the Cybersecurity Managed Security Services (MSS) Platform, featuring enterprise-grade authentication, multi-factor authentication (MFA), and comprehensive security controls.

## 🔐 Authentication Features

### Core Authentication
- **JWT-based authentication** with access/refresh token rotation
- **Multi-factor authentication (MFA)** with TOTP and backup codes
- **Risk-based authentication** with device fingerprinting and location tracking
- **Session management** with concurrent session limits
- **Account lockout protection** with progressive penalties
- **Password security** with strength validation and history prevention

### Security Controls
- **Role-based access control (RBAC)** with organization isolation
- **Rate limiting** per user and endpoint type
- **Audit logging** for all authentication events
- **Device tracking** for trusted device management
- **IP reputation** and geo-location monitoring
- **Impossible travel detection** for suspicious activity

## 🗄️ Database Architecture

The system uses PostgreSQL with a comprehensive multi-tenant schema:

- **Organizations**: Customer companies + MSS provider isolation
- **Users**: Complete user management with MFA settings
- **Sessions**: JWT session tracking with device metadata
- **Security**: Password resets, email verification, login attempts
- **Business Logic**: Reports, interventions, alerts (legacy compatibility)

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit the environment variables
nano .env
```

Key variables to configure:
```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/mss_platform

# Redis (required for sessions and MFA)
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate secure random strings)
JWT_SECRET=your-256-bit-secret-key
JWT_REFRESH_SECRET=your-different-256-bit-refresh-secret

# Encryption key for MFA secrets (32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key

# SMTP for password resets
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Run database migration
npm run migrate

# Seed with demo data
npm run seed
```

### 3. Start Development Server

```bash
# Development with hot reload
npm run dev

# Production build
npm run build
npm start
```

## 📡 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Email/password login with risk assessment |
| `POST` | `/api/auth/mfa/complete` | Complete MFA authentication |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Logout current session |
| `POST` | `/api/auth/logout-all` | Logout all sessions |
| `GET` | `/api/auth/me` | Get current user info |
| `GET` | `/api/auth/sessions` | List active sessions |
| `DELETE` | `/api/auth/sessions/:id` | Revoke specific session |

### Password Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/password/change` | Change password |
| `POST` | `/api/auth/password/reset` | Request password reset |
| `POST` | `/api/auth/password/reset/confirm` | Confirm password reset |

### Multi-Factor Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/mfa/setup` | Generate MFA setup (QR code) |
| `POST` | `/api/auth/mfa/enable` | Enable MFA after verification |
| `POST` | `/api/auth/mfa/disable` | Disable MFA |
| `POST` | `/api/auth/mfa/regenerate-codes` | Generate new backup codes |
| `GET` | `/api/auth/mfa/status` | Get MFA status |

## 🔑 Authentication Flow Examples

### 1. Standard Login

```javascript
// Login request
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword'
  })
});

const data = await response.json();

if (data.requiresMfa) {
  // MFA required - complete with TOTP code
  const mfaResponse = await fetch('/api/auth/mfa/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: '123456',
      pendingSessionId: data.pendingSessionId
    })
  });
} else {
  // Login successful - store tokens
  localStorage.setItem('accessToken', data.data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
}
```

### 2. MFA Setup

```javascript
// 1. Generate MFA setup
const setupResponse = await fetch('/api/auth/mfa/setup', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const setupData = await setupResponse.json();
// Display QR code: setupData.data.qrCode
// Show backup codes: setupData.data.backupCodes

// 2. Enable MFA with TOTP code
const enableResponse = await fetch('/api/auth/mfa/enable', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    totpCode: '123456' // From authenticator app
  })
});
```

### 3. Token Refresh

```javascript
// Automatic token refresh
const refreshResponse = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken')
  })
});

if (refreshResponse.ok) {
  const data = await refreshResponse.json();
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
}
```

## 🛡️ Security Features

### Risk Assessment

The system performs real-time risk assessment during login:

- **New IP addresses** and geographical locations
- **Device fingerprinting** for trusted devices
- **Time-based analysis** for unusual login times
- **Failed attempt monitoring** per IP and user
- **Automated user agent detection** for bots
- **IP reputation checking** against known threats

Risk levels: `low`, `medium`, `high`, `critical`
- **Medium/High**: Requires MFA
- **Critical**: Login blocked

### Session Security

- **JWT access tokens**: 15-minute expiry
- **Refresh tokens**: 7-day expiry with rotation
- **Session tracking**: Device info, location, IP
- **Concurrent limits**: Maximum 5 active sessions
- **Automatic cleanup**: Expired session removal

### Password Security

- **Strength validation**: 8+ chars, mixed case, numbers, symbols
- **History prevention**: Last 5 passwords blocked
- **Progressive lockout**: Account lock after 5 failed attempts
- **Secure reset tokens**: 1-hour expiry, cryptographically secure

### MFA Implementation

- **TOTP support**: Google Authenticator, Authy, etc.
- **Backup codes**: 10 single-use recovery codes
- **Replay protection**: Used codes tracked in Redis
- **Time window**: 30-second tolerance for clock drift
- **Required roles**: Super admin, technician, security analyst

## 📊 Audit & Compliance

### Comprehensive Logging

All authentication events are logged:

- Login attempts (success/failure)
- MFA usage and backup code consumption
- Password changes and resets
- Session creation and termination
- Suspicious activity detection

### Compliance Features

- **Data retention**: Configurable log retention periods
- **Audit trails**: Immutable security event logs
- **User tracking**: Complete activity monitoring
- **Export capabilities**: JSON/CSV audit data export
- **GDPR compliance**: User data deletion and export

## 🔧 Development & Testing

### Demo Users

After running `npm run seed`, these demo users are available:

| Email | Password | Role | Organization |
|-------|----------|------|--------------|
| `admin@mssplatform.com` | `SecureAdmin123!` | Super Admin | MSS Provider |
| `technician@mssplatform.com` | `SecureTech123!` | Technician | MSS Provider |
| `analyst@mssplatform.com` | `SecureAnalyst123!` | Security Analyst | MSS Provider |
| `admin@acme.com` | `SecureCustomer123!` | Admin | Acme Corporation |
| `viewer@acme.com` | `SecureViewer123!` | Report Viewer | Acme Corporation |

### API Testing

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests (when implemented)
npm test
```

### RBAC Testing

Each role has specific permissions:

**Customer Organization Roles:**
- `admin`: Full organization management
- `report_viewer`: View security reports only
- `request_user`: Submit intervention requests
- `basic_user`: Limited dashboard access

**MSS Provider Roles:**
- `super_admin`: Platform administration
- `technician`: Customer access and remote sessions
- `security_analyst`: Report creation and analysis
- `account_manager`: Customer relationship management

## 🚀 Production Deployment

### Environment Variables

Ensure these production settings:

```env
NODE_ENV=production
JWT_SECRET=<256-bit-production-secret>
JWT_REFRESH_SECRET=<different-256-bit-secret>
ENCRYPTION_KEY=<32-character-production-key>
DATABASE_URL=<production-database-url>
REDIS_URL=<production-redis-url>
```

### Security Checklist

- [ ] Generate secure random JWT secrets (256-bit minimum)
- [ ] Configure production database with SSL
- [ ] Set up Redis with authentication
- [ ] Configure SMTP for password reset emails
- [ ] Set appropriate CORS origins
- [ ] Enable HTTPS/TLS in production
- [ ] Configure rate limiting for production load
- [ ] Set up monitoring and alerting
- [ ] Review and adjust session timeouts
- [ ] Configure log retention policies

### Monitoring

The API includes health check endpoints:

- `GET /health`: Basic health status
- Monitor failed login attempts
- Track MFA adoption rates
- Monitor session creation/termination
- Alert on suspicious activity patterns

## 🔗 Integration

### Frontend Integration

The API is designed for seamless integration with React/Next.js frontends:

```typescript
// TypeScript interfaces available
interface AuthResponse {
  success: boolean;
  data?: {
    user: User;
    tokens: TokenPair;
    riskAssessment: RiskAssessment;
  };
  requiresMfa?: boolean;
  pendingSessionId?: string;
}
```

### External Services

Optional integrations supported:

- **Email providers**: SMTP, SendGrid, AWS SES
- **IP Geolocation**: MaxMind, ipinfo.io
- **Threat Intelligence**: VirusTotal, AbuseIPDB
- **Monitoring**: Prometheus, Grafana, DataDog

## 📝 Notes

This Phase 2 implementation provides a production-ready authentication system that:

- ✅ Implements all Phase 1 database designs
- ✅ Provides comprehensive JWT + MFA authentication
- ✅ Includes advanced security features (risk assessment, device tracking)
- ✅ Offers complete session management
- ✅ Maintains backward compatibility with existing routes
- ✅ Supports frontend integration out of the box
- ✅ Includes extensive logging and audit capabilities
- ✅ Follows security best practices for enterprise applications

The system is ready for immediate frontend integration and can handle production traffic with appropriate scaling infrastructure.