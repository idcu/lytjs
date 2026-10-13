---
scope: meta
status: active
last-verified: 2026-10-14
keywords: [坑库, 归档, archive, INDEX 预算, 蒸馏, 容量]
type: decision
created: 2026-10-14
superseded-by:
---

# 0009 已蒸馏的坑移出检索面（archived）

## 背景

`pitfalls/INDEX.md` 贴到域索引预算上限（2991/3000；域索引限 3000 字节 / 80 行）。
实测每行 ≈103 字节（症状 + scope + 级 + **必需的 markdown 链接**）⇒ 预算只容约 29 条。
上一轮已因此**被迫把一条独立陷阱并入另一条**（`double-handler` → `parallel-impl-only-one-fixed`）
—— 即**上限在逼着坑库降低质量**。

而 keel 自身已有三处现成机制，指向同一个答案：
- `pitfalls/_template.md` 的 status 取值写明 `archived（已移入 archive/）`；
- `keel-lint.sh` 的 `hot_files()` = `find keel -name '*.md' -not -path '*/archive/*' -not -path '*/NOW-history/*'`
  ⇒ `*/archive/*` 下的文档**不参与**预算 / 孤儿 / 蒸馏检查；
- `keel/INDEX.md` 检索协议第 2 条本就 `--exclude-dir=archive`，且「冷区指针」已指向 `[archive/]`。

## 决定

**坑库 = 管道，不是档案**：坑的教训被蒸馏后，其文件**移出检索面** ——
`keel/pitfalls/<scope>/x.md` → `keel/archive/pitfalls/<scope>/x.md`，`status` 由 `distilled` 改 `archived`，
并从 `pitfalls/INDEX.md` 删除该行。INDEX 只列**未蒸馏**的活跃坑。

本次执行：把当时的 10 个 `distilled` 坑全部归档 ⇒ INDEX 由 2991 字节降到约 1900（≈10 条余量），
且**不放宽任何预算**（`BYTES_DOMAIN_INDEX` 保持 3000）。

## 被否掉的选项

- **提高 `BYTES_DOMAIN_INDEX`**：那是放宽门禁（owner 级），且治标 —— 按当前增速仍会反复触顶；
- **删掉 `级` / `scope` 列**：每行仅省 5~7 字节（≈2 条），却丢掉速览分级；
- **缩短或去掉链接**：markdown 链接是「孤儿检查」与引用图的前提，去掉会把坑变成孤儿（lint fail）。

## 代价 / 风险

- 归档文件不再受预算与孤儿检查约束 ⇒ 可能静默腐烂。**接受**：它们是冻结的案例史，教训已进宪法，
  且 `archive/` 仍在 git 里可追溯；
- 检索协议 `--exclude-dir=archive` ⇒ 已归档的坑**不会**被关键词命中。**接受**：这正是"出检索面"的定义，
  需要时按「冷区指针」显式进入。
