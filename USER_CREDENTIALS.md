# MSS Platform User Credentials

## How to Set Up Users

1. **Run the SQL script:**
   ```bash
   psql -d your_database_name -f create_users.sql
   ```

2. **Or execute via Docker:**
   ```bash
   docker exec -i postgres_container psql -U username -d database_name < create_users.sql
   ```

## User Credentials

### 🔴 SUPERADMIN (Platform Administrator)
- **Email:** `superadmin@msssecurity.com`
- **Password:** `SuperAdmin123!`
- **Role:** Platform Admin (MSS Provider)
- **Access:** Full platform access, all organizations, user management
- **Organization:** MSS Security Services (MSS Provider)

### 👤 CUSTOMER USER (Basic Customer)
- **Email:** `customer@testcorp.com`
- **Password:** `CustomerTest123!`
- **Role:** Customer
- **Access:** Customer portal, view reports, request interventions
- **Organization:** Test Customer Corp

### 🔧 TECHNICIAN USER (Internal Technician)
- **Email:** `technician@msssecurity.com`
- **Password:** `TechTest123!`
- **Role:** Technician (MSS Provider)
- **Access:** Technician workspace, customer environments, interventions
- **Organization:** MSS Security Services (MSS Provider)
- **Customer Access:** Full access to Test Customer Corp

### 👥 CUSTOMER ADMIN (Customer Organization Admin)
- **Email:** `admin@testcorp.com`
- **Password:** `AdminTest123!`
- **Role:** Admin (within customer organization)
- **Access:** Customer org management, user management, reports
- **Organization:** Test Customer Corp

## Login Instructions

1. **Start the development environment:**
   ```bash
   cd /Users/roynasser/Library/CloudStorage/Dropbox-Bina/Roy\ Nasser/Mac/Desktop/Dome
   npm run dev
   ```

2. **Access the frontend:**
   - URL: `http://localhost:3000/auth`
   - Choose any user credentials above
   - Log in and explore the role-specific dashboards

3. **Role-based Access:**
   - **Superadmin:** Can access all admin functions, multi-tenant management
   - **Customer:** Can view security reports, request interventions
   - **Technician:** Can manage customer environments, handle interventions
   - **Customer Admin:** Can manage users within their organization

## Security Notes

- ✅ All passwords use bcrypt hashing with salt rounds 12
- ✅ Users are email verified and active by default
- ✅ MFA is disabled initially (can be enabled after login)
- ✅ Audit logging is set up for user creation
- ✅ Technician has pre-configured access to test customer

## Troubleshooting

If login fails:
1. Verify the database script ran successfully
2. Check that the backend is running on port 3001
3. Verify JWT secrets are configured
4. Check browser console for errors

## Next Steps

After logging in:
1. **Superadmin:** Set up additional organizations and users
2. **Customer:** Explore security dashboard and reports
3. **Technician:** Test customer access matrix and assignments
4. **Customer Admin:** Manage team members and permissions