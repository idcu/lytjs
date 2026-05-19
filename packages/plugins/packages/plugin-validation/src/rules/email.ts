/**
 * 邮箱验证规则
 */
import type { Validator } from '../types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmail: Validator = (value: unknown): boolean => {
  if (value == null || value === '') return true;
  return EMAIL_REGEX.test(String(value));
};
