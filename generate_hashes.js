const bcrypt = require('bcryptjs');

const passwords = {
  'superadmin@msssecurity.com': 'SuperAdmin123!',
  'customer@testcorp.com': 'CustomerTest123!',
  'technician@msssecurity.com': 'TechTest123!',
  'admin@testcorp.com': 'AdminTest123!'
};

async function generateHashes() {
  console.log('-- Update user passwords with bcryptjs-compatible hashes');
  
  for (const [email, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE email = '${email}';`);
  }
  
  console.log('\n-- Verify users');
  console.log('SELECT email, role, first_name, last_name FROM users ORDER BY role, email;');
}

generateHashes().catch(console.error);