import bcrypt from 'bcryptjs';
import { connectDB, getDB, closeDB } from './connection';

async function seedDatabase() {
  try {
    await connectDB();
    const db = getDB();
    
    console.log('Seeding database with initial data...');
    
    // Check if MSS Provider organization already exists
    const mssOrgResult = await db.query(
      "SELECT id FROM organizations WHERE type = 'mss_provider' LIMIT 1"
    );
    
    let mssOrgId: string;
    
    if (mssOrgResult.rows.length === 0) {
      // Create MSS Provider organization
      const orgResult = await db.query(`
        INSERT INTO organizations (name, type, sso_enabled, status)
        VALUES ('MSS Security Provider', 'mss_provider', false, 'active')
        RETURNING id
      `);
      mssOrgId = orgResult.rows[0].id;
      console.log('✅ Created MSS Provider organization');
    } else {
      mssOrgId = mssOrgResult.rows[0].id;
      console.log('ℹ️  MSS Provider organization already exists');
    }
    
    // Create demo customer organization
    const customerOrgResult = await db.query(`
      INSERT INTO organizations (name, type, domain, sso_enabled, status)
      VALUES ('Acme Corporation', 'customer', 'acme.com', false, 'active')
      ON CONFLICT DO NOTHING
      RETURNING id
    `);
    
    let customerOrgId: string;
    if (customerOrgResult.rows.length > 0) {
      customerOrgId = customerOrgResult.rows[0].id;
      console.log('✅ Created demo customer organization: Acme Corporation');
    } else {
      const existingCustomer = await db.query(`
        SELECT id FROM organizations WHERE name = 'Acme Corporation' AND type = 'customer'
      `);
      customerOrgId = existingCustomer.rows[0].id;
      console.log('ℹ️  Demo customer organization already exists');
    }
    
    // Create default admin user for MSS Provider
    const adminEmail = 'admin@mssplatform.com';
    const adminPassword = await bcrypt.hash('SecureAdmin123!', 12);
    
    await db.query(`
      INSERT INTO users (
        org_id, email, email_verified, password_hash, 
        first_name, last_name, role, status
      )
      VALUES ($1, $2, true, $3, 'System', 'Administrator', 'super_admin', 'active')
      ON CONFLICT (org_id, email) DO NOTHING
    `, [mssOrgId, adminEmail, adminPassword]);
    console.log('✅ Created default super admin user: admin@mssplatform.com');
    
    // Create demo technician
    const techEmail = 'technician@mssplatform.com';
    const techPassword = await bcrypt.hash('SecureTech123!', 12);
    
    await db.query(`
      INSERT INTO users (
        org_id, email, email_verified, password_hash,
        first_name, last_name, role, status
      )
      VALUES ($1, $2, true, $3, 'John', 'TechSupport', 'technician', 'active')
      ON CONFLICT (org_id, email) DO NOTHING
    `, [mssOrgId, techEmail, techPassword]);
    console.log('✅ Created demo technician user: technician@mssplatform.com');
    
    // Create demo security analyst
    const analystEmail = 'analyst@mssplatform.com';
    const analystPassword = await bcrypt.hash('SecureAnalyst123!', 12);
    
    await db.query(`
      INSERT INTO users (
        org_id, email, email_verified, password_hash,
        first_name, last_name, role, status
      )
      VALUES ($1, $2, true, $3, 'Jane', 'SecurityAnalyst', 'security_analyst', 'active')
      ON CONFLICT (org_id, email) DO NOTHING
    `, [mssOrgId, analystEmail, analystPassword]);
    console.log('✅ Created demo security analyst: analyst@mssplatform.com');
    
    // Create demo customer admin
    const customerEmail = 'admin@acme.com';
    const customerPassword = await bcrypt.hash('SecureCustomer123!', 12);
    
    await db.query(`
      INSERT INTO users (
        org_id, email, email_verified, password_hash,
        first_name, last_name, role, status
      )
      VALUES ($1, $2, true, $3, 'Alice', 'Johnson', 'admin', 'active')
      ON CONFLICT (org_id, email) DO NOTHING
    `, [customerOrgId, customerEmail, customerPassword]);
    console.log('✅ Created demo customer admin: admin@acme.com');
    
    // Create demo customer report viewer
    const viewerEmail = 'viewer@acme.com';
    const viewerPassword = await bcrypt.hash('SecureViewer123!', 12);
    
    await db.query(`
      INSERT INTO users (
        org_id, email, email_verified, password_hash,
        first_name, last_name, role, status
      )
      VALUES ($1, $2, true, $3, 'Bob', 'Reporter', 'report_viewer', 'active')
      ON CONFLICT (org_id, email) DO NOTHING
    `, [customerOrgId, viewerEmail, viewerPassword]);
    console.log('✅ Created demo customer report viewer: viewer@acme.com');
    
    // Create sample security reports
    const sampleReport = {
      title: 'Monthly Security Assessment Report',
      description: 'Comprehensive security assessment for the month',
      report_data: {
        vulnerabilities: {
          critical: 0,
          high: 2,
          medium: 5,
          low: 12
        },
        threats: {
          blocked: 45,
          investigated: 3,
          false_positives: 8
        },
        compliance: {
          score: 95,
          issues: [
            'Patch management policy needs update',
            'User access review overdue'
          ]
        }
      },
      severity: 'medium',
      status: 'published',
      report_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      report_period_end: new Date(),
      generated_at: new Date(),
      published_at: new Date()
    };
    
    await db.query(`
      INSERT INTO security_reports (
        customer_org_id, report_type, title, description, 
        severity, status, report_data, report_period_start,
        report_period_end, generated_at, published_at
      )
      VALUES ($1, 'vulnerability_assessment', $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT DO NOTHING
    `, [
      customerOrgId,
      sampleReport.title,
      sampleReport.description,
      sampleReport.severity,
      sampleReport.status,
      JSON.stringify(sampleReport.report_data),
      sampleReport.report_period_start,
      sampleReport.report_period_end,
      sampleReport.generated_at,
      sampleReport.published_at
    ]);
    console.log('✅ Created sample security report');
    
    // Create sample alerts
    const sampleAlerts = [
      {
        type: 'security',
        severity: 'high',
        title: 'Suspicious Login Attempt',
        message: 'Multiple failed login attempts detected from IP 192.168.1.100',
        source: 'Authentication System'
      },
      {
        type: 'system',
        severity: 'medium',
        title: 'Disk Space Warning',
        message: 'Server disk usage is at 85% capacity',
        source: 'System Monitor'
      },
      {
        type: 'compliance',
        severity: 'low',
        title: 'Certificate Expiration Notice',
        message: 'SSL certificate will expire in 30 days',
        source: 'Certificate Manager'
      }
    ];
    
    for (const alert of sampleAlerts) {
      await db.query(`
        INSERT INTO alerts (
          customer_org_id, type, severity, title, message, source, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        customerOrgId,
        alert.type,
        alert.severity,
        alert.title,
        alert.message,
        alert.source,
        JSON.stringify({ created_by: 'system' })
      ]);
    }
    console.log('✅ Created sample alerts');
    
    // Create sample intervention request
    await db.query(`
      INSERT INTO interventions (
        customer_org_id, requested_by, title, description, 
        request_type, priority, status
      )
      VALUES ($1, (
        SELECT id FROM users WHERE org_id = $1 AND role = 'admin' LIMIT 1
      ), $2, $3, $4, $5, $6)
    `, [
      customerOrgId,
      'Security Incident Response',
      'We have detected suspicious activity on our network and need immediate assistance to investigate and contain any potential threats.',
      'incident_response',
      'high',
      'pending'
    ]);
    console.log('✅ Created sample intervention request');
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Demo Users Created:');
    console.log('🔧 Super Admin: admin@mssplatform.com (password: SecureAdmin123!)');
    console.log('⚙️  Technician: technician@mssplatform.com (password: SecureTech123!)');
    console.log('📊 Security Analyst: analyst@mssplatform.com (password: SecureAnalyst123!)');
    console.log('👑 Customer Admin: admin@acme.com (password: SecureCustomer123!)');
    console.log('👁️  Report Viewer: viewer@acme.com (password: SecureViewer123!)');
    console.log('\n🔐 All users have email verification enabled by default');
    console.log('🔒 MFA is disabled by default - users can enable it after login');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDB();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };