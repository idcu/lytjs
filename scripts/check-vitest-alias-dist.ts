/**
 * 守卫：`vitest.config.ts` 里每个 `@lytjs/*` alias 指向的**文件必须真的存在**
 *
 * ## 为什么需要它（2026-10-05 实测）
 *
 * `vitest.config.ts` 把各包 alias 到 `packages/…/dist/index.mjs`（少数指 `src`）。
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
 * 解析 `vitest.config.ts` 的 `resolve.alias`，逐条断言**目标文件存在**。
 * 属于**快档**（只读一个文件、毫秒级）⇒ 放进日常反馈路径。
 *
 * ★ 刻意**不做**的事：不去「顺手建 dist」。缺 dist 是构建状态问题，
 *   应该由 `gate.mjs build` 负责；本守卫只负责**把缺失这件事说清楚**。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = resolve(ROOT, 'vitest.config.ts');

function collectAliasTargets(src: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  // 只关心形如 `'@lytjs/xxx': resolve(root, 'packages/...')` 的条目
  const re = /'(@lytjs\/[^']+)':\s*resolve\(\s*root,\s*'([^']+)'\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out.push([m[1]!, m[2]!]);
  }
  return out;
}

function main(): void {
  if (!existsSync(CONFIG)) {
    console.error(`❌ 找不到 ${CONFIG}`);
    process.exit(1);
  }
  const src = readFileSync(CONFIG, 'utf-8');
  const entries = collectAliasTargets(src);

  if (entries.length === 0) {
    console.log('⚠️  未从 vitest.config.ts 解析到任何 @lytjs/* alias —— 守卫已失效？');
    process.exit(1);
  }

  // 两种缺失要分开报：
  // ① 死 alias：路径里的**包目录都不存在**（配置指向了本仓没有的包）
  // ② 缺构建：包在，但 dist/index.mjs 没建
  // ── 已知问题白名单（棘轮）：这些条目**已知**不成立，登记在案不再报错，
  //    但一旦清单里出现**新的**问题就仍然失败（否则门禁会被直接关掉）。
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
    // 去掉末两段（dist/index.mjs）后看包目录是否还在
    const pkgDir = resolve(ROOT, rel.replace(/[\\/]dist[\\/]index\.m?js$/, ''));
    if (existsSync(pkgDir)) missingDist.push([name, rel]);
    else deadAlias.push([name, rel]);
  }

  // 过滤掉已登记的已知问题
  const isKnown = (name: string, rel: string): boolean => KNOWN.has(`${name} ${rel}`);
  const deadNew = deadAlias.filter(([n, r]) => !isKnown(n, r));
  const distNew = missingDist.filter(([n, r]) => !isKnown(n, r));
  const knownHit = deadAlias.length + missingDist.length - deadNew.length - distNew.length;

  if (deadNew.length === 0 && distNew.length === 0) {
    console.log(
      `✅ 通过：${entries.length} 个 @lytjs/* alias 目标全部存在（测试不会因缺 dist 而静默少跑）` +
        (knownHit > 0
          ? `\n   ℹ️  另有 ${knownHit} 个**已登记**的已知问题（见 scripts/vitest-alias-known-issues.txt）`
          : ''),
    );
    process.exit(0);
  }

  if (distNew.length > 0) {
    console.error(
      `❌ 有 ${distNew.length} 个 alias 指向的**构建产物不存在** —— 对应包的测试会\n` +
        `   在收集阶段失败、其用例**一个都不会执行**（但「Tests N passed」看起来仍像通过）：\n`,
    );
    for (const [name, rel] of distNew) {
      console.error(`  ${name.padEnd(30)} → ${rel}`);
    }
    console.error(`\n  修法：构建这些包（node scripts/gate.mjs build，或逐包 tsup）后重跑测试。`);
  }

  if (deadNew.length > 0) {
    console.error(
      `\n❌ 另有 ${deadNew.length} 个 alias 指向**本仓不存在的包目录**（死 alias）：\n`,
    );
    for (const [name, rel] of deadNew) {
      console.error(`  ${name.padEnd(30)} → ${rel}`);
    }
    console.error(
      `\n  这类不是「忘了构建」，而是**配置指向了不存在的包**。\n` +
        `  修法二选一：① 若该包确实要存在 ⇒ 先建包；\n` +
        `            ② 若本仓不做它 ⇒ 从 vitest.config.ts 的 alias 里删掉（留着只会让\n` +
        `               依赖它的测试永远无法收集）。`,
    );
  }

  process.exit(1);
}

main();
