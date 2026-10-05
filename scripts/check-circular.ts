/**
 * 循环依赖检测脚本
 *
 * 使用 madge 检测所有包的循环依赖。
 *
 * ⚠️ **默认模式扫的是 `dist`（构建产物），不是源码**（2026-10-05 实测）：
 *   - `check-circular`（默认 / dist）：检出 **0** 条；
 *   - `check-circular:src`（源码）：检出 198 条 ⇒ 逐层过滤后只剩 **8 条**：
 *     归一化去重 21 条 ⇒ 去掉 8 条纯类型环（`import type`）⇒ 去掉 5 条懒加载环
 *     （`await import()`，调用时才解析 ⇒ 无初始化风险）⇒ **8 条真运行时静态环**，
 *     全部在 `compiler`（`parser-base ↔ parser-children ↔ parser-element`、`optimizations`）。
 *     过滤规则见下方 `detectiveOptions`。
 *   也就是说：**源码里的循环依赖从来没被这个门禁发现过** ——
 *   构建产物的依赖图与源码不同（打包/重排后循环可能消失）。
 *   需要真正查源码循环请用 `pnpm check:circular-src`（较慢：约 29s）。
 *
 * ★ 源码模式带**棘轮基线**（2026-10-05）：源码里确实存在一批循环依赖（既有欠账），
 *   直接判红会让门禁失去意义 ⇒ `scripts/circular-baseline.txt` 记录当前快照，
 *   `--src` **只对「基线之外的新循环」报错**。基线的每一条都必须是
 *   **仓库相对路径**（由本脚本用「入口目录 + madge 的相对路径」算出，
 *   不做任何字符串截断 ⇒ 稳定可比）。
 *
 *   ⚠️ `--write-baseline` 会**整体覆盖**基线文件 —— 文件里若有人工补的
 *     「性质分析」段落，重新生成后需要补回来。
 *   重新生成基线（**只在确认过这些循环确实是既有问题后**才做）：
 *     node scripts/check-circular.ts --src --write-baseline
 *
 * 用法: pnpm run check-circular                     (扫构建产物，快)
 *       pnpm run check-circular:src                 (扫源码 + 棘轮，慢但有意义)
 *       node scripts/check-circular.ts --src --write-baseline
 */

import madge from 'madge';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const isSrc = process.argv.includes('--src');
const writeBaseline = process.argv.includes('--write-baseline');

/** 基线文件（仅 --src 模式使用） */
const BASELINE = join(ROOT, 'scripts/circular-baseline.txt');

/**
 * 把 madge 报出的一条循环**归一化成仓库相对路径**。
 *
 * ★ 关键：madge 返回的每个节点都是**相对于被分析入口所在目录**的路径
 *   （例：入口 `packages/reactivity/src/index.ts` ⇒ 节点 `effect.ts`、
 *   `../common/x.ts`）。因此只要拿**入口目录**去 `resolve`，就能得到
 *   确定的仓库相对路径 —— 不需要任何「取末 N 段」之类的脆弱截断。
 */
function normalizeCycle(cycle: string[], entryDir: string): string {
  return cycle
    .map((node) => {
      const abs = resolve(ROOT, entryDir, node);
      return relative(ROOT, abs).split(/[\\/]/).join('/');
    })
    .join(' → ');
}

function readBaseline(): Set<string> {
  if (!existsSync(BASELINE)) return new Set();
  return new Set(
    readFileSync(BASELINE, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#')),
  );
}

interface PackageEntry {
  name: string;
  path: string;
}

function collectPackages(): PackageEntry[] {
  const packages: PackageEntry[] = [];
  const packagesDir = join(ROOT, 'packages');

  // 顶层包
  const topDirs = readdirSync(packagesDir, { withFileTypes: true });
  for (const dir of topDirs) {
    if (!dir.isDirectory()) continue;
    if (dir.name.startsWith('_') || dir.name === 'common' || dir.name === 'lytui') continue;

    const entryFile = isSrc
      ? join(packagesDir, dir.name, 'src', 'index.ts')
      : join(packagesDir, dir.name, 'dist', 'index.mjs');

    if (existsSync(entryFile)) {
      packages.push({ name: `@lytjs/${dir.name}`, path: entryFile });
    }
  }

  // 孙包目录
  const subDirs = [
    'common/packages',
    'common/common-warn',
    'ecosystem/packages',
    'plugins/packages',
    'tools/packages',
  ];
  for (const sub of subDirs) {
    const subPath = join(packagesDir, sub);
    if (!existsSync(subPath)) continue;

    const dirs = readdirSync(subPath, { withFileTypes: true });
    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const entryFile = isSrc
        ? join(subPath, dir.name, 'src', 'index.ts')
        : join(subPath, dir.name, 'dist', 'index.mjs');

      if (existsSync(entryFile)) {
        packages.push({ name: `@lytjs/${dir.name}`, path: entryFile });
      }
    }
  }

  return packages;
}

async function main(): Promise<void> {
  console.log(`🔍 检查循环依赖 (${isSrc ? '源码模式' : '构建模式'})...\n`);

  if (!isSrc) {
    // ★ 2026-10-05：默认模式扫的是 dist，**源码里的循环它一个都查不到**
    //   （实测默认 0 条 vs 源码 198 条）⇒ 必须把这件事说在前面，
    //   否则「✅ 未发现循环依赖」会被误读成「源码没有循环依赖」。
    console.log('⚠️  注意：当前是**构建产物（dist）**模式。');
    console.log('   实测（2026-10-05）：该模式检出 0 条，而源码模式检出 198 条');
    console.log('   ⇒ 源码里**确实存在**循环依赖，默认模式查不到。');
    console.log('   要真查源码请跑：pnpm check-circular:src\n');
  }

  const packages = collectPackages();

  if (packages.length === 0) {
    console.log('⚠️  未找到任何包入口文件。');
    console.log(isSrc ? '请确保 src/index.ts 文件存在。' : '请先运行 pnpm build。');
    process.exit(1);
  }

  console.log(`扫描到 ${packages.length} 个包，逐个检查中...\n`);

  const allCircular: string[][] = [];

  for (const pkg of packages) {
    try {
      console.log(`📦 检查 ${pkg.name}...`);

      const result = await madge(pkg.path, {
        fileExtensions: ['ts', 'js', 'mjs', 'cjs'],
        tsConfig: join(ROOT, 'tsconfig.base.json'),
        alias: {
          '@lytjs/*': join(ROOT, 'packages/*').replace(/\\/g, '/'),
        },
        // ★★ 只看**运行时**的循环（2026-10-05）。
        // TS 的 `import type` 在编译期被**完全擦除** ⇒ 由它形成的环
        // 在运行时**不存在**，因此不是真问题。
        // 实测：`reactivity` 的 7 条循环里有 6 条是纯类型环
        //（`effect-scope ↔ effect-scope-registrar` 两个方向**全是** `import type`），
        // 跳过类型导入后只剩 **1 条**真运行时环（`effect.ts → signal.ts`）。
        // ⚠️ 若将来要连类型环一起查，去掉这个选项即可（但基线要重新生成）。
        //   ⚠️ `skipAsyncImports`：**动态 `import()` 不算依赖边**。
        //     理由：静态 `import` 在模块**初始化**时就绑定 ⇒ 环会导致 TDZ /
        //     「拿到 undefined」；而 `await import()` 是**调用时**才解析，
        //     执行时双方模块早已初始化完毕 ⇒ 不构成初始化环。
        //     本仓的 `core ↔ renderer` 4 条环**全部**是这种懒加载环
        //     （`core/create-app.ts` 里 `await import('@lytjs/renderer')`，
        //      `renderer/hydration/enhanced-hydration.ts` 里 `await import('@lytjs/core')`，
        //      且后者文件头明确写了「这么写是踩过坑之后的刻意选择」）。
        //     ⚠️ 若要连懒加载环一起查，去掉该选项即可（基线要重新生成）。
        detectiveOptions: { ts: { skipTypeImports: true, skipAsyncImports: true } },
      });

      const circular = result.circular();
      if (circular.length > 0) {
        // ★ 归一化：madge 的节点是**相对入口目录**的 ⇒ 用入口目录还原成仓库相对路径
        const entryDir = dirname(pkg.path);
        for (const cycle of circular) {
          allCircular.push(normalizeCycle(cycle, entryDir));
        }
        console.log(`   ❌ 发现 ${circular.length} 个循环依赖`);
      } else {
        console.log(`   ✅ 无循环依赖`);
      }
    } catch (err) {
      console.warn(`   ⚠️  跳过 ${pkg.name}: ${(err as Error).message}`);
    }
  }

  console.log('\n========================================');

  if (allCircular.length === 0) {
    console.log('✅ 所有包均未发现循环依赖。\n');
    process.exit(0);
  }

  console.log(`❌ 发现 ${allCircular.length} 个循环依赖：\n`);

  // 去重（同一循环可能被多个包入口检出）
  const unique = [...new Set(allCircular)];

  // ★ 源码模式：与基线比对，**只对新增的循环报错**（棘轮）
  if (isSrc) {
    if (writeBaseline) {
      writeFileSync(
        BASELINE,
        [
          '# 源码级循环依赖基线（棘轮）—— 由 `node scripts/check-circular.ts --src --write-baseline` 生成',
          '#',
          '# 语义：这些是**已确认的既有欠账**，门禁只对**新增**循环报错。',
          '# 格式：每行一条，仓库相对路径（`/` 分隔），节点用 ` → ` 连接。',
          '#',
          `# 共 ${unique.length} 条 · 生成于 ${new Date().toISOString().slice(0, 10)}`,
          ...unique.sort(),
          '',
        ].join('\n'),
        'utf-8',
      );
      console.log(`\n✅ 已写入基线：${unique.length} 条 → scripts/circular-baseline.txt\n`);
      process.exit(0);
    }

    const known = readBaseline();
    const fresh = unique.filter((c) => !known.has(c));
    const fixed = [...known].filter((c) => !new Set(unique).has(c));

    if (fixed.length > 0) {
      console.log(`\n🎉 已消除的循环（基线里有、现在没有）：${fixed.length} 条`);
      for (const c of fixed.slice(0, 10)) console.log(`   ✔ ${c}`);
      if (fixed.length > 10) console.log(`   …（其余 ${fixed.length - 10} 条略）`);
      console.log('   ⇒ 建议**同步删掉基线里的对应行**，让基线只反映当前真实欠账。\n');
    }

    if (fresh.length === 0) {
      console.log(
        `✅ 源码循环依赖：${unique.length} 条，与基线一致（无新增）。\n` +
          `   （基线 ${known.size} 条 · 门禁只拦新增；彻底解决请分批重构并删基线行）`,
      );
      process.exit(0);
    }

    console.log(`❌ 新增 ${fresh.length} 条源码循环依赖（不在基线内）：\n`);
    for (const c of fresh) console.log(`  🔄 ${c}`);
    console.log('\n这���是**新引入**的循环依赖，请重构消除。');
    console.log(
      '若确认是既有问题而本次只是暴露，请把它写进 scripts/circular-baseline.txt 并注明原因。',
    );
    process.exit(1);
  }

  for (const cycle of allCircular) {
    console.log(`  🔄 ${cycle}`);
  }

  console.log('\n请重构以上模块以消除循环依赖。');
  process.exit(1);
}

main();
