#!/usr/bin/env node

const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
});

async function checkAdminUsers() {
  try {
    console.log('🔍 Checking database connection...');
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`User: ${process.env.DB_USER}`);
    console.log('');

    // Test database connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Users table does not exist');
      client.release();
      return;
    }

    console.log('✅ Users table found');
    console.log('');

    // Get table structure first
    console.log('📋 Users table structure:');
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      ORDER BY ordinal_position;
    `);

    tableStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}`);
    });
    console.log('');

    // Check for admin users
    console.log('👑 Checking for admin users...');
    
    // First, let's see all users
    const allUsersQuery = await client.query(`
      SELECT id, email, first_name, last_name, role, password, created_at
      FROM users 
      ORDER BY created_at DESC;
    `);

    if (allUsersQuery.rows.length === 0) {
      console.log('📭 No users found in the database');
    } else {
      console.log(`📊 Found ${allUsersQuery.rows.length} total users:`);
      console.log('');

      allUsersQuery.rows.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.first_name} ${user.last_name}`);
        console.log(`  Role: ${user.role || 'No role assigned'}`);
        console.log(`  Password Hash: ${user.password ? user.password.substring(0, 20) + '...' : 'No password set'}`);
        console.log(`  Created: ${user.created_at}`);
        console.log(`  Is Admin: ${user.role === 'admin' ? '✅ YES' : '❌ No'}`);
        console.log('');
      });

      // Filter admin users
      const adminUsers = allUsersQuery.rows.filter(user => user.role === 'admin');
      
      if (adminUsers.length > 0) {
        console.log(`👑 Admin users found (${adminUsers.length}):`);
        console.log('');
        
        adminUsers.forEach((admin, index) => {
          console.log(`Admin ${index + 1}:`);
          console.log(`  Email: ${admin.email}`);
          console.log(`  Name: ${admin.first_name} ${admin.last_name}`);
          console.log(`  Password Hash: ${admin.password || 'No password set'}`);
          console.log(`  Created: ${admin.created_at}`);
          console.log('');
        });
      } else {
        console.log('❌ No admin users found');
        console.log('');
        console.log('💡 To create an admin user, you can run:');
        console.log(`   INSERT INTO users (email, password, first_name, last_name, role) 
   VALUES ('admin@example.com', '$2b$10$hashedpassword', 'Admin', 'User', 'admin');`);
      }
    }

    client.release();
    console.log('✅ Database check completed');

  } catch (error) {
    console.error('❌ Database error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Database connection refused. Please check:');
      console.log('   1. PostgreSQL is running');
      console.log('   2. Database credentials in .env file');
      console.log('   3. Database exists and is accessible');
    }
  } finally {
    await pool.end();
  }
}

// Run the check
checkAdminUsers().catch(console.error);
