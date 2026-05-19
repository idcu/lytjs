/**
 * 字符串长度验证规则
 */
import type { Validator } from '../types';

export const validateMinLength: Validator = (value: unknown, ruleValue?: unknown): boolean => {
  if (value == null || value === '') return true;
  const str = String(value);
  const min = Number(ruleValue);
  if (isNaN(min)) return true;
  return str.length >= min;
};

export const validateMaxLength: Validator = (value: unknown, ruleValue?: unknown): boolean => {
  if (value == null || value === '') return true;
  const str = String(value);
  const max = Number(ruleValue);
  if (isNaN(max)) return true;
  return str.length <= max;
};

export const validateLength: Validator = (value: unknown, ruleValue?: unknown): boolean => {
  if (value == null || value === '') return true;
  const str = String(value);
  const len = Number(ruleValue);
  if (isNaN(len)) return true;
  return str.length === len;
};
