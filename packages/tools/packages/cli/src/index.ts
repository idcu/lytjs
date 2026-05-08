/**
 * @lytjs/cli
 *
 * LytJS project scaffolding and development CLI tool.
 *
 * @packageDocumentation
 */

// CLI entry point
export { runCli } from './commands/run';

// Commands
export { create, listTemplates } from './commands/create';
export { dev } from './commands/dev';
export { build } from './commands/build';
export { test } from './commands/test';

// Utils
export { logger } from './utils/logger';
export { ensureDir, writeFile, readFile, exists } from './utils/fs';
export { detectPackageManager, getInstallCommand, getRunCommand, getAddCommand } from './utils/package';

// Types
export type {
  CliOptions,
  CreateOptions,
  DevOptions,
  BuildOptions,
  TestOptions,
  PackageJson,
} from './types';
