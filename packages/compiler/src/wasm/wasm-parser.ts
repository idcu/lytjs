/**
 * @lytjs/compiler - WASM Parser Interface
 * 封装 Parser 相关的 WASM-ready 接口。
 */

import { parse } from '../parser';
import { NodeTypes } from '../constants';
import type { RootNode, TemplateChildNode } from '../types';
import type { ASTNode, Token } from './wasm-compiler';

// ============================================================
// tokenize — 模板分词
// ============================================================

/**
 * 将模板源码分词为 Token 流。
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const rest = source.slice(i);

    // 注释
    if (rest.startsWith('<!--')) {
      const end = source.indexOf('-->', i);
      const endIndex = end === -1 ? source.length : end + 3;
      tokens.push({ type: 'comment', value: source.slice(i, endIndex) });
      i = endIndex;
      continue;
    }

    // 插值
    if (rest.startsWith('{{')) {
      const closeIndex = findInterpolationEnd(source, i + 2);
      if (closeIndex !== -1) {
        tokens.push({ type: 'interpolation', value: source.slice(i, closeIndex + 2) });
        i = closeIndex + 2;
        continue;
      }
    }

    // 标签
    if (rest.startsWith('<')) {
      // 闭合标签
      if (rest[1] === '/') {
        const match = rest.match(/^<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/);
        if (match) {
          tokens.push({ type: 'tag-close', value: match[0] });
          i += match[0].length;
          continue;
        }
      }

      // 开始标签
      const tagMatch = rest.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/);
      if (tagMatch) {
        tokens.push({ type: 'tag-open', value: `<${tagMatch[1]}` });
        i += tagMatch[0].length;

        // 解析属性
        while (i < source.length && !source.slice(i).startsWith('>') && !source.slice(i).startsWith('/>')) {
          const attrMatch = source.slice(i).match(/^\s+([^\t\r\n\f />=][^\t\r\n\f />=]*)/);
          if (attrMatch) {
            tokens.push({ type: 'attr-name', value: attrMatch[1]! });
            i += attrMatch[0].length;

            if (source[i] === '=') {
              i++; // skip =
              const valueMatch = source.slice(i).match(/^("[^"]*"|'[^']*'|[^\s>]+)/);
              if (valueMatch) {
                tokens.push({ type: 'attr-value', value: valueMatch[1]! });
                i += valueMatch[0].length;
              }
            }
          } else {
            i++; // skip whitespace or unexpected char
          }
        }

        // 跳过 > 或 />
        if (source.slice(i).startsWith('/>')) {
          i += 2;
        } else if (source[i] === '>') {
          i++;
        }
        continue;
      }
    }

    // 文本
    const nextTag = source.indexOf('<', i);
    const nextInterp = source.indexOf('{{', i);
    let textEnd = source.length;
    if (nextTag !== -1 && nextTag < textEnd) textEnd = nextTag;
    if (nextInterp !== -1 && nextInterp < textEnd) textEnd = nextInterp;
    if (textEnd > i) {
      tokens.push({ type: 'text', value: source.slice(i, textEnd) });
      i = textEnd;
    } else {
      i++;
    }
  }

  return tokens;
}

function findInterpolationEnd(source: string, start: number): number {
  let inString: string | null = null;
  let backslashCount = 0;

  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (inString) {
      if (char === '\\') {
        backslashCount++;
      } else if (char === inString && backslashCount % 2 === 0) {
        inString = null;
        backslashCount = 0;
      } else {
        backslashCount = 0;
      }
    } else {
      backslashCount = 0;
      if (char === '"' || char === "'") {
        inString = char;
      } else if (char === '}' && source[i + 1] === '}') {
        return i;
      }
    }
  }

  return -1;
}

// ============================================================
// buildAST — 从源码构建 AST
// ============================================================

/**
 * 将模板源码解析为序列化 AST。
 */
export function buildAST(source: string): ASTNode[] {
  const root = parse(source);
  return serializeASTSimple(root);
}

function serializeASTSimple(root: RootNode): ASTNode[] {
  return root.children.map(serializeSimpleNode);
}

function serializeSimpleNode(node: TemplateChildNode): ASTNode {
  switch (node.type) {
    case NodeTypes.ELEMENT: {
      const el = node as any;
      return {
        type: 'Element',
        tag: el.tag,
        children: el.children.map(serializeSimpleNode),
        props: el.props.map((p: any) => ({
          name: p.type === NodeTypes.DIRECTIVE ? `v-${p.name}` : p.name,
          value: p.value?.content ?? p.exp?.content,
        })),
        isStatic: el.isStatic,
        patchFlag: el.patchFlag,
      };
    }
    case NodeTypes.TEXT:
      return { type: 'Text', content: (node as any).content, isStatic: (node as any).isStatic };
    case NodeTypes.INTERPOLATION:
      return { type: 'Interpolation', content: (node as any).content?.content ?? '' };
    case NodeTypes.COMMENT:
      return { type: 'Comment', content: (node as any).content };
    default:
      return { type: `Unknown(${node.type})` };
  }
}

// ============================================================
// parseInterpolation — 解析插值表达式
// ============================================================

/**
 * 解析 {{ expression }} 中的表达式内容。
 */
export function parseInterpolation(source: string): string | null {
  const trimmed = source.trim();
  if (!trimmed.startsWith('{{') || !trimmed.endsWith('}}')) {
    return null;
  }

  const content = trimmed.slice(2, -2).trim();
  if (!content) {
    return null;
  }

  return content;
}
