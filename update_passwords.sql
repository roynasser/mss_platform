-- Update user passwords with properly hashed bcrypt passwords
-- Using PostgreSQL's crypt function with bcrypt

UPDATE users SET password_hash = crypt('SuperAdmin123!', gen_salt('bf', 12)) 
WHERE email = 'superadmin@msssecurity.com';

UPDATE users SET password_hash = crypt('CustomerTest123!', gen_salt('bf', 12)) 
WHERE email = 'customer@testcorp.com';

UPDATE users SET password_hash = crypt('TechTest123!', gen_salt('bf', 12)) 
WHERE email = 'technician@msssecurity.com';

UPDATE users SET password_hash = crypt('AdminTest123!', gen_salt('bf', 12)) 
WHERE email = 'admin@testcorp.com';

-- Verify the updates
SELECT email, 
       password_hash, 
       crypt('SuperAdmin123!', password_hash) = password_hash AS superadmin_match,
       crypt('CustomerTest123!', password_hash) = password_hash AS customer_match,
       crypt('TechTest123!', password_hash) = password_hash AS tech_match,
       crypt('AdminTest123!', password_hash) = password_hash AS admin_match
FROM users 
ORDER BY role, email;