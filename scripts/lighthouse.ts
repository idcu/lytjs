/**
 * LytJS Lighthouse 性能测试命令
 * 
 * 用法：
 *   pnpm lighthouse                     # 运行桌面端测试
 *   pnpm lighthouse --mobile            # 运行移动端测试
 *   pnpm lighthouse --report <path>      # 验证已有报告
 */

import { spawn } from 'child_process';
import { resolve, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

interface LighthouseOptions {
  url?: string;
  outputPath?: string;
  reportFormat?: 'html' | 'json' | 'csv';
  device?: 'desktop' | 'mobile';
  onlyCategories?: string[];
}

const DEFAULT_OPTIONS: LighthouseOptions = {
  url: 'http://localhost:5173',
  outputPath: './lighthouse-reports',
  reportFormat: 'html',
  device: 'desktop',
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
};

async function runLighthouse(options: LighthouseOptions = {}): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  if (!opts.url) {
    console.error('❌ 请提供测试 URL');
    console.log('用法: pnpm lighthouse --url http://localhost:5173');
    process.exit(1);
  }

  console.log('\n🧪 LytJS Lighthouse Performance Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   URL:        ${opts.url}`);
  console.log(`   Device:     ${opts.device}`);
  console.log(`   Format:     ${opts.reportFormat}`);
  console.log(`   Output:     ${opts.outputPath}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!existsSync(opts.outputPath!)) {
    mkdirSync(opts.outputPath!, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = join(opts.outputPath!, `lighthouse-${opts.device}-${timestamp}.${opts.reportFormat}`);

  const desktopConfig = opts.device === 'desktop' ? [
    '--preset=desktop',
  ] : [];

  const lighthouseArgs = [
    opts.url,
    ...desktopConfig,
    `--output=${opts.reportFormat}`,
    `--output-path=${outputFile}`,
    '--quiet',
    '--chrome-flags="--headless --disable-dev-shm-usage --no-sandbox"',
  ];

  console.log('🚀 开始 Lighthouse 测试...\n');

  return new Promise((resolve, reject) => {
    const lighthouse = spawn('npx', ['lighthouse', ...lighthouseArgs], {
      stdio: 'inherit',
      shell: true,
    });

    lighthouse.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ Lighthouse 测试完成`);
        console.log(`📊 报告已保存至: ${outputFile}`);
        console.log(`\n💡 查看 HTML 报告:`);
        console.log(`   open ${outputFile}`);
        console.log(`\n💡 验证 JSON 报告:`);
        console.log(`   pnpm lighthouse:verify --report ${outputFile.replace('.html', '.json')}`);
        resolve();
      } else {
        reject(new Error(`Lighthouse 退出码: ${code}`));
      }
    });

    lighthouse.on('error', (err) => {
      reject(err);
    });
  });
}

function generateSampleReport(outputPath: string): void {
  const sampleReport = {
    categories: {
      performance: { score: 0.92 },
      accessibility: { score: 0.95 },
      'best-practices': { score: 0.98 },
      seo: { score: 0.90 },
    },
    audits: {
      'first-contentful-paint': { numericValue: 850 },
      'largest-contentful-paint': { numericValue: 1800 },
      'total-blocking-time': { numericValue: 120 },
      'cumulative-layout-shift': { numericValue: 0.05 },
      'speed-index': { numericValue: 2200 },
    },
  };

  const filePath = join(outputPath, 'sample-lighthouse-report.json');
  writeFileSync(filePath, JSON.stringify(sampleReport, null, 2));
  console.log(`\n📄 示例报告已生成: ${filePath}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 LytJS Lighthouse Performance Test

用法:
  pnpm lighthouse [options]

选项:
  --url <url>           测试 URL (默认: http://localhost:5173)
  --output <path>       输出目录 (默认: ./lighthouse-reports)
  --format <format>     报告格式: html, json, csv (默认: html)
  --desktop             桌面端测试 (默认)
  --mobile              移动端测试
  --sample              生成示例报告
  --help, -h            显示帮助

示例:
  pnpm lighthouse --url http://localhost:5173
  pnpm lighthouse --mobile --output ./reports
  pnpm lighthouse --sample
    `);
    return;
  }

  if (args.includes('--sample')) {
    const outputPath = args.includes('--output') 
      ? args[args.indexOf('--output') + 1] 
      : './lighthouse-reports';
    generateSampleReport(outputPath || './lighthouse-reports');
    return;
  }

  const options: LighthouseOptions = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        options.url = args[++i];
        break;
      case '--output':
        options.outputPath = args[++i];
        break;
      case '--format':
        options.reportFormat = args[++i] as 'html' | 'json' | 'csv';
        break;
      case '--desktop':
        options.device = 'desktop';
        break;
      case '--mobile':
        options.device = 'mobile';
        break;
    }
  }

  try {
    await runLighthouse(options);
  } catch (error) {
    console.error('\n❌ Lighthouse 测试失败:', error);
    process.exit(1);
  }
}

main();
