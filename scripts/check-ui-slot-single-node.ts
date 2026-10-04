/**
 * 检测「slot 内容只处理数组形态 ⇒ 单个 VNode 被整个丢弃」
 *
 * ## 为什么需要它
 *
 * 2026-10-04 实测：`Popconfirm` / `Tag` / `Timeline` / `TimelineItem` / `Steps`
 * 五处都写成
 *
 *     if (Array.isArray(slotContent)) { children.push(...slotContent) }
 *
 * **没有 else 分支** ⇒ slot 返回**单个 VNode**（最常见的写法）时，
 * 内容**整个被丢弃** —— 用户看到的是「内容不见了」，且**没有任何报错**。
 *
 * 2026-10-02 起本仓的 `initSlots` 修过一次同族问题（VNode 数组分支缺失），
 * 但那修的是**运行期**；这里是**组件侧写法**的复发点 ⇒ 需要门禁盯着。
 *
 * ## 判据形态（零清单）
 *
 * 对每个组件文件：找 `Array.isArray(slot…)` 所在行 ⇒ 往后看该 `if` 块内
 * 是否存在**单节点处理**（`else` 分支里有 push / 调用）。没有 ⇒ 报出。
 *
 * ⚠️ 这是**文本级**判据：它抓的是「忘了写 else」这个**形态**，
 * 抓不到「写了 else 但写错了」。后者仍需行为级判据。
 *
 * ## 用法
 *   tsx scripts/check-ui-slot-single-node.ts
 *
 * 退出码：有命中 ⇒ 1（**红门禁** —— 这个形态的错误后果是「内容静默消失」，
 * 属必须拦住的类别）；无命中 ⇒ 0。
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const UI_DIR = join(ROOT, 'packages/ecosystem/packages/ui/src/components');

if (!existsSync(UI_DIR)) {
  console.error('未找到 UI 组件目录：' + UI_DIR);
  process.exit(0);
}

interface Hit {
  file: string;
  line: number;
  snippet: string;
}

const hits: Hit[] = [];

for (const f of readdirSync(UI_DIR).filter((x) => x.endsWith('.ts'))) {
  const lines = readFileSync(join(UI_DIR, f), 'utf-8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /if\s*\(\s*Array\.isArray\(\s*(\w*[Ss]lot\w*)\s*\)\s*\)\s*\{/.exec(line);
    if (!m) continue;
    // 从这一行起，找到该 if 块的结束（按花括号配平 —— 这里的块都是纯 push，结构简单）
    let depth = 0;
    let started = false;
    let end = i;
    for (let k = i; k < lines.length; k++) {
      for (const ch of lines[k]!) {
        if (ch === '{') {
          depth++;
          started = true;
        } else if (ch === '}') {
          depth--;
          if (started && depth === 0) {
            end = k;
            break;
          }
        }
      }
      if (end !== i) break;
    }
    const block = lines.slice(i, end + 1);
    // 块内出现 `else` ⇒ 有单节点处理
    const hasElse = block.some((l) => /\belse\b/.test(l));
    // 也接受「块外紧跟的 else if（...）push(...)」写法
    const after = lines.slice(end + 1, end + 4).join('\n');
    const hasTrailingElse = /^\s*}\s*else\s*(if\s*)?\(?/.test(after) || /\}\s*else\s/.test(after);
    if (!hasElse && !hasTrailingElse) {
      hits.push({ file: f, line: i + 1, snippet: line.trim().slice(0, 70) });
    }
  }
}

if (hits.length === 0) {
  console.log('✅ 每个 `Array.isArray(slot…)` 分支都处理了「单节点」形态');
  process.exit(0);
}

console.log(`❌ 发现 ${hits.length} 处「只处理数组形态」的 slot 分支（单节点内容会被丢弃）：\n`);
for (const h of hits) {
  console.log(`  ${h.file}:${h.line}  ${h.snippet}`);
}
console.log('\n修法：补 `else`（或 `else if (x)`）把单个 VNode 也 push 进去。');
process.exit(1);
