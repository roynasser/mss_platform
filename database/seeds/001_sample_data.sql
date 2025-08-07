-- Sample users (passwords are hashed version of 'password123')
INSERT INTO users (email, password, first_name, last_name, role, company) VALUES
('admin@mss-platform.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewU4ZWY7hS6YGJ4K', 'Admin', 'User', 'admin', 'MSS Platform'),
('tech1@mss-platform.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewU4ZWY7hS6YGJ4K', 'John', 'Smith', 'technician', 'MSS Platform'),
('tech2@mss-platform.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewU4ZWY7hS6YGJ4K', 'Sarah', 'Johnson', 'technician', 'MSS Platform'),
('customer1@acme.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewU4ZWY7hS6YGJ4K', 'Mike', 'Davis', 'customer', 'Acme Corp'),
('customer2@techstart.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewU4ZWY7hS6YGJ4K', 'Lisa', 'Wilson', 'customer', 'TechStart Inc'),
('customer3@globalfinance.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewU4ZWY7hS6YGJ4K', 'David', 'Brown', 'customer', 'Global Finance Ltd');

-- Sample security reports
INSERT INTO security_reports (customer_id, title, type, severity, status, description, findings, recommendations) 
SELECT 
    u.id,
    'Vulnerability Assessment Report - ' || u.company,
    'vulnerability',
    'high',
    'resolved',
    'Comprehensive vulnerability scan identified several security issues requiring immediate attention.',
    '[
        {"category": "Network Security", "issue": "Open ports detected", "risk": "high", "affected_systems": ["192.168.1.100", "192.168.1.101"]},
        {"category": "Software Updates", "issue": "Outdated software versions", "risk": "medium", "affected_systems": ["Windows Server 2019", "Apache 2.4.41"]}
    ]'::jsonb,
    ARRAY['Update all software to latest versions', 'Configure firewall to close unnecessary ports', 'Implement network segmentation']
FROM users u WHERE u.role = 'customer';

INSERT INTO security_reports (customer_id, title, type, severity, status, description, findings, recommendations) 
SELECT 
    u.id,
    'Compliance Audit Report - ' || u.company,
    'compliance',
    'medium',
    'pending',
    'Annual compliance audit to ensure adherence to industry standards and regulations.',
    '[
        {"standard": "ISO 27001", "compliance_level": "85%", "gaps": ["Access control documentation", "Incident response procedures"]},
        {"standard": "GDPR", "compliance_level": "92%", "gaps": ["Data retention policies"]}
    ]'::jsonb,
    ARRAY['Update access control documentation', 'Develop comprehensive incident response procedures', 'Review and update data retention policies']
FROM users u WHERE u.role = 'customer';

-- Sample alerts
INSERT INTO alerts (customer_id, type, severity, title, message, source, metadata) 
SELECT 
    u.id,
    'security',
    'critical',
    'Suspicious Login Activity Detected',
    'Multiple failed login attempts detected from IP address 192.168.1.200',
    'IDS',
    '{"ip_address": "192.168.1.200", "attempts": 15, "timeframe": "5 minutes"}'::jsonb
FROM users u WHERE u.role = 'customer';

INSERT INTO alerts (customer_id, type, severity, title, message, source, metadata) 
SELECT 
    u.id,
    'system',
    'warning',
    'High CPU Usage Alert',
    'Server CPU usage has exceeded 85% for the past 10 minutes',
    'Monitoring System',
    '{"server": "web-server-01", "cpu_usage": "87%", "duration": "10 minutes"}'::jsonb
FROM users u WHERE u.role = 'customer';

INSERT INTO alerts (customer_id, type, severity, title, message, source, metadata) 
SELECT 
    u.id,
    'network',
    'error',
    'Network Connectivity Issue',
    'Network connection to backup server has been lost',
    'Network Monitor',
    '{"affected_server": "backup-server-01", "last_seen": "2024-01-15T10:30:00Z"}'::jsonb
FROM users u WHERE u.role = 'customer';

-- Sample interventions
INSERT INTO interventions (customer_id, title, description, type, status, priority, scheduled_at, notes) 
SELECT 
    u.id,
    'Security Patch Installation',
    'Install critical security patches for Windows servers and update antivirus definitions',
    'security_patch',
    'requested',
    'high',
    CURRENT_TIMESTAMP + INTERVAL '2 days',
    '[]'::jsonb
FROM users u WHERE u.role = 'customer';

INSERT INTO interventions (customer_id, title, description, type, status, priority, scheduled_at, notes) 
SELECT 
    u.id,
    'Remote Access Setup',
    'Configure secure remote access for emergency incident response',
    'remote_access',
    'approved',
    'medium',
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    '[{"timestamp": "2024-01-15T09:00:00Z", "author": "tech1@mss-platform.com", "content": "Request approved, scheduling for tomorrow morning"}]'::jsonb
FROM users u WHERE u.role = 'customer' LIMIT 1;

-- Update some interventions to show different statuses
UPDATE interventions 
SET status = 'completed', 
    started_at = CURRENT_TIMESTAMP - INTERVAL '2 hours',
    completed_at = CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    notes = '[
        {"timestamp": "2024-01-15T08:00:00Z", "author": "tech1@mss-platform.com", "content": "Starting patch installation"},
        {"timestamp": "2024-01-15T09:30:00Z", "author": "tech1@mss-platform.com", "content": "All patches installed successfully, system rebooted"}
    ]'::jsonb
WHERE title = 'Security Patch Installation' 
AND customer_id = (SELECT id FROM users WHERE role = 'customer' LIMIT 1);