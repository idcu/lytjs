 
/**
 * LytJS Lighthouse 性能测试运行器
 *
 * 用于运行 Lighthouse 性能测试并验证分数
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';

interface LighthouseResult {
  categories: {
    performance: { score: number };
    accessibility: { score: number };
    'best-practices': { score: number };
    seo: { score: number };
  };
  audits: Record<string, { numericValue?: number; score?: number }>;
}

interface TestResult {
  passed: boolean;
  score: number;
  threshold: number;
  metric: string;
}

async function loadLighthouseReport(jsonPath: string): Promise<LighthouseResult> {
  const content = await readFile(jsonPath, 'utf-8');
  return JSON.parse(content);
}

function validateMetrics(result: LighthouseResult): TestResult[] {
  const tests: TestResult[] = [];

  const thresholds = {
    'first-contentful-paint': 1800,
    'largest-contentful-paint': 2500,
    'total-blocking-time': 200,
    'cumulative-layout-shift': 0.1,
    'speed-index': 3400,
  };

  for (const [metric, threshold] of Object.entries(thresholds)) {
    const audit = result.audits[metric];
    if (audit && audit.numericValue !== undefined) {
      tests.push({
        passed: audit.numericValue <= threshold,
        score: audit.numericValue,
        threshold,
        metric,
      });
    }
  }

  return tests;
}

function validateScores(result: LighthouseResult): TestResult[] {
  const tests: TestResult[] = [];

  const scoreThresholds = {
    performance: 0.9,
    accessibility: 0.9,
    'best-practices': 0.9,
    seo: 0.9,
  };

  for (const [category, threshold] of Object.entries(scoreThresholds)) {
    const cat = result.categories[category as keyof typeof result.categories];
    if (cat) {
      tests.push({
        passed: cat.score >= threshold,
        score: cat.score,
        threshold,
        metric: category,
      });
    }
  }

  return tests;
}

async function runLighthouseTest(reportPath: string): Promise<{
  passed: boolean;
  scoreTests: TestResult[];
  metricTests: TestResult[];
  summary: string;
}> {
  try {
    const result = await loadLighthouseReport(reportPath);
    const scoreTests = validateScores(result);
    const metricTests = validateMetrics(result);

    const allPassed = [...scoreTests, ...metricTests].every((t) => t.passed);
    const avgScore = scoreTests.reduce((sum, t) => sum + t.score, 0) / scoreTests.length;

    return {
      passed: allPassed,
      scoreTests,
      metricTests,
      summary: `Performance Score: ${(avgScore * 100).toFixed(0)}% | Tests Passed: ${[...scoreTests, ...metricTests].filter((t) => t.passed).length}/${scoreTests.length + metricTests.length}`,
    };
  } catch (error) {
    return {
      passed: false,
      scoreTests: [],
      metricTests: [],
      summary: `Error loading report: ${error}`,
    };
  }
}

function printTestResults(results: {
  passed: boolean;
  scoreTests: TestResult[];
  metricTests: TestResult[];
  summary: string;
}): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('         LytJS Lighthouse Performance Results');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 Category Scores:');
  for (const test of results.scoreTests) {
    const icon = test.passed ? '✅' : '❌';
    console.log(
      `   ${icon} ${test.metric}: ${(test.score * 100).toFixed(0)}% (threshold: ${(test.threshold * 100).toFixed(0)}%)`,
    );
  }

  console.log('\n⏱️  Performance Metrics:');
  for (const test of results.metricTests) {
    const icon = test.passed ? '✅' : '❌';
    console.log(
      `   ${icon} ${test.metric}: ${test.score.toFixed(2)}ms (threshold: ${test.threshold}ms)`,
    );
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   ${results.passed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log(`   ${results.summary}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

export { runLighthouseTest, printTestResults, LighthouseResult, TestResult };

if (require.main === module) {
  const reportPath = process.argv[2] || resolve(process.cwd(), 'lighthouse-report.json');

  console.log(`\n🧪 LytJS Lighthouse Performance Test`);
  console.log(`📄 Loading report from: ${reportPath}\n`);

  runLighthouseTest(reportPath).then((results) => {
    printTestResults(results);
    process.exit(results.passed ? 0 : 1);
  });
}
