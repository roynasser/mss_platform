# Platform Overview

## Business Requirements & Initial Request

### Original User Request
The client requested a prototype platform for a cybersecurity Managed Security Services (MSS) provider with the following core requirements:

> "The app is going to be a platform for a cybersecurity MSS provider. There will be 2 main user groups. Group 1 is our corporate customers. They will access the platform to view reports and make specific requests for intervention in their cybersecurity environments. Group 2 is comprised of our internal technicians. These technicians will work on our customers environment from within the platform. All work by our techs will be done in this environment, so it will need to embed remote access to our customer's infrastructure."

### Expanded Requirements

**Data Sources & Reports:**
- API connections to existing security products
- Custom data from internal sources (past/future interventions)
- Multiple report types: vulnerability assessments, incident reports, compliance dashboards

**Remote Access Requirements:**
- RDP, SSH, VPN connections, web-based terminals
- Platform-level connection management (technicians never see credentials)
- Complete isolation of technician workstations from customer environments
- Server-level VPN connections and authentication

**Security & Compliance:**
- SOC2 and ISO27001 compliance standards
- Detailed audit logging for all technician activities
- Multi-factor authentication support
- Enterprise SSO integration

## User Groups & Roles

### Group 1: Corporate Customers
Organizations that purchase cybersecurity services from the MSS provider.

**Customer User Roles:**
- **Admin Users**: Full customer organization permissions
  - Manage organization users
  - Access all reports and dashboards
  - Submit intervention requests
  - Configure organization settings

- **Report Viewers**: Read-only access to security reports
  - View vulnerability assessments
  - Access incident reports
  - View compliance dashboards
  - Cannot submit requests or manage users

- **Request Users**: Can submit intervention requests
  - View basic security status
  - Submit and track intervention requests
  - Limited report access

- **Basic Users**: Limited dashboard access
  - View basic security overview
  - Limited notification access

### Group 2: Internal Technicians (MSS Provider)
Internal staff of the MSS provider who deliver services to customers.

**Internal User Roles:**
- **Super Admins**: Platform management
  - Manage all platform settings
  - Assign technician access to customers
  - Platform-wide reporting and analytics
  - Emergency access capabilities

- **Technicians**: Individual customer access
  - Access assigned customer environments only
  - Perform security work through remote access tools
  - Document work and interventions
  - Cannot see customer credentials

- **Security Analysts**: Cross-customer reporting
  - Generate reports across multiple customers
  - Trend analysis and threat intelligence
  - Cannot access customer environments directly

- **Account Managers**: Customer relationship management
  - Customer communication
  - Service delivery oversight
  - Limited technical access

## Core Platform Features

### For Corporate Customers
1. **Security Dashboard**
   - Real-time security status overview
   - Recent alerts and incidents
   - Compliance status indicators
   - Key security metrics visualization

2. **Report Management**
   - Vulnerability assessment reports
   - Incident response summaries
   - Compliance audit reports
   - Custom report generation
   - Historical report access

3. **Intervention Requests**
   - Submit new security intervention requests
   - Track request status and progress
   - Communicate with assigned technicians
   - Approve/reject proposed changes

4. **User Management**
   - Manage organization users (Admin only)
   - Role assignment and permissions
   - Activity monitoring
   - Access control settings

### For Internal Technicians
1. **Customer Environment Access**
   - Secure remote desktop connections
   - SSH terminal access
   - Network device management
   - Application access through web portals

2. **Work Documentation**
   - Intervention logging and tracking
   - Time tracking for billing
   - Change documentation
   - Customer communication tools

3. **Tools & Resources**
   - Security scanning tools
   - Incident response playbooks
   - Customer environment information
   - Escalation procedures

## Security Architecture

### Access Control Model
- **Individual Technician Assignment**: Technicians are granted access to specific customers (not group-based)
- **Credential Isolation**: Platform manages all customer credentials; technicians never see them
- **Audit Trail**: Complete logging of all technician activities
- **Session Management**: Secure session handling with automatic timeouts

### Multi-Tenant Architecture
Each customer organization operates as a separate tenant with:
- Isolated data storage
- Independent user management
- Customizable dashboards and reports
- Separate audit trails

### Compliance Features
- **SOC2 Type II** compliance preparation
- **ISO27001** compliance framework
- Complete audit logging and reporting
- Data encryption at rest and in transit
- Regular security assessments

## Integration Capabilities

### External Security Tools
- **SIEM Integration**: Connect to existing SIEM platforms
- **Vulnerability Scanners**: Import scan results from multiple vendors
- **Threat Intelligence**: Real-time threat feed integration
- **Compliance Tools**: Connect to GRC platforms

### Remote Access Tools
- **Apache Guacamole**: Web-based remote desktop gateway
- **Teleport**: SSH and application access proxy
- **OpenVPN**: Secure network access
- **Custom Web Portals**: Direct application access

### Enterprise Integrations
- **Single Sign-On**: SAML 2.0, OAuth2/OIDC support
- **Directory Services**: Active Directory, LDAP integration
- **Ticketing Systems**: ServiceNow, Jira integration
- **Communication**: Slack, Teams notifications

## Success Metrics

### Customer Experience
- **Response Time**: Average time to acknowledge intervention requests < 15 minutes
- **Resolution Time**: Average intervention completion time
- **Customer Satisfaction**: Regular NPS surveys and feedback
- **Platform Uptime**: 99.9% availability SLA

### Operational Efficiency
- **Technician Productivity**: Time spent on customer work vs. platform navigation
- **Audit Compliance**: 100% activity logging and traceability
- **Security Incidents**: Zero credential exposure incidents
- **Platform Performance**: < 2 second response times for all operations

### Business Impact
- **Customer Retention**: Improved customer satisfaction through better visibility
- **Service Delivery**: Faster incident response and resolution
- **Compliance**: Reduced audit preparation time
- **Scalability**: Support for increased customer base without linear staff growth