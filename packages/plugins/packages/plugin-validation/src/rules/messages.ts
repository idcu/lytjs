import type { ValidationMessages } from '../types';

export const defaultMessages: ValidationMessages = {
  required: '此字段为必填项',
  email: '请输入有效的邮箱地址',
  phone: '请输入有效的手机号码',
  number: '请输入数字',
  min: (value?: unknown, label?: string) => `${label || '值'}不能小于 ${value}`,
  max: (value?: unknown, label?: string) => `${label || '值'}不能大于 ${value}`,
  minLength: (value?: unknown, label?: string) => `${label || '长度'}不能小于 ${value}`,
  maxLength: (value?: unknown, label?: string) => `${label || '长度'}不能大于 ${value}`,
  length: (value?: unknown, label?: string) => `${label || '长度'}必须等于 ${value}`,
  pattern: '格式不正确',
  url: '请输入有效的URL',
  uuid: '请输入有效的UUID',
  date: '请输入有效的日期',
  custom: '校验失败',
};
