/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect } from 'vitest';
import { getSequence } from '../src/index';

describe('@lytjs/common-algorithm', () => {
  describe('getSequence (LIS - Longest Increasing Subsequence)', () => {
    it('should return empty array for empty input', () => {
      expect(getSequence([])).toEqual([]);
    });

    it('should return single element for single item', () => {
      expect(getSequence([5])).toEqual([0]);
    });

    it('should find LIS for strictly increasing sequence', () => {
      expect(getSequence([1, 2, 3, 4, 5])).toEqual([0, 1, 2, 3, 4]);
    });

    it('should find LIS for strictly decreasing sequence', () => {
      const result = getSequence([5, 4, 3, 2, 1]);
      expect(result).toHaveLength(1);
    });

    it('should find LIS for mixed sequence', () => {
      // [10, 9, 2, 5, 3, 7, 101, 18]
      // LIS length = 4
      const result = getSequence([10, 9, 2, 5, 3, 7, 101, 18]);
      expect(result).toHaveLength(4);
      // Verify it's a valid LIS (values are strictly increasing)
      const values = result.map((i) => [10, 9, 2, 5, 3, 7, 101, 18][i]);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });

    it('should find LIS for sequence with duplicates', () => {
      // [1, 3, 2, 2, 4]
      // LIS length = 3
      const result = getSequence([1, 3, 2, 2, 4]);
      expect(result).toHaveLength(3);
      // Verify it's a valid LIS (values are strictly increasing)
      const values = result.map((i) => [1, 3, 2, 2, 4][i]);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });

    it('should find LIS for all equal elements', () => {
      const result = getSequence([5, 5, 5, 5]);
      expect(result).toHaveLength(1);
    });

    it('should handle large input efficiently', () => {
      const input = Array.from({ length: 1000 }, (_, i) => 1000 - i);
      const result = getSequence(input);
      expect(result).toHaveLength(1);
    });
  });
});
