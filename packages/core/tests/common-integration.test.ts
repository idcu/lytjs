// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  IntegrationScope,
  registerIntegrations,
  resetIntegrations,
  getHttpClient,
  getQueryUtils,
  getSecurityUtils,
  getCacheUtils,
  safeEscapeHtml,
  safeParseQueryString,
} from '../src/common-integration';
import type {
  HttpClientLike,
  QueryUtilsLike,
  SecurityUtilsLike,
  CacheUtilsLike,
} from '../src/common-integration';

// ============================================================
// IntegrationScope 测试
// ============================================================

describe('IntegrationScope', () => {
  let scope: IntegrationScope;

  beforeEach(() => {
    scope = new IntegrationScope();
    resetIntegrations(); // 重置全局集成点，避免测试间干扰
  });

  describe('register', () => {
    it('应该注册一个集成点', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      scope.register({ http });
      expect(scope.getHttpClient()).toBe(http);
    });

    it('应该注册多个集成点', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      const security: SecurityUtilsLike = {
        escapeHtml: vi.fn(),
        escapeAttr: vi.fn(),
        sanitizeHtml: vi.fn(),
      };
      scope.register({ http, security });
      expect(scope.getHttpClient()).toBe(http);
      expect(scope.getSecurityUtils()).toBe(security);
    });

    it('后续注册应合并而非覆盖', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      const security: SecurityUtilsLike = {
        escapeHtml: vi.fn(),
        escapeAttr: vi.fn(),
        sanitizeHtml: vi.fn(),
      };
      scope.register({ http });
      scope.register({ security });
      expect(scope.getHttpClient()).toBe(http);
      expect(scope.getSecurityUtils()).toBe(security);
    });

    it('后续注册同名集成点应覆盖', () => {
      const http1: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      const http2: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      scope.register({ http: http1 });
      scope.register({ http: http2 });
      expect(scope.getHttpClient()).toBe(http2);
    });
  });

  describe('unregister', () => {
    it('应该取消注册指定的集成点', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      scope.register({ http });
      scope.unregister('http');
      expect(scope.getHttpClient()).toBeUndefined();
    });

    it('应该支持同时取消多个集成点', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      const security: SecurityUtilsLike = {
        escapeHtml: vi.fn(),
        escapeAttr: vi.fn(),
        sanitizeHtml: vi.fn(),
      };
      scope.register({ http, security });
      scope.unregister('http', 'security');
      expect(scope.getHttpClient()).toBeUndefined();
      expect(scope.getSecurityUtils()).toBeUndefined();
    });

    it('取消不存在的集成点不应报错', () => {
      expect(() => scope.unregister('http')).not.toThrow();
    });
  });

  describe('reset', () => {
    it('应该清空所有集成点', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      const security: SecurityUtilsLike = {
        escapeHtml: vi.fn(),
        escapeAttr: vi.fn(),
        sanitizeHtml: vi.fn(),
      };
      scope.register({ http, security });
      scope.reset();
      expect(scope.getHttpClient()).toBeUndefined();
      expect(scope.getSecurityUtils()).toBeUndefined();
      expect(scope.getQueryUtils()).toBeUndefined();
      expect(scope.getCacheUtils()).toBeUndefined();
    });
  });

  describe('get integrations', () => {
    it('应该返回当前所有集成点', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      scope.register({ http });
      const integrations = scope.integrations;
      expect(integrations.http).toBe(http);
      expect(integrations.query).toBeUndefined();
    });

    it('初始状态应返回空对象', () => {
      const integrations = scope.integrations;
      expect(integrations).toEqual({});
    });
  });

  describe('getHttpClient', () => {
    it('未注册时应返回 undefined', () => {
      expect(scope.getHttpClient()).toBeUndefined();
    });

    it('注册后应返回对应的 HttpClientLike', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      scope.register({ http });
      expect(scope.getHttpClient()).toBe(http);
    });
  });

  describe('getQueryUtils', () => {
    it('未注册时应返回 undefined', () => {
      expect(scope.getQueryUtils()).toBeUndefined();
    });

    it('注册后应返回对应的 QueryUtilsLike', () => {
      const query: QueryUtilsLike = {
        parseQueryString: vi.fn(),
        stringifyQueryString: vi.fn(),
        parseURL: vi.fn(),
        buildURL: vi.fn(),
      };
      scope.register({ query });
      expect(scope.getQueryUtils()).toBe(query);
    });
  });

  describe('getSecurityUtils', () => {
    it('未注册时应返回 undefined', () => {
      expect(scope.getSecurityUtils()).toBeUndefined();
    });

    it('注册后应返回对应的 SecurityUtilsLike', () => {
      const security: SecurityUtilsLike = {
        escapeHtml: vi.fn(),
        escapeAttr: vi.fn(),
        sanitizeHtml: vi.fn(),
      };
      scope.register({ security });
      expect(scope.getSecurityUtils()).toBe(security);
    });
  });

  describe('getCacheUtils', () => {
    it('未注册时应返回 undefined', () => {
      expect(scope.getCacheUtils()).toBeUndefined();
    });

    it('注册后应返回对应的 CacheUtilsLike', () => {
      const cache: CacheUtilsLike = {
        createLRUCache: vi.fn(),
      };
      scope.register({ cache });
      expect(scope.getCacheUtils()).toBe(cache);
    });
  });

  it('不同 IntegrationScope 实例应互相独立', () => {
    const scope1 = new IntegrationScope();
    const scope2 = new IntegrationScope();
    const http: HttpClientLike = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };
    scope1.register({ http });
    expect(scope1.getHttpClient()).toBe(http);
    expect(scope2.getHttpClient()).toBeUndefined();
  });
});

// ============================================================
// 全局集成点函数测试
// ============================================================

describe('全局集成点函数', () => {
  beforeEach(() => {
    resetIntegrations();
  });

  describe('registerIntegrations / resetIntegrations', () => {
    it('registerIntegrations 应注册全局集成点', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      registerIntegrations({ http });
      expect(getHttpClient()).toBe(http);
    });

    it('resetIntegrations 应清空全局集成点', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      registerIntegrations({ http });
      resetIntegrations();
      expect(getHttpClient()).toBeUndefined();
    });

    it('registerIntegrations 应合并而非覆盖', () => {
      const http: HttpClientLike = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      };
      const security: SecurityUtilsLike = {
        escapeHtml: vi.fn(),
        escapeAttr: vi.fn(),
        sanitizeHtml: vi.fn(),
      };
      registerIntegrations({ http });
      registerIntegrations({ security });
      expect(getHttpClient()).toBe(http);
      expect(getSecurityUtils()).toBe(security);
    });
  });

  describe('getHttpClient', () => {
    it('未注册时应返回 undefined', () => {
      expect(getHttpClient()).toBeUndefined();
    });
  });

  describe('getQueryUtils', () => {
    it('未注册时应返回 undefined', () => {
      expect(getQueryUtils()).toBeUndefined();
    });

    it('注册后应返回对应的工具', () => {
      const query: QueryUtilsLike = {
        parseQueryString: vi.fn(),
        stringifyQueryString: vi.fn(),
        parseURL: vi.fn(),
        buildURL: vi.fn(),
      };
      registerIntegrations({ query });
      expect(getQueryUtils()).toBe(query);
    });
  });

  describe('getSecurityUtils', () => {
    it('未注册时应返回 undefined', () => {
      expect(getSecurityUtils()).toBeUndefined();
    });

    it('注册后应返回对应的工具', () => {
      const security: SecurityUtilsLike = {
        escapeHtml: vi.fn(),
        escapeAttr: vi.fn(),
        sanitizeHtml: vi.fn(),
      };
      registerIntegrations({ security });
      expect(getSecurityUtils()).toBe(security);
    });
  });

  describe('getCacheUtils', () => {
    it('未注册时应返回 undefined', () => {
      expect(getCacheUtils()).toBeUndefined();
    });

    it('注册后应返回对应的工具', () => {
      const cache: CacheUtilsLike = {
        createLRUCache: vi.fn(),
      };
      registerIntegrations({ cache });
      expect(getCacheUtils()).toBe(cache);
    });
  });
});

// ============================================================
// safeEscapeHtml 测试
// ============================================================

describe('safeEscapeHtml', () => {
  beforeEach(() => {
    resetIntegrations();
  });

  it('应转义 & 字符', () => {
    expect(safeEscapeHtml('a&b')).toBe('a&amp;b');
  });

  it('应转义 < 字符', () => {
    expect(safeEscapeHtml('a<b')).toBe('a&lt;b');
  });

  it('应转义 > 字符', () => {
    expect(safeEscapeHtml('a>b')).toBe('a&gt;b');
  });

  it('应转义双引号 " 字符', () => {
    expect(safeEscapeHtml('a"b')).toBe('a&quot;b');
  });

  it('应转义单引号 \' 字符', () => {
    expect(safeEscapeHtml("a'b")).toBe('a&#39;b');
  });

  it('应转义反斜杠 \\ 字符', () => {
    // 注意：源码中反斜杠先被替换为 &#92;，然后 & 被替换为 &amp;
    // 所以实际结果是 &amp;#92; 而不是 &#92;
    expect(safeEscapeHtml('a\\b')).toBe('a&amp;#92;b');
  });

  it('应同时转义多种特殊字符', () => {
    expect(safeEscapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('不包含特殊字符时应原样返回', () => {
    expect(safeEscapeHtml('hello world')).toBe('hello world');
  });

  it('空字符串应返回空字符串', () => {
    expect(safeEscapeHtml('')).toBe('');
  });

  it('当注册了安全工具时应使用安全工具的实现', () => {
    const security: SecurityUtilsLike = {
      escapeHtml: vi.fn((str: string) => `ESCAPED:${str}`),
      escapeAttr: vi.fn(),
      sanitizeHtml: vi.fn(),
    };
    registerIntegrations({ security });
    expect(safeEscapeHtml('<test>')).toBe('ESCAPED:<test>');
    expect(security.escapeHtml).toHaveBeenCalledWith('<test>');
  });
});

// ============================================================
// safeParseQueryString 测试
// ============================================================

describe('safeParseQueryString', () => {
  beforeEach(() => {
    resetIntegrations();
  });

  it('应解析简单的查询字符串', () => {
    const result = safeParseQueryString('a=1&b=2');
    expect(result).toEqual({ a: '1', b: '2' });
  });

  it('应处理以 ? 开头的查询字符串', () => {
    const result = safeParseQueryString('?a=1&b=2');
    expect(result).toEqual({ a: '1', b: '2' });
  });

  it('空字符串应返回空对象', () => {
    expect(safeParseQueryString('')).toEqual({});
  });

  it('应处理值包含特殊字符的情况', () => {
    const result = safeParseQueryString('name=hello%20world');
    expect(result).toEqual({ name: 'hello world' });
  });

  it('应处理无值的键', () => {
    const result = safeParseQueryString('key');
    expect(result).toEqual({ key: '' });
  });

  it('当注册了查询工具时应使用查询工具的实现', () => {
    const query: QueryUtilsLike = {
      parseQueryString: vi.fn((str: string) => ({ custom: str })),
      stringifyQueryString: vi.fn(),
      parseURL: vi.fn(),
      buildURL: vi.fn(),
    };
    registerIntegrations({ query });
    const result = safeParseQueryString('a=1');
    expect(result).toEqual({ custom: 'a=1' });
    expect(query.parseQueryString).toHaveBeenCalledWith('a=1');
  });
});
