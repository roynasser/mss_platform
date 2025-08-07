# MSS Platform Security Documentation

## 🔒 Security Overview

The MSS Platform implements enterprise-grade security measures to protect sensitive cybersecurity data and ensure compliance with industry standards including SOC2 and ISO27001.

## 🛡️ Authentication & Authorization

### JWT-Based Authentication

The platform uses JSON Web Tokens (JWT) for stateless authentication:

- **Access Tokens**: Short-lived (15 minutes) for API access
- **Refresh Tokens**: Long-lived (30 days) for token renewal
- **MFA Tokens**: Short-lived (5 minutes) for MFA completion

#### Token Structure

```javascript
// Access Token Payload
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "admin",
  "orgId": "uuid",
  "orgType": "customer",
  "sessionId": "uuid",
  "iat": 1234567890,
  "exp": 1234567890,
  "type": "access"
}
```

### Multi-Factor Authentication (MFA)

MFA implementation using Time-based One-Time Passwords (TOTP):

- **TOTP Algorithm**: RFC 6238 compliant
- **Secret Length**: 32 bytes (256 bits)
- **Time Step**: 30 seconds
- **Code Length**: 6 digits
- **Backup Codes**: 8 single-use recovery codes

#### MFA Flow

1. **Setup**: Generate TOTP secret and QR code
2. **Verification**: User scans QR code with authenticator app
3. **Activation**: User enters TOTP code to confirm setup
4. **Login**: After password verification, prompt for TOTP code
5. **Recovery**: Backup codes for device loss scenarios

### Role-Based Access Control (RBAC)

#### Customer Organization Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| **admin** | Full organization management | Manage users, view all reports, request interventions |
| **report_viewer** | Read-only report access | View security reports and dashboards |
| **request_user** | Intervention requests | Request security interventions, view own requests |
| **basic_user** | Dashboard access | Limited dashboard access, view basic security status |

#### MSS Provider Roles

| Role | Permissions | Description |
|------|-------------|-------------|
| **super_admin** | Platform administration | Full system access, manage all organizations |
| **account_manager** | Customer management | Manage customer organizations and users |
| **security_analyst** | Security operations | Monitor alerts, generate reports, analyze threats |
| **technician** | Field operations | Execute interventions, access customer environments |

## 🔐 Password Security

### Password Policies

- **Minimum Length**: 8 characters
- **Complexity**: Must include uppercase, lowercase, numbers
- **History**: Prevent reuse of last 12 passwords
- **Expiration**: 90 days for privileged accounts
- **Lockout**: Account locked after 5 failed attempts

### Password Storage

- **Algorithm**: bcrypt with salt rounds = 12
- **Salt**: Cryptographically random per password
- **Verification**: Constant-time comparison to prevent timing attacks

```javascript
// Password hashing implementation
import bcrypt from 'bcryptjs';

const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);
const isValid = await bcrypt.compare(password, hashedPassword);
```

## 🔒 Encryption & Data Protection

### Data Encryption

#### At Rest
- **Database**: AES-256 encryption for sensitive fields
- **Backups**: Encrypted with separate key management
- **Files**: AES-256-GCM for document storage

#### In Transit
- **API Communication**: TLS 1.3 minimum
- **WebSocket**: WSS (WebSocket Secure)
- **Database**: SSL/TLS encrypted connections

### Encryption Implementation

```javascript
// Sensitive data encryption
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('MSS-Platform'));
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}
```

## 🔍 Session Management

### Session Security

- **Session ID**: Cryptographically secure random (256 bits)
- **Storage**: Redis with TTL expiration
- **Rotation**: New session ID on role changes
- **Tracking**: Device fingerprinting and IP monitoring

### Session Data Structure

```javascript
{
  "sessionId": "crypto-random-id",
  "userId": "uuid",
  "createdAt": "timestamp",
  "lastAccessAt": "timestamp",
  "expiresAt": "timestamp",
  "ipAddress": "client-ip",
  "userAgent": "client-user-agent",
  "deviceFingerprint": "device-hash",
  "riskLevel": "low|medium|high|critical",
  "revoked": false,
  "revokedReason": null
}
```

### Device Fingerprinting

```javascript
function generateDeviceFingerprint(req) {
  const components = [
    req.headers['user-agent'],
    req.headers['accept-language'],
    req.headers['accept-encoding'],
    req.ip,
    req.headers['x-forwarded-for']
  ].filter(Boolean);
  
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
}
```

## 🚫 Security Middleware

### Rate Limiting

```javascript
// Authentication endpoints
app.use('/api/auth', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many authentication attempts',
  standardHeaders: true,
  legacyHeaders: false
}));

// General API endpoints
app.use('/api', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.user?.role === 'super_admin'
}));
```

### Input Validation

```javascript
import Joi from 'joi';

// User creation validation
const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  role: Joi.string().valid(...VALID_ROLES).required(),
  password: Joi.string().min(8).pattern(PASSWORD_REGEX).optional()
});

// Validation middleware
const validateRequest = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.reduce((acc, detail) => {
        acc[detail.path.join('.')] = detail.message;
        return acc;
      }, {})
    });
  }
  next();
};
```

### SQL Injection Prevention

```javascript
// Parameterized queries only
const getUserById = async (userId) => {
  const result = await db.query(
    'SELECT * FROM users WHERE id = $1 AND status != $2',
    [userId, 'deleted']
  );
  return result.rows[0];
};

// Query builder with parameter binding
const buildUserQuery = (filters) => {
  let query = 'SELECT * FROM users WHERE status != $1';
  const params = ['deleted'];
  let paramIndex = 2;
  
  if (filters.orgId) {
    query += ` AND org_id = $${paramIndex}`;
    params.push(filters.orgId);
    paramIndex++;
  }
  
  if (filters.role) {
    query += ` AND role = $${paramIndex}`;
    params.push(filters.role);
    paramIndex++;
  }
  
  return { query, params };
};
```

## 🔎 Audit Logging

### Audit Events

All security-relevant events are logged:

- **Authentication**: Login, logout, MFA events
- **Authorization**: Access denials, role changes
- **Data Access**: Sensitive data views, exports
- **Configuration**: Security setting changes
- **Administrative**: User management, system changes

### Audit Log Structure

```javascript
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "userId": "uuid",
  "sessionId": "uuid",
  "organizationId": "uuid",
  "actionType": "login|logout|create|update|delete|view|export",
  "resourceType": "user|organization|report|alert|intervention",
  "resourceId": "uuid",
  "actionDescription": "Human readable description",
  "actionData": {
    "field": "changes made",
    "previous": "old value",
    "new": "new value"
  },
  "ipAddress": "client-ip",
  "userAgent": "client-user-agent",
  "riskLevel": "low|medium|high|critical",
  "complianceRelevant": true,
  "success": true,
  "errorCode": null,
  "metadata": {
    "additional": "context data"
  }
}
```

### Audit Implementation

```javascript
const auditLog = {
  async logEvent(event) {
    await db.query(`
      INSERT INTO audit_logs (
        user_id, session_id, org_id, action_type, resource_type,
        resource_id, action_description, action_data, ip_address,
        user_agent, risk_level, compliance_relevant, success,
        error_code, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `, [
      event.userId, event.sessionId, event.organizationId,
      event.actionType, event.resourceType, event.resourceId,
      event.actionDescription, JSON.stringify(event.actionData),
      event.ipAddress, event.userAgent, event.riskLevel,
      event.complianceRelevant, event.success, event.errorCode,
      JSON.stringify(event.metadata), new Date()
    ]);
  },
  
  async searchAuditTrail(filters) {
    const { query, params } = buildAuditQuery(filters);
    const result = await db.query(query, params);
    return result.rows;
  }
};
```

## 🛡️ Security Headers

### HTTP Security Headers

```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
}));
```

## 🔍 Threat Detection

### Risk Assessment

Real-time risk assessment based on:

- **Login Patterns**: Unusual times, locations, devices
- **Failed Attempts**: Multiple failures, credential stuffing
- **Behavior Analysis**: Unusual data access patterns
- **Threat Intelligence**: Known malicious IPs, user agents

### Risk Scoring

```javascript
const calculateRiskScore = (context) => {
  let score = 0;
  const factors = [];
  
  // Location risk
  if (context.location.country !== context.user.usualCountry) {
    score += 30;
    factors.push('unusual_location');
  }
  
  // Time-based risk
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) {
    score += 10;
    factors.push('unusual_time');
  }
  
  // Device risk
  if (!context.user.knownDevices.includes(context.deviceFingerprint)) {
    score += 20;
    factors.push('new_device');
  }
  
  // Failed attempts
  if (context.user.recentFailedAttempts > 2) {
    score += context.user.recentFailedAttempts * 5;
    factors.push('failed_attempts');
  }
  
  // Determine risk level
  let riskLevel = 'low';
  if (score >= 50) riskLevel = 'critical';
  else if (score >= 30) riskLevel = 'high';
  else if (score >= 15) riskLevel = 'medium';
  
  return { score, riskLevel, factors };
};
```

## 🚨 Incident Response

### Security Incident Classification

| Level | Description | Response Time | Stakeholders |
|-------|-------------|---------------|--------------|
| **P0 - Critical** | Data breach, system compromise | 15 minutes | All teams, executives |
| **P1 - High** | Service disruption, failed logins | 1 hour | Security, engineering |
| **P2 - Medium** | Performance issues, warnings | 4 hours | Security team |
| **P3 - Low** | Minor issues, informational | 24 hours | Engineering team |

### Automated Response Actions

```javascript
const securityAutomation = {
  async handleSuspiciousActivity(event) {
    const risk = calculateRiskScore(event);
    
    switch (risk.riskLevel) {
      case 'critical':
        await this.lockAccount(event.userId);
        await this.notifySecurityTeam(event);
        await this.requireMFAVerification(event.userId);
        break;
        
      case 'high':
        await this.requireMFAVerification(event.userId);
        await this.logSecurityEvent(event);
        break;
        
      case 'medium':
        await this.increaseMonitoring(event.userId);
        await this.logSecurityEvent(event);
        break;
    }
  },
  
  async lockAccount(userId) {
    await db.query(
      'UPDATE users SET status = $1 WHERE id = $2',
      ['locked', userId]
    );
    
    await db.query(
      'UPDATE user_sessions SET status = $1 WHERE user_id = $2',
      ['revoked', userId]
    );
  }
};
```

## 🔒 Data Classification & Handling

### Data Classification Levels

| Level | Description | Examples | Protection Requirements |
|-------|-------------|----------|------------------------|
| **Public** | Non-sensitive information | Marketing materials | Standard web security |
| **Internal** | Business information | User guides, procedures | Access controls |
| **Confidential** | Sensitive business data | Customer data, reports | Encryption, audit logging |
| **Restricted** | Highly sensitive data | Security assessments, PII | Encryption, MFA, audit |

### Data Handling Procedures

```javascript
const dataClassification = {
  LEVELS: {
    PUBLIC: 1,
    INTERNAL: 2,
    CONFIDENTIAL: 3,
    RESTRICTED: 4
  },
  
  getRequiredProtections(dataLevel) {
    switch (dataLevel) {
      case this.LEVELS.RESTRICTED:
        return {
          encryption: 'required',
          mfaRequired: true,
          auditLogging: true,
          accessRestriction: 'role-based',
          dataRetention: '7-years'
        };
      case this.LEVELS.CONFIDENTIAL:
        return {
          encryption: 'required',
          mfaRequired: false,
          auditLogging: true,
          accessRestriction: 'organization',
          dataRetention: '5-years'
        };
      // ... other levels
    }
  }
};
```

## 📋 Compliance & Standards

### SOC2 Compliance

The platform implements SOC2 Trust Service Criteria:

- **Security**: Access controls, encryption, monitoring
- **Availability**: System uptime, disaster recovery
- **Processing Integrity**: Data accuracy, completeness
- **Confidentiality**: Data protection, access restrictions
- **Privacy**: PII handling, consent management

### ISO27001 Controls

Key implemented controls:

- **A.9**: Access control management
- **A.10**: Cryptographic controls
- **A.12**: Operations security
- **A.13**: Communications security
- **A.14**: System acquisition and maintenance
- **A.16**: Information security incident management

## 🔄 Security Updates & Maintenance

### Patch Management

- **Critical Patches**: Applied within 24 hours
- **Security Updates**: Applied within 72 hours
- **Regular Updates**: Monthly maintenance windows
- **Testing**: All patches tested in staging environment

### Security Monitoring

- **Real-time Alerting**: Suspicious activity detection
- **Log Analysis**: Automated security log analysis
- **Vulnerability Scanning**: Weekly automated scans
- **Penetration Testing**: Quarterly external assessments

## 📞 Security Contact Information

- **Security Team**: security@mss-platform.com
- **Incident Response**: incidents@mss-platform.com
- **Vulnerability Reports**: security-reports@mss-platform.com
- **Emergency Hotline**: +1-xxx-xxx-xxxx

## 🔐 Security Checklist

### Development Security Checklist

- [ ] All inputs validated and sanitized
- [ ] Parameterized queries used for database access
- [ ] Sensitive data encrypted at rest and in transit
- [ ] Authentication and authorization implemented
- [ ] Audit logging enabled for all security events
- [ ] Error messages don't expose sensitive information
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Dependencies updated and vulnerability-free

### Deployment Security Checklist

- [ ] TLS certificates installed and configured
- [ ] Database connections encrypted
- [ ] Environment variables secured
- [ ] Security monitoring enabled
- [ ] Backup encryption configured
- [ ] Access controls implemented
- [ ] Security testing completed
- [ ] Documentation updated

---

**Remember**: Security is everyone's responsibility. When in doubt, consult the security team.