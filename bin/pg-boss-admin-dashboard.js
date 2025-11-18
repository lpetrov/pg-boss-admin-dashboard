#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const noBrowser = args.includes('--no-browser');
const portArg = args.find(arg => arg.startsWith('--port='));
const port = portArg ? portArg.split('=')[1] : null;

if (showHelp) {
  console.log(`
PgBoss Admin Dashboard - Monitor, debug and manage your pg-boss queues and jobs

Usage:
  pg-boss-admin-dashboard [options]

Options:
  --port=<number>    Port to run the dashboard on (default: 8671)
  --no-browser       Don't automatically open browser
  -h, --help         Show this help message

Environment Variables:
  PGBOSS_DATABASE_URL       PostgreSQL connection string (required)
  PGBOSS_DASHBOARD_PORT     Alternative way to set port
  PGBOSS_NO_BROWSER         Set to 'true' to disable auto-open

The dashboard will look for a .env file in the current directory first,
then fall back to the package directory.

Example:
  pg-boss-admin-dashboard --port=3000 --no-browser
`);
  process.exit(0);
}

console.log('PgBoss Admin Dashboard - Starting...');
console.log('Current directory:', process.cwd());

// Try to load .env from current working directory first
const localEnvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(localEnvPath)) {
  console.log('Loading .env from:', localEnvPath);
  require('dotenv').config({ path: localEnvPath });
} else {
  console.log('No .env found in current directory');
  // Try to load from package directory as fallback
  const packageEnvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(packageEnvPath)) {
    console.log('Loading .env from package directory:', packageEnvPath);
    require('dotenv').config({ path: packageEnvPath });
  }
}

// Check if we have the required environment variable
if (!process.env.PGBOSS_DATABASE_URL) {
  console.error('\nERROR: PGBOSS_DATABASE_URL environment variable is required');
  console.error('Please ensure you have a .env file in the current directory with:');
  console.error('PGBOSS_DATABASE_URL=postgres://user:password@localhost:5432/pgboss_db\n');
  process.exit(1);
}

console.log('Database URL:', process.env.PGBOSS_DATABASE_URL.replace(/:[^:]*@/, ':***@'));

// Apply CLI options
if (port) {
  process.env.PGBOSS_DASHBOARD_PORT = port;
}
if (noBrowser) {
  process.env.PGBOSS_NO_BROWSER = 'true';
}

// Start the server
require('../index');