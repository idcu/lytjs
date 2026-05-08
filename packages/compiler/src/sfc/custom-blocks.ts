// src/sfc/custom-blocks.ts
// SFC 自定义块处理器注册表

// ============================================================
// 类型定义
// ============================================================

export interface CustomBlockProcessor {
  name: string;
  transform: (
    source: string,
    attrs: Record<string, string>,
  ) => { code: string; map?: object };
}

// ============================================================
// 已知自定义块类型
// ============================================================

/**
 * LytJS SFC 中常用的预定义自定义块类型。
 * 这些被工具（IDE、linter 等）识别但没有
 * built-in processors unless registered.
 */
export const KNOWN_CUSTOM_BLOCKS: readonly string[] = [
  'i18n',
  'route',
  'graphql',
  'md',
] as const;

// ============================================================
// 处理器注册表
// ============================================================

const processorMap = new Map<string, CustomBlockProcessor>();

/**
 * 注册自定义块处理器。
 *
 * @param processor - The processor to register
 * @throws Error if a processor with the same name is already registered
 */
export function registerCustomBlockProcessor(
  processor: CustomBlockProcessor,
): void {
  if (processorMap.has(processor.name)) {
    if (__DEV__) {
      console.warn(
        `[custom-blocks] Overwriting existing custom block processor for "${processor.name}".`,
      );
    }
  }
  processorMap.set(processor.name, processor);
}

/**
 * 按名称获取已注册的自定义块处理器。
 *
 * @param name - The block type name
 * @returns The processor if registered, undefined otherwise
 */
export function getCustomBlockProcessor(
  name: string,
): CustomBlockProcessor | undefined {
  return processorMap.get(name);
}

/**
 * 移除已注册的自定义块处理器。
 *
 * @param name - The block type name to unregister
 * @returns true if the processor was found and removed
 */
export function unregisterCustomBlockProcessor(name: string): boolean {
  return processorMap.delete(name);
}

/**
 * 获取所有已注册自定义块处理器的名称。
 *
 * @returns Array of registered processor names
 */
export function getRegisteredCustomBlockProcessors(): string[] {
  return Array.from(processorMap.keys());
}
