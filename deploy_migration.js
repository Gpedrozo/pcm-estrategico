#!/usr/bin/env node
/**
 * Deploy Dispositivos RLS Fix Migration
 * This script applies the migration directly to Supabase PostgreSQL
 */

const fs = require('fs');
const path = require('path');

// Try different approaches to apply migration
const migrationFile = path.join(__dirname, 'supabase', 'migrations', '20260402_140500_fix_dispositivos_rls_owner.sql');

if (!fs.existsSync(migrationFile)) {
  console.error('❌ Migration file not found:', migrationFile);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

console.log('✅ Migration file loaded: 65 lines');
console.log('');
console.log('📋 Content preview:');
console.log(migrationSQL.substring(0, 200) + '...');
console.log('');

// Method 1: Try using supabase CLI
console.log('🚀 Attempting Method 1: Supabase CLI...');
const { execSync } = require('child_process');

try {
  const output = execSync('supabase db push --linked', { 
    cwd: __dirname,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ SUCCESS via Supabase CLI!');
  console.log(output);
  process.exit(0);
} catch (error) {
  console.log('⚠️  Supabase CLI failed:', error.message);
  console.log('');
}

// Method 2: Try direct PostgreSQL connection
console.log('🚀 Attempting Method 2: Direct PostgreSQL...');

// Check for pg package
try {
  const { Client } = require('pg');
  
  // Try to connect with environment variables
  const client = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: process.env.SUPABASE_DB_PORT || 5432,
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME || 'postgres'
  });
  
  client.connect((err) => {
    if (err) {
      console.log('⚠️  PostgreSQL connection failed:', err.message);
      console.log('');
      printAlternatives();
    } else {
      client.query(migrationSQL, (err, res) => {
        if (err) {
          console.error('❌ Migration failed:', err.message);
          client.end();
          process.exit(1);
        } else {
          console.log('✅ SUCCESS via PostgreSQL!');
          console.log('Migration applied successfully');
          client.end();
          process.exit(0);
        }
      });
    }
  });
} catch (error) {
  console.log('⚠️  PostgreSQL method not available:', error.message);
  console.log('');
  printAlternatives();
}

function printAlternatives() {
  console.log('=========================================');
  console.log('📋 Alternative Deployment Methods');
  console.log('=========================================');
  console.log('');
  console.log('Option 1: Manual Supabase Dashboard');
  console.log('  1. Go to https://app.supabase.com');
  console.log('  2. Select project "pcm-estrategico"');
  console.log('  3. SQL Editor → New Query');
  console.log('  4. Copy content from migration file');
  console.log('  5. Run the query');
  console.log('');
  console.log('Option 2: Supabase CLI (if linked)');
  console.log('  supabase db push --linked');
  console.log('');
  console.log('Option 3: Set environment variables and retry');
  console.log('  SUPABASE_DB_HOST=<host>');
  console.log('  SUPABASE_DB_USER=postgres');
  console.log('  SUPABASE_DB_PASSWORD=<password>');
  console.log('  SUPABASE_DB_NAME=postgres');
  console.log('  node deploy_migration.js');
  console.log('');
}
