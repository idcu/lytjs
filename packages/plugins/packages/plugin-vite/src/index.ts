/**
 * @lytjs/plugin-vite
 *
 * LytJS official Vite plugin for SFC compilation, HMR, and build optimizations.
 *
 * @packageDocumentation
 */

import type { Plugin, PluginOption } from 'vite';

export interface LytjsPluginOptions {
  include?: RegExp | RegExp[];
  exclude?: RegExp | RegExp[];
  ssr?: boolean;
  signalMode?: boolean;
}

/**
 * Create the LytJS Vite plugin
 */
export default function lytjs(options: LytjsPluginOptions = {}): Plugin {
  // TODO: implement Vite plugin
  return {
    name: '@lytjs/plugin-vite',
    enforce: 'pre',
    configResolved(config) {
      // TODO: resolve configuration
    },
    transform(code, id) {
      // TODO: implement SFC transform
      return null;
    },
    handleHotUpdate({ file, server }) {
      // TODO: implement HMR
      return [];
    },
  };
}

export type { Plugin, PluginOption };
