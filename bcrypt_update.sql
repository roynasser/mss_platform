-- Update users with proper bcryptjs-compatible password hashes
UPDATE users SET password_hash = '$2a$12$OHhtO/7Edg.jv.iFJ2EoheXQ3Zw86dEwP/SyLaGF8krmy67Z4N3PW' WHERE email = 'superadmin@msssecurity.com';
UPDATE users SET password_hash = '$2a$12$6u5mF6ZvgWPH4VPjQCPXEOBc8PnpjF.4MDlOrXNEzMxmsWWNnmr/6' WHERE email = 'customer@testcorp.com';
UPDATE users SET password_hash = '$2a$12$FEkT/satPlO9CfRfSYmzqean082DaNiUuvPMmAUvDhxftXHS32hNy' WHERE email = 'technician@msssecurity.com';
UPDATE users SET password_hash = '$2a$12$zSm8vWupwj./jX.T74y5IuFHXEb/8Y2wLIzfMbmyQjbZpXoNvjOPu' WHERE email = 'admin@testcorp.com';

SELECT email, role, first_name, last_name, status FROM users ORDER BY role, email;
