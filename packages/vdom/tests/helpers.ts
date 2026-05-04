/**
 * Test helper: creates a DOM renderer for testing
 */
import { createRenderer } from '../src/patch';
import { WebRendererHost } from '@lytjs/adapter-web';

export function createTestRenderer() {
  const host = new WebRendererHost();
  return createRenderer(host);
}
