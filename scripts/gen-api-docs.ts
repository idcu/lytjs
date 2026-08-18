/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * API Documentation Generator
 *
 * Uses TypeScript Compiler API to parse source code and extract JSDoc comments,
 * generating Markdown files to docs/api/
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

// ===== Configuration =====

interface PackageConfig {
  name: string;
  packagePath: string;
  outputFile: string;
  description: string;
}

/**
 * 生成文档输出目录。
 *
 * 说明：
 * - `docs/api/*.md`（如 core.md / reactivity.md / router.md / devtools.md 等）为人工精修的高质量参考，
 *   由 `docs/api/` 下的手工文档权威维护，**不在此处生成或覆盖**。
 * - 本生成器只对「尚缺 API 文档的高价值包」产出，落盘到独立的 `docs/api/generated/<slug>.md`，
 *   避免与人工稿撞名、撞路径。
 */
const GENERATED_DIR = 'docs/api/generated';

/**
 * 便捷构造：以包名推导生成文件名（`@lytjs/` 前缀后的部分），保证 slug 全局唯一。
 */
function pkg(name: string, packagePath: string, description: string): PackageConfig {
  const slug = name.replace('@lytjs/', '');
  return { name, packagePath, outputFile: `${GENERATED_DIR}/${slug}.md`, description };
}

/**
 * 高价值但暂缺 API 文档的包（官方插件 / SSR 渲染栈 / Web 框架中间件 / 平台适配与运行时）。
 * 按批次扩展可在此追加 `pkg(...)`。
 */
const PACKAGES: PackageConfig[] = [
  // ---- 官方插件（plugin-vite 已有人工稿，不在此列）----
  pkg(
    '@lytjs/plugin-animation',
    'packages/plugins/packages/plugin-animation/src',
    '官方动画插件，基于 CSS 动画与过渡',
  ),
  pkg(
    '@lytjs/plugin-auth',
    'packages/plugins/packages/plugin-auth/src',
    '官方认证插件，用于路由鉴权',
  ),
  pkg(
    '@lytjs/plugin-chart',
    'packages/plugins/packages/plugin-chart/src',
    '官方图表插件，用于数据可视化渲染',
  ),
  pkg('@lytjs/plugin-data', 'packages/plugins/packages/plugin-data/src', '官方增强数据插件'),
  pkg(
    '@lytjs/plugin-data-fetch',
    'packages/plugins/packages/plugin-data-fetch/src',
    '官方数据请求插件，支持缓存与响应式数据',
  ),
  pkg(
    '@lytjs/plugin-form',
    'packages/plugins/packages/plugin-form/src',
    '官方表单插件，提供表单状态管理',
  ),
  pkg('@lytjs/plugin-i18n', 'packages/plugins/packages/plugin-i18n/src', '官方国际化（i18n）插件'),
  pkg(
    '@lytjs/plugin-logger',
    'packages/plugins/packages/plugin-logger/src',
    '官方日志插件，支持日志分级',
  ),
  pkg(
    '@lytjs/plugin-storage',
    'packages/plugins/packages/plugin-storage/src',
    '官方存储插件，封装 localStorage/sessionStorage',
  ),
  pkg('@lytjs/plugin-testing', 'packages/plugins/packages/plugin-testing/src', '官方测试插件'),
  pkg(
    '@lytjs/plugin-theme',
    'packages/plugins/packages/plugin-theme/src',
    '官方主题插件，管理 CSS 变量主题',
  ),
  pkg(
    '@lytjs/plugin-validation',
    'packages/plugins/packages/plugin-validation/src',
    '官方校验插件，提供类型校验',
  ),

  // ---- SSR 渲染栈 ----
  pkg(
    '@lytjs/ssr',
    'packages/ecosystem/packages/ssr-kit/packages/ssr/src',
    '服务端渲染（SSR）支持',
  ),
  pkg(
    '@lytjs/ssg',
    'packages/ecosystem/packages/ssr-kit/packages/ssg/src',
    '静态站点生成（SSG）支持',
  ),
  pkg(
    '@lytjs/hmr',
    'packages/ecosystem/packages/ssr-kit/packages/hmr/src',
    '热模块替换（HMR）支持',
  ),
  pkg(
    '@lytjs/cache',
    'packages/ecosystem/packages/ssr-kit/packages/cache/src',
    '统一缓存系统（内存缓存）',
  ),
  pkg(
    '@lytjs/cache-isr',
    'packages/ecosystem/packages/ssr-kit/packages/cache-isr/src',
    '增量静态再生成（ISR）缓存',
  ),
  pkg(
    '@lytjs/html-renderer',
    'packages/ecosystem/packages/ssr-kit/packages/html-renderer/src',
    'SSR HTML 渲染器',
  ),

  // ---- Web 框架（中间件与引擎）----
  pkg('@lytjs/api', 'packages/ecosystem/packages/web-framework/packages/api/src', 'API 路由引擎'),
  pkg(
    '@lytjs/http-server',
    'packages/ecosystem/packages/web-framework/packages/http-server/src',
    'HTTP 服务器',
  ),
  pkg(
    '@lytjs/metadata',
    'packages/ecosystem/packages/web-framework/packages/metadata/src',
    '元数据系统',
  ),
  pkg(
    '@lytjs/middleware',
    'packages/ecosystem/packages/web-framework/packages/middleware/src',
    '中间件核心系统（洋葱模型）',
  ),
  pkg(
    '@lytjs/middleware-auth',
    'packages/ecosystem/packages/web-framework/packages/middleware-auth/src',
    '认证中间件',
  ),
  pkg(
    '@lytjs/middleware-cors',
    'packages/ecosystem/packages/web-framework/packages/middleware-cors/src',
    'CORS 跨域中间件',
  ),
  pkg(
    '@lytjs/middleware-rate-limit',
    'packages/ecosystem/packages/web-framework/packages/middleware-rate-limit/src',
    '速率限制中间件',
  ),
  pkg(
    '@lytjs/router-fs',
    'packages/ecosystem/packages/web-framework/packages/router-fs/src',
    '基于文件系统的路由引擎',
  ),

  // ---- 平台适配 / 运行时 / 生态 ----
  pkg(
    '@lytjs/ui',
    'packages/ecosystem/packages/ui/src',
    '官方 UI 组件库（Button、Input、Dialog 等）',
  ),
  pkg('@lytjs/adapter-web', 'packages/adapter-web/src', 'Web 平台适配器（DOM RendererHost）'),
  pkg(
    '@lytjs/devtools',
    'packages/ecosystem/packages/devtools/src',
    '开发调试工具（服务端包，区别于 devtools-extension）',
  ),
  pkg(
    '@lytjs/runtime-edge',
    'packages/ecosystem/packages/runtime-edge/src',
    '边缘运行时支持（Serverless 适配）',
  ),
  pkg('@lytjs/bundler', 'packages/ecosystem/packages/bundler/src', '与 Vite 集成的打包器'),
  // 注意：@lytjs/compat 为 0 导出兼容层（src/index.ts 仅 `export {}`），不生成 API 文档，避免空文件
];

// ===== TypeScript Parser =====

interface APIDoc {
  name: string;
  kind: 'function' | 'interface' | 'type' | 'class' | 'variable' | 'enum';
  description: string;
  jsDoc?: ts.JSDoc;
  signature?: string;
  parameters?: ParameterDoc[];
  returns?: ReturnDoc;
  members?: MemberDoc[];
  examples?: string[];
  since?: string;
  deprecated?: string;
  see?: string[];
}

interface ParameterDoc {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  defaultValue?: string;
}

interface ReturnDoc {
  type: string;
  description: string;
}

interface MemberDoc {
  name: string;
  kind: 'property' | 'method';
  type?: string;
  description: string;
  optional: boolean;
}

/**
 * Parse a TypeScript source file and extract API documentation
 */
function parseSourceFile(filePath: string): APIDoc[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, 'utf-8'),
    ts.ScriptTarget.Latest,
    true,
  );

  const docs: APIDoc[] = [];

  function visit(node: ts.Node) {
    if (ts.isExportDeclaration(node)) {
      // Handle export declarations
      return;
    }

    // Check if node has JSDoc
    const jsDoc = ts.getJSDocCommentsAndTags(node);
    if (jsDoc.length === 0 && !isExported(node)) {
      ts.forEachChild(node, visit);
      return;
    }

    const doc = extractDocFromNode(node, jsDoc);
    if (doc) {
      docs.push(doc);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return docs;
}

/**
 * Check if a node is exported
 */
function isExported(node: ts.Node): boolean {
  return (
    (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
    (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
  );
}

/**
 * Extract documentation from a TypeScript node
 */
function extractDocFromNode(node: ts.Node, jsDoc: ts.JSDoc[]): APIDoc | null {
  const name = getNodeName(node);
  if (!name) return null;

  const kind = getNodeKind(node);
  if (!kind) return null;

  const description = extractDescription(jsDoc);
  const examples = extractExamples(jsDoc);
  const since = extractTag(jsDoc, '@since');
  const deprecated = extractTag(jsDoc, '@deprecated');
  const see = extractTags(jsDoc, '@see');

  const doc: APIDoc = {
    name,
    kind,
    description,
    jsDoc: jsDoc[0],
    examples,
    since,
    deprecated,
    see,
  };

  // Extract signature and parameters for functions
  if (kind === 'function' || kind === 'method') {
    const signature = extractSignature(node);
    if (signature) {
      doc.signature = signature;
      doc.parameters = extractParameters(node, jsDoc);
      doc.returns = extractReturns(node, jsDoc);
    }
  }

  // Extract members for interfaces and classes
  if (kind === 'interface' || kind === 'class') {
    doc.members = extractMembers(node);
  }

  // Extract type for type aliases
  if (kind === 'type') {
    doc.signature = extractTypeSignature(node);
  }

  return doc;
}

/**
 * Get the name of a node
 */
function getNodeName(node: ts.Node): string | null {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isVariableStatement(node)
  ) {
    const name = (node as any).name;
    return name ? name.text : null;
  }
  if (ts.isVariableDeclaration(node)) {
    return node.name.getText();
  }
  return null;
}

/**
 * Get the kind of a node
 */
function getNodeKind(node: ts.Node): APIDoc['kind'] | null {
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isVariableDeclaration(node) || ts.isVariableStatement(node)) return 'variable';
  return null;
}

/**
 * Extract description from JSDoc
 */
function extractDescription(jsDoc: ts.JSDoc[]): string {
  if (jsDoc.length === 0) return '';
  const doc = jsDoc[0];
  if (typeof doc.comment === 'string') {
    return doc.comment;
  }
  if (Array.isArray(doc.comment)) {
    return doc.comment.map((c) => c.text).join('');
  }
  return '';
}

/**
 * 将类型签名折叠为单行，避免反引号代码跨度跨行。
 * 跨行的 `Foo<T>` 会被 markdown 解析器当作未闭合内联 HTML，导致 VitePress 构建失败。
 * 同时转义类型中可能出现的反引号。
 */
function inlineType(type: string): string {
  return type
    .replace(/\s*\n\s*/g, ' ')
    .replace(/`/g, '\\`')
    .trim();
}

/**
 * 转义正文描述中反引号代码跨度之外的 `<` / `>`。
 * 描述里若出现 `Promise<void>` 这类裸文本，`<void>` 会被 Vue 编译器当作未闭合 HTML 标签导致构建失败。
 * 行内代码（反引号内）不做转义，避免显示异常。
 */
function escapeAngleOutsideTicks(text: string): string {
  let out = '';
  let inTick = false;
  for (const ch of text) {
    if (ch === '`') {
      inTick = !inTick;
      out += ch;
      continue;
    }
    if (!inTick && (ch === '<' || ch === '>')) {
      out += ch === '<' ? '&lt;' : '&gt;';
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * 转义 Markdown 表格单元格（类型 / 默认值列）。
 *
 * 类型串常含联合符 `|`、对象字面量 `{ ... }`、泛型 `<>` 等：
 * - 字面 `|` 若原样写入表格会被当作列分隔符，破坏表格结构；
 * - 字面 `{ ... }` 会被 Vue 编译器当作 HTML 属性解析，导致
 *   「Duplicate attribute」/「Element is missing end tag」构建报错。
 *
 * 统一策略：将整段类型包进行内代码跨段（Code Span）：
 * - 行内代码内的 `<>`/`&` 由 markdown-it 自动转义，浏览器显示原字符；
 * - 联合符 `|` 转义为 `\|`（反斜杠管道），既避开表格按列切分，
 *   显示时又还原为 `|`；
 * - 若类型本身含反引号（模板字符串类型），自动选用长度 +1 的反引号串
 *   作为代码跨段定界符，避免与内部反引号冲突。
 */
function mdCell(type: string): string {
  const t = String(type)
    .replace(/\s*\r?\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const content = t.replace(/\|/g, '\\|');
  const maxBacktickRun = (content.match(/`+/g) || []).reduce((m, r) => Math.max(m, r.length), 0);
  const delim = '`'.repeat(maxBacktickRun + 1);
  return `${delim}${content}${delim}`;
}

/**
 * 转义表格「描述」列：角度号用 escapeAngleOutsideTicks（保留行内代码），
 * 管道符统一转义为实体，避免被当作列分隔符。
 */
function mdCellText(text: string): string {
  return escapeAngleOutsideTicks(
    String(text)
      .replace(/\s*\r?\n\s*/g, ' ')
      .replace(/&/g, '&amp;'),
  ).replace(/\|/g, '&#124;');
}

/**
 * 剥离示例文本首尾的代码围栏（```typescript / ```），避免生成时双重嵌套围栏。
 */
function unwrapFences(example: string): string {
  const lines = example.split('\n');
  if (lines.length && lines[0].trim().startsWith('```')) lines.shift();
  if (lines.length && lines[lines.length - 1].trim() === '```') lines.pop();
  return lines.join('\n');
}

/**
 * Extract examples from JSDoc
 */
function extractExamples(jsDoc: ts.JSDoc[]): string[] {
  const examples: string[] = [];
  for (const doc of jsDoc) {
    if (!doc.tags) continue;
    for (const tag of doc.tags) {
      if (tag.tagName.text === 'example') {
        const text = typeof tag.comment === 'string' ? tag.comment : '';
        examples.push(text);
      }
    }
  }
  return examples;
}

/**
 * Extract a specific tag from JSDoc
 */
function extractTag(jsDoc: ts.JSDoc[], tagName: string): string | undefined {
  for (const doc of jsDoc) {
    if (!doc.tags) continue;
    for (const tag of doc.tags) {
      if (tag.tagName.text === tagName.replace('@', '')) {
        return typeof tag.comment === 'string' ? tag.comment : undefined;
      }
    }
  }
  return undefined;
}

/**
 * Extract multiple tags from JSDoc
 */
function extractTags(jsDoc: ts.JSDoc[], tagName: string): string[] {
  const tags: string[] = [];
  for (const doc of jsDoc) {
    if (!doc.tags) continue;
    for (const tag of doc.tags) {
      if (tag.tagName.text === tagName.replace('@', '')) {
        const text = typeof tag.comment === 'string' ? tag.comment : '';
        tags.push(text);
      }
    }
  }
  return tags;
}

/**
 * Extract function signature
 */
function extractSignature(node: ts.Node): string | undefined {
  if (ts.isFunctionDeclaration(node) && node.type) {
    return node.type.getText();
  }
  return undefined;
}

/**
 * Extract function parameters
 */
function extractParameters(node: ts.Node, jsDoc: ts.JSDoc[]): ParameterDoc[] {
  const params: ParameterDoc[] = [];

  if (!ts.isFunctionDeclaration(node) || !node.parameters) {
    return params;
  }

  // Build param docs from JSDoc @param tags
  const paramDocs = new Map<string, { description: string; type?: string }>();
  for (const doc of jsDoc) {
    if (!doc.tags) continue;
    for (const tag of doc.tags) {
      if (tag.tagName.text === 'param') {
        const text = typeof tag.comment === 'string' ? tag.comment : '';
        const match = text.match(/^(\w+)\s*(-\s*)?(.+)?$/);
        if (match) {
          paramDocs.set(match[1], {
            description: match[3] || '',
            type: (tag as any).typeExpression?.type?.getText(),
          });
        }
      }
    }
  }

  for (const param of node.parameters) {
    const name = param.name.getText();
    const paramDoc = paramDocs.get(name);

    params.push({
      name,
      type: paramDoc?.type || param.type?.getText() || 'any',
      description: paramDoc?.description || '',
      optional: !!param.questionToken || !!param.initializer,
      defaultValue: param.initializer?.getText(),
    });
  }

  return params;
}

/**
 * Extract return type info
 */
function extractReturns(node: ts.Node, jsDoc: ts.JSDoc[]): ReturnDoc | undefined {
  let description = '';
  let type = '';

  // Get from JSDoc @returns tag
  for (const doc of jsDoc) {
    if (!doc.tags) continue;
    for (const tag of doc.tags) {
      if (tag.tagName.text === 'returns' || tag.tagName.text === 'return') {
        description = typeof tag.comment === 'string' ? tag.comment : '';
        type = (tag as any).typeExpression?.type?.getText() || '';
      }
    }
  }

  // Get from function return type
  if (ts.isFunctionDeclaration(node) && node.type && !type) {
    type = node.type.getText();
  }

  if (!type && !description) return undefined;

  return { type: type || 'void', description };
}

/**
 * Extract interface/class members
 */
function extractMembers(node: ts.Node): MemberDoc[] {
  const members: MemberDoc[] = [];

  if (!ts.isInterfaceDeclaration(node) && !ts.isClassDeclaration(node)) {
    return members;
  }

  for (const member of (node as any).members || []) {
    if (ts.isPropertySignature(member) || ts.isPropertyDeclaration(member)) {
      members.push({
        name: member.name?.getText() || '',
        kind: 'property',
        type: member.type?.getText(),
        description: extractDescription(ts.getJSDocCommentsAndTags(member)),
        optional: !!member.questionToken,
      });
    } else if (ts.isMethodSignature(member) || ts.isMethodDeclaration(member)) {
      members.push({
        name: member.name?.getText() || '',
        kind: 'method',
        description: extractDescription(ts.getJSDocCommentsAndTags(member)),
        optional: !!member.questionToken,
      });
    }
  }

  return members;
}

/**
 * Extract type alias signature
 */
function extractTypeSignature(node: ts.Node): string | undefined {
  if (ts.isTypeAliasDeclaration(node)) {
    return node.type.getText();
  }
  return undefined;
}

// ===== Markdown Generator =====

/**
 * Generate Markdown documentation from API docs
 */
function generateMarkdown(packageConfig: PackageConfig, docs: APIDoc[]): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${packageConfig.name}`);
  lines.push('');
  lines.push(packageConfig.description);
  lines.push('');

  // Table of contents
  if (docs.length > 0) {
    lines.push('## 目录');
    lines.push('');
    for (const doc of docs) {
      const anchor = doc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      lines.push(`- [${doc.name}](#${anchor})`);
    }
    lines.push('');
  }

  // API documentation
  for (const doc of docs) {
    lines.push(...generateDocMarkdown(doc));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate Markdown for a single API doc
 */
function generateDocMarkdown(doc: APIDoc): string[] {
  const lines: string[] = [];

  // Heading
  lines.push(`## ${doc.name}`);
  lines.push('');

  // Badge for kind
  lines.push(`**${doc.kind.charAt(0).toUpperCase() + doc.kind.slice(1)}**`);
  lines.push('');

  // Deprecated warning
  if (doc.deprecated) {
    lines.push('::: warning 已弃用');
    lines.push(escapeAngleOutsideTicks(doc.deprecated));
    lines.push(':::');
    lines.push('');
  }

  // Since version
  if (doc.since) {
    lines.push(`**自版本:** ${doc.since}`);
    lines.push('');
  }

  // Description
  if (doc.description) {
    lines.push(escapeAngleOutsideTicks(doc.description));
    lines.push('');
  }

  // Signature
  if (doc.signature) {
    lines.push('### 签名');
    lines.push('');
    lines.push('```typescript');
    lines.push(`${doc.name}: ${doc.signature}`);
    lines.push('```');
    lines.push('');
  }

  // Parameters
  if (doc.parameters && doc.parameters.length > 0) {
    lines.push('### 参数');
    lines.push('');
    lines.push('| 参数 | 类型 | 描述 | 可选 | 默认值 |');
    lines.push('|------|------|------|------|--------|');
    for (const param of doc.parameters) {
      const optional = param.optional ? '是' : '否';
      const defaultVal = param.defaultValue ? mdCell(param.defaultValue) : '-';
      lines.push(
        `| ${param.name} | ${mdCell(param.type)} | ${mdCellText(param.description)} | ${optional} | ${defaultVal} |`,
      );
    }
    lines.push('');
  }

  // Returns
  if (doc.returns) {
    lines.push('### 返回值');
    lines.push('');
    lines.push(`**类型:** \`${inlineType(doc.returns.type)}\``);
    if (doc.returns.description) {
      lines.push('');
      lines.push(escapeAngleOutsideTicks(doc.returns.description));
    }
    lines.push('');
  }

  // Members (for interfaces/classes)
  if (doc.members && doc.members.length > 0) {
    lines.push('### 成员');
    lines.push('');
    lines.push('| 名称 | 类型 | 描述 | 可选 |');
    lines.push('|------|------|------|------|');
    for (const member of doc.members) {
      const type = member.type ? mdCell(member.type) : '-';
      const optional = member.optional ? '是' : '否';
      lines.push(`| ${member.name} | ${type} | ${mdCellText(member.description)} | ${optional} |`);
    }
    lines.push('');
  }

  // Examples
  if (doc.examples && doc.examples.length > 0) {
    lines.push('### 示例');
    lines.push('');
    for (const example of doc.examples) {
      lines.push('```typescript');
      lines.push(unwrapFences(example));
      lines.push('```');
      lines.push('');
    }
  }

  // See also
  if (doc.see && doc.see.length > 0) {
    lines.push('### 参考');
    lines.push('');
    for (const ref of doc.see) {
      lines.push(`- ${ref}`);
    }
    lines.push('');
  }

  return lines;
}

// ===== File Processing =====

/**
 * Find all TypeScript source files in a directory
 */
function findSourceFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findSourceFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Process a package and generate documentation
 */
function processPackage(packageConfig: PackageConfig): void {
  console.log(`Processing ${packageConfig.name}...`);

  const sourceDir = path.resolve(packageConfig.packagePath);
  const sourceFiles = findSourceFiles(sourceDir);

  if (sourceFiles.length === 0) {
    console.log(`  No source files found in ${sourceDir}`);
    return;
  }

  console.log(`  Found ${sourceFiles.length} source files`);

  const allDocs: APIDoc[] = [];
  for (const file of sourceFiles) {
    try {
      const docs = parseSourceFile(file);
      allDocs.push(...docs);
    } catch (error) {
      console.error(`  Error parsing ${file}:`, error);
    }
  }

  console.log(`  Extracted ${allDocs.length} API docs`);

  // Generate Markdown
  const markdown = generateMarkdown(packageConfig, allDocs);

  // Write output
  const outputPath = path.resolve(packageConfig.outputFile);
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`  Written to ${packageConfig.outputFile}`);
}

// ===== Main =====

function main(): void {
  console.log('Lyt.js API Documentation Generator');
  console.log('===================================\n');

  const rootDir = path.resolve('.');
  process.chdir(rootDir);

  for (const packageConfig of PACKAGES) {
    try {
      processPackage(packageConfig);
      console.log('');
    } catch (error) {
      console.error(`Error processing ${packageConfig.name}:`, error);
      console.log('');
    }
  }

  console.log('Done!');
}

main();
