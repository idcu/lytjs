/**
 * 范围验证规则（min, max）
 */
import type { Validator } from '../types';

export const validateMin: Validator = (value: unknown, ruleValue?: unknown): boolean => {
  if (value == null || value === '') return true;
  const num = Number(value);
  const min = Number(ruleValue);
  if (isNaN(num) || isNaN(min)) return true;
  return num >= min;
};

export const validateMax: Validator = (value: unknown, ruleValue?: unknown): boolean => {
  if (value == null || value === '') return true;
  const num = Number(value);
  const max = Number(ruleValue);
  if (isNaN(num) || isNaN(max)) return true;
  return num <= max;
};
