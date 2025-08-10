#!/usr/bin/env node

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
});

async function debugLogin() {
  try {
    console.log('🔍 Debugging login issue...');
    console.log('Testing with email: admin@company.com');
    console.log('Testing with password: admin123');
    console.log('');

    const email = 'admin@company.com';
    const password = 'admin123';

    // Step 1: Check if user exists and get user data
    console.log('Step 1: Looking up user...');
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      return;
    }

    const user = result.rows[0];
    console.log('✅ User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.first_name, user.last_name);
    console.log('  Is Admin:', user.is_admin);
    console.log('  Password Hash:', user.password_hash ? user.password_hash.substring(0, 30) + '...' : 'NULL');
    console.log('');

    // Step 2: Test password comparison
    console.log('Step 2: Testing password...');
    if (!user.password_hash) {
      console.log('❌ No password hash stored for user');
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('❌ Password does not match');
      console.log('');
      console.log('Let me try testing with some other common passwords:');
      
      const commonPasswords = ['password', 'admin', '123456', 'test', 'company123'];
      for (const testPass of commonPasswords) {
        const testMatch = await bcrypt.compare(testPass, user.password_hash);
        console.log(`  "${testPass}": ${testMatch ? '✅ MATCH!' : '❌ no match'}`);
        if (testMatch) break;
      }
    } else {
      console.log('✅ Password matches!');
      console.log('');
      console.log('The login should work. The 500 error might be in JWT token generation or database write issues.');
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

debugLogin().catch(console.error);
