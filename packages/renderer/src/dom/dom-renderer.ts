/**
 * @lytjs/renderer - DOM Renderer
 * Creates a DOM renderer using vdom's createRenderer with enhanced patchProp
 */

import { createRenderer, createDOMRendererOptions } from "@lytjs/vdom";
import type { VNode, RendererOptions } from "@lytjs/vdom";
import { patchProp } from "./patch-props";

// ============================================================
// SVG namespace detection
// ============================================================

const SVG_TAGS = new Set([
  "svg",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "g",
  "defs",
  "use",
  "clipPath",
  "text",
  "tspan",
  "linearGradient",
  "radialGradient",
  "stop",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feFlood",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "mask",
  "symbol",
  "marker",
  "pattern",
  "foreignObject",
  "image",
  "animate",
  "animateTransform",
  "animateMotion",
]);

function isSVGTag(tag: string): boolean {
  return SVG_TAGS.has(tag);
}

// ============================================================
// createDOMRenderer
// ============================================================

export interface DOMRenderer {
  render(vnode: VNode | null, container: Element): void;
  patch(
    n1: VNode | null,
    n2: VNode,
    container: Node,
    anchor?: Node | null,
  ): void;
  unmount(vnode: VNode): void;
  mount(vnode: VNode, container: Node): void;
  move(vnode: VNode, container: Node, anchor: Node | null): void;
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Create a DOM renderer that uses vdom's createRenderer with enhanced patchProp.
 */
export function createDOMRenderer(): DOMRenderer {
  // Get vdom's DOM host options
  const hostOptions = createDOMRendererOptions();

  // Override patchProp with our enhanced version that handles
  // class, style, events, and attributes properly
  // Also override createElement to handle SVG namespace
  const options: RendererOptions<Node, Element> = {
    ...hostOptions,
    createElement(tag: string): Element {
      if (isSVGTag(tag)) {
        return document.createElementNS(SVG_NS, tag);
      }
      return document.createElement(tag);
    },
    patchProp(
      el: Element,
      key: string,
      prevValue: unknown,
      nextValue: unknown,
    ): void {
      const isSVG = (el as Element).namespaceURI === SVG_NS;
      patchProp(el, key, prevValue, nextValue, isSVG);
    },
  };

  const renderer = createRenderer(options);

  return {
    render(vnode: VNode | null, container: Element): void {
      if (vnode == null) {
        // Unmount: trigger lifecycle hooks before clearing DOM
        const existing = (container as any)._vnode as VNode | null | undefined;
        if (existing) {
          renderer.unmount(existing);
          (container as any)._vnode = null;
        }
        if (container.firstChild) {
          // Use replaceChildren instead of innerHTML to avoid memory leaks
          // from event listeners and other references not being cleaned up
          if (typeof container.replaceChildren === "function") {
            container.replaceChildren();
          } else {
            while (container.firstChild) {
              container.removeChild(container.firstChild);
            }
          }
        }
      } else {
        // Patch into container
        const existing = (container as any)._vnode as VNode | null | undefined;
        renderer.patch(existing ?? null, vnode, container);
        (container as any)._vnode = vnode;
      }
    },
    patch: renderer.patch,
    unmount(vnode: VNode): void {
      renderer.unmount(vnode);
    },
    mount: renderer.mount,
    move(vnode: VNode, container: Node, anchor: Node | null): void {
      renderer.move(vnode, container, anchor, null, null);
    },
  };
}
