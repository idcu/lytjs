---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [索引, 入口, 路由]
keel-version: 3.4.9
project-state: building      # exploring | architecture-locked | building | frozen
---

# keel · INDEX

> **唯一必读入口。** 检索协议、路由表、项目状态三样的唯一真源就在这里。
> 规格见《Keel 设计稿》§5.1；协议正文必须与 §8 逐字一致，不得改写、不得精简。

## 检索协议（必须遵守）

1. 必读：INDEX.md（唯一入口）+ 当前 NOW*.md —— 固定预算 ≤2.3k token（最坏）
2. 定位：先 grep -rl "关键词" keel/ --exclude-dir=archive --exclude-dir=NOW-history（只出文件名，冷区不参与检索）；命中过多先收窄关键词
3. 读取：只 read 命中的那一个文件；不够就回到第 2 步换关键词，不得扩大范围
4. 预算：单次检索输出 ≤100 行；本轮 Keel 加载总量 ≤15,000 字节（≈5k token）
5. 写回：完成任务必须写回 NOW*.md（新坑登记进 pitfalls/INDEX.md 且 triggers 维护），否则本轮不算完成

## 路由（scope → 入口）

<!-- 规则 1：新增 scope 必须在此加一行。"定位 scope"不允许靠猜。 -->

| scope | 一句话 | 入口 |
|---|---|---|
| meta | 宪法：身份 / 硬约束 / 人审关卡 / 状态机 | [CONSTITUTION.md](CONSTITUTION.md) |
| meta | 代码地图：包拓扑 / 依赖方向 / 构建顺序 | [ARCHITECTURE.md](ARCHITECTURE.md) |
| meta | 门禁真源：快慢档 / 棘轮 / 本仓扩展检查位 | [rules.md](checks/rules.md) |
| now | 当前焦点、下一步与阻塞 | [NOW.md](NOW.md) |
| meta | 决策记录（ADR） | [decisions/INDEX.md](decisions/INDEX.md) |
| meta | 可复用操作手册（shim / 构建顺序 / 反向验证） | [skills/INDEX.md](skills/INDEX.md) |
| meta | 坑库：症状 → 文件（转发链 / dist 陷阱…） | [pitfalls/INDEX.md](pitfalls/INDEX.md) |
| api | 契约真源：公开导出面 / codegen 形态 | [contracts/INDEX.md](contracts/INDEX.md) |
| env | 依赖锁 / 无全局 pnpm / 配额 / mock | [env/INDEX.md](env/INDEX.md) |
| meta | 术语表：唯一写法与禁止写法 | [GLOSSARY.md](GLOSSARY.md) |
| build | 门禁清单（单一真相源，快/慢档） | [../scripts/gate.mjs](../scripts/gate.mjs) |
| build | 构建顺序真相源 | [../scripts/build-order.ts](../scripts/build-order.ts) |

## 冷区指针（只此一行）

[archive/](archive/) · [NOW-history/](NOW-history/)
