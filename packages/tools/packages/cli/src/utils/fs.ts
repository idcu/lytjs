/**
 * @lytjs/cli - File system utilities
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Ensure directory exists (create if not)
 */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Write a file with content, creating parent directories if needed
 */
export function writeFile(filePath: string, content: string): void {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, 'utf-8');
}

/**
 * Read a file as string
 */
export function readFile(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

/**
 * Check if path exists
 */
export function exists(path: string): boolean {
  return existsSync(path);
}

/**
 * Copy directory recursively
 */
export function copyDir(src: string, dest: string): void {
  ensureDir(dest);
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      writeFile(destPath, readFileSync(srcPath, 'utf-8'));
    }
  }
}

/**
 * Check if directory is empty
 */
export function isEmptyDir(dir: string): boolean {
  if (!existsSync(dir)) return true;
  const files = readdirSync(dir);
  return files.length === 0;
}
