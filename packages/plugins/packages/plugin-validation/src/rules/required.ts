/**
 * 必填验证规则
 */
import type { Validator } from '../types';

export const validateRequired: Validator = (value: unknown): boolean => {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length > 0;
  }
  return true;
};
