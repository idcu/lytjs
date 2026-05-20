#!/usr/bin/env node
/**
 * Benchmark Comparison Script
 *
 * Compares benchmark results between different runs or versions.
 * Usage: node scripts/compare.js [baseline.json] [current.json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BENCH_REPORT_PATH = path.join(__dirname, '..', 'bench-report.json');
const BASELINE_PATH = path.join(__dirname, '..', 'baseline.json');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'k';
  return num.toFixed(2);
}

function formatTime(ns) {
  if (ns >= 1e9) return (ns / 1e9).toFixed(2) + 's';
  if (ns >= 1e6) return (ns / 1e6).toFixed(2) + 'ms';
  if (ns >= 1e3) return (ns / 1e3).toFixed(2) + 'μs';
  return ns.toFixed(2) + 'ns';
}

function calculateChange(current, baseline) {
  if (!baseline || baseline === 0) return null;
  const change = ((current - baseline) / baseline) * 100;
  return change;
}

function getChangeColor(change, higherIsBetter = false) {
  if (change === null) return colors.gray;
  if (higherIsBetter) {
    return change > 0 ? colors.green : colors.red;
  }
  return change < 0 ? colors.green : colors.red;
}

function getChangeSymbol(change, higherIsBetter = false) {
  if (change === null) return '';
  if (higherIsBetter) {
    return change > 0 ? '▲' : '▼';
  }
  return change < 0 ? '▲' : '▼';
}

function loadBenchmarkReport(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading benchmark report from ${filePath}:`, error.message);
    return null;
  }
}

function extractBenchmarks(report) {
  const benchmarks = [];

  if (!report || !report.testResults) {
    return benchmarks;
  }

  for (const [suiteName, suite] of Object.entries(report.testResults)) {
    if (suite && typeof suite === 'object') {
      for (const [testName, test] of Object.entries(suite)) {
        if (test && typeof test === 'object' && test.benchmarks) {
          for (const [benchName, bench] of Object.entries(test.benchmarks)) {
            benchmarks.push({
              suite: suiteName,
              test: testName,
              name: benchName,
              mean: bench.mean,
              median: bench.median,
              min: bench.min,
              max: bench.max,
              hz: bench.hz,
              samples: bench.samples,
            });
          }
        }
      }
    }
  }

  return benchmarks;
}

function compareBenchmarks(current, baseline) {
  const results = [];

  for (const curr of current) {
    const base = baseline.find(
      (b) => b.suite === curr.suite && b.test === curr.test && b.name === curr.name,
    );

    results.push({
      ...curr,
      baseline: base
        ? {
            mean: base.mean,
            hz: base.hz,
          }
        : null,
      change: {
        mean: calculateChange(curr.mean, base?.mean),
        hz: calculateChange(curr.hz, base?.hz),
      },
    });
  }

  return results;
}

function printComparison(results) {
  console.log('\n' + '='.repeat(100));
  console.log('Benchmark Comparison Report');
  console.log('='.repeat(100));

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.suite]) acc[r.suite] = [];
    acc[r.suite].push(r);
    return acc;
  }, {});

  for (const [suiteName, benchmarks] of Object.entries(grouped)) {
    console.log(`\n${colors.cyan}${suiteName}${colors.reset}`);
    console.log('-'.repeat(100));
    console.log(
      `${'Benchmark'.padEnd(40)} ${'Current'.padStart(15)} ${'Baseline'.padStart(15)} ${'Change'.padStart(15)} ${'Ops/sec'.padStart(15)}`,
    );
    console.log('-'.repeat(100));

    for (const b of benchmarks) {
      const currentTime = formatTime(b.mean);
      const baselineTime = b.baseline ? formatTime(b.baseline.mean) : 'N/A';
      const changeStr =
        b.change.mean !== null
          ? `${getChangeSymbol(b.change.mean)} ${Math.abs(b.change.mean).toFixed(2)}%`
          : 'N/A';
      const changeColor = getChangeColor(b.change.mean);
      const opsStr = formatNumber(b.hz);

      console.log(
        `${b.name.padEnd(40)} ` +
          `${currentTime.padStart(15)} ` +
          `${baselineTime.padStart(15)} ` +
          `${changeColor}${changeStr.padStart(15)}${colors.reset} ` +
          `${opsStr.padStart(15)}`,
      );
    }
  }

  // Summary
  const withBaseline = results.filter((r) => r.baseline !== null);
  const improved = withBaseline.filter((r) => r.change.mean < 0);
  const regressed = withBaseline.filter((r) => r.change.mean > 0);
  const unchanged = withBaseline.filter((r) => r.change.mean === 0);
  const newTests = results.filter((r) => r.baseline === null);

  console.log('\n' + '='.repeat(100));
  console.log('Summary');
  console.log('='.repeat(100));
  console.log(`${colors.green}Improved:${colors.reset}   ${improved.length}`);
  console.log(`${colors.red}Regressed:${colors.reset}  ${regressed.length}`);
  console.log(`${colors.gray}Unchanged:${colors.reset}  ${unchanged.length}`);
  console.log(`${colors.blue}New tests:${colors.reset}  ${newTests.length}`);

  if (regressed.length > 0) {
    console.log(`\n${colors.red}Regressions detected:${colors.reset}`);
    for (const r of regressed) {
      console.log(`  - ${r.suite} > ${r.name}: +${r.change.mean.toFixed(2)}%`);
    }
  }

  console.log('');
}

function saveBaseline(report) {
  try {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(report, null, 2));
    console.log(`${colors.green}Baseline saved to:${colors.reset} ${BASELINE_PATH}`);
  } catch (error) {
    console.error(`${colors.red}Error saving baseline:${colors.reset}`, error.message);
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'save-baseline') {
    const report = loadBenchmarkReport(BENCH_REPORT_PATH);
    if (report) {
      saveBaseline(report);
    }
    return;
  }

  const baselinePath = args[0] || BASELINE_PATH;
  const currentPath = args[1] || BENCH_REPORT_PATH;

  console.log(`${colors.blue}Loading baseline:${colors.reset} ${baselinePath}`);
  console.log(`${colors.blue}Loading current:${colors.reset} ${currentPath}`);

  const baseline = loadBenchmarkReport(baselinePath);
  const current = loadBenchmarkReport(currentPath);

  if (!current) {
    console.error(`${colors.red}Error: Could not load current benchmark report${colors.reset}`);
    console.error(`Run benchmarks first: pnpm bench`);
    process.exit(1);
  }

  if (!baseline) {
    console.warn(
      `${colors.yellow}Warning: No baseline found. Saving current as baseline.${colors.reset}`,
    );
    saveBaseline(current);
    return;
  }

  const baselineBenchmarks = extractBenchmarks(baseline);
  const currentBenchmarks = extractBenchmarks(current);

  if (currentBenchmarks.length === 0) {
    console.error(`${colors.red}Error: No benchmarks found in current report${colors.reset}`);
    process.exit(1);
  }

  const results = compareBenchmarks(currentBenchmarks, baselineBenchmarks);
  printComparison(results);

  // Exit with error code if there are significant regressions (>10%)
  const significantRegressions = results.filter((r) => r.baseline && r.change.mean > 10);

  if (significantRegressions.length > 0) {
    console.log(
      `${colors.red}ERROR: ${significantRegressions.length} significant regressions detected (>10%)${colors.reset}`,
    );
    process.exit(1);
  }
}

main();
