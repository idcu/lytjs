/**
 * 数字验证规则
 */
import type { Validator } from '../types';

export const validateNumber: Validator = (value: unknown): boolean => {
  if (value == null || value === '') return true;
  return !isNaN(Number(value)) && isFinite(Number(value));
};
