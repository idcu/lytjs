/**
 * Test helper: creates a DOM renderer for testing
 */
import { createRenderer, createDOMRendererOptions } from '../src/patch';

export function createTestRenderer() {
  const options = createDOMRendererOptions();
  return createRenderer(options);
}
