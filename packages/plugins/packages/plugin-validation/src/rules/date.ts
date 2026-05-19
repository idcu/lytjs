/**
 * 日期验证规则
 */
import type { Validator } from '../types';

export const validateDate: Validator = (value: unknown): boolean => {
  if (value == null || value === '') return true;
  const date = new Date(value as string | number);
  return !isNaN(date.getTime());
};
