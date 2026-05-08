/**
 * @lytjs/cli - Package manager utilities
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/**
 * Detect which package manager to use
 */
export function detectPackageManager(cwd: string = process.cwd()): PackageManager {
  // Check for lock files
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(cwd, 'package-lock.json'))) return 'npm';
  
  // Default to pnpm if available
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    return 'pnpm';
  } catch {
    // Fall back to npm
    return 'npm';
  }
}

/**
 * Get install command for package manager
 */
export function getInstallCommand(pm: PackageManager): string {
  switch (pm) {
    case 'pnpm': return 'pnpm install';
    case 'yarn': return 'yarn';
    case 'npm': return 'npm install';
  }
}

/**
 * Get run command for package manager
 */
export function getRunCommand(pm: PackageManager, script: string): string {
  switch (pm) {
    case 'pnpm': return `pnpm run ${script}`;
    case 'yarn': return `yarn ${script}`;
    case 'npm': return `npm run ${script}`;
  }
}

/**
 * Get add dependency command
 */
export function getAddCommand(pm: PackageManager, dep: string, dev: boolean = false): string {
  const devFlag = dev ? ' -D' : '';
  switch (pm) {
    case 'pnpm': return `pnpm add${devFlag} ${dep}`;
    case 'yarn': return `yarn add${devFlag} ${dep}`;
    case 'npm': return `npm install${devFlag} ${dep}`;
  }
}
