/**
 * @lytjs/cli
 *
 * LytJS project scaffolding and development CLI tool.
 *
 * @packageDocumentation
 */

import { runCli } from './commands/run';

export { runCli } from './commands/run';

export { create, listTemplates } from './commands/create';
export { dev } from './commands/dev';
export { build } from './commands/build';
export { test } from './commands/test';
export { add } from './commands/add';
export { generate } from './commands/generate';
export type { GenerateOptions } from './commands/generate';
export { createPlugin, buildPlugin, validatePlugin, listPluginTemplates } from './commands/plugin';
export type {
  PluginCreateOptions,
  PluginBuildOptions,
  PluginValidateOptions,
  PluginPublishOptions,
} from './commands/plugin';

export { logger } from './utils/logger';
export { ensureDir, writeFile, readFile, exists } from './utils/fs';
export {
  detectPackageManager,
  getInstallCommand,
  getRunCommand,
  getAddCommand,
} from './utils/package';

export type {
  CliOptions,
  CreateOptions,
  DevOptions,
  BuildOptions,
  TestOptions,
  PackageJson,
} from './types';

 
if (require.main === module) {
  runCli().catch(console.error);
}
