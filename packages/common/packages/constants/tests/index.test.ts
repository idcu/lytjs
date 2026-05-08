import { describe, it, expect } from 'vitest';
import {
  COMPILER_MAX_INPUT_LENGTH,
  COMPILER_MAX_REGEX_INPUT_LENGTH,
  COMPILER_MAX_ATTRIBUTES,
  COMPILER_END_TAG_CACHE_MAX_SIZE,
  VDOM_MAX_LIST_DIFF_SIZE,
  VDOM_MAX_RECURSION_DEPTH,
  REACTIVITY_MAX_TRIGGER_DEPTH,
  REACTIVITY_MAX_TRACK_DEPTH,
  ERROR_MAX_WARNED_MESSAGES,
  SCHEDULER_MAX_ITERATIONS,
  SCHEDULER_MAX_FLUSH_RETRIES,
  CACHE_DEFAULT_LRU_SIZE,
  CACHE_MAX_ENTRIES,
  DOM_DEBOUNCE_DELAY_MS,
  DOM_MAX_BATCH_SIZE,
  PERF_MONITOR_SAMPLE_RATE,
  PERF_MAX_ENTRIES,
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  FRAME_INTERVAL_MS,
  HTTP_DEFAULT_TIMEOUT_MS,
  HTTP_MAX_RETRIES,
  HTTP_RETRY_DELAY_MS,
  STORAGE_VERSION_KEY_PREFIX,
  STORAGE_DEFAULT_EXPIRY_MS,
  CLONE_DEFAULT_MAX_DEPTH,
  PROTO_POLLUTION_KEYS,
  STRING_DEFAULT_TRUNCATION_OMISSION,
  STRING_DEFAULT_ID_PREFIX,
  FLOAT_EPSILON,
  MAX_SAFE_INTEGER,
  MIN_SAFE_INTEGER,
} from '../src/index';

describe('@lytjs/common-constants', () => {
  describe('编译器常量', () => {
    it('COMPILER_MAX_INPUT_LENGTH 应为正整数', () => {
      expect(COMPILER_MAX_INPUT_LENGTH).toBe(10000);
      expect(Number.isInteger(COMPILER_MAX_INPUT_LENGTH)).toBe(true);
      expect(COMPILER_MAX_INPUT_LENGTH).toBeGreaterThan(0);
    });

    it('COMPILER_MAX_REGEX_INPUT_LENGTH 应小于等于 COMPILER_MAX_INPUT_LENGTH', () => {
      expect(COMPILER_MAX_REGEX_INPUT_LENGTH).toBe(5000);
      expect(COMPILER_MAX_REGEX_INPUT_LENGTH).toBeLessThanOrEqual(COMPILER_MAX_INPUT_LENGTH);
    });

    it('COMPILER_MAX_ATTRIBUTES 应为正整数', () => {
      expect(COMPILER_MAX_ATTRIBUTES).toBe(1000);
      expect(COMPILER_MAX_ATTRIBUTES).toBeGreaterThan(0);
    });

    it('COMPILER_END_TAG_CACHE_MAX_SIZE 应为正整数', () => {
      expect(COMPILER_END_TAG_CACHE_MAX_SIZE).toBe(100);
      expect(COMPILER_END_TAG_CACHE_MAX_SIZE).toBeGreaterThan(0);
    });
  });

  describe('VDOM / 渲染器常量', () => {
    it('VDOM_MAX_LIST_DIFF_SIZE 应为正整数', () => {
      expect(VDOM_MAX_LIST_DIFF_SIZE).toBe(1000);
    });

    it('VDOM_MAX_RECURSION_DEPTH 应为正整数', () => {
      expect(VDOM_MAX_RECURSION_DEPTH).toBe(100);
    });
  });

  describe('响应式系统常量', () => {
    it('REACTIVITY_MAX_TRIGGER_DEPTH 应为正整数', () => {
      expect(REACTIVITY_MAX_TRIGGER_DEPTH).toBe(100);
    });

    it('REACTIVITY_MAX_TRACK_DEPTH 应为正整数', () => {
      expect(REACTIVITY_MAX_TRACK_DEPTH).toBe(100);
    });
  });

  describe('错误处理常量', () => {
    it('ERROR_MAX_WARNED_MESSAGES 应为正整数', () => {
      expect(ERROR_MAX_WARNED_MESSAGES).toBe(1000);
    });
  });

  describe('调度器常量', () => {
    it('SCHEDULER_MAX_ITERATIONS 应为正整数', () => {
      expect(SCHEDULER_MAX_ITERATIONS).toBe(1000);
    });

    it('SCHEDULER_MAX_FLUSH_RETRIES 应为正整数', () => {
      expect(SCHEDULER_MAX_FLUSH_RETRIES).toBe(3);
    });
  });

  describe('缓存常量', () => {
    it('CACHE_DEFAULT_LRU_SIZE 应小于等于 CACHE_MAX_ENTRIES', () => {
      expect(CACHE_DEFAULT_LRU_SIZE).toBe(100);
      expect(CACHE_DEFAULT_LRU_SIZE).toBeLessThanOrEqual(CACHE_MAX_ENTRIES);
    });

    it('CACHE_MAX_ENTRIES 应为正整数', () => {
      expect(CACHE_MAX_ENTRIES).toBe(10000);
    });
  });

  describe('DOM 操作常量', () => {
    it('DOM_DEBOUNCE_DELAY_MS 应约等于一帧时间', () => {
      expect(DOM_DEBOUNCE_DELAY_MS).toBe(16);
    });

    it('DOM_MAX_BATCH_SIZE 应为正整数', () => {
      expect(DOM_MAX_BATCH_SIZE).toBe(100);
    });
  });

  describe('性能监控常量', () => {
    it('PERF_MONITOR_SAMPLE_RATE 应在 0-1 之间', () => {
      expect(PERF_MONITOR_SAMPLE_RATE).toBe(0.1);
      expect(PERF_MONITOR_SAMPLE_RATE).toBeGreaterThanOrEqual(0);
      expect(PERF_MONITOR_SAMPLE_RATE).toBeLessThanOrEqual(1);
    });

    it('PERF_MAX_ENTRIES 应为正整数', () => {
      expect(PERF_MAX_ENTRIES).toBe(1000);
    });
  });

  describe('时间常量', () => {
    it('MS_PER_SECOND 应为 1000', () => {
      expect(MS_PER_SECOND).toBe(1000);
    });

    it('MS_PER_MINUTE 应为 60000', () => {
      expect(MS_PER_MINUTE).toBe(60000);
    });

    it('MS_PER_HOUR 应为 3600000', () => {
      expect(MS_PER_HOUR).toBe(3600000);
    });

    it('MS_PER_DAY 应为 86400000', () => {
      expect(MS_PER_DAY).toBe(86400000);
    });

    it('时间常量之间应保持正确的换算关系', () => {
      expect(MS_PER_MINUTE).toBe(60 * MS_PER_SECOND);
      expect(MS_PER_HOUR).toBe(60 * MS_PER_MINUTE);
      expect(MS_PER_DAY).toBe(24 * MS_PER_HOUR);
    });

    it('FRAME_INTERVAL_MS 应约为 16.67ms', () => {
      expect(FRAME_INTERVAL_MS).toBeCloseTo(16.67, 1);
    });
  });

  describe('HTTP 常量', () => {
    it('HTTP_DEFAULT_TIMEOUT_MS 应为正数', () => {
      expect(HTTP_DEFAULT_TIMEOUT_MS).toBe(10000);
    });

    it('HTTP_MAX_RETRIES 应为正整数', () => {
      expect(HTTP_MAX_RETRIES).toBe(3);
    });

    it('HTTP_RETRY_DELAY_MS 应为正数', () => {
      expect(HTTP_RETRY_DELAY_MS).toBe(1000);
    });
  });

  describe('存储常量', () => {
    it('STORAGE_VERSION_KEY_PREFIX 应为字符串', () => {
      expect(STORAGE_VERSION_KEY_PREFIX).toBe('__lyt_storage_version__');
      expect(typeof STORAGE_VERSION_KEY_PREFIX).toBe('string');
    });

    it('STORAGE_DEFAULT_EXPIRY_MS 应为 7 天', () => {
      expect(STORAGE_DEFAULT_EXPIRY_MS).toBe(7 * MS_PER_DAY);
    });
  });

  describe('对象操作常量', () => {
    it('CLONE_DEFAULT_MAX_DEPTH 应为正整数', () => {
      expect(CLONE_DEFAULT_MAX_DEPTH).toBe(20);
    });

    it('PROTO_POLLUTION_KEYS 应被冻结', () => {
      expect(Object.isFrozen(PROTO_POLLUTION_KEYS)).toBe(true);
    });

    it('PROTO_POLLUTION_KEYS 应包含原型污染相关键', () => {
      expect(PROTO_POLLUTION_KEYS).toContain('__proto__');
      expect(PROTO_POLLUTION_KEYS).toContain('constructor');
      expect(PROTO_POLLUTION_KEYS).toContain('prototype');
    });
  });

  describe('字符串常量', () => {
    it('STRING_DEFAULT_TRUNCATION_OMISSION 应为 "..."', () => {
      expect(STRING_DEFAULT_TRUNCATION_OMISSION).toBe('...');
    });

    it('STRING_DEFAULT_ID_PREFIX 应为 "lyt"', () => {
      expect(STRING_DEFAULT_ID_PREFIX).toBe('lyt');
    });
  });

  describe('数值常量', () => {
    it('FLOAT_EPSILON 应为很小的正数', () => {
      expect(FLOAT_EPSILON).toBe(1e-10);
      expect(FLOAT_EPSILON).toBeGreaterThan(0);
      expect(FLOAT_EPSILON).toBeLessThan(1);
    });

    it('MAX_SAFE_INTEGER 应等于 Number.MAX_SAFE_INTEGER', () => {
      expect(MAX_SAFE_INTEGER).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('MIN_SAFE_INTEGER 应等于 Number.MIN_SAFE_INTEGER', () => {
      expect(MIN_SAFE_INTEGER).toBe(Number.MIN_SAFE_INTEGER);
    });
  });
});
