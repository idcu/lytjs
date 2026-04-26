/**
 * Lyt.js TypeScript 类型声明生成器
 *
 * 为 .lyt 文件生成 TypeScript 类型声明，提供模板类型安全。
 */

import { parseSFC, type SFCDescriptor } from './sfc/parse-sfc';

// ============================================================
// 类型定义
// ============================================================

export interface TypeGenerateOptions {
  /** 文件名 */
  filename?: string;
  /** 是否生成 d.ts 文件 */
  generateDts?: boolean;
}

// ============================================================
// 内部工具
// ============================================================

/**
 * 从 script 内容中提取 props 定义
 */
function extractPropsFromScript(scriptContent: string): string | null {
  // 简单的正则提取，实际项目中可以使用 TS 编译器 API
  const propsMatch = scriptContent.match(/props:\s*(\{[^}]+\}|\[[^\]]+\])/);
  return propsMatch ? propsMatch[1] : null;
}

/**
 * 从 script 内容中提取 emits 定义
 */
function extractEmitsFromScript(scriptContent: string): string | null {
  const emitsMatch = scriptContent.match(/emits:\s*(\{[^}]+\}|\[[^\]]+\])/);
  return emitsMatch ? emitsMatch[1] : null;
}

// ============================================================
// 类型生成
// ============================================================

/**
 * 为 SFC 生成 TypeScript 类型声明
 *
 * @param sfc - SFC 描述符
 * @param options - 生成选项
 * @returns 类型声明字符串
 */
export function generateTypeDeclarations(
  sfc: SFCDescriptor,
  options: TypeGenerateOptions = {},
): string {
  const { filename = 'Component' } = options;
  const componentName = filename.replace(/\.lyt$/, '');

  const lines: string[] = [];

  lines.push('/**');
  lines.push(` * ${componentName} 组件类型声明`);
  lines.push(' * 由 @lytjs/compiler 自动生成');
  lines.push(' */');
  lines.push('');

  // 生成组件 Props 接口
  lines.push('export interface ComponentProps {');

  // 尝试从 script 中提取 props 定义
  if (sfc.script) {
    const propsDef = extractPropsFromScript(sfc.script.content);
    if (propsDef) {
      lines.push(`  // Props 定义: ${propsDef}`);
    }
  }

  // 默认的通用 props
  lines.push('  [key: string]: any;');
  lines.push('}');
  lines.push('');

  // 生成组件 Emits 接口
  lines.push('export interface ComponentEmits {');
  if (sfc.script) {
    const emitsDef = extractEmitsFromScript(sfc.script.content);
    if (emitsDef) {
      lines.push(`  // Emits 定义: ${emitsDef}`);
    }
  }
  lines.push('  [key: string]: (...args: any[]) => any;');
  lines.push('}');
  lines.push('');

  // 生成组件类型
  lines.push('/**');
  lines.push(' * 组件类型定义');
  lines.push(' */');
  lines.push('declare const component: import(\'@lytjs/component\').ComponentDefine;');
  lines.push('');
  lines.push('export default component;');

  return lines.join('\n');
}

/**
 * 为 .lyt 文件内容生成 d.ts 类型声明
 *
 * @param content - .lyt 文件内容
 * @param filename - 文件名
 * @returns d.ts 内容
 */
export function generateDtsForLytFile(
  content: string,
  filename: string = 'Component.lyt',
): string {
  const sfc = parseSFC(content, filename);
  return generateTypeDeclarations(sfc, { filename, generateDts: true });
}

/**
 * 创建 TypeScript 类型声明插件配置
 * 用于在构建时为 .lyt 文件生成类型
 */
export function createTypePlugin() {
  return {
    name: 'lytjs-types',
    transform(code: string, id: string) {
      if (id.endsWith('.lyt')) {
        const dts = generateDtsForLytFile(code, id);
        return {
          code,
          map: null,
          dts,
        };
      }
      return null;
    },
  };
}
