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

/**
 * 判断当前模块是否为「被直接运行的入口」。
 *
 * ⚠️ 2026-09-26 修复：此前直接写 `require.main === module` —— 在 **ESM 产物**里
 * tsup 会把它改写成 `__require.main === module`，而 `module` 在 ESM 作用域下
 * **根本不存在** ⇒ `import '@lytjs/cli'` 会立刻抛
 * `ReferenceError: module is not defined in ES module scope`
 * （整个包无法被程序化使用，实测确认）。
 *
 * 这里改为「两个标识符都存在时才比较」：`typeof` 检查永远不会抛错，
 * 因此 ESM 场景下安全地判定为「非入口」，入口逻辑交给 bin 脚本/调用方。
 */
const isMainModule = (() => {
  try {
    const mod = typeof module !== 'undefined' ? (module as { id?: string }) : undefined;
    const req = typeof require !== 'undefined' ? (require as { main?: unknown }) : undefined;
    return Boolean(mod && req && req.main === mod);
  } catch {
    return false;
  }
})();

if (isMainModule) {
  runCli().catch(console.error);
}
