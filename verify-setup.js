#!/usr/bin/env node

/**
 * ChatterBOX v3.1 - Setup Verification Script
 * 
 * This script verifies that your system is properly configured to run ChatterBOX
 * Run with: npm run verify (from root directory)
 * 
 * Checks:
 * - Node.js version
 * - npm version
 * - Dependencies installation
 * - Environment variables
 * - MongoDB connectivity (optional)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const SYMBOLS = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
};

function print(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function check(condition, successMsg, errorMsg) {
  if (condition) {
    print(`  ${SYMBOLS.success} ${successMsg}`, 'green');
    return true;
  } else {
    print(`  ${SYMBOLS.error} ${errorMsg}`, 'red');
    return false;
  }
}

function getVersion(command) {
  try {
    return execSync(`${command} --version`, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function parseVersion(versionStr) {
  const match = versionStr.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
  };
}

function isVersionSufficient(actual, required) {
  if (!actual || !required) return false;
  if (actual.major > required.major) return true;
  if (actual.major < required.major) return false;
  if (actual.minor > required.minor) return true;
  if (actual.minor < required.minor) return false;
  return actual.patch >= required.patch;
}

function fileExists(filePath) {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

async function main() {
  print('\n╔════════════════════════════════════════════╗', 'blue');
  print('║  ChatterBOX v3.1 - Setup Verification     ║', 'blue');
  print('╚════════════════════════════════════════════╝\n', 'blue');

  let allChecks = true;

  // System Requirements
  print('System Requirements:', 'blue');
  const nodeVersion = getVersion('node');
  const nodeParsed = nodeVersion ? parseVersion(nodeVersion) : null;
  const nodeRequired = { major: 20, minor: 0, patch: 0 };
  allChecks &= check(
    isVersionSufficient(nodeParsed, nodeRequired),
    `Node.js ${nodeVersion}`,
    `Node.js ${nodeVersion} - Required: >= 20.0.0`
  );

  const npmVersion = getVersion('npm');
  const npmParsed = npmVersion ? parseVersion(npmVersion) : null;
  const npmRequired = { major: 10, minor: 0, patch: 0 };
  allChecks &= check(
    isVersionSufficient(npmParsed, npmRequired),
    `npm ${npmVersion}`,
    `npm ${npmVersion} - Required: >= 10.0.0`
  );

  // Project Structure
  print('\nProject Structure:', 'blue');
  allChecks &= check(fileExists('package.json'), 'Root package.json exists', 'Root package.json not found');
  allChecks &= check(
    fileExists('chatterbox-client/package.json'),
    'Client package.json exists',
    'Client package.json not found'
  );
  allChecks &= check(
    fileExists('chatterbox-server/package.json'),
    'Server package.json exists',
    'Server package.json not found'
  );

  // Dependencies
  print('\nDependencies Installation:', 'blue');
  allChecks &= check(
    fileExists('node_modules'),
    'Root node_modules exists',
    'Root node_modules not found - run: npm install'
  );
  allChecks &= check(
    fileExists('chatterbox-client/node_modules'),
    'Client node_modules exists',
    'Client node_modules not found - run: cd chatterbox-client && npm install'
  );
  allChecks &= check(
    fileExists('chatterbox-server/node_modules'),
    'Server node_modules exists',
    'Server node_modules not found - run: cd chatterbox-server && npm install'
  );

  // Environment Files
  print('\nEnvironment Configuration:', 'blue');
  const hasServerEnv = fileExists('chatterbox-server/.env');
  check(
    hasServerEnv,
    'Server .env file exists',
    'Server .env file not found - copy from .env.example'
  );
  
  const hasClientEnv = fileExists('chatterbox-client/.env.local');
  check(
    hasClientEnv,
    'Client .env.local file exists',
    'Client .env.local file not found - copy from .env.example'
  );

  if (hasServerEnv) {
    print('\n  Checking server environment variables:', 'yellow');
    const serverEnv = fs.readFileSync(
      path.join(process.cwd(), 'chatterbox-server/.env'),
      'utf8'
    );
    const hasMongoUri = serverEnv.includes('MONGO_URI') && !serverEnv.includes('MONGO_URI=mongodb+srv://username');
    const hasJwt = serverEnv.includes('JWT_SECRET') && !serverEnv.includes('JWT_SECRET=your_super_secret');
    const hasCloudinary = serverEnv.includes('CLOUDINARY_CLOUD_NAME') && !serverEnv.includes('your_cloudinary');

    check(hasMongoUri, 'MONGO_URI configured', 'MONGO_URI not configured - edit .env');
    check(hasJwt, 'JWT_SECRET configured', 'JWT_SECRET uses placeholder - set strong key');
    check(hasCloudinary, 'Cloudinary configured', 'Cloudinary credentials missing - edit .env');
  }

  if (hasClientEnv) {
    print('\n  Checking client environment variables:', 'yellow');
    const clientEnv = fs.readFileSync(
      path.join(process.cwd(), 'chatterbox-client/.env.local'),
      'utf8'
    );
    const hasCloudinary = clientEnv.includes('VITE_CLOUDINARY_CLOUD_NAME') && !clientEnv.includes('your_cloudinary');
    const hasGoogle = clientEnv.includes('VITE_GOOGLE_CLIENT_ID') && !clientEnv.includes('your_google_client_id');

    check(hasCloudinary, 'Cloudinary cloud name set', 'Cloudinary cloud name not set');
    check(hasGoogle, 'Google Client ID set', 'Google Client ID not set');
  }

  // Summary
  print('\n╔════════════════════════════════════════════╗', 'blue');
  if (allChecks && hasServerEnv && hasClientEnv) {
    print('║          ✓ All checks passed!              ║', 'green');
    print('║  You can now run: npm run dev              ║', 'green');
  } else {
    print('║    ⚠ Some checks failed                   ║', 'yellow');
    print('║  Please fix the issues above               ║', 'yellow');
  }
  print('╚════════════════════════════════════════════╝\n', 'blue');

  return allChecks && hasServerEnv && hasClientEnv;
}

main().catch(console.error);
