/**
 * @lytjs/cli - Type definitions
 */

export interface CliOptions {
  command: string;
  args: string[];
  options: Record<string, unknown>;
}

export interface CreateOptions {
  template?: string;
  force?: boolean;
}

export interface DevOptions {
  port?: number;
  host?: string;
  open?: boolean;
}

export interface BuildOptions {
  outDir?: string;
  ssr?: boolean;
  minify?: boolean;
}

export interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  grep?: string;
}

export interface AddOptions {
  force?: boolean;
}

export interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}
