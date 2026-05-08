/**
 * @lytjs/cli - Type definitions
 */

export interface CliOptions {
  command: string;
  args: string[];
  options: Record<string, any>;
}
