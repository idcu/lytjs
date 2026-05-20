/**
 * @lytjs/plugin-vite
 *
 * LytJS official Vite plugin for SFC compilation, HMR, and build optimizations.
 *
 * @packageDocumentation
 */

import type { Plugin, HmrContext } from 'vite';
import type { LytjsPluginOptions } from './options';
import type { SFCStyleBlock, SFCCustomBlock } from '@lytjs/compiler/sfc';
import { resolveOptions, defaultOptions } from './options';
import { createFilter, generateScopeId } from './utils';
import { parseSFC, compileSFC } from '@lytjs/compiler/sfc';

// HMR cache for tracking component updates
const hmrCache = new Map<
  string,
  { script: string; template: string; styles: string[]; isVapor: boolean }
>();

// Route block collection
const routeBlockMap = new Map<string, string>();

// Vapor component ID map (Phase 1.2)
const vaporComponentIdMap = new Map<string, string>();

/**
 * Create the LytJS Vite plugin
 */
export default function lytjs(rawOptions: LytjsPluginOptions = {}): Plugin {
  const options = resolveOptions(rawOptions);
  const filter = createFilter(options.include, options.exclude);
  let isProduction = false;

  return {
    name: '@lytjs/plugin-vite',
    enforce: 'pre',

    config(_userConfig, env) {
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

    resolveId(id) {
      // Handle .lyt imports
      if (filter(id)) {
        return id;
      }
      // Handle .route virtual modules
      if (id.endsWith('.route')) {
        return `\0virtual-route:${id}`;
      }
      return null;
    },

    load(id) {
      if (!filter(id)) {
        // Handle virtual route modules
        if (id.startsWith('\0virtual-route:')) {
          const sourceId = id.replace('\0virtual-route:', '');
          const routeContent = routeBlockMap.get(sourceId);
          if (routeContent) {
            return `export default ${routeContent}`;
          }
        }
        return null;
      }

      return null;
    },

    transform(code, id) {
      if (!filter(id)) return null;

      try {
        // Parse the SFC
        const descriptor = parseSFC(code, { filename: id });

        // Handle <route> custom block
        const routeBlock = descriptor.customBlocks.find(
          (block: SFCCustomBlock) => block.type === 'route',
        );
        if (routeBlock) {
          // Store route info for later collection
          routeBlockMap.set(id, routeBlock.content);
        }

        // Generate the component code
        const result = compileSFC(descriptor, {
          filename: id,
          ssr: options.ssr,
          rendererMode: options.signalMode ? 'signal' : 'vnode',
        });

        let compiledCode = result.code;

        // Handle scoped styles - inject scope attribute
        const scopedStyles = descriptor.styles.filter((s: SFCStyleBlock) => s.scoped);
        if (scopedStyles.length > 0) {
          const scopeId = generateScopeId(id);
          // Inject __scopeId into the component setup
          compiledCode = compiledCode.replace(
            /(export default\s*\{)/,
            `$1\n  __scopeId: '${scopeId}',`,
          );
        }

        // Cache for HMR
        if (!isProduction) {
          hmrCache.set(id, {
            script: descriptor.script?.content || '',
            template: descriptor.template?.content || '',
            styles: descriptor.styles.map((s: SFCStyleBlock) => s.content),
            isVapor: options.signalMode || false,
          });
        }

        // Add HMR accept for development
        if (!isProduction) {
          // Phase 1.2: Vapor HMR 支持
          if (options.signalMode && options.enableVaporHMR !== false) {
            const componentId = `vapor-${id.replace(/[^a-zA-Z0-9]/g, '_')}`;
            vaporComponentIdMap.set(id, componentId);
            compiledCode += `
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule && newModule.default) {
      // Vapor HMR: 更新组件定义，保留状态
      const registry = window.__LYTJS_HMR_REGISTRY__;
      if (registry) {
        const instance = registry.get('${componentId}');
        if (instance) {
          instance.component = newModule.default;
          // Signal 模式会自动通过 effect 重新渲染
          console.log('[LytJS HMR] Vapor component updated: ${id}');
        }
      }
    }
  });
}
`;
          } else {
            compiledCode += '\nif (import.meta.hot) { import.meta.hot.accept(); }\n';
          }
        }

        return {
          code: compiledCode,
          map: result.sourceMap as any,
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
                  error instanceof Error ? error.message : String(error),
                )});
              }
            `,
            map: null,
          };
        }

        throw error;
      }
    },

    async handleHotUpdate(ctx: HmrContext) {
      const { file, server, modules } = ctx;

      if (!filter(file)) return;

      const prevCache = hmrCache.get(file);
      if (!prevCache) return modules;

      try {
        // Read the updated file content
        const content = await ctx.read();
        const descriptor = parseSFC(content, { filename: file });

        const newCache = {
          script: descriptor.script?.content || '',
          template: descriptor.template?.content || '',
          styles: descriptor.styles.map((s: SFCStyleBlock) => s.content),
          isVapor: prevCache.isVapor,
        };

        // Determine what changed
        const scriptChanged = prevCache.script !== newCache.script;
        const templateChanged = prevCache.template !== newCache.template;
        const stylesChanged =
          prevCache.styles.length !== newCache.styles.length ||
          prevCache.styles.some((s: string, i: number) => s !== newCache.styles[i]);

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
