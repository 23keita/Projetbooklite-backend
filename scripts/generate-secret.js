#!/usr/bin/env node
/**
 * Simple utility to generate a strong DOWNLOAD_SECRET for .env
 * Usage:
 *   node scripts/generate-secret.js
 *   # or (after chmod +x)
 *   ./scripts/generate-secret.js
 */

import crypto from 'crypto';

// Options: change size or encoding if you prefer
const sizeBytes = 48; // 48 bytes -> 64 chars base64url approx, 96 chars hex

function toBase64Url(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

const buf = crypto.randomBytes(sizeBytes);
const hex = buf.toString('hex');
const b64url = toBase64Url(buf);

console.log('=== DOWNLOAD_SECRET generator ===');
console.log('\nYou can use one of the following values in your .env:');
console.log('\n# Option A (hex):');
console.log(`DOWNLOAD_SECRET=${hex}`);
console.log('\n# Option B (base64url):');
console.log(`DOWNLOAD_SECRET=${b64url}`);
console.log('\nTip: keep this secret private and do not commit your .env file.');
