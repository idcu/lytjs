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

const VERSION = '6.0.0';

/**
 * Run the CLI with given options
 */
export async function runCli(rawArgs: string[] = process.argv.slice(2)): Promise<void> {
  const { command, args, options } = parseArgs(rawArgs);
  
  // Handle help and version
  if (options.help || command === 'help') {
    showHelp();
    return;
  }
  
  if (options.version || command === 'version' || command === '-v' || command === '--version') {
    // eslint-disable-next-line no-console
    console.log(`LytJS CLI v${VERSION}`);
    return;
  }
  
  // Route to commands
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
      if (!args[0] || !['component', 'page', 'store'].includes(args[0])) {
        logger.error('Usage: lytjs add <component|page|store> <name>');
        logger.info('Example: lytjs add component Button');
        process.exit(1);
      }
      await add(args[0] as 'component' | 'page' | 'store', args[1] || 'Unnamed', {
        force: options.force as boolean | undefined,
      });
      break;
      
    default:
      if (command) {
        logger.error(`Unknown command: ${command}`);
        logger.info('Run "lytjs --help" for usage information.');
        process.exit(1);
      } else {
        showHelp();
      }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const command = args[0] ?? '';
  const positional: string[] = [];
  const options: Record<string, unknown> = {};
  
  for (let i = command ? 1 : 0; i < args.length; i++) {
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

/**
 * Show help message
 */
function showHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`
${logger.bold('LytJS CLI')} v${VERSION}

${logger.bold('Usage:')}
  lytjs <command> [options]

${logger.bold('Commands:')}
  create <name>     Create a new LytJS project
  templates         List available templates
  dev               Start development server
  build             Build for production
  test              Run tests
  add <type> <name> Generate a component, page, or store
  help              Show this help message

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

${logger.bold('Examples:')}
  lytjs create my-app
  lytjs create my-app --template minimal
  lytjs dev --port 3000
  lytjs build --ssr
  lytjs add component Button
  lytjs add page About
  lytjs add store user
`);
}
