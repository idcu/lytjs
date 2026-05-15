/**
 * @lytjs/cli - plugin command
 *
 * Plugin development CLI commands: create, build, validate, publish.
 */

import { logger } from '../utils/logger';
import { ensureDir } from '../utils/fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';

// ==================== Types ====================

export interface PluginCreateOptions {
  template?: string;
  force?: boolean;
  skipInstall?: boolean;
}

export interface PluginBuildOptions {
  outDir?: string;
  minify?: boolean;
  sourcemap?: boolean;
}

export interface PluginValidateOptions {
  strict?: boolean;
  warningsAsErrors?: boolean;
}

export interface PluginPublishOptions {
  registry?: string;
  access?: 'public' | 'restricted';
  otp?: string;
}

// ==================== Plugin Templates ====================

const PLUGIN_TEMPLATES = {
  default: 'Default plugin template with TypeScript',
  minimal: 'Minimal plugin without extra dependencies',
  withConfig: 'Plugin template with configuration schema',
};

function getTemplateContent(template: string, pluginName: string): Record<string, string> {
  const packageName = `@lytjs/plugin-${pluginName}`;

  const files: Record<string, string> = {};

  // package.json
  files['package.json'] = JSON.stringify({
    name: packageName,
    version: '0.1.0',
    description: `LytJS plugin: ${pluginName}`,
    main: 'dist/index.cjs',
    module: 'dist/index.mjs',
    types: 'dist/index.d.ts',
    exports: {
      '.': {
        import: './dist/index.mjs',
        require: './dist/index.cjs',
        types: './dist/index.d.ts',
      },
    },
    files: ['dist'],
    scripts: {
      build: 'tsup',
      dev: 'tsup --watch',
      test: 'vitest',
      lint: 'eslint src',
      'prepublishOnly': 'npm run build',
    },
    keywords: ['lytjs', 'plugin'],
    license: 'MIT',
    peerDependencies: {
      '@lytjs/core': '>=6.0.0',
    },
  }, null, 2);

  // tsconfig.json
  files['tsconfig.json'] = JSON.stringify({
    extends: '@lytjs/core/tsconfig.json',
    compilerOptions: {
      outDir: './dist',
      rootDir: './src',
      declaration: true,
      declarationMap: true,
    },
    include: ['src'],
    exclude: ['node_modules', 'dist', 'tests'],
  }, null, 2);

  // tsup.config.ts
  files['tsup.config.ts'] = `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: ['@lytjs/core'],
});
`;

  // src/index.ts
  if (template === 'withConfig') {
    files['src/index.ts'] = `/**
 * @lytjs/plugin-${pluginName}
 *
 * A LytJS plugin with configuration schema support.
 */

import { definePlugin } from '@lytjs/core';
import type { ConfigSchema } from '@lytjs/core';

/**
 * Plugin options schema
 */
const optionsSchema: ConfigSchema<${pluginName.replace(/-/g, '')}Options> = {
  type: 'object',
  properties: {
    debug: {
      type: 'boolean',
      description: 'Enable debug mode',
      default: false,
    },
    option1: {
      type: 'string',
      description: 'First option',
      default: 'default value',
    },
  },
  additionalProperties: false,
};

export interface ${pluginName.replace(/-/g, '')}Options {
  debug?: boolean;
  option1?: string;
}

/**
 * Create the plugin with configuration schema
 */
export function create${pluginName.replace(/-/g, '').replace(/^\w/, (c) => c.toUpperCase())}(options?: ${pluginName.replace(/-/g, '')}Options) {
  return definePlugin({
    name: '${packageName}',
    version: '0.1.0',
    description: 'A LytJS plugin',
    schema: optionsSchema,
    install: (app, opts) => {
      const config = opts || {};
      console.log('[${packageName}] Installing with config:', config);
    },
  });
}

/**
 * Direct plugin export (without schema)
 */
export default create${pluginName.replace(/-/g, '').replace(/^\w/, (c) => c.toUpperCase())}();
`;
  } else {
    files['src/index.ts'] = `/**
 * @lytjs/plugin-${pluginName}
 *
 * A LytJS plugin.
 */

import { definePlugin } from '@lytjs/core';

/**
 * Create the plugin
 */
export function create${pluginName.replace(/-/g, '').replace(/^\w/, (c) => c.toUpperCase())}() {
  return definePlugin({
    name: '${packageName}',
    version: '0.1.0',
    description: 'A LytJS plugin',
    install: (app) => {
      console.log('[${packageName}] Plugin installed');
    },
  });
}

/**
 * Direct plugin export
 */
export default create${pluginName.replace(/-/g, '').replace(/^\w/, (c) => c.toUpperCase())}();
`;
  }

  // src/types.ts (for minimal template)
  if (template === 'minimal') {
    files['src/types.ts'] = `/**
 * Plugin types
 */

export interface PluginOptions {
  // Define your plugin options here
}
`;
  }

  // README.md
  files['README.md'] = `# @lytjs/plugin-${pluginName}

A LytJS plugin.

## Installation

\`\`\`bash
npm install @lytjs/plugin-${pluginName}
\`\`\`

## Usage

\`\`\`typescript
import { createApp } from '@lytjs/core';
import myPlugin from '@lytjs/plugin-${pluginName}';

const app = createApp(App);
app.use(myPlugin);
\`\`\`

## API

### createPlugin(options?)

Create the plugin with options.

## License

MIT
`;

  // .gitignore
  files['.gitignore'] = `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

node_modules
dist
*.local

# IDE
.vscode
.idea
*.sw?
`;

  return files;
}

// ==================== Create Command ====================

export async function createPlugin(name: string, options: PluginCreateOptions = {}): Promise<void> {
  const targetDir = resolve(process.cwd(), name);
  const template = options.template || 'default';

  // Check template validity
  if (template !== 'default' && template !== 'minimal' && template !== 'withConfig') {
    logger.error(`Unknown template: ${template}`);
    logger.info('Available templates: default, minimal, withConfig');
    process.exit(1);
  }

  // Check if directory exists
  if (existsSync(targetDir) && !isEmptyDir(targetDir) && !options.force) {
    logger.error(`Directory "${name}" already exists and is not empty.`);
    logger.info('Use --force to overwrite.');
    process.exit(1);
  }

  logger.info(`Creating a new LytJS plugin in ${targetDir}...`);

  // Create directory
  ensureDir(targetDir);

  // Generate plugin files
  const files = getTemplateContent(template, name);
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(targetDir, filePath);
    const fileDir = resolve(fullPath, '..');
    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true });
    }
    writeFileSync(fullPath, content, 'utf-8');
    logger.success(`Created: ${filePath}`);
  }

  // Install dependencies
  if (!options.skipInstall) {
    logger.info('Installing dependencies...');
    try {
      execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' });
      logger.success('Dependencies installed!');
    } catch (_error) {
      logger.warning('Failed to install dependencies automatically.');
      logger.info('Please run "pnpm install" manually.');
    }
  }

  logger.success(`Plugin "${name}" created successfully!`);
  logger.info('');
  logger.bold('Next steps:');
  logger.info(`  cd ${name}`);
  logger.info('  pnpm dev      # Start development');
  logger.info('  pnpm build    # Build for production');
  logger.info('  pnpm test     # Run tests');
}

// ==================== Build Command ====================

export async function buildPlugin(options: PluginBuildOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const outDir = options.outDir || 'dist';

  // Check if package.json exists
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    logger.error('No package.json found. Are you in a plugin directory?');
    process.exit(1);
  }

  logger.info('Building plugin...');

  try {
    const buildCmd = 'tsup';
    const args = ['--entry', 'src/index.ts', '--outDir', outDir, '--format', 'esm,cjs', '--dts', '--sourcemap'];

    if (options.minify) {
      args.push('--minify');
    }

    execSync(`${buildCmd} ${args.join(' ')}`, { cwd, stdio: 'inherit' });

    logger.success('Build completed!');
    logger.info(`Output: ${join(cwd, outDir)}`);
  } catch (_error) {
    logger.error('Build failed. Make sure tsup is installed: pnpm add -D tsup');
    process.exit(1);
  }
}

// ==================== Validate Command ====================

export async function validatePlugin(options: PluginValidateOptions = {}): Promise<void> {
  const cwd = process.cwd();

  logger.info('Validating plugin...');

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check package.json
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    errors.push('package.json not found');
  } else {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

      // Check required fields
      if (!pkg.name) errors.push('package.json: name is required');
      if (!pkg.version) errors.push('package.json: version is required');
      if (!pkg.main) errors.push('package.json: main is required');
      if (!pkg.module) errors.push('package.json: module is required');
      if (!pkg.types) errors.push('package.json: types is required');

      // Check exports
      if (!pkg.exports) {
        warnings.push('package.json: exports field is recommended');
      }

      // Check peerDependencies
      if (!pkg.peerDependencies || !pkg.peerDependencies['@lytjs/core']) {
        errors.push('package.json: @lytjs/core peerDependency is required');
      }

      // Check keywords
      if (!pkg.keywords || !pkg.keywords.includes('lytjs')) {
        warnings.push('package.json: "lytjs" keyword is recommended');
      }
    } catch (err) {
      errors.push(`package.json: Invalid JSON - ${err}`);
    }
  }

  // Check source files
  const srcPath = join(cwd, 'src');
  if (!existsSync(srcPath)) {
    errors.push('src directory not found');
  } else {
    const indexPath = join(srcPath, 'index.ts');
    if (!existsSync(indexPath)) {
      errors.push('src/index.ts not found');
    } else {
      const content = readFileSync(indexPath, 'utf-8');

      // Check for definePlugin usage
      if (!content.includes('definePlugin') && !content.includes('EnhancedPlugin')) {
        warnings.push('src/index.ts: Consider using definePlugin or EnhancedPlugin');
      }

      // Check for export
      if (!content.includes('export')) {
        warnings.push('src/index.ts: No exports found');
      }
    }
  }

  // Check tsconfig.json
  const tsconfigPath = join(cwd, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    warnings.push('tsconfig.json not found (recommended)');
  }

  // Check tsup.config.ts
  const tsupConfigPath = join(cwd, 'tsup.config.ts');
  if (!existsSync(tsupConfigPath)) {
    warnings.push('tsup.config.ts not found (recommended for builds)');
  }

  // Report results
  let hasErrors = errors.length > 0;
  let hasWarnings = warnings.length > 0;

  if (hasErrors) {
    logger.error('Validation failed with errors:');
    for (const err of errors) {
      logger.error(`  - ${err}`);
    }
  }

  if (hasWarnings && !options.strict) {
    logger.warning('Warnings:');
    for (const warn of warnings) {
      logger.warning(`  - ${warn}`);
    }
  }

  if (!hasErrors && !hasWarnings) {
    logger.success('Plugin validation passed!');
  } else if (hasWarnings && !hasErrors) {
    logger.success('Plugin validation passed (with warnings)');
    if (options.strict) {
      process.exit(1);
    }
  } else {
    if (options.warningsAsErrors && hasWarnings) {
      logger.error('Strict mode: treating warnings as errors');
    }
    process.exit(1);
  }
}

// ==================== Helper Functions ====================

function isEmptyDir(dir: string): boolean {
  if (!existsSync(dir)) return true;
  const files = require('fs').readdirSync(dir);
  return files.length === 0;
}

// ==================== List Templates ====================

export function listPluginTemplates(): void {
  logger.bold('Available plugin templates:');
  for (const [name, description] of Object.entries(PLUGIN_TEMPLATES)) {
    logger.info(`  ${name.padEnd(12)} - ${description}`);
  }
}
