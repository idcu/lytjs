/**
 * @lytjs/cli - CLI runner
 *
 * Main entry point for the CLI. Parses arguments and routes to commands.
 */

import type { CliOptions } from '../types';
import { logger } from '../utils/logger';
import { create, listTemplates } from './create';
import { dev } from './dev';
import { build } from './build';
import { test } from './test';
import { add } from './add';
import {
  createPlugin,
  buildPlugin,
  validatePlugin,
  listPluginTemplates,
} from './plugin';

const VERSION = '6.0.0';

export async function runCli(rawArgs: string[] = process.argv.slice(2)): Promise<void> {
  const { command, args, options } = parseArgs(rawArgs);
  
  if (options.help || command === 'help') {
    showHelp();
    return;
  }
  
  if (options.version || command === 'version' || command === '-v' || command === '--version') {
    console.log(`LytJS CLI v${VERSION}`);
    return;
  }
  
  switch (command) {
    case 'create':
      await create(args[0] || 'my-lytjs-app', {
        template: options.template as string | undefined,
        force: options.force as boolean | undefined,
      });
      break;
      
    case 'templates':
      listTemplates();
      break;
      
    case 'dev':
      await dev({
        port: options.port ? parseInt(options.port as string, 10) : undefined,
        host: options.host as string | undefined,
        open: options.open as boolean | undefined,
      });
      break;
      
    case 'build':
      await build({
        outDir: options.outDir as string | undefined,
        ssr: options.ssr as boolean | undefined,
        minify: (options.minify as string) !== 'false',
      });
      break;
      
    case 'test':
      await test({
        watch: (options.watch as string) !== 'false',
        coverage: options.coverage as boolean | undefined,
        grep: options.grep as string | undefined,
      });
      break;

    case 'add':
      const addTypes = ['component', 'page', 'store', 'directive', 'composable', 'util', 'middleware', 'hook'];
      if (!args[0] || !addTypes.includes(args[0])) {
        logger.error('Usage: lyt add <type> <name>');
        logger.info('Types: component, page, store, directive, composable, util, middleware, hook');
        logger.info('Example: lyt add component Button');
        process.exit(1);
      }
      await add(args[0] as any, args[1] || 'Unnamed', {
        force: options.force as boolean | undefined,
      });
      break;
      
    case 'plugin':
      if (!args[0]) {
        logger.error('Usage: lyt plugin <create|build|validate|templates>');
        logger.info('Example: lyt plugin create my-plugin');
        process.exit(1);
      }
      
      const subCommand = args[0];
      switch (subCommand) {
        case 'create':
          await createPlugin(args[1] || 'my-plugin', {
            template: options.template as string | undefined,
            force: options.force as boolean | undefined,
            skipInstall: options.skipInstall as boolean | undefined,
          });
          break;
        case 'build':
          await buildPlugin({
            outDir: options.outDir as string | undefined,
            minify: options.minify as boolean | undefined,
            sourcemap: options.sourcemap as boolean | undefined,
          });
          break;
        case 'validate':
          await validatePlugin({
            strict: options.strict as boolean | undefined,
            warningsAsErrors: options.warningsAsErrors as boolean | undefined,
          });
          break;
        case 'templates':
          listPluginTemplates();
          break;
        default:
          logger.error(`Unknown plugin sub-command: ${subCommand}`);
          logger.info('Supported sub-commands: create, build, validate, templates');
          process.exit(1);
      }
      break;
      
    default:
      if (command) {
        logger.error(`Unknown command: ${command}`);
        logger.info('Run "lyt --help" for usage information.');
        process.exit(1);
      } else {
        showHelp();
      }
  }
}

function parseArgs(args: string[]): CliOptions {
  let command = args[0] ?? '';
  const positional: string[] = [];
  const options: Record<string, unknown> = {};
  
  if (command.startsWith('--') || command.startsWith('-')) {
    command = '';
  }
  
  const startIndex = command ? 1 : 0;
  
  for (let i = startIndex; i < args.length; i++) {
    const arg = args[i] ?? '';
    
    if (arg.startsWith('--')) {
      const parts = arg.slice(2).split('=');
      const key = parts[0];
      const value = parts[1];
      if (value !== undefined && key) {
        options[key] = value;
      } else if (key && i + 1 < args.length && !(args[i + 1] ?? '').startsWith('-')) {
        const nextArg = args[++i];
        if (nextArg) {
          options[key] = nextArg;
        }
      } else if (key) {
        options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      if (key) {
        options[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  
  return { command, args: positional, options };
}

function showHelp(): void {
  console.log(`
${logger.bold('LytJS CLI')} v${VERSION}

${logger.bold('Usage:')}
  lyt <command> [options]

${logger.bold('Commands:')}
  create <name>            Create a new LytJS project
  templates                List available templates
  dev                      Start development server
  build                    Build for production
  test                     Run tests
  add <type> <name>        Generate a component, page, store, directive, composable, etc.
  plugin <subcmd>          Plugin development commands
  help                     Show this help message

${logger.bold('Options:')}
  --version, -v     Show version number
  --help            Show help

${logger.bold('Create Options:')}
  --template <name> Use a specific template
  --force           Overwrite existing directory

${logger.bold('Dev Options:')}
  --port <number>   Specify port (default: 5173)
  --host <host>     Specify host (default: localhost)
  --open            Open browser on start

${logger.bold('Build Options:')}
  --outDir <dir>    Output directory (default: dist)
  --ssr             Build for SSR
  --minify false    Disable minification

${logger.bold('Test Options:')}
  --watch false     Run tests once (no watch mode)
  --coverage        Generate coverage report
  --grep <pattern>  Filter tests by pattern

${logger.bold('Plugin Options:')}
  --template <name>    Use a specific plugin template (default, minimal, withConfig)
  --force              Overwrite existing directory
  --skipInstall        Skip installing dependencies
  --outDir <dir>       Output directory (default: dist)
  --minify             Minify output
  --sourcemap          Generate sourcemaps
  --strict             Strict validation mode
  --warningsAsErrors   Treat warnings as errors

${logger.bold('Examples:')}
  lyt create my-app
  lyt create my-app --template minimal
  lyt create my-app --template router
  lyt create my-app --template full
  lyt dev --port 3000
  lyt build --ssr
  lyt add component Button
  lyt add page About
  lyt add store user
  lyt add directive click-outside
  lyt add composable fetch-data
  lyt add util format
  lyt add hook window-size
  lyt plugin create my-plugin
  lyt plugin create my-plugin --template withConfig
  lyt plugin build
  lyt plugin validate
`);
}
