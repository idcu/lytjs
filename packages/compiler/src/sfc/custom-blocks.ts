// src/sfc/custom-blocks.ts
// Custom block processor registry for SFC

// ============================================================
// Types
// ============================================================

export interface CustomBlockProcessor {
  name: string;
  transform: (
    source: string,
    attrs: Record<string, string>,
  ) => { code: string; map?: object };
}

// ============================================================
// Known Custom Block Types
// ============================================================

/**
 * Pre-defined custom block types that are commonly used in LytJS SFCs.
 * These are recognized by tooling (IDE, linter, etc.) but do not have
 * built-in processors unless registered.
 */
export const KNOWN_CUSTOM_BLOCKS: readonly string[] = [
  'i18n',
  'route',
  'graphql',
  'md',
] as const;

// ============================================================
// Processor Registry
// ============================================================

const processorMap = new Map<string, CustomBlockProcessor>();

/**
 * Register a custom block processor.
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
 * Get a registered custom block processor by name.
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
 * Remove a registered custom block processor.
 *
 * @param name - The block type name to unregister
 * @returns true if the processor was found and removed
 */
export function unregisterCustomBlockProcessor(name: string): boolean {
  return processorMap.delete(name);
}

/**
 * Get the names of all registered custom block processors.
 *
 * @returns Array of registered processor names
 */
export function getRegisteredCustomBlockProcessors(): string[] {
  return Array.from(processorMap.keys());
}
