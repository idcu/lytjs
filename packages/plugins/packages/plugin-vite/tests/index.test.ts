/**
 * @lytjs/plugin-vite unit tests
 */

import { describe, it, expect } from 'vitest';
import lytjs from '../src/index';

describe('@lytjs/plugin-vite', () => {
  describe('plugin creation', () => {
    it('should create a Vite plugin with default options', () => {
      const plugin = lytjs();
      expect(plugin).toBeDefined();
      expect(plugin.name).toBe('@lytjs/plugin-vite');
    });

    it('should accept custom options', () => {
      const plugin = lytjs({
        include: [/\.custom$/],
        ssr: true,
      });
      expect(plugin).toBeDefined();
    });
  });
});
