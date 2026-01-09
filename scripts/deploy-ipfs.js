#!/usr/bin/env node
/**
 * Zikalyze IPFS Deployment Script
 * 
 * This script builds the app and pins it to IPFS via Pinata.
 * 
 * Prerequisites:
 * 1. Set environment variables:
 *    - PINATA_API_KEY
 *    - PINATA_SECRET_KEY
 * 
 * 2. Get your Pinata keys at: https://app.pinata.cloud/keys
 * 
 * Usage:
 *   PINATA_API_KEY=xxx PINATA_SECRET_KEY=xxx node scripts/deploy-ipfs.js
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync, createReadStream } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.cyan}[${step}]${colors.reset} ${colors.bright}${message}${colors.reset}`);
}

// Validate environment variables
if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
  log('\n❌ Error: Missing Pinata credentials!', 'red');
  log('\nPlease set the following environment variables:', 'yellow');
  log('  PINATA_API_KEY=your_api_key', 'reset');
  log('  PINATA_SECRET_KEY=your_secret_key', 'reset');
  log('\nGet your keys at: https://app.pinata.cloud/keys\n', 'blue');
  process.exit(1);
}

// Get all files recursively from a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = join(dirPath, file);
    if (statSync(filePath).isDirectory()) {
      getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Calculate total size of directory
function getDirSize(dirPath) {
  const files = getAllFiles(dirPath);
  return files.reduce((acc, file) => acc + statSync(file).size, 0);
}

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function pinDirectoryToPinata(dirPath) {
  const FormData = (await import('form-data')).default;
  const axios = (await import('axios')).default;

  const formData = new FormData();
  const files = getAllFiles(dirPath);

  // Add each file to the form data
  files.forEach((filePath) => {
    const relativePath = relative(dirPath, filePath);
    formData.append('file', createReadStream(filePath), {
      filepath: `zikalyze/${relativePath}`,
    });
  });

  // Add pinata options
  const pinataOptions = JSON.stringify({
    cidVersion: 1,
    wrapWithDirectory: false,
  });
  formData.append('pinataOptions', pinataOptions);

  // Add metadata
  const pinataMetadata = JSON.stringify({
    name: `Zikalyze-${new Date().toISOString().split('T')[0]}`,
    keyvalues: {
      app: 'zikalyze',
      deployedAt: new Date().toISOString(),
    },
  });
  formData.append('pinataMetadata', pinataMetadata);

  const response = await axios.post(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    formData,
    {
      maxBodyLength: Infinity,
      headers: {
        ...formData.getHeaders(),
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
    }
  );

  return response.data;
}

async function main() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════╗', 'cyan');
  log('║       🚀 Zikalyze IPFS Deployment Script         ║', 'cyan');
  log('╚══════════════════════════════════════════════════╝', 'cyan');

  try {
    // Step 1: Build the project
    logStep('1/4', 'Building production bundle...');
    execSync('npm run build', { stdio: 'inherit' });
    log('✓ Build completed successfully', 'green');

    // Step 2: Calculate bundle info
    logStep('2/4', 'Analyzing bundle...');
    const distPath = join(process.cwd(), 'dist');
    const files = getAllFiles(distPath);
    const totalSize = getDirSize(distPath);
    log(`  Files: ${files.length}`, 'reset');
    log(`  Total size: ${formatBytes(totalSize)}`, 'reset');
    log('✓ Bundle analysis complete', 'green');

    // Step 3: Pin to IPFS
    logStep('3/4', 'Pinning to IPFS via Pinata...');
    log('  Uploading files...', 'yellow');
    const result = await pinDirectoryToPinata(distPath);
    log('✓ Successfully pinned to IPFS!', 'green');

    // Step 4: Display results
    logStep('4/4', 'Deployment complete!');
    
    console.log('\n');
    log('╔══════════════════════════════════════════════════╗', 'green');
    log('║            🎉 DEPLOYMENT SUCCESSFUL!             ║', 'green');
    log('╚══════════════════════════════════════════════════╝', 'green');
    
    console.log('\n');
    log('📦 IPFS CID:', 'bright');
    log(`   ${result.IpfsHash}`, 'cyan');
    
    console.log('\n');
    log('🌐 Access URLs:', 'bright');
    log(`   Gateway:  https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`, 'blue');
    log(`   IPFS.io:  https://ipfs.io/ipfs/${result.IpfsHash}`, 'blue');
    log(`   Dweb:     https://dweb.link/ipfs/${result.IpfsHash}`, 'blue');
    log(`   CF IPFS:  https://cloudflare-ipfs.com/ipfs/${result.IpfsHash}`, 'blue');
    
    console.log('\n');
    log('📊 Pin Details:', 'bright');
    log(`   Size: ${formatBytes(result.PinSize)}`, 'reset');
    log(`   Timestamp: ${result.Timestamp || new Date().toISOString()}`, 'reset');
    
    console.log('\n');
    log('💡 Next Steps:', 'yellow');
    log('   1. Test your app at the gateway URLs above', 'reset');
    log('   2. Set up a custom domain via Pinata or ENS', 'reset');
    log('   3. Consider using a dedicated IPFS gateway for production', 'reset');
    console.log('\n');

    // Write deployment info to file
    const deploymentInfo = {
      cid: result.IpfsHash,
      pinSize: result.PinSize,
      timestamp: new Date().toISOString(),
      urls: {
        pinata: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
        ipfsIo: `https://ipfs.io/ipfs/${result.IpfsHash}`,
        dweb: `https://dweb.link/ipfs/${result.IpfsHash}`,
        cloudflare: `https://cloudflare-ipfs.com/ipfs/${result.IpfsHash}`,
      },
    };

    const { writeFileSync } = await import('fs');
    writeFileSync(
      join(process.cwd(), 'ipfs-deployment.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    log('📄 Deployment info saved to ipfs-deployment.json', 'green');
    console.log('\n');

  } catch (error) {
    console.log('\n');
    log('❌ Deployment failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    
    if (error.response?.data) {
      log(`Pinata Error: ${JSON.stringify(error.response.data)}`, 'red');
    }
    
    console.log('\n');
    process.exit(1);
  }
}

main();
