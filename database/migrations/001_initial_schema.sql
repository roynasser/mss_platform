-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- CORE ORGANIZATIONAL STRUCTURE
-- =============================================================================

-- Organizations table (customer companies + MSS provider)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('customer', 'mss_provider')),
    domain VARCHAR(255), -- For email domain validation
    sso_enabled BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    settings JSONB DEFAULT '{}', -- Flexible settings storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    CONSTRAINT unique_mss_provider CHECK (
        type != 'mss_provider' OR (
            SELECT COUNT(*) FROM organizations WHERE type = 'mss_provider'
        ) < 2
    )
);

-- Indexes for organizations
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_organizations_status ON organizations(status);

-- =============================================================================
-- USER MANAGEMENT & AUTHENTICATION
-- =============================================================================

-- Users table with organizational roles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(320) NOT NULL, -- RFC 5321 max length
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255), -- NULL for SSO-only users
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'locked', 'deleted')),
    
    -- MFA settings
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255), -- Encrypted TOTP secret
    mfa_backup_codes TEXT[], -- Array of hashed backup codes
    mfa_last_used TIMESTAMP WITH TIME ZONE,
    
    -- Account security
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    
    -- Constraints
    CONSTRAINT unique_email_per_org UNIQUE (org_id, email),
    CONSTRAINT valid_customer_roles CHECK (
        (SELECT type FROM organizations WHERE id = org_id) != 'customer' OR
        role IN ('admin', 'report_viewer', 'request_user', 'basic_user')
    ),
    CONSTRAINT valid_mss_roles CHECK (
        (SELECT type FROM organizations WHERE id = org_id) != 'mss_provider' OR
        role IN ('super_admin', 'technician', 'security_analyst', 'account_manager')
    )
);

-- Indexes for users
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_email ON users USING gin(email gin_trgm_ops);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_mfa_enabled ON users(mfa_enabled);
CREATE INDEX idx_users_last_login ON users(last_login_at);

-- =============================================================================
-- SESSION MANAGEMENT
-- =============================================================================

-- User sessions for JWT token management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    
    -- Session metadata
    device_info JSONB, -- Browser, OS, device fingerprint
    ip_address INET NOT NULL,
    user_agent TEXT,
    location JSONB, -- Geo-location data
    
    -- Session timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Session status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(100)
);

-- Indexes for user_sessions
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_status ON user_sessions(status);
CREATE INDEX idx_sessions_ip_address ON user_sessions(ip_address);

-- =============================================================================
-- SECURITY AND MFA TABLES
-- =============================================================================

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT one_active_token_per_user UNIQUE (user_id) WHERE used_at IS NULL
);

-- Indexes for password_reset_tokens
CREATE INDEX idx_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_reset_tokens_used_at ON password_reset_tokens(used_at);

-- Email verification tokens
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(320) NOT NULL, -- Email being verified
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for email_verification_tokens
CREATE INDEX idx_email_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_tokens_expires_at ON email_verification_tokens(expires_at);

-- Login attempt tracking for security
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(320) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100), -- 'invalid_password', 'account_locked', etc.
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Geo-location data for suspicious activity detection
    location_data JSONB
);

-- Indexes for login_attempts
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at);
CREATE INDEX idx_login_attempts_success ON login_attempts(success);

-- =============================================================================
-- BUSINESS LOGIC TABLES
-- =============================================================================
CREATE TABLE security_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_org_id UUID NOT NULL REFERENCES organizations(id),
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN 
        ('vulnerability_assessment', 'incident_report', 'compliance_dashboard', 'threat_analysis', 'custom')),
    
    -- Report metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN 
        ('draft', 'pending_review', 'approved', 'published', 'archived')),
    
    -- Report content and data
    report_data JSONB NOT NULL, -- Structured report content
    file_attachments TEXT[], -- Array of file paths/URLs
    
    -- Report timeline
    report_period_start DATE,
    report_period_end DATE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Report metadata
    generated_by UUID REFERENCES users(id), -- Which analyst generated it
    approved_by UUID REFERENCES users(id), -- Who approved publication
    tags TEXT[], -- Report categorization tags
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alerts table (updated for multi-tenant)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_org_id UUID NOT NULL REFERENCES organizations(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('security', 'system', 'compliance', 'network')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Interventions table (updated for multi-tenant)
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_org_id UUID NOT NULL REFERENCES organizations(id),
    requested_by UUID NOT NULL REFERENCES users(id),
    
    -- Request details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN 
        ('incident_response', 'vulnerability_remediation', 'security_assessment', 'configuration_review', 'custom')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    
    -- Assignment and tracking
    assigned_to UUID REFERENCES users(id), -- Assigned technician
    assigned_at TIMESTAMP WITH TIME ZONE,
    assigned_by UUID REFERENCES users(id),
    
    -- Status and timeline
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN 
        ('pending', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    estimated_completion TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Request data and attachments
    request_data JSONB DEFAULT '{}', -- Additional structured data
    attachments TEXT[], -- File attachments
    
    -- Communication
    internal_notes TEXT, -- For technician use only
    customer_notes TEXT, -- Visible to customer
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for security_reports
CREATE INDEX idx_reports_customer_org_id ON security_reports(customer_org_id);
CREATE INDEX idx_reports_type ON security_reports(report_type);
CREATE INDEX idx_reports_severity ON security_reports(severity);
CREATE INDEX idx_reports_status ON security_reports(status);
CREATE INDEX idx_reports_generated_at ON security_reports(generated_at);
CREATE INDEX idx_reports_published_at ON security_reports(published_at);
CREATE INDEX idx_reports_tags ON security_reports USING gin(tags);

-- Indexes for alerts
CREATE INDEX idx_alerts_customer_org_id ON alerts(customer_org_id);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- Indexes for interventions
CREATE INDEX idx_ir_customer_org_id ON interventions(customer_org_id);
CREATE INDEX idx_ir_requested_by ON interventions(requested_by);
CREATE INDEX idx_ir_assigned_to ON interventions(assigned_to);
CREATE INDEX idx_ir_status ON interventions(status);
CREATE INDEX idx_ir_priority ON interventions(priority);
CREATE INDEX idx_ir_request_type ON interventions(request_type);
CREATE INDEX idx_ir_created_at ON interventions(created_at);
CREATE INDEX idx_ir_assigned_at ON interventions(assigned_at);

-- =============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_reports_updated_at BEFORE UPDATE ON security_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL DATA SEEDING
-- =============================================================================

-- Insert MSS Provider organization (there should only be one)
INSERT INTO organizations (id, name, type, sso_enabled, status) 
VALUES (
    uuid_generate_v4(),
    'MSS Security Provider',
    'mss_provider',
    FALSE,
    'active'
) ON CONFLICT DO NOTHING;

-- =============================================================================
-- CLEANUP PROCEDURES
-- =============================================================================

-- Procedure to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE status = 'active' AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    UPDATE user_sessions 
    SET status = 'expired' 
    WHERE status = 'active' AND expires_at < CURRENT_TIMESTAMP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;