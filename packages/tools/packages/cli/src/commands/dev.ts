/**
 * @lytjs/cli - dev command
 *
 * Starts the development server.
 */

import type { DevOptions } from '../types';
import { logger } from '../utils/logger';
import { exists } from '../utils/fs';
import { detectPackageManager, getRunCommand } from '../utils/package';
import { spawn } from 'child_process';
import { join } from 'path';

/**
 * Start the development server
 */
export async function dev(options: DevOptions = {}): Promise<void> {
  // Check if we're in a LytJS project
  if (!exists(join(process.cwd(), 'package.json'))) {
    logger.error('No package.json found. Are you in a LytJS project directory?');
    process.exit(1);
  }
  
  const pm = detectPackageManager();
  logger.info(`Starting development server with ${pm}...`);
  
  // Build the dev command
  const args = ['dev'];
  if (options.port) args.push('--port', String(options.port));
  if (options.host) args.push('--host', options.host);
  if (options.open) args.push('--open');
  
  // Spawn the dev server
  const child = spawn(pm, args, {
    stdio: 'inherit',
    shell: true,
  });
  
  child.on('error', (error) => {
    logger.error(`Failed to start dev server: ${error.message}`);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}
