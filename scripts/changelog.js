#!/usr/bin/env node
/**
 * ============================================================
 * Lyt.js Changelog Manager
 *
 * 自动化管理 CHANGELOG.md
 *
 * 用法：
 *   node scripts/changelog.js add <type> <message>  # 添加变更条目
 *   node scripts/changelog.js release <version>     # 发布新版本
 *   node scripts/changelog.js init                  # 初始化 CHANGELOG.md
 *   node scripts/changelog.js preview               # 预览当前变更
 * ============================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CHANGELOG_PATH = path.resolve(ROOT_DIR, 'CHANGELOG.md');

const color = {
  green: (text) => `\x1b[0;32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[0;33m${text}\x1b[0m`,
  red: (text) => `\x1b[0;31m${text}\x1b[0m`,
  blue: (text) => `\x1b[0;34m${text}\x1b[0m`,
};

const log = (text) => console.log(`${color.blue('[changelog]')} ${text}`);
const ok = (text) => console.log(`${color.green('[OK]')} ${text}`);
const warn = (text) => console.log(`${color.yellow('[WARN]')} ${text}`);
const err = (text) => console.log(`${color.red('[ERROR]')} ${text}`);

const CHANGE_TYPES = {
  'feat': { title: '新增 (Features)', emoji: '✨' },
  'fix': { title: '修复 (Bug Fixes)', emoji: '🐛' },
  'docs': { title: '文档 (Documentation)', emoji: '📚' },
  'style': { title: '样式 (Style)', emoji: '💎' },
  'refactor': { title: '重构 (Refactoring)', emoji: '🔨' },
  'perf': { title: '性能 (Performance)', emoji: '⚡' },
  'test': { title: '测试 (Tests)', emoji: '🧪' },
  'build': { title: '构建 (Build)', emoji: '🏗️' },
  'ci': { title: 'CI/CD', emoji: '🚀' },
  'chore': { title: '其他 (Chores)', emoji: '🔧' },
};

const UNRELEASED_HEADER = '## [Unreleased]';

function getCurrentVersion() {
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readChangelog() {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    return null;
  }
  return fs.readFileSync(CHANGELOG_PATH, 'utf8');
}

function writeChangelog(content) {
  fs.writeFileSync(CHANGELOG_PATH, content, 'utf8');
}

function initChangelog() {
  if (fs.existsSync(CHANGELOG_PATH)) {
    warn('CHANGELOG.md already exists');
    return;
  }

  const initialContent = `---

# Changelog

本项目的所有重要变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/)，
版本管理遵循 [Semantic Versioning](https://semver.org/)。

## [Unreleased]

---

> 📄 本文档基于 Lyt.js 项目
`;

  writeChangelog(initialContent);
  ok('CHANGELOG.md initialized successfully');
}

function getUnreleasedSection(content) {
  const lines = content.split('\n');
  const unreleasedStart = lines.findIndex(line => line.startsWith(UNRELEASED_HEADER));
  
  if (unreleasedStart === -1) {
    return { start: -1, end: -1, content: '' };
  }

  let unreleasedEnd = lines.findIndex((line, index) => 
    index > unreleasedStart && line.startsWith('## [')
  );

  if (unreleasedEnd === -1) {
    unreleasedEnd = lines.findIndex((line, index) => 
      index > unreleasedStart && line.startsWith('---')
    );
  }

  if (unreleasedEnd === -1) {
    unreleasedEnd = lines.length;
  }

  const unreleasedContent = lines.slice(unreleasedStart + 1, unreleasedEnd).join('\n').trim();
  
  return {
    start: unreleasedStart,
    end: unreleasedEnd,
    content: unreleasedContent,
    lines: lines
  };
}

function ensureUnreleasedSection(content) {
  if (!content.includes(UNRELEASED_HEADER)) {
    const marker = '---\n\n# Changelog';
    if (content.includes(marker)) {
      content = content.replace(marker, `${marker}\n\n${UNRELEASED_HEADER}\n`);
    } else {
      content = content.replace('# Changelog', `# Changelog\n\n${UNRELEASED_HEADER}\n`);
    }
  }
  return content;
}

function addChange(type, message) {
  if (!CHANGE_TYPES[type]) {
    err(`Unknown change type: ${type}`);
    err(`Valid types: ${Object.keys(CHANGE_TYPES).join(', ')}`);
    process.exit(1);
  }

  let content = readChangelog();
  if (!content) {
    initChangelog();
    content = readChangelog();
  }

  content = ensureUnreleasedSection(content);

  const { start, end, content: unreleasedContent, lines } = getUnreleasedSection(content);
  
  if (start === -1) {
    err('Failed to find Unreleased section');
    process.exit(1);
  }

  const changeTypeInfo = CHANGE_TYPES[type];
  const typeHeader = `### ${changeTypeInfo.title}`;
  
  let newUnreleasedContent = unreleasedContent;

  if (!newUnreleasedContent.includes(typeHeader)) {
    if (newUnreleasedContent) {
      newUnreleasedContent = `${typeHeader}\n\n- ${message}\n\n${newUnreleasedContent}`;
    } else {
      newUnreleasedContent = `${typeHeader}\n\n- ${message}\n`;
    }
  } else {
    const typeHeaderRegex = new RegExp(`### ${changeTypeInfo.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    newUnreleasedContent = newUnreleasedContent.replace(typeHeaderRegex, `${typeHeader}\n\n- ${message}`);
  }

  const newLines = [
    ...lines.slice(0, start + 1),
    '',
    ...newUnreleasedContent.split('\n'),
    ...lines.slice(end)
  ];

  writeChangelog(newLines.join('\n'));
  ok(`Added change: ${changeTypeInfo.emoji} ${type} - ${message}`);
}

function releaseVersion(version) {
  let content = readChangelog();
  if (!content) {
    err('CHANGELOG.md not found');
    process.exit(1);
  }

  const { start, end, content: unreleasedContent, lines } = getUnreleasedSection(content);
  
  if (start === -1) {
    err('Failed to find Unreleased section');
    process.exit(1);
  }

  if (!unreleasedContent.trim()) {
    warn('No changes in Unreleased section');
    return;
  }

  const date = getCurrentDate();
  const newReleaseHeader = `## [${version}] - ${date}`;

  const newLines = [
    ...lines.slice(0, start),
    UNRELEASED_HEADER,
    '',
    newReleaseHeader,
    '',
    ...unreleasedContent.split('\n'),
    '',
    '---',
    ...lines.slice(end)
  ];

  writeChangelog(newLines.join('\n'));
  ok(`Released version ${version} on ${date}`);
}

function previewChanges() {
  const content = readChangelog();
  if (!content) {
    err('CHANGELOG.md not found');
    process.exit(1);
  }

  const { content: unreleasedContent } = getUnreleasedSection(content);
  
  if (!unreleasedContent.trim()) {
    log('No unreleased changes');
    return;
  }

  console.log('\n' + color.blue('=== Unreleased Changes ===') + '\n');
  console.log(unreleasedContent);
  console.log('\n' + color.blue('=========================') + '\n');
}

function getGitCommits() {
  try {
    const output = execSync('git log --oneline -20', { encoding: 'utf8' });
    return output.trim().split('\n');
  } catch (e) {
    return [];
  }
}

function parseCommitMessage(commit) {
  const match = commit.match(/^[0-9a-f]+ (\w+)(\([^)]+\))?:? (.+)$/i);
  if (match) {
    return {
      type: match[1].toLowerCase(),
      scope: match[2] ? match[2].slice(1, -1) : '',
      message: match[3]
    };
  }
  return null;
}

function addFromGit() {
  const commits = getGitCommits();
  
  console.log('\n' + color.blue('Recent commits:') + '\n');
  commits.forEach((commit, index) => {
    console.log(`  ${index + 1}. ${commit}`);
  });
  console.log('');
  
  log('Please use "node scripts/changelog.js add <type> <message>" to add changes manually');
}

function showHelp() {
  console.log(`
${color.blue('Lyt.js Changelog Manager')}

Usage:
  node scripts/changelog.js init                  # Initialize CHANGELOG.md
  node scripts/changelog.js add <type> <message>  # Add a change entry
  node scripts/changelog.js release <version>     # Release a new version
  node scripts/changelog.js preview               # Preview unreleased changes
  node scripts/changelog.js git                   # Show recent git commits

Change types:
  feat     - New features
  fix      - Bug fixes
  docs     - Documentation changes
  style    - Code style changes
  refactor - Code refactoring
  perf     - Performance improvements
  test     - Test changes
  build    - Build system changes
  ci       - CI/CD changes
  chore    - Other changes

Examples:
  node scripts/changelog.js add feat "Add new component"
  node scripts/changelog.js release 4.1.1
  node scripts/changelog.js preview
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case 'init':
      initChangelog();
      break;

    case 'add':
      if (args.length < 3) {
        err('Please specify change type and message');
        showHelp();
        process.exit(1);
      }
      addChange(args[1], args.slice(2).join(' '));
      break;

    case 'release':
      if (args.length < 2) {
        err('Please specify version');
        showHelp();
        process.exit(1);
      }
      releaseVersion(args[1]);
      break;

    case 'preview':
      previewChanges();
      break;

    case 'git':
      addFromGit();
      break;

    default:
      err(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
