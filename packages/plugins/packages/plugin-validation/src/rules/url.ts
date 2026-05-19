/**
 * URL验证规则
 */
import type { Validator } from '../types';

const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;

export const validateUrl: Validator = (value: unknown): boolean => {
  if (value == null || value === '') return true;
  return URL_REGEX.test(String(value));
};
