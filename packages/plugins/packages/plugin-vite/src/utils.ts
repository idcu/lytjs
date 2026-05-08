/**
 * @lytjs/plugin-vite - Utility functions
 */

import type { LytjsPluginOptions } from './options';

/**
 * Create a filter function for file matching
 */
export function createFilter(
  include: LytjsPluginOptions['include'],
  exclude: LytjsPluginOptions['exclude'],
): (id: string) => boolean {
  const includes = Array.isArray(include) ? include : include ? [include] : [];
  const excludes = Array.isArray(exclude) ? exclude : exclude ? [exclude] : [];

  return (id: string): boolean => {
    // Check excludes first
    for (const pattern of excludes) {
      if (pattern.test(id)) return false;
    }

    // Check includes
    if (includes.length === 0) return true; // Include all if no patterns specified

    for (const pattern of includes) {
      if (pattern.test(id)) return true;
    }

    return false;
  };
}

/**
 * Normalize path for consistent matching
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Generate a scope ID for scoped styles
 */
export function generateScopeId(filename: string): string {
  const hash = filename.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  return `data-v-${Math.abs(hash).toString(36).substring(0, 8)}`;
}
