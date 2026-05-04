// src/sfc/parse.ts
// SFC (Single File Component) parser for .lyt files

import type { RootNode } from '../types';

// ============================================================
// SFC Descriptor Types
// ============================================================

export interface SFCDescriptor {
  filename: string;
  template: SFCTemplateBlock | null;
  script: SFCScriptBlock | null;
  scriptSetup: SFCScriptBlock | null;
  styles: SFCStyleBlock[];
  customBlocks: SFCCustomBlock[];
}

export interface SFCTemplateBlock {
  type: 'template';
  content: string;
  start: number;
  end: number;
  attrs: Record<string, string>;
  ast: RootNode | null;
}

export interface SFCScriptBlock {
  type: 'script';
  content: string;
  start: number;
  end: number;
  attrs: Record<string, string>;
  setup?: boolean;
}

export interface SFCStyleBlock {
  type: 'style';
  content: string;
  start: number;
  end: number;
  attrs: Record<string, string>;
  scoped?: boolean;
  lang?: string;
}

export interface SFCCustomBlock {
  type: string;
  content: string;
  start: number;
  end: number;
  attrs: Record<string, string>;
}

// ============================================================
// Internal types
// ============================================================

interface SFCBlock {
  type: string;
  content: string;
  start: number;
  end: number;
  attrs: Record<string, string>;
}

// ============================================================
// Constants
// ============================================================

// Standard block names that have special handling
// (used internally for documentation; actual dispatch uses switch/case)

// Opening tag regex: matches <tagname with optional attributes>
// Captures: [1] tag name, [2] full attribute string
const RE_BLOCK_OPEN = /^<([a-zA-Z][a-zA-Z0-9-]*)([\s\S]*?)>/;

// Attribute regex: matches name="value", name='value', name=value, or standalone name
const RE_ATTR = /([^\s"'<>=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

// ============================================================
// Parse Options
// ============================================================

export interface SFCParseOptions {
  filename?: string;
  /** If true, parse the template block into an AST */
  parseTemplate?: boolean;
}

// ============================================================
// parseSFC
// ============================================================

/**
 * Parse a .lyt single file component source string into a structured descriptor.
 *
 * @param source - The raw source code of the .lyt file
 * @param options - Parse options (filename, etc.)
 * @returns SFCDescriptor containing all parsed blocks
 */
export function parseSFC(
  source: string,
  options: SFCParseOptions = {},
): SFCDescriptor {
  const { filename = 'anonymous.lyt' } = options;

  const descriptor: SFCDescriptor = {
    filename,
    template: null,
    script: null,
    scriptSetup: null,
    styles: [],
    customBlocks: [],
  };

  const blocks = extractBlocks(source);

  for (const block of blocks) {
    switch (block.type) {
      case 'template': {
        if (descriptor.template !== null) {
          if (__DEV__) {
            console.warn(
              `[parseSFC] Duplicate <template> block in "${filename}". Only the first one will be used.`,
            );
          }
          break;
        }
        descriptor.template = {
          type: 'template',
          content: block.content,
          start: block.start,
          end: block.end,
          attrs: block.attrs,
          ast: null,
        };
        break;
      }

      case 'script': {
        const isSetup = block.attrs['setup'] !== undefined;
        if (isSetup) {
          if (descriptor.scriptSetup !== null) {
            if (__DEV__) {
              console.warn(
                `[parseSFC] Duplicate <script setup> block in "${filename}". Only the first one will be used.`,
              );
            }
            break;
          }
          descriptor.scriptSetup = {
            type: 'script',
            content: block.content,
            start: block.start,
            end: block.end,
            attrs: block.attrs,
            setup: true,
          };
        } else {
          if (descriptor.script !== null) {
            if (__DEV__) {
              console.warn(
                `[parseSFC] Duplicate <script> block in "${filename}". Only the first one will be used.`,
              );
            }
            break;
          }
          descriptor.script = {
            type: 'script',
            content: block.content,
            start: block.start,
            end: block.end,
            attrs: block.attrs,
            setup: false,
          };
        }
        break;
      }

      case 'style': {
        const scoped = block.attrs['scoped'] !== undefined;
        const lang = block.attrs['lang'];
        descriptor.styles.push({
          type: 'style',
          content: block.content,
          start: block.start,
          end: block.end,
          attrs: block.attrs,
          scoped,
          lang,
        });
        break;
      }

      default: {
        // Custom block (e.g., <i18n>, <route>, <graphql>, <md>, etc.)
        descriptor.customBlocks.push({
          type: block.type,
          content: block.content,
          start: block.start,
          end: block.end,
          attrs: block.attrs,
        });
        break;
      }
    }
  }

  return descriptor;
}

// ============================================================
// Block Extraction
// ============================================================

/**
 * Extract all top-level blocks from the SFC source.
 * Handles nested angle brackets inside block content correctly
 * by matching opening and closing tags.
 */
function extractBlocks(source: string): SFCBlock[] {
  const blocks: SFCBlock[] = [];
  let pos = 0;

  // Skip leading whitespace / BOM
  while (pos < source.length && isWhitespace(source[pos]!)) {
    pos++;
  }

  while (pos < source.length) {
    // Try to match an opening tag
    const openMatch = RE_BLOCK_OPEN.exec(source.slice(pos));
    if (!openMatch) {
      // No more blocks found; remaining content is ignored
      break;
    }

    const tagName = openMatch[1]!;
    const attrString = openMatch[2]!;
    const tagEnd = pos + openMatch[0].length;

    // Parse attributes
    const attrs = parseAttributes(attrString);

    // Find the matching closing tag
    const closeTag = `</${tagName}>`;
    const closeIndex = source.indexOf(closeTag, tagEnd);

    if (closeIndex === -1) {
      // No closing tag found; treat remaining content as this block's content
      if (__DEV__) {
        console.warn(
          `[parseSFC] Missing closing tag </${tagName}>. Treating rest of file as block content.`,
        );
      }
      blocks.push({
        type: tagName,
        content: source.slice(tagEnd),
        start: pos,
        end: source.length,
        attrs,
      });
      break;
    }

    const content = source.slice(tagEnd, closeIndex);
    const blockEnd = closeIndex + closeTag.length;

    blocks.push({
      type: tagName,
      content,
      start: pos,
      end: blockEnd,
      attrs,
    });

    pos = blockEnd;

    // Skip whitespace between blocks
    while (pos < source.length && isWhitespace(source[pos]!)) {
      pos++;
    }
  }

  return blocks;
}

// ============================================================
// Attribute Parsing
// ============================================================

/**
 * Parse an attribute string into a Record<string, string>.
 * Boolean attributes (e.g., `scoped`, `setup`) get an empty string value.
 */
function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  if (!attrString.trim()) {
    return attrs;
  }

  // Reset lastIndex since we reuse the global regex
  RE_ATTR.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = RE_ATTR.exec(attrString)) !== null) {
    const name = match[1]!;
    // Value can be in group 2 (double-quoted), group 3 (single-quoted), or group 4 (unquoted)
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[name] = value;
  }

  return attrs;
}

// ============================================================
// Utilities
// ============================================================

function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r';
}
