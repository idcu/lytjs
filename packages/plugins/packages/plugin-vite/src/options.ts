/**
 * @lytjs/plugin-vite - Options and configuration
 */

import type { LytjsPluginOptions } from './index';

/**
 * Default plugin options
 */
export const defaultOptions: Required<LytjsPluginOptions> = {
  include: [/\.lyt$/],
  exclude: [/node_modules/, /\.git/],
  ssr: false,
  signalMode: false,
};

/**
 * Resolve user options with defaults
 */
export function resolveOptions(options: LytjsPluginOptions): Required<LytjsPluginOptions> {
  return {
    include: options.include ?? defaultOptions.include,
    exclude: options.exclude ?? defaultOptions.exclude,
    ssr: options.ssr ?? defaultOptions.ssr,
    signalMode: options.signalMode ?? defaultOptions.signalMode,
  };
}

/**
 * Validate plugin options
 */
export function validateOptions(options: LytjsPluginOptions): void {
  if (options.include && !Array.isArray(options.include) && !(options.include instanceof RegExp)) {
    throw new TypeError('[@lytjs/plugin-vite] Option "include" must be a RegExp or an array of RegExp');
  }
  if (options.exclude && !Array.isArray(options.exclude) && !(options.exclude instanceof RegExp)) {
    throw new TypeError('[@lytjs/plugin-vite] Option "exclude" must be a RegExp or an array of RegExp');
  }
}
