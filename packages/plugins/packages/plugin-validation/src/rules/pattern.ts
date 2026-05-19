/**
 * 正则表达式验证规则
 */
import type { Validator } from '../types';

export const validatePattern: Validator = (value: unknown, ruleValue?: unknown): boolean => {
  if (value == null || value === '') return true;
  const regex = typeof ruleValue === 'string' ? new RegExp(ruleValue) : ruleValue as RegExp;
  if (!(regex instanceof RegExp)) return true;
  return regex.test(String(value));
};
