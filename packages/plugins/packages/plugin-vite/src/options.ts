/**
 * @lytjs/plugin-vite - Default options
 */

import type { LytjsPluginOptions } from './index';

export const defaultOptions: Required<LytjsPluginOptions> = {
  include: [/\.lyt$/, /\.lytjs$/],
  exclude: [/node_modules/],
  ssr: false,
  signalMode: false,
};

export function resolveOptions(options: LytjsPluginOptions): Required<LytjsPluginOptions> {
  return {
    ...defaultOptions,
    ...options,
  };
}
