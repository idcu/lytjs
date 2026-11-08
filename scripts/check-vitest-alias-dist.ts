/**
 * 守卫：`vitest.config.*` 里每个 alias 指向的**目标路径必须真的存在**
 *
 * ## 为什么需要它（2026-10-05 实测）
 *
 * 根 `vitest.config.ts` 把各包 alias 到 `packages/…/dist/index.mjs`（少数指 `src`）。
 * 一次 `packages/vdom/tests` 的运行结果曾长这样：
 *
 *     Test Files  10 failed | 5 passed (15)
 *     Tests       121 passed (121)
 *
 * —— 看着像「只有 10 个文件挂了」，实际上是那 10 个文件**在收集阶段就失败**
 * （`Failed to resolve import "@lytjs/common-object"`）⇒
 * **它们的测试一个都没跑**（真实数量是 418）。
 *
 * 危险之处：**「Tests N passed」并不代表用例都跑了**。
 * 缺失的 dist 只需要**少建一个包**就会出现，且极易被误读成「测试通过」。
 *
 * ## 本守卫做什么
 *
 * 1. 解析**根** `vitest.config.ts` 的 `resolve.alias`，逐条断言**目标文件存在**。
 * 2. 扫描 `packages/**\/vitest.config.*`，**动态加载**每个包级配置，读取其
 *    `resolve.alias`，同样断言目标存在。
 *    - 2026-11-08 补盲：此前只看根配置，devtools 包级 alias 的 `../..`/`../../..`
 *      写错（指向仓库根 `reactivity/`）长期无人发现；根 `vitest run` 不读包级配置，
 *      于是「gate 全绿」与「包级测试能跑」之间没有因果关系。
 *    - 用动态 import 而不是正则解析：包级配置的别名大量使用
 *      `resolve(__dirname, '..')` + 模板串 + 正则 `find`，静态解析既漏检又易误报。
 * 3. 正则 `find` 的 replacement 含 `$1` 时无法断言完整路径，只断言**静态前缀目录**
 *    存在（足以抓住「根目录写错」这类真实故障）。
 *
 * 属于**快档**（只读配置、毫秒级）⇒ 放进日常反馈路径。
 *
 * ★ 刻意**不做**的事：不去「顺手建 dist」。缺 dist 是构建状态问题，
 *   应该由 `gate.mjs build` 负责；本守卫只负责**把缺失这件事说清楚**。
 */
import { existsSync, globSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = resolve(ROOT, 'vitest.config.ts');

interface AliasEntry {
  name: string;
  target: string;
}

function collectAliasTargets(src: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  // 只关心形如 `'@lytjs/xxx': resolve(root, 'packages/...')` 的条目
  //
  // ⚠️ 2026-10-27 修：此前正则结尾是 `'([^']+)'\s*\)`，**不容忍尾逗号**。
  // 而多行写法（prettier 对超长行会自动折行）必然带尾逗号：
  //   '@lytjs/common-dom-helpers': resolve(
  //     root,
  //     'packages/common/packages/dom-helpers/src',
  //   ),
  // ⇒ 8 条 alias 被静默漏检（实测 47 条只解析到 39 条），门禁报「39 个全部存在」是假绿。
  // 现在允许可选的尾逗号。
  const re = /'(@lytjs\/[^']+)':\s*resolve\(\s*root,\s*'([^']+)'\s*,?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out.push([m[1]!, m[2]!]);
  }
  return out;
}

/** 把任意形态的 `resolve.alias` 归一成 (name, target) 列表。 */
function normalizeAlias(alias: unknown): AliasEntry[] {
  const out: AliasEntry[] = [];
  if (!alias) return out;
  if (Array.isArray(alias)) {
    for (const raw of alias) {
      const item = raw as { find?: unknown; replacement?: unknown };
      if (!item || typeof item !== 'object') continue;
      const name = typeof item.find === 'string' ? item.find : String(item.find ?? '');
      for (const target of toTargets(item.replacement)) out.push({ name, target });
    }
    return out;
  }
  if (typeof alias === 'object') {
    for (const [name, replacement] of Object.entries(alias as Record<string, unknown>)) {
      for (const target of toTargets(replacement)) out.push({ name, target });
    }
  }
  return out;
}

function toTargets(replacement: unknown): string[] {
  if (typeof replacement === 'string') return [replacement];
  if (Array.isArray(replacement)) {
    return replacement.filter((x): x is string => typeof x === 'string');
  }
  return [];
}

/** 正则 replacement 含 `$1` 时，取第一个 `$/…` 之前的目录作为可断言的静态前缀。 */
function staticPrefix(target: string): string {
  const idx = target.indexOf('$');
  if (idx === -1) return target;
  const slash = target.lastIndexOf('/', idx);
  return slash === -1 ? '' : target.slice(0, slash);
}

/** 缺目标时区分「缺构建产物」与「指向不存在的包目录」。 */
function classify(target: string): 'missingDist' | 'deadAlias' {
  const pkgDir = target.replace(/[\\/]dist[\\/][^/\\]+$/, '');
  return existsSync(pkgDir) ? 'missingDist' : 'deadAlias';
}

async function scanPackageConfigs(): Promise<number> {
  const configs = globSync('packages/**/vitest.config.{ts,mts,js,mjs}', {
    cwd: ROOT,
    exclude: ['**/node_modules/**'],
  }).sort();

  if (configs.length === 0) {
    console.error('❌ 未找到任何包级 vitest 配置 —— 守卫已失效？');
    return 1;
  }

  let checked = 0;
  let skippedNoAlias = 0;
  const dead: Array<AliasEntry & { config: string }> = [];
  const missing: Array<AliasEntry & { config: string }> = [];
  const failedImports: Array<{ config: string; error: string }> = [];

  for (const relCfg of configs) {
    const cfg = resolve(ROOT, relCfg);
    let mod: unknown;
    try {
      mod = await import(pathToFileURL(cfg).href);
    } catch (err) {
      failedImports.push({
        config: relCfg,
        error: String(err instanceof Error ? err.message : err),
      });
      continue;
    }
    const conf = (mod as { default?: unknown }).default ?? mod;
    const alias = (conf as { resolve?: { alias?: unknown } })?.resolve?.alias;
    const entries = normalizeAlias(alias);
    if (entries.length === 0) {
      skippedNoAlias++;
      continue;
    }
    for (const { name, target } of entries) {
      // 只有绝对路径能直接断言；包名/函数式 replacement 不属于路径检查范围。
      if (!target.startsWith('/')) continue;
      checked++;
      const probe = staticPrefix(target);
      if (probe && existsSync(probe)) continue;
      const kind = classify(probe || target);
      const hit = { config: relCfg, name, target };
      if (kind === 'missingDist') missing.push(hit);
      else dead.push(hit);
    }
  }

  if (failedImports.length > 0) {
    console.error(`\n❌ 有 ${failedImports.length} 个包级 vitest 配置无法加载，alias 未校验：\n`);
    for (const { config, error } of failedImports) console.error(`  ${config}\n    ${error}`);
    return 1;
  }

  if (dead.length === 0 && missing.length === 0) {
    console.log(
      `✅ 包级配置：${configs.length} 个文件 / ${checked} 条绝对路径 alias 目标全部存在` +
        (skippedNoAlias > 0 ? `（${skippedNoAlias} 个配置无 alias，跳过）` : ''),
    );
    return 0;
  }

  if (missing.length > 0) {
    console.error(`\n❌ 包级配置有 ${missing.length} 条 alias 指向**构建产物不存在**：\n`);
    for (const { config, name, target } of missing) {
      console.error(`  ${config}\n    ${name} → ${target}`);
    }
    console.error('\n  修法：先构建对应包（node scripts/gate.mjs build）后重跑。');
  }

  if (dead.length > 0) {
    console.error(`\n❌ 包级配置有 ${dead.length} 条 alias 指向**不存在的目录**：\n`);
    for (const { config, name, target } of dead) {
      console.error(`  ${config}\n    ${name} → ${target}`);
    }
    console.error(
      '\n  这类通常是相对层级写错（如 `../..` 与 `../../..`）。\n' +
        '  修法：按配置文件自身所在层级修正相对路径；不要用「构建」掩盖。',
    );
  }
  return 1;
}

async function main(): Promise<void> {
  if (!existsSync(CONFIG)) {
    console.error(`❌ 找不到 ${CONFIG}`);
    process.exit(1);
  }

  // ── 根配置（保持原有静态解析与已知问题棘轮）──────────────────────
  const src = readFileSync(CONFIG, 'utf-8');
  const entries = collectAliasTargets(src);

  if (entries.length === 0) {
    console.log('⚠️  未从 vitest.config.ts 解析到任何 @lytjs/* alias —— 守卫已失效？');
    process.exit(1);
  }

  const KNOWN = new Set(
    readFileSync(resolve(ROOT, 'scripts/vitest-alias-known-issues.txt'), 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#')),
  );

  const deadAlias: Array<[string, string]> = [];
  const missingDist: Array<[string, string]> = [];
  for (const [name, rel] of entries) {
    if (existsSync(resolve(ROOT, rel))) continue;
    const pkgDir = resolve(ROOT, rel.replace(/[\\/]dist[\\/]index\.m?js$/, ''));
    if (existsSync(pkgDir)) missingDist.push([name, rel]);
    else deadAlias.push([name, rel]);
  }

  const isKnown = (name: string, rel: string): boolean => KNOWN.has(`${name} ${rel}`);
  const deadNew = deadAlias.filter(([n, r]) => !isKnown(n, r));
  const distNew = missingDist.filter(([n, r]) => !isKnown(n, r));
  const knownHit = deadAlias.length + missingDist.length - deadNew.length - distNew.length;

  if (distNew.length > 0) {
    console.error(
      `❌ 根配置有 ${distNew.length} 个 alias 指向的**构建产物不存在** —— 对应包的测试会\n` +
        `   在收集阶段失败、其用例**一个都不会执行**（但「Tests N passed」看起来仍像通过）：\n`,
    );
    for (const [name, rel] of distNew) console.error(`  ${name.padEnd(30)} → ${rel}`);
    console.error(`\n  修法：构建这些包（node scripts/gate.mjs build，或逐包 tsup）后重跑测试。`);
  }

  if (deadNew.length > 0) {
    console.error(
      `\n❌ 根配置另有 ${deadNew.length} 个 alias 指向**本仓不存在的包目录**（死 alias）：\n`,
    );
    for (const [name, rel] of deadNew) console.error(`  ${name.padEnd(30)} → ${rel}`);
  }

  if (deadNew.length > 0 || distNew.length > 0) {
    console.error(
      '\n  死 alias 的修法二选一：① 若该包确实要存在 ⇒ 先建包；\n' +
        '                    ② 若本仓不做它 ⇒ 从 alias 里删掉（留着只会让依赖它的测试永远无法收集）。',
    );
    process.exit(1);
  }

  console.log(
    `✅ 根配置：${entries.length} 个 @lytjs/* alias 目标全部存在（测试不会因缺 dist 而静默少跑）` +
      (knownHit > 0
        ? `\n   ℹ️  另有 ${knownHit} 个**已登记**的已知问题（见 scripts/vitest-alias-known-issues.txt）`
        : ''),
  );

  // ── 包级配置 ───────────────────────────────────────────────
  const code = await scanPackageConfigs();
  process.exit(code);
}

main();
