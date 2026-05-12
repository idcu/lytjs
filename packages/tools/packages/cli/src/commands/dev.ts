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
  const runCmd = getRunCommand(pm, 'dev');
  logger.info(`Starting development server with ${pm}...`);

  // Build the dev command args
  const devArgs: string[] = [];
  if (options.port) devArgs.push('--port', String(options.port));
  if (options.host) devArgs.push('--host', options.host);
  if (options.open) devArgs.push('--open');

  // Parse the run command (e.g., "pnpm run dev" -> ["pnpm", "run", "dev"])
  const cmdParts = runCmd.split(' ');
  const cmd = cmdParts[0] ?? 'pnpm';
  const cmdArgs = [...cmdParts.slice(1), ...devArgs];

  // Spawn the dev server
  const child = spawn(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (error: Error) => {
    logger.error(`Failed to start dev server: ${error.message}`);
    process.exit(1);
  });

  child.on('exit', (code: number | null) => {
    process.exit(code || 0);
  });
}
