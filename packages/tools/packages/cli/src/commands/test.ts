/**
 * @lytjs/cli - test command
 *
 * Runs the test suite.
 */

import type { TestOptions } from '../types';
import { logger } from '../utils/logger';
import { exists } from '../utils/fs';
import { detectPackageManager } from '../utils/package';
import { spawn } from 'child_process';
import { join } from 'path';

/**
 * Run tests
 */
export async function test(options: TestOptions = {}): Promise<void> {
  // Check if we're in a LytJS project
  if (!exists(join(process.cwd(), 'package.json'))) {
    logger.error('No package.json found. Are you in a LytJS project directory?');
    process.exit(1);
  }

  const pm = detectPackageManager();
  logger.info('Running tests...');

  // Build the command
  const args = ['vitest'];
  if (options.watch === false) args.push('run');
  if (options.coverage) args.push('--coverage');
  if (options.grep) args.push('--grep', options.grep);

  // Spawn the test process
  const child = spawn(pm === 'npm' ? 'npx' : pm, args, {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (error) => {
    logger.error(`Tests failed: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}
