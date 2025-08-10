#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
});

async function resetAdminPassword() {
  try {
    console.log('🔧 Resetting admin password...');
    
    const email = 'admin@company.com';
    const newPassword = 'admin123';
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log('Generated hash:', hashedPassword);
    
    // Update password in database
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, first_name, last_name',
      [hashedPassword, email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = result.rows[0];
    console.log('✅ Password updated successfully!');
    console.log(`👤 User: ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`🔑 New password: ${newPassword}`);
    console.log('');
    console.log('You can now login at https://my.fullship.net with:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    await pool.end();
  }
}

resetAdminPassword().catch(console.error);
