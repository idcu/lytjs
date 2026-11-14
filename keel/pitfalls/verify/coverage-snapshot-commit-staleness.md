---
scope: verify
status: active
severity: P2
last-verified: 2026-11-14
triggers: 2
keywords: [覆盖率, coverage, snapshot, 快照, 过期, 97.99, 旧口径]
---

## 症状

`check-coverage-snapshot` 绿，但「覆盖率 xx%」描述的是几十个提交前的代码；
「97.99%」被当成当前可信数字。

## 根因

旧门禁只读受版本控制的 `scripts/coverage-snapshot.json`，从不打开 `coverage/`；
生成器又把**当前** HEAD 写进用陈旧产物算出的快照 ⇒ commit 永远等于 HEAD。
97.5% 总额阈值等价于「最多 11 个文件可不插桩」；97.99% 是该旧口径的数，
并非语句覆盖率。

## 正解

- **2026-11-14 判据口径变更（不是缺陷修复）**：快照改写 gitignore 的
  `coverage/snapshot.json`，记录 `coverage-final.json` 的 sha256 与生成时 HEAD；
  校验侧两者都必须与现场一致，否则提示重跑 `test:coverage`。
- 未插桩文件必须全在 `scripts/coverage-uninstrumented.json` 冻结清单内，
  清单外任何一个即红；总额阈值废止。
- 生成器在产物早于当前树或有未提交改动时拒绝写入。
- 历史「97.99%」为旧口径，不可横比。
