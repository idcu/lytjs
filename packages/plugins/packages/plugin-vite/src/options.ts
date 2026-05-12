/**
 * @lytjs/plugin-vite - Options and configuration
 */

export interface LytjsPluginOptions {
  include?: RegExp | RegExp[];
  exclude?: RegExp | RegExp[];
  ssr?: boolean;
  signalMode?: boolean;
  /** Phase 1.2: 启用 Vapor HMR 支持 */
  enableVaporHMR?: boolean;
}

/**
 * Default plugin options
 */
export const defaultOptions: Required<LytjsPluginOptions> = {
  include: [/\.lyt$/],
  exclude: [/node_modules/, /\.git/],
  ssr: false,
  signalMode: false,
  enableVaporHMR: false,
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
    enableVaporHMR: options.enableVaporHMR ?? defaultOptions.enableVaporHMR,
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
