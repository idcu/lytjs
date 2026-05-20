/**
 * @lytjs/cli - build command
 *
 * Builds the project for production.
 */

import type { BuildOptions } from '../types';
import { logger } from '../utils/logger';
import { exists } from '../utils/fs';
import { detectPackageManager } from '../utils/package';
import { spawn } from 'child_process';
import { join } from 'path';

/**
 * Build the project for production
 */
export async function build(options: BuildOptions = {}): Promise<void> {
  // Check if we're in a LytJS project
  if (!exists(join(process.cwd(), 'package.json'))) {
    logger.error('No package.json found. Are you in a LytJS project directory?');
    process.exit(1);
  }

  const pm = detectPackageManager();
  logger.info('Building for production...');

  // Build the command
  const args = ['vite', 'build'];
  if (options.outDir) args.push('--outDir', options.outDir);
  if (options.ssr) args.push('--ssr');
  if (options.minify === false) args.push('--minify', 'false');

  // Spawn the build process
  const child = spawn(pm === 'npm' ? 'npx' : pm, args, {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (error) => {
    logger.error(`Build failed: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code === 0) {
      logger.success('Build completed successfully!');
    } else {
      logger.error(`Build failed with exit code ${code}`);
    }
    process.exit(code || 0);
  });
}
