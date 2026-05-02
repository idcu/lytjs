/**
 * @lytjs/renderer - SSR Island Architecture
 * Provides island-based selective hydration for SSR applications
 */

import type { VNode } from '@lytjs/vdom';
import { isString } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { escapeHtml } from '../utils';

// ============================================================
// Types
// ============================================================

/**
 * Minimal component options interface for island components.
 * Uses a simplified shape to avoid tight coupling with the full ComponentOptions.
 */
export interface ComponentOptions {
  name?: string;
  props?: Record<string, unknown>;
  setup?: (props: Record<string, unknown>) => Record<string, unknown> | VNode | void;
  render?: (ctx: Record<string, unknown>) => VNode;
  data?: () => Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================
// Island Registry
// ============================================================

const islandRegistry = new Map<string, ComponentOptions>();

/**
 * Register a named island component.
 *
 * Registered components can later be referenced by name in `hydrateIsland`
 * and `createIslandSSRContent`.
 */
export function registerIslandComponent(name: string, component: ComponentOptions): void {
  if (!name || typeof name !== 'string') {
    if (__DEV__) {
      warn(`registerIslandComponent: invalid island name "${String(name)}"`);
    }
    return;
  }
  islandRegistry.set(name, component);
}

/**
 * Get a registered island component by name.
 * Returns undefined if not found.
 */
export function getIslandComponent(name: string): ComponentOptions | undefined {
  return islandRegistry.get(name);
}

// ============================================================
// createIslandSSRContent
// ============================================================

/**
 * Create server-side rendered island placeholder HTML.
 *
 * Generates a `<div>` element with `data-island` and `data-props` attributes.
 * The props are serialized as JSON and base64-encoded for safe embedding in HTML.
 */
export function createIslandSSRContent(
  name: string,
  props: Record<string, unknown>,
): string {
  const encodedProps = encodeProps(props);
  return `<div data-island="${escapeHtml(name)}" data-props="${escapeHtml(encodedProps)}"><!-- island placeholder --></div>`;
}

// ============================================================
// hydrateIsland
// ============================================================

/**
 * Hydrate an island element within a container.
 *
 * Finds elements with `data-island` attribute, decodes the serialized props,
 * and hydrates them using the registered island component.
 *
 * @param container - An Element or CSS selector string to find the container
 * @param component - The component options to hydrate with (overrides registry)
 * @param props - Optional props override (overrides serialized props)
 */
export async function hydrateIsland(
  container: Element | string,
  component: ComponentOptions,
  props?: Record<string, unknown>,
): Promise<void> {
  // Resolve container
  let root: Element | null;
  if (isString(container)) {
    root = document.querySelector(container);
  } else {
    root = container;
  }

  if (!root) {
    if (__DEV__) {
      warn(`hydrateIsland: container not found for "${String(container)}"`);
    }
    return;
  }

  // Find all island elements within the container
  const islandElements = root.querySelectorAll('[data-island]');

  for (let i = 0; i < islandElements.length; i++) {
    const el = islandElements[i] as HTMLElement;
    const islandName = el.getAttribute('data-island');

    if (!islandName) continue;

    // Determine which component to use: explicit parameter or registry lookup
    const resolvedComponent = islandName === component.name
      ? component
      : (islandRegistry.get(islandName) ?? component);

    // Determine props: explicit parameter or decode from data-props attribute
    const resolvedProps = props ?? decodeProps(el.getAttribute('data-props') ?? '');

    // Hydrate the island element
    await hydrateIslandElement(el, resolvedComponent, resolvedProps);
  }
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Hydrate a single island element with the given component and props.
 */
async function hydrateIslandElement(
  el: HTMLElement,
  component: ComponentOptions,
  props: Record<string, unknown>,
): Promise<void> {
  // Call setup if defined
  let setupResult: Record<string, unknown> | VNode | void = undefined;
  if (typeof component.setup === 'function') {
    setupResult = component.setup(props);
  }

  // Call render if defined
  let vnode: VNode | undefined;
  if (typeof component.render === 'function') {
    const ctx = (setupResult && typeof setupResult === 'object' && !('type' in setupResult))
      ? setupResult as Record<string, unknown>
      : {};
    vnode = component.render(ctx);
  }

  // If setup returned a VNode directly, use it
  if (setupResult && typeof setupResult === 'object' && 'type' in setupResult) {
    vnode = setupResult as VNode;
  }

  if (vnode) {
    // Replace the island placeholder content with the hydrated vnode
    el.innerHTML = '';
    // For SSR island hydration, we render the vnode to HTML and set it
    // In a full implementation this would use the DOM renderer's hydrate
    const html = vnodeToSimpleHTML(vnode);
    el.innerHTML = html;
  }
}

/**
 * Simple vnode-to-HTML converter for island hydration.
 * This is a lightweight version that handles basic elements and text.
 */
function vnodeToSimpleHTML(vnode: VNode): string {
  const { type, children } = vnode;

  if (typeof type === 'string') {
    const props = vnode.props ?? {};
    let attrs = '';
    for (const key in props) {
      if (key === 'key' || key === 'ref') continue;
      const value = props[key];
      if (typeof value === 'boolean' && value) {
        attrs += ` ${key}`;
      } else if (value != null && value !== '') {
        attrs += ` ${key}="${escapeHtml(String(value))}"`;
      }
    }

    const tag = type;
    const childContent = children != null
      ? typeof children === 'string'
        ? escapeHtml(children)
        : ''
      : '';

    return `<${tag}${attrs}>${childContent}</${tag}>`;
  }

  return '';
}

/**
 * Encode props to a base64 string for embedding in HTML attributes.
 */
function encodeProps(props: Record<string, unknown>): string {
  const json = JSON.stringify(props);
  // Use btoa for base64 encoding (available in browser and Node.js)
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(json)));
  }
  // Fallback for non-browser environments
  return Buffer.from(json, 'utf-8').toString('base64');
}

/**
 * Decode props from a base64 string.
 */
function decodeProps(encoded: string): Record<string, unknown> {
  if (!encoded) return {};

  try {
    let json: string;
    if (typeof atob !== 'undefined') {
      json = decodeURIComponent(escape(atob(encoded)));
    } else {
      json = Buffer.from(encoded, 'base64').toString('utf-8');
    }
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    if (__DEV__) {
      warn(`hydrateIsland: failed to decode props from "${encoded}"`);
    }
    return {};
  }
}
