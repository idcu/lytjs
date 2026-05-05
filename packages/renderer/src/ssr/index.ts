/**
 * @lytjs/renderer - SSR Module
 * Server-side rendering exports
 * FIX: P2-9 RENDERER-NEW-02 - SSR 流式渲染支持
 */

// SSR Renderer - render to string
export { renderToString } from './ssr-renderer';
export type { SSRInput } from './ssr-renderer';

// SSR Streaming - render to stream
export { renderToStream } from './ssr-stream';
export type { SSRStreamOptions } from './ssr-stream';

// SSR Island Architecture
export {
  hydrateIsland,
  registerIslandComponent,
  createIslandSSRContent,
} from './ssr-island';
export type { ComponentOptions as IslandComponentOptions } from './ssr-island';

// SSR Utilities
export {
  isValidHTMLElementTag,
  renderAttributeToString,
  NAMED_ENTITIES,
} from './ssr-utils';

/**
 * SSR Rendering Options
 * Combined options for both string and stream rendering
 */
export interface SSROptions {
  /**
   * Whether to insert comment markers between chunks (for debugging)
   * Only applies to streaming mode
   */
  commentMarkers?: boolean;

  /**
   * Whether to enable island architecture hydration
   */
  islands?: boolean;

  /**
   * Custom island component registry
   */
  islandComponents?: Map<string, unknown>;
}

/**
 * Render a VNode to HTML (string or stream based on options)
 *
 * @example
 * ```ts
 * // String rendering
 * const html = await renderToSSR({ vnode });
 *
 * // Stream rendering
 * const stream = renderToSSRStream({ vnode, commentMarkers: true });
 * ```
 */
export function renderToSSR(input: SSRInput & { stream?: false }): Promise<string>;
export function renderToSSR(
  input: SSRInput & { stream: true; commentMarkers?: boolean },
): ReadableStream<Uint8Array>;
export function renderToSSR(
  input: SSRInput & { stream?: boolean; commentMarkers?: boolean },
): Promise<string> | ReadableStream<Uint8Array> {
  if (input.stream) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { renderToStream } = require('./ssr-stream');
    return renderToStream(input, { commentMarkers: input.commentMarkers });
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { renderToString } = require('./ssr-renderer');
  return renderToString(input);
}
