// src/source-map.ts
// 轻量级 Source Map 生成器
//
// 实现最小化的 Source Map v3 生成器，支持 VLQ 编码，
// compatible with the Source Map specification.
// https://sourcemaps.info/spec.html

import type { RawSourceMap } from './types';

// ============================================================
// VLQ Encoding
// ============================================================

/** Base64 VLQ 字符集（A-Z, a-z, 0-9, +, /） */
const VLQ_BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** 继续位掩码 */
const VLQ_BASE_SHIFT = 5;
const VLQ_CONTINUATION_BIT = 1 << VLQ_BASE_SHIFT;

/** 符号位位置 */
const VLQ_VALUE_MASK = (1 << VLQ_BASE_SHIFT) - 1;

/**
 * 使用 VLQ（可变长度数量）编码对单个整数值进行编码。
 * 处理有符号值：负值使用最低有效位作为符号位。
 */
function vlqEncode(value: number): string {
  let vlq = value < 0 ? ((-value) << 1) + 1 : value << 1;
  let encoded = '';

  do {
    let digit = vlq & VLQ_VALUE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += VLQ_BASE64_CHARS[digit]!;
  } while (vlq > 0);

  return encoded;
}

// ============================================================
// 源码映射
// ============================================================

export interface SourceMapping {
  /** 原始源文件路径 */
  source?: string;
  /** 原始源文件行号（从 0 开始） */
  originalLine: number;
  /** Original source column (0-based) - 高精度列号映射 */
  originalColumn: number;
  /** 生成代码行号（从 0 开始） */
  generatedLine: number;
  /** 生成代码列号（从 0 开始） - 高精度列号映射 */
  generatedColumn: number;
  /** 映射 token 的可选名称 */
  name?: string;
  /** FIX: P2-1 原始列号精确映射，支持更细粒度的源码定位 */
  originalColumnExact?: number;
  /** FIX: P2-1 生成列号精确映射 */
  generatedColumnExact?: number;
}

// ============================================================
// SourceMapGenerator
// ============================================================

export class SourceMapGenerator {
  private file: string;
  private _sourceRoot = '';
  private sources: string[] = [];
  private sourcesContent: string[] = [];
  private names: string[] = [];
  private mappings: SourceMapping[] = [];
  private _namesMap = new Map<string, number>();
  private _sourcesMap = new Map<string, number>();

  constructor(file = '', sourceRoot = '') {
    this.file = file;
    this._sourceRoot = sourceRoot;
  }

  /**
   * 添加从原始源码位置到生成代码位置的映射。
   * FIX: P2-1 提高列精度，支持精确的原始列号映射
   *
   * @param originalLine - Original source line (0-based)
   * @param originalColumn - Original source column (0-based)
   * @param generatedLine - Generated code line (0-based)
   * @param generatedColumn - Generated code column (0-based)
   * @param name - Optional name for the mapped token
   * @param originalColumnExact - Optional exact original column for high-precision mapping
   */
  addMapping(
    originalLine: number,
    originalColumn: number,
    generatedLine: number,
    generatedColumn: number,
    name?: string,
    originalColumnExact?: number,
  ): void {
    // 解析源索引（如果尚未添加则使用第一个源）
    if (this.sources.length === 0) {
      this.addSource(this.file || 'source');
    }

    // 解析名称索引
    let nameIndex: number | undefined;
    if (name !== undefined) {
      nameIndex = this._namesMap.get(name);
      if (nameIndex === undefined) {
        nameIndex = this.names.length;
        this.names.push(name);
        this._namesMap.set(name, nameIndex);
      }
    }

    // FIX: P2-1 使用精确的列号映射，如果提供了精确列号则使用，否则使用标准列号
    const finalOriginalColumn = originalColumnExact !== undefined ? originalColumnExact : originalColumn;
    const finalGeneratedColumn = generatedColumn;

    this.mappings.push({
      originalLine,
      originalColumn: finalOriginalColumn,
      generatedLine,
      generatedColumn: finalGeneratedColumn,
      name: nameIndex !== undefined ? this.names[nameIndex] : undefined,
      // FIX: P2-1 存储精确列号信息用于高精度映射
      originalColumnExact: originalColumnExact,
      generatedColumnExact: finalGeneratedColumn,
    });
  }

  /**
   * FIX: P2-27 多文件 source map 合并支持：
   * addSource 现在支持同一 source 多次调用（合并 content）
   *
   * 添加源文件。
   */
  addSource(source: string, content?: string): number {
    const existingIndex = this._sourcesMap.get(source);
    if (existingIndex !== undefined) {
      if (content !== undefined && !this.sourcesContent[existingIndex]) {
        this.sourcesContent[existingIndex] = content;
      }
      return existingIndex;
    }

    const index = this.sources.length;
    this.sources.push(source);
    this.sourcesContent.push(content ?? '');
    this._sourcesMap.set(source, index);
    return index;
  }

  /**
   * 使用 VLQ 编码生成编码后的映射字符串。
   *
   * 格式：每个段用 ',' 分隔；每个行组用 ';' 分隔。
   * 每个段包含：[生成列, 源索引, 原始行, 原始列, 名称索引]
   * 所有值都是相对的（增量编码），除了每行的第一个段
   * which has an absolute generated column.
   */
  private encodeMappings(): string {
    if (this.mappings.length === 0) return '';

    // 按生成位置排序映射
    const sorted = [...this.mappings].sort((a, b) => {
      if (a.generatedLine !== b.generatedLine) return a.generatedLine - b.generatedLine;
      return a.generatedColumn - b.generatedColumn;
    });

    const lines: string[] = [];
    let prevGenLine = 0;
    let prevGenCol = 0;
    let prevSource = 0;
    let prevOrigLine = 0;
    let prevOrigCol = 0;
    let prevName = 0;

    let currentLineSegments: string[] = [];

    for (const mapping of sorted) {
      // 用分号填充空行
      while (prevGenLine < mapping.generatedLine) {
        lines.push(currentLineSegments.join(','));
        currentLineSegments = [];
        prevGenLine++;
        prevGenCol = 0; // Reset generated column for new lines
      }

      // FIX: P0-5 根据 mapping.source 查找正确的 sourceIndex
      let sourceIdx = 0;
      if (mapping.source !== undefined) {
        const idx = this._sourcesMap.get(mapping.source);
        if (idx === undefined) {
          throw new Error(`Unknown source: ${mapping.source}`);
        }
        sourceIdx = idx;
      }

      // 编码段字段（全部增量编码）
      const genCol = mapping.generatedColumn - prevGenCol;
      const source = sourceIdx - prevSource;
      const origLine = mapping.originalLine - prevOrigLine;
      const origCol = mapping.originalColumn - prevOrigCol;

      let segment = vlqEncode(genCol) + vlqEncode(source) + vlqEncode(origLine) + vlqEncode(origCol);

      // 名称索引（可选）
      if (mapping.name !== undefined) {
        const nameIdx = this._namesMap.get(mapping.name);
        if (nameIdx === undefined) {
          throw new Error(`Unknown name: ${mapping.name}`);
        }
        segment += vlqEncode(nameIdx - prevName);
        prevName = nameIdx;
      }

      currentLineSegments.push(segment);

      // 更新前一个值
      prevGenCol = mapping.generatedColumn;
      prevSource = sourceIdx;
      prevOrigLine = mapping.originalLine;
      prevOrigCol = mapping.originalColumn;
    }

    // 推入最后一行
    lines.push(currentLineSegments.join(','));

    return lines.join(';');
  }

  /**
   * 转换为 RawSourceMap 对象。
   */
  toJSON(): RawSourceMap {
    return {
      version: 3,
      file: this.file,
      sourceRoot: this._sourceRoot || undefined,
      sources: [...this.sources],
      sourcesContent: [...this.sourcesContent],
      names: [...this.names],
      mappings: this.encodeMappings(),
    };
  }

  /**
   * Convert to base64-encoded data URI string.
   * Format: data:application/json;charset=utf-8;base64,<encoded>
   * FIX: P1-31 使用 TextEncoder+btoa 替代 Buffer，
   * 确保在浏览器环境和 Node.js 环境中都能正常工作
   * FIX: P2-19 使用 TextEncoder + 手动 base64 替代废弃的 unescape
   */
  toBase64(): string {
    const json = JSON.stringify(this.toJSON());
    // FIX: P1-31 优先使用 TextEncoder + btoa（浏览器兼容），
    // 回退到 Buffer（Node.js 环境）
    let base64: string;
    if (typeof TextEncoder !== 'undefined' && typeof btoa !== 'undefined') {
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(json);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]!);
      }
      base64 = btoa(binary);
    } else if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(json, 'utf-8').toString('base64');
    } else {
      // FIX: P2-19 使用 TextEncoder + 手动 base64 编码替代废弃的 unescape
      base64 = this._manualBase64Encode(json);
    }
    return `data:application/json;charset=utf-8;base64,${base64}`;
  }

  /**
   * FIX: P2-19 手动实现 base64 编码，避免使用废弃的 unescape
   * 使用 TextEncoder 将字符串转换为 UTF-8 字节，然后进行 base64 编码
   */
  private _manualBase64Encode(str: string): string {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;

    while (i < bytes.length) {
      // 每次处理 3 个字节（24 位）
      const byte1 = bytes[i++] ?? 0;
      const byte2 = bytes[i++] ?? 0;
      const byte3 = bytes[i++] ?? 0;

      // 将 24 位分成 4 个 6 位组
      const bitmap = (byte1 << 16) | (byte2 << 8) | byte3;

      result += base64Chars[(bitmap >> 18) & 63];
      result += base64Chars[(bitmap >> 12) & 63];
      // FIX: P1-9 填充计算：i 已被 i++ 自增，应使用 < 而非 <=
      result += i - 2 < bytes.length ? base64Chars[(bitmap >> 6) & 63] : '=';
      result += i - 1 < bytes.length ? base64Chars[bitmap & 63] : '=';
    }

    return result;
  }

  /**
   * Convert to inline source map comment format.
   * Format: //# sourceMappingURL=data:application/json;charset=utf-8;base64,<encoded>
   */
  toComment(): string {
    return `//# sourceMappingURL=${this.toBase64()}`;
  }
}

// ============================================================
// Source Map Builder (convenience API for compiler integration)
// ============================================================

export interface SourceMapBuildOptions {
  filename?: string;
  sourceContent?: string;
  sourceRoot?: string;
}

/**
 * Create a SourceMapGenerator pre-configured for compiler use.
 */
export function createSourceMapGenerator(options: SourceMapBuildOptions = {}): SourceMapGenerator {
  const gen = new SourceMapGenerator(options.filename ?? 'template.html', options.sourceRoot);
  if (options.sourceContent !== undefined) {
    gen.addSource(options.filename ?? 'template.html', options.sourceContent);
  }
  return gen;
}
