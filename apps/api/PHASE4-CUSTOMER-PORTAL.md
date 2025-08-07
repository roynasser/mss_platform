# Phase 4: Customer Portal Backend APIs

This document outlines the implementation of Phase 4 Customer Portal APIs for the Cybersecurity MSS Platform, providing comprehensive security visibility and intervention management for customer organizations.

## Overview

Phase 4 builds upon the foundation established in Phases 1-3, adding sophisticated customer-facing APIs for:

- **Security Reports & Analytics** - Comprehensive security reporting with visualizations
- **Intervention Management** - SLA-tracked security intervention requests  
- **Real-time Dashboard** - Security metrics, KPIs, and compliance status
- **Advanced Analytics** - Predictive insights and benchmark analysis
- **Multi-format Export** - PDF, CSV, and JSON report generation

## API Endpoints

### 1. Dashboard API (`/api/dashboard`)

Provides comprehensive dashboard data for security visibility.

#### GET `/api/dashboard/overview`
Real-time dashboard overview with key security metrics.

**Query Parameters:**
- `period_days` (optional): Analysis period in days (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T00:00:00Z"
    },
    "securityScore": 92,
    "securityMetrics": {
      "score": 92,
      "breakdown": {
        "criticalAlerts": 0,
        "highAlerts": 3,
        "totalAlerts": 25,
        "resolvedAlerts": 22,
        "resolutionRate": 88
      },
      "factors": [...],
      "recommendations": [...]
    },
    "alertStats": {...},
    "interventionStats": {...},
    "complianceStatus": {...},
    "trendData": [...],
    "lastUpdated": "2024-01-31T12:00:00Z"
  }
}
```

#### GET `/api/dashboard/security-score`
Detailed security score breakdown with historical data.

#### GET `/api/dashboard/security-status`
Real-time security status with active alerts and interventions.

#### GET `/api/dashboard/vulnerabilities`
Vulnerability distribution and trend analysis.

#### GET `/api/dashboard/compliance`
Compliance framework status and scores.

### 2. Enhanced Reports API (`/api/reports`)

Extended reporting capabilities with advanced filtering and export options.

#### GET `/api/reports`
List reports with enhanced filtering and pagination.

**Query Parameters:**
- `page`, `limit`: Pagination
- `report_type`: Filter by report type
- `severity`: Filter by severity level
- `status`: Filter by report status
- `search`: Text search in title/description
- `date_from`, `date_to`: Date range filtering
- `sort_by`, `sort_order`: Sorting options

#### POST `/api/reports/generate`
Generate new security reports with automated data collection.

**Body:**
```json
{
  "customer_org_id": "uuid",
  "report_type": "vulnerability_assessment",
  "title": "Monthly Security Assessment",
  "description": "Comprehensive security review",
  "severity": "medium",
  "report_period_start": "2024-01-01",
  "report_period_end": "2024-01-31",
  "tags": ["monthly", "assessment"]
}
```

#### GET `/api/reports/:id/export`
Export reports in multiple formats.

**Query Parameters:**
- `format`: Export format (`json`, `csv`, `pdf`)

**Supported Formats:**
- **JSON**: Structured data export
- **CSV**: Tabular data for analysis (requires `json2csv` package)
- **PDF**: Formatted report for presentation (requires `pdfkit` package)

#### PATCH `/api/reports/:id/approve`
Approve or reject reports for publication.

### 3. Enhanced Interventions API (`/api/interventions`)

Comprehensive intervention management with SLA tracking.

#### GET `/api/interventions`
List interventions with SLA status and advanced filtering.

**Query Parameters:**
- `status`, `request_type`, `priority`: Status filtering
- `assigned_to`: Filter by assigned technician
- `overdue_only`: Show only overdue interventions
- `search`: Text search in title/description
- `sort_by`: Sort by various fields

#### POST `/api/interventions`
Create intervention requests with automatic SLA calculation.

**Body:**
```json
{
  "title": "Security Incident Response",
  "description": "Urgent security incident requiring immediate attention",
  "request_type": "incident_response",
  "priority": "emergency",
  "request_data": {
    "affected_systems": ["web-server-01"],
    "incident_type": "malware_detection"
  },
  "customer_notes": "Detected suspicious activity on production server"
}
```

#### PATCH `/api/interventions/:id/assign`
Assign interventions to technicians.

#### PATCH `/api/interventions/:id/status`
Update intervention status with comprehensive tracking.

#### GET `/api/interventions/:id`
Get detailed intervention information with SLA status.

#### GET `/api/interventions/analytics/sla`
SLA performance analytics and metrics.

### 4. Analytics API (`/api/analytics`)

Advanced analytics and predictive insights.

#### GET `/api/analytics/overview`
Comprehensive analytics overview with trends and patterns.

**Query Parameters:**
- `period_days`: Analysis period
- `customer_org_id`: Specific customer (MSS provider only)
- `include_predictions`: Include predictive analytics

#### GET `/api/analytics/threat-intelligence`
Threat pattern analysis and intelligence (Security Analyst only).

#### GET `/api/analytics/predictions`
Predictive analytics and forecasting.

**Query Parameters:**
- `forecast_days`: Forecast period (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "forecastPeriod": 30,
    "predictions": [
      {
        "date": "2024-02-01",
        "predictedAlerts": 8,
        "predictedCritical": 1,
        "confidence": 0.85
      }
    ],
    "confidence": "medium",
    "methodology": "Time series analysis with seasonal decomposition"
  }
}
```

#### POST `/api/analytics/custom-metrics`
Calculate custom metrics and KPIs.

#### GET `/api/analytics/benchmarks`
Industry benchmark comparison.

#### GET `/api/analytics/maturity-assessment`
Security maturity model assessment.

#### GET `/api/analytics/cost-benefit`
Cost-benefit analysis for security investments.

## Key Features

### 1. Multi-Tenant Security
- Organization-based access control
- Customer data isolation
- Role-based permissions

### 2. Real-time Monitoring
- Live security status updates
- Alert frequency analysis
- Intervention SLA tracking

### 3. Advanced Analytics
- Predictive modeling
- Trend analysis
- Benchmark comparisons
- Custom KPI calculations

### 4. Comprehensive Reporting
- Automated report generation
- Multi-format export (JSON/CSV/PDF)
- Customizable report templates
- Approval workflows

### 5. SLA Management
- Automatic SLA calculation
- Priority-based timelines
- Performance tracking
- Escalation alerts

### 6. Compliance Tracking
- Multiple framework support (SOC2, ISO27001, GDPR)
- Control status monitoring
- Gap analysis
- Audit trail maintenance

## Database Schema Updates

The implementation uses the existing schema from Phase 1-3 with these key tables:

- `security_reports` - Enhanced with new fields for comprehensive reporting
- `interventions` - Enhanced with SLA tracking and workflow management
- `alerts` - Used for dashboard metrics and analytics
- `organizations` - Multi-tenant customer organizations
- `users` - Role-based access control

## Security Considerations

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control (RBAC)
- Multi-tenant data isolation
- API rate limiting

### Data Protection
- Sensitive data encryption
- Audit logging for all actions
- Secure data export
- Compliance with data protection regulations

### API Security
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration

## Performance Optimization

### Database Performance
- Optimized queries with proper indexing
- Efficient pagination
- Query result caching
- Connection pooling

### API Performance
- Response compression
- Efficient data aggregation
- Lazy loading for large datasets
- Background processing for reports

### Caching Strategy
- Redis caching for frequently accessed data
- Dashboard metrics caching
- Session management
- Rate limiting counters

## Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- TypeScript 5+

### Dependencies
Install the required packages:

```bash
npm install json2csv pdfkit @types/json2csv @types/pdfkit
```

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mss_platform

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### Database Migration
Run the existing migration to set up the schema:

```bash
npm run migrate
```

### Starting the Server
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Testing

### Test Suite
The implementation includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run specific Phase 4 tests
npm test -- --testPathPattern=phase4-apis

# Run with coverage
npm run test:coverage
```

### Example Test Requests

#### Dashboard Overview
```bash
curl -X GET "http://localhost:3001/api/dashboard/overview?period_days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Generate Report
```bash
curl -X POST "http://localhost:3001/api/reports/generate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_org_id": "uuid",
    "report_type": "vulnerability_assessment",
    "title": "Security Assessment",
    "description": "Monthly security review"
  }'
```

#### Create Intervention
```bash
curl -X POST "http://localhost:3001/api/interventions" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Incident Response",
    "description": "Security incident",
    "request_type": "incident_response",
    "priority": "high"
  }'
```

## Deployment Considerations

### Production Deployment
- Use environment-specific configuration
- Enable HTTPS/TLS encryption
- Configure proper CORS policies
- Set up monitoring and logging
- Implement health checks

### Monitoring & Observability
- Application performance monitoring
- Error tracking and alerting
- API usage analytics
- Database performance monitoring
- Security event logging

### Scalability
- Horizontal scaling with load balancers
- Database read replicas
- Redis clustering
- Microservices architecture consideration
- CDN for static assets

## Future Enhancements

### Phase 5 Considerations
- Machine learning-powered threat detection
- Advanced visualization components
- Mobile API endpoints
- Third-party integrations (SIEM, SOAR)
- Advanced compliance automation

### API Versioning
- RESTful API versioning strategy
- Backward compatibility maintenance
- Deprecation policies
- Migration guides

## Support & Documentation

### API Documentation
- OpenAPI/Swagger specification
- Interactive API explorer
- Code examples in multiple languages
- Authentication guide

### Troubleshooting
- Common error codes and solutions
- Performance optimization guide
- Security best practices
- Integration examples

---

This implementation provides a production-ready Customer Portal backend that enables comprehensive security management, real-time monitoring, and advanced analytics for cybersecurity MSS platforms.