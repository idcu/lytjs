 
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

const PACKAGES: PackageConfig[] = [
  {
    name: '@lytjs/core',
    packagePath: 'packages/core/src',
    outputFile: 'docs/api/core.md',
    description: 'Lyt.js 核心包，提供应用创建、组件定义和组合式 API',
  },
  {
    name: '@lytjs/reactivity',
    packagePath: 'packages/reactivity/src',
    outputFile: 'docs/api/reactivity.md',
    description: '响应式系统，提供 ref、reactive、computed、watch 等 API',
  },
  {
    name: '@lytjs/compiler',
    packagePath: 'packages/compiler/src',
    outputFile: 'docs/api/compiler.md',
    description: '模板编译器，将模板编译为渲染函数',
  },
  {
    name: '@lytjs/renderer',
    packagePath: 'packages/renderer/src',
    outputFile: 'docs/api/renderer.md',
    description: '渲染器，负责虚拟 DOM 的 diff 和 patch',
  },
  {
    name: '@lytjs/component',
    packagePath: 'packages/component/src',
    outputFile: 'docs/api/component.md',
    description: '组件系统，提供组件生命周期、props、emit 等功能',
  },
  {
    name: '@lytjs/vdom',
    packagePath: 'packages/vdom/src',
    outputFile: 'docs/api/vdom.md',
    description: '虚拟 DOM 实现，提供 VNode 创建和 diff 算法',
  },
  {
    name: '@lytjs/router',
    packagePath: 'packages/ecosystem/packages/router/src',
    outputFile: 'docs/api/router.md',
    description: '官方路由管理器，支持 hash 和 history 模式',
  },
  {
    name: '@lytjs/store',
    packagePath: 'packages/ecosystem/packages/store/src',
    outputFile: 'docs/api/store.md',
    description: '状态管理库，提供 Pinia 兼容的 API',
  },
  {
    name: '@lytjs/devtools-extension',
    packagePath: 'packages/tools/packages/devtools/src',
    outputFile: 'docs/api/devtools.md',
    description: '浏览器 DevTools 扩展，用于调试 Lyt.js 应用',
  },
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
    lines.push(doc.deprecated);
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
    lines.push(doc.description);
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
      const defaultVal = param.defaultValue || '-';
      lines.push(
        `| ${param.name} | \`${param.type}\` | ${param.description} | ${optional} | ${defaultVal} |`,
      );
    }
    lines.push('');
  }

  // Returns
  if (doc.returns) {
    lines.push('### 返回值');
    lines.push('');
    lines.push(`**类型:** \`${doc.returns.type}\``);
    if (doc.returns.description) {
      lines.push('');
      lines.push(doc.returns.description);
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
      const type = member.type ? `\`${member.type}\`` : '-';
      const optional = member.optional ? '是' : '否';
      lines.push(`| ${member.name} | ${type} | ${member.description} | ${optional} |`);
    }
    lines.push('');
  }

  // Examples
  if (doc.examples && doc.examples.length > 0) {
    lines.push('### 示例');
    lines.push('');
    for (const example of doc.examples) {
      lines.push('```typescript');
      lines.push(example);
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
