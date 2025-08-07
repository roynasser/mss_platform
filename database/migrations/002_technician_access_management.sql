-- =============================================================================
-- TECHNICIAN ACCESS MANAGEMENT SYSTEM
-- Migration 002: Individual technician-to-customer access control
-- =============================================================================

-- Technician access assignments table
CREATE TABLE technician_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Access configuration
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('read_only', 'standard', 'elevated', 'emergency')),
    permissions JSONB NOT NULL DEFAULT '{}', -- Detailed permissions object
    restrictions JSONB DEFAULT '{}', -- IP restrictions, time restrictions, etc.
    
    -- Access metadata
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL for no expiration
    
    -- Access tracking
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    -- Emergency access
    is_emergency BOOLEAN DEFAULT FALSE,
    emergency_approved_by UUID REFERENCES users(id),
    emergency_reason TEXT,
    
    -- Transfer tracking
    transferred_from UUID REFERENCES users(id), -- Original technician if transferred
    transferred_to UUID REFERENCES users(id), -- New technician if transferred
    
    -- Status and audit
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked', 'expired', 'transferred')),
    reason TEXT, -- Reason for granting access
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),
    revoked_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_technician_role CHECK (
        (SELECT role FROM users u JOIN organizations o ON u.org_id = o.id 
         WHERE u.id = technician_id) IN ('technician', 'security_analyst', 'super_admin')
        AND (SELECT type FROM organizations o JOIN users u ON o.id = u.org_id 
             WHERE u.id = technician_id) = 'mss_provider'
    ),
    CONSTRAINT valid_customer_org CHECK (
        (SELECT type FROM organizations WHERE id = customer_org_id) = 'customer'
    ),
    CONSTRAINT no_duplicate_active_access UNIQUE (technician_id, customer_org_id) 
        WHERE status = 'active'
);

-- Indexes for technician_access
CREATE INDEX idx_technician_access_technician_id ON technician_access(technician_id);
CREATE INDEX idx_technician_access_customer_org_id ON technician_access(customer_org_id);
CREATE INDEX idx_technician_access_status ON technician_access(status);
CREATE INDEX idx_technician_access_access_level ON technician_access(access_level);
CREATE INDEX idx_technician_access_granted_at ON technician_access(granted_at);
CREATE INDEX idx_technician_access_expires_at ON technician_access(expires_at);
CREATE INDEX idx_technician_access_last_accessed ON technician_access(last_accessed);
CREATE INDEX idx_technician_access_is_emergency ON technician_access(is_emergency);

-- Access logging table for detailed audit trail
CREATE TABLE access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_id UUID NOT NULL REFERENCES technician_access(id) ON DELETE CASCADE,
    technician_id UUID NOT NULL REFERENCES users(id),
    customer_org_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Access details
    action VARCHAR(100) NOT NULL, -- 'view_dashboard', 'download_report', 'create_intervention', etc.
    resource_type VARCHAR(50), -- 'report', 'alert', 'intervention', etc.
    resource_id UUID, -- ID of the specific resource accessed
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    location_data JSONB, -- Geo-location if available
    session_id UUID,
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}', -- Flexible metadata storage
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Timing
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER -- Time spent on action
);

-- Indexes for access_logs
CREATE INDEX idx_access_logs_access_id ON access_logs(access_id);
CREATE INDEX idx_access_logs_technician_id ON access_logs(technician_id);
CREATE INDEX idx_access_logs_customer_org_id ON access_logs(customer_org_id);
CREATE INDEX idx_access_logs_timestamp ON access_logs(timestamp DESC);
CREATE INDEX idx_access_logs_action ON access_logs(action);
CREATE INDEX idx_access_logs_ip_address ON access_logs(ip_address);
CREATE INDEX idx_access_logs_success ON access_logs(success);

-- Emergency access requests table
CREATE TABLE emergency_access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    technician_id UUID NOT NULL REFERENCES users(id),
    customer_org_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Request details
    requested_access_level VARCHAR(20) NOT NULL CHECK (requested_access_level IN ('elevated', 'emergency')),
    justification TEXT NOT NULL,
    urgency VARCHAR(20) DEFAULT 'high' CHECK (urgency IN ('medium', 'high', 'critical')),
    
    -- Approval workflow
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Auto-expiration
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for emergency_access_requests
CREATE INDEX idx_emergency_requests_technician_id ON emergency_access_requests(technician_id);
CREATE INDEX idx_emergency_requests_customer_org_id ON emergency_access_requests(customer_org_id);
CREATE INDEX idx_emergency_requests_status ON emergency_access_requests(status);
CREATE INDEX idx_emergency_requests_urgency ON emergency_access_requests(urgency);
CREATE INDEX idx_emergency_requests_created_at ON emergency_access_requests(created_at DESC);
CREATE INDEX idx_emergency_requests_expires_at ON emergency_access_requests(expires_at);

-- Enhanced audit logs table for organization operations
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    org_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Action details
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'grant_access', 'revoke_access', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'organization', 'user', 'technician_access', etc.
    resource_id UUID, -- ID of the resource being acted upon
    
    -- Change details
    details JSONB DEFAULT '{}', -- What changed, previous values, etc.
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    
    -- Timing
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit_logs (if not already created)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);

-- Customer access preferences table
CREATE TABLE customer_access_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Access control preferences
    require_approval_for_elevated BOOLEAN DEFAULT TRUE,
    require_approval_for_emergency BOOLEAN DEFAULT TRUE,
    auto_expire_access_hours INTEGER DEFAULT 720, -- 30 days default
    
    -- Notification preferences
    notify_on_access_granted BOOLEAN DEFAULT TRUE,
    notify_on_access_revoked BOOLEAN DEFAULT TRUE,
    notify_on_technician_access BOOLEAN DEFAULT FALSE, -- Real-time access notifications
    
    -- Security preferences
    allowed_ip_ranges INET[], -- Allowed IP ranges for technician access
    blocked_ip_ranges INET[], -- Explicitly blocked IP ranges
    require_mfa_for_technicians BOOLEAN DEFAULT FALSE,
    allowed_access_hours JSONB DEFAULT '{}', -- Time-based access restrictions
    
    -- Communication preferences
    primary_contact_email VARCHAR(320),
    secondary_contact_email VARCHAR(320),
    escalation_contact_email VARCHAR(320),
    
    -- Settings metadata
    settings JSONB DEFAULT '{}', -- Additional flexible settings
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_customer_preferences UNIQUE (customer_org_id)
);

-- Indexes for customer_access_preferences
CREATE INDEX idx_customer_prefs_customer_org_id ON customer_access_preferences(customer_org_id);
CREATE INDEX idx_customer_prefs_require_approval ON customer_access_preferences(require_approval_for_elevated, require_approval_for_emergency);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to automatically expire access
CREATE OR REPLACE FUNCTION expire_technician_access()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE technician_access 
    SET 
        status = 'expired',
        updated_at = CURRENT_TIMESTAMP
    WHERE 
        status = 'active' 
        AND expires_at IS NOT NULL 
        AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old access logs
CREATE OR REPLACE FUNCTION cleanup_old_access_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM access_logs 
    WHERE timestamp < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check technician access permissions
CREATE OR REPLACE FUNCTION check_technician_access(
    p_technician_id UUID,
    p_customer_org_id UUID,
    p_required_permission VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    access_record RECORD;
    has_permission BOOLEAN DEFAULT FALSE;
BEGIN
    -- Get active access record
    SELECT * INTO access_record
    FROM technician_access
    WHERE 
        technician_id = p_technician_id 
        AND customer_org_id = p_customer_org_id 
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    -- Return false if no access
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check specific permission in permissions JSON
    SELECT COALESCE(
        (access_record.permissions->>p_required_permission)::BOOLEAN,
        FALSE
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_technician_access_updated_at 
    BEFORE UPDATE ON technician_access
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_requests_updated_at 
    BEFORE UPDATE ON emergency_access_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_prefs_updated_at 
    BEFORE UPDATE ON customer_access_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- INITIAL DATA AND CONFIGURATION
-- =============================================================================

-- Create default access preferences for existing customer organizations
INSERT INTO customer_access_preferences (customer_org_id)
SELECT id FROM organizations WHERE type = 'customer'
ON CONFLICT (customer_org_id) DO NOTHING;

-- =============================================================================
-- SAMPLE DATA FOR TESTING (Comment out for production)
-- =============================================================================

-- Note: This would typically be in a separate seed file
-- Uncomment for development/testing purposes

/*
-- Sample technician access grants (for testing)
DO $$
DECLARE
    mss_org_id UUID;
    customer_org_id UUID;
    technician_id UUID;
    admin_id UUID;
BEGIN
    -- Get IDs for sample data
    SELECT id INTO mss_org_id FROM organizations WHERE type = 'mss_provider' LIMIT 1;
    SELECT id INTO customer_org_id FROM organizations WHERE type = 'customer' LIMIT 1;
    SELECT id INTO technician_id FROM users WHERE role = 'technician' LIMIT 1;
    SELECT id INTO admin_id FROM users WHERE role = 'super_admin' LIMIT 1;
    
    -- Only insert if we have the required data
    IF mss_org_id IS NOT NULL AND customer_org_id IS NOT NULL AND technician_id IS NOT NULL AND admin_id IS NOT NULL THEN
        INSERT INTO technician_access (
            technician_id,
            customer_org_id,
            access_level,
            permissions,
            granted_by,
            reason
        ) VALUES (
            technician_id,
            customer_org_id,
            'standard',
            '{"viewReports": true, "viewAlerts": true, "viewInterventions": true, "createInterventions": true}',
            admin_id,
            'Initial access grant for customer onboarding'
        );
    END IF;
END $$;
*/