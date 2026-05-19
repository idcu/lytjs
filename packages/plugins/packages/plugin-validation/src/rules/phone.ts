/**
 * 手机号验证规则
 */
import type { Validator } from '../types';

const PHONE_REGEX = /^1[3-9]\d{9}$/;

export const validatePhone: Validator = (value: unknown): boolean => {
  if (value == null || value === '') return true;
  return PHONE_REGEX.test(String(value));
};
