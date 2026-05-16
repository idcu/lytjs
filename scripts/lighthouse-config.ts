/**
 * LytJS Lighthouse 性能测试配置
 * 
 * 用于验证 Lighthouse 性能分数 >= 90
 */

interface LighthouseConfig {
  extends: 'lighthouse:default';
  passes: {
    passName: string;
    useThrottling: boolean;
    networkQuietThresholdMs: number;
  }[];
  settings: {
    onlyCategories: string[];
    throttlingMethod: 'simulate' | 'provided';
    throttling: {
      rttMs: number;
      throughputKbps: number;
      cpuSlowdownMultiplier: number;
      requestLatencyMs: number;
      downloadThroughputKbps: number;
      uploadThroughputKbps: number;
    };
    extraHeaders?: Record<string, string>;
  };
  categories: {
    performance: {
      title: string;
      description: string;
      auditRefs: {
        id: string;
        weight: number;
        group?: string;
      }[];
    };
  };
}

const lighthouseConfig: LighthouseConfig = {
  extends: 'lighthouse:default',
  passes: [
    {
      passName: 'defaultPass',
      useThrottling: true,
      networkQuietThresholdMs: 5000,
    },
  ],
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    throttlingMethod: 'simulate',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
  },
  categories: {
    performance: {
      title: 'Performance',
      description: 'Performance metrics for LytJS applications',
      auditRefs: [
        { id: 'first-contentful-paint', weight: 10, group: 'metrics' },
        { id: 'largest-contentful-paint', weight: 25, group: 'metrics' },
        { id: 'total-blocking-time', weight: 30, group: 'metrics' },
        { id: 'cumulative-layout-shift', weight: 25, group: 'metrics' },
        { id: 'speed-index', weight: 10, group: 'metrics' },
      ],
    },
  },
};

export default lighthouseConfig;

export const PERFORMANCE_THRESHOLDS = {
  performance: 0.9,
  accessibility: 0.9,
  'best-practices': 0.9,
  seo: 0.9,
  'first-contentful-paint': 1800,
  'largest-contentful-paint': 2500,
  'total-blocking-time': 200,
  'cumulative-layout-shift': 0.1,
  'speed-index': 3400,
};

export const DESKTOP_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    throttlingMethod: 'provided',
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },
  },
};

export const MOBILE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    throttlingMethod: 'simulate',
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      disabled: false,
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
  },
};
