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
    console.log(`LytJS CLI v${VERSION}`);
    return;
  }
  
  // Route to commands
  switch (command) {
    case 'create':
      await create(args[0] || 'my-lytjs-app', {
        template: options.template,
        force: options.force,
      });
      break;
      
    case 'templates':
      listTemplates();
      break;
      
    case 'dev':
      await dev({
        port: options.port ? parseInt(options.port, 10) : undefined,
        host: options.host,
        open: options.open,
      });
      break;
      
    case 'build':
      await build({
        outDir: options.outDir,
        ssr: options.ssr,
        minify: options.minify !== 'false',
      });
      break;
      
    case 'test':
      await test({
        watch: options.watch !== 'false',
        coverage: options.coverage,
        grep: options.grep,
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
  const command = args[0] || '';
  const positional: string[] = [];
  const options: Record<string, any> = {};
  
  for (let i = command ? 1 : 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (value !== undefined) {
        options[key] = value;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        options[key] = args[++i];
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      options[key] = true;
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
`);
}
