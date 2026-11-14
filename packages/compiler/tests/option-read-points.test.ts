/**
 * C-14 判据：公开选项字段必须有真实读取点
 *
 * 背景：`ParserOptions` / `TransformOptions` / `CompilerOptions` 里曾出现多个
 * 「只声明、从未读取」的装饰性选项（写进文档、调用方也传，但编译器从不消费）。
 * 本测试用 TypeScript 类型检查器机械化地守护这条契约：
 *
 *  1. 从 `src/types.ts` 的 AST 中取出三个公开接口的**自有字段**；
 *  2. 遍历 `src/**\/*.ts`，只认**类型可归属到目标接口字段**的读取：
 *     - 成员读取：`options.ssr`
 *     - 下标读取：`options['ssr']`
 *     - 解构读取：`const { ssr } = options` / 参数解构
 *  3. 任一字段零读取点即失败，并列出 `接口.字段`。
 *
 * 为什么不用「字符串出现」：`inline` 同时存在于 `WasmCompilerOptions` 与
 * `TransformOptions`，按字符串判定会把 wasm 的读取算到公开选项头上（假绿）。
 * 这里通过 `checker.getPropertyOfType` 找到属性声明节点，再核对它声明的接口名，
 * 因此同名但不同来源的读取不会被误记。
 */

import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, '..');
const SRC_DIR = join(PACKAGE_ROOT, 'src');
const TYPES_FILE = join(SRC_DIR, 'types.ts');

const PUBLIC_OPTION_INTERFACES = ['ParserOptions', 'TransformOptions', 'CompilerOptions'] as const;
type PublicOptionInterface = (typeof PUBLIC_OPTION_INTERFACES)[number];

function createProgram(): ts.Program {
  const configPath = ts.findConfigFile(PACKAGE_ROOT, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error(`找不到 ${PACKAGE_ROOT}/tsconfig.json，判据自身失效`);
  }
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) {
    throw new Error(
      `读取 tsconfig 失败：${ts.flattenDiagnosticMessageText(config.error.messageText, ' ')}`,
    );
  }
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, PACKAGE_ROOT);
  return ts.createProgram(parsed.fileNames, parsed.options);
}

function loadTypesSource(): ts.SourceFile {
  const text = ts.sys.readFile(TYPES_FILE);
  if (text === undefined) {
    throw new Error(`读不到 ${TYPES_FILE}`);
  }
  return ts.createSourceFile(TYPES_FILE, text, ts.ScriptTarget.Latest, true);
}

/** 取出公开接口的自有字段名（只看接口体，不展开 extends）。 */
function collectOwnFields(source: ts.SourceFile): Map<PublicOptionInterface, string[]> {
  const result = new Map<PublicOptionInterface, string[]>();
  for (const statement of source.statements) {
    if (!ts.isInterfaceDeclaration(statement)) continue;
    const name = statement.name.text as PublicOptionInterface;
    if (!PUBLIC_OPTION_INTERFACES.includes(name)) continue;
    const fields: string[] = [];
    for (const member of statement.members) {
      if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
        fields.push(member.name.text);
      }
    }
    result.set(name, fields);
  }
  for (const name of PUBLIC_OPTION_INTERFACES) {
    if (!result.has(name)) {
      throw new Error(`src/types.ts 里找不到 interface ${name}，判据自身失效`);
    }
  }
  return result;
}

/**
 * 属性 `key` 是否**声明在**目标接口（而不是同名但来自其它接口，如 WasmCompilerOptions）。
 */
function typeDeclaresFieldFrom(
  type: ts.Type,
  key: string,
  interfaceName: PublicOptionInterface,
  checker: ts.TypeChecker,
): boolean {
  const candidates = type.isUnion() ? type.types : [type];
  for (const candidate of candidates) {
    const property = checker.getPropertyOfType(candidate, key);
    if (!property) continue;
    for (const declaration of property.declarations ?? []) {
      if (
        ts.isPropertySignature(declaration) &&
        ts.isInterfaceDeclaration(declaration.parent) &&
        declaration.parent.name.text === interfaceName
      ) {
        return true;
      }
    }
  }
  return false;
}

/** 绑定模式里是否解构了 `key`，且来源类型的该属性声明在目标接口。 */
function bindingPatternReadsField(
  pattern: ts.ObjectBindingPattern,
  key: string,
  interfaceName: PublicOptionInterface,
  checker: ts.TypeChecker,
): boolean {
  for (const element of pattern.elements) {
    const nameNode = element.propertyName ?? element.name;
    if (!ts.isIdentifier(nameNode) || nameNode.text !== key) continue;
    if (typeDeclaresFieldFrom(checker.getTypeAtLocation(pattern), key, interfaceName, checker)) {
      return true;
    }
  }
  return false;
}

function sourceFileReadsField(
  source: ts.SourceFile,
  key: string,
  interfaceName: PublicOptionInterface,
  checker: ts.TypeChecker,
): boolean {
  let found = false;

  const visit = (node: ts.Node): void => {
    if (found) return;

    if (ts.isPropertyAccessExpression(node) && node.name.text === key) {
      if (
        typeDeclaresFieldFrom(
          checker.getTypeAtLocation(node.expression),
          key,
          interfaceName,
          checker,
        )
      ) {
        found = true;
        return;
      }
    } else if (
      ts.isElementAccessExpression(node) &&
      node.argumentExpression &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === key
    ) {
      if (
        typeDeclaresFieldFrom(
          checker.getTypeAtLocation(node.expression),
          key,
          interfaceName,
          checker,
        )
      ) {
        found = true;
        return;
      }
    } else if (
      (ts.isVariableDeclaration(node) || ts.isParameter(node)) &&
      ts.isObjectBindingPattern(node.name) &&
      bindingPatternReadsField(node.name, key, interfaceName, checker)
    ) {
      found = true;
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(source);
  return found;
}

describe('C-14 公开选项必须有真实读取点', () => {
  it('ParserOptions / TransformOptions / CompilerOptions 的每个字段都至少被 src 读取一次', () => {
    const program = createProgram();
    const checker = program.getTypeChecker();

    const typesSource = loadTypesSource();
    const ownFields = collectOwnFields(typesSource);

    const scanned = program
      .getSourceFiles()
      .filter(
        (file) =>
          !file.isDeclarationFile &&
          file.fileName.startsWith(SRC_DIR) &&
          !file.fileName.endsWith('types.ts'),
      );

    const missing: string[] = [];
    for (const [interfaceName, fields] of ownFields) {
      for (const field of fields) {
        const read = scanned.some((file) =>
          sourceFileReadsField(file, field, interfaceName, checker),
        );
        if (!read) {
          missing.push(`${interfaceName}.${field}`);
        }
      }
    }

    expect(missing).toEqual([]);
    // 该用例要创建 TS Program 并遍历 src：plain vitest 约 2s，v8 覆盖率插桩后约 6-7s，
    // 默认 5s 超时会让 `test:coverage` 假红。
  }, 60_000);
});
