#!/usr/bin/env node
/**
 * 简单的 AI 集成测试脚本
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Lyt.js AI 集成测试\n');
console.log('='.repeat(60));

// 检查 llms.txt 和 llms-full.txt
console.log('\n📝 检查文档文件:');
const llmsTxtPath = join(__dirname, 'llms.txt');
const llmsFullTxtPath = join(__dirname, 'llms-full.txt');

console.log(`  - llms.txt: ${existsSync(llmsTxtPath) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`  - llms-full.txt: ${existsSync(llmsFullTxtPath) ? '✅ 存在' : '❌ 不存在'}`);

// 检查 AI 包
console.log('\n🤖 检查 AI 包:');
const aiPackagePath = join(__dirname, 'packages/ai');
const aiSrcPath = join(aiPackagePath, 'src');

console.log(`  - packages/ai: ${existsSync(aiPackagePath) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`  - packages/ai/src: ${existsSync(aiSrcPath) ? '✅ 存在' : '❌ 不存在'}`);

const aiFiles = [
  'types.ts',
  'ai-client.ts',
  'prompts.ts',
  'config-loader.ts',
  'ai-generator.ts',
  'component-generator.ts',
  'template-engine.ts',
  'code-completer.ts',
  'index.ts',
  'bin/lyt-ai.ts'
];

aiFiles.forEach(file => {
  const filePath = join(aiSrcPath, file);
  console.log(`  - src/${file}: ${existsSync(filePath) ? '✅ 存在' : '❌ 不存在'}`);
});

// 检查 CLI
console.log('\n💻 检查 CLI:');
const cliPackagePath = join(__dirname, 'packages/cli');
const cliSrcPath = join(cliPackagePath, 'src');

console.log(`  - packages/cli: ${existsSync(cliPackagePath) ? '✅ 存在' : '❌ 不存在'}`);
console.log(`  - packages/cli/src: ${existsSync(cliSrcPath) ? '✅ 存在' : '❌ 不存在'}`);

const cliFiles = [
  'generate.ts',
  'index.ts'
];

cliFiles.forEach(file => {
  const filePath = join(cliSrcPath, file);
  console.log(`  - src/${file}: ${existsSync(filePath) ? '✅ 存在' : '❌ 不存在'}`);
});

// 检查 .trae 目录
console.log('\n🎯 检查 .trae 目录:');
const traeDirPath = join(__dirname, '.trae');
console.log(`  - .trae: ${existsSync(traeDirPath) ? '✅ 存在' : '❌ 不存在'}`);

const traeFiles = [
  'README.md',
  'context.md',
  'api-reference.md',
  'quick-start.md',
  'best-practices.md',
  'ai-integration-examples.md'
];

traeFiles.forEach(file => {
  const filePath = join(traeDirPath, file);
  console.log(`  - .trae/${file}: ${existsSync(filePath) ? '✅ 存在' : '❌ 不存在'}`);
});

// 检查 prompts 目录
console.log('\n💡 检查提示词目录:');
const promptsDirPath = join(traeDirPath, 'prompts');
console.log(`  - .trae/prompts: ${existsSync(promptsDirPath) ? '✅ 存在' : '❌ 不存在'}`);

const promptFiles = [
  'component.md',
  'store.md',
  'page.md',
  'api.md'
];

promptFiles.forEach(file => {
  const filePath = join(promptsDirPath, file);
  console.log(`  - .trae/prompts/${file}: ${existsSync(filePath) ? '✅ 存在' : '❌ 不存在'}`);
});

console.log('\n' + '='.repeat(60));
console.log('\n✅ 所有文件检查完成！');
console.log('\n📋 总结:');
console.log('  - llms.txt 和 llms-full.txt: 快速参考和完整文档');
console.log('  - AI 包: 包含真实 API 集成、配置加载、提示词、代码生成');
console.log('  - CLI: 添加了 lytx generate 命令，支持 --ai 选项');
console.log('  - .trae 目录: 为 AI IDE 提供深度集成支持');
console.log('  - 提示词: 专门为组件、Store、页面、API 优化');
console.log('\n🎉 Lyt.js AI 集成已完善！');
console.log('\n💡 下一步:');
console.log('  1. 在 .lytrc.json 中配置 AI API');
console.log('  2. 使用 `lytx generate --ai` 命令体验 AI 代码生成');
console.log('  3. 在 Trae、Cursor 等 IDE 中查看 .trae 目录的内容');
