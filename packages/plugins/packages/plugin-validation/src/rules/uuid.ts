/**
 * UUID验证规则
 */
import type { Validator } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateUuid: Validator = (value: unknown): boolean => {
  if (value == null || value === '') return true;
  return UUID_REGEX.test(String(value));
};
