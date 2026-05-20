#!/usr/bin/env node
import { execSync } from 'child_process';

// List of versions to unpublish
const versions = [
  '6.0.34',
  '6.0.33',
  '6.0.32',
  '6.0.31',
  '6.0.30',
  '6.0.29',
  '6.0.28',
  '6.0.27',
  '6.0.26',
  '6.0.25',
  '6.0.24',
  '6.0.23',
  '6.0.22',
  '6.0.21',
  '6.0.20',
  '6.0.19',
  '6.0.18',
  '6.0.17',
  '6.0.16',
  '6.0.15',
  '6.0.14',
  '6.0.13',
  '6.0.12',
  '6.0.11',
  '6.0.10',
  '6.0.9',
  '6.0.8',
  '6.0.7',
  '6.0.6',
  '6.0.5',
  '6.0.4',
  '6.0.3',
  '6.0.2',
  '6.0.1',
];

console.log('Unpublishing all 6.0.x versions...');

// Get token from environment variable
const npmToken = process.env.NPM_TOKEN;
if (!npmToken) {
  console.error('Error: NPM_TOKEN environment variable not set');
  process.exit(1);
}

for (const version of versions) {
  try {
    console.log(`Unpublishing @lytjs/cli@${version}...`);
    execSync(
      `npm unpublish @lytjs/cli@${version} --force --//registry.npmjs.org/:_authToken=${npmToken}`,
      {
        stdio: 'inherit',
        cwd: process.cwd(),
      },
    );
    console.log(`✓ Unpublished @lytjs/cli@${version}`);
  } catch (e) {
    console.log(`✗ Failed to unpublish @lytjs/cli@${version}`);
  }
}

console.log('Done!');
