/**
 * @lytjs/plugin-vite
 *
 * LytJS official Vite plugin for SFC compilation, HMR, and build optimizations.
 *
 * @packageDocumentation
 */

import type { Plugin, HmrContext, ResolvedConfig } from 'vite';
import type { LytjsPluginOptions } from './options';
import { resolveOptions, defaultOptions } from './options';
import { createFilter } from './utils';
import { compileSFC, parseSFC } from '@lytjs/compiler';

export interface LytjsPluginOptions {
  include?: RegExp | RegExp[];
  exclude?: RegExp | RegExp[];
  ssr?: boolean;
  signalMode?: boolean;
}

// HMR cache for tracking component updates
const hmrCache = new Map<string, { script: string; template: string; styles: string[] }>();

/**
 * Create the LytJS Vite plugin
 */
export default function lytjs(rawOptions: LytjsPluginOptions = {}): Plugin {
  const options = resolveOptions(rawOptions);
  const filter = createFilter(options.include, options.exclude);
  let config: ResolvedConfig;
  let isProduction = false;

  return {
    name: '@lytjs/plugin-vite',
    enforce: 'pre',

    config(userConfig, env) {
      isProduction = env.mode === 'production';

      return {
        esbuild: {
          include: [/\.ts$/, /\.tsx$/],
          exclude: [/\.lyt$/],
        },
        optimizeDeps: {
          exclude: ['@lytjs/core', '@lytjs/compiler'],
        },
      };
    },

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    resolveId(id) {
      // Handle .lyt imports
      if (filter(id)) {
        return id;
      }
      return null;
    },

    load(id) {
      if (!filter(id)) return null;

      // In development, we compile on-the-fly
      // In production, this would be handled by transform
      return null;
    },

    transform(code, id) {
      if (!filter(id)) return null;

      try {
        // Parse the SFC
        const { descriptor } = parseSFC(code, { filename: id });

        // Generate the component code
        const result = compileSFC(descriptor, {
          filename: id,
          ssr: options.ssr,
          signalMode: options.signalMode,
        });

        // Cache for HMR
        if (!isProduction) {
          hmrCache.set(id, {
            script: descriptor.script?.content || '',
            template: descriptor.template?.content || '',
            styles: descriptor.styles.map((s) => s.content),
          });
        }

        return {
          code: result.code,
          map: result.map,
        };
      } catch (error) {
        // Log compilation errors
        console.error(`[@lytjs/plugin-vite] Error compiling ${id}:`, error);

        // Return error overlay in development
        if (!isProduction) {
          return {
            code: `
              export default function ErrorComponent() {
                throw new Error(${JSON.stringify(
                  error instanceof Error ? error.message : String(error)
                )});
              }
            `,
            map: null,
          };
        }

        throw error;
      }
    },

    handleHotUpdate(ctx: HmrContext) {
      const { file, server, modules } = ctx;

      if (!filter(file)) return;

      const prevCache = hmrCache.get(file);
      if (!prevCache) return modules;

      try {
        // Read the updated file content
        const content = ctx.read();
        const { descriptor } = parseSFC(content, { filename: file });

        const newCache = {
          script: descriptor.script?.content || '',
          template: descriptor.template?.content || '',
          styles: descriptor.styles.map((s) => s.content),
        };

        // Determine what changed
        const scriptChanged = prevCache.script !== newCache.script;
        const templateChanged = prevCache.template !== newCache.template;
        const stylesChanged =
          prevCache.styles.length !== newCache.styles.length ||
          prevCache.styles.some((s, i) => s !== newCache.styles[i]);

        // Update cache
        hmrCache.set(file, newCache);

        // If script changed, full reload needed
        if (scriptChanged) {
          server.ws.send({
            type: 'full-reload',
            path: '*',
          });
          return [];
        }

        // If only template changed, we can do a hot update
        if (templateChanged && !stylesChanged) {
          // The transform hook will recompile the component
          return modules;
        }

        // If styles changed, we can handle CSS HMR separately
        if (stylesChanged && !templateChanged) {
          // Return the modules for CSS update
          return modules;
        }

        // Multiple changes, let Vite handle it
        return modules;
      } catch (error) {
        console.error(`[@lytjs/plugin-vite] HMR error for ${file}:`, error);
        return modules;
      }
    },
  };
}

export type { LytjsPluginOptions };
export { defaultOptions, resolveOptions };
