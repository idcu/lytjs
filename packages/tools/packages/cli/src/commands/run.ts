/**
 * @lytjs/cli - CLI runner
 */

import type { CliOptions } from '../types';

/**
 * Run the CLI with given options
 */
export async function runCli(options: CliOptions): Promise<void> {
  // TODO: implement CLI runner
  console.log(`LytJS CLI v6.0.0`);
  console.log(`Command: ${options.command}`);
}
