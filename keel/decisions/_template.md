---
scope: meta
status: active            # 被取代时改成 archived，并补 superseded-by
last-verified: 2026-09-30
keywords: [决策, ADR]
type: decision            # 冻结期例外改成 exception，并补 created（缺了 lint 直接 fail）
created: 2026-09-30       # 只有 type: exception 才被 lint 强制，但建议一律写上
superseded-by:            # 被谁取代，写同目录文件名如 0007-xxx.md；lint 会检查它存在
---

# <0001 决策标题，一句话>

<!-- 复制本文件时：文件名用 0001-<slug>.md（四位序号递增，日期只允许出现在冷区归档名里），
     删掉本段注释，并在 decisions/INDEX.md 加一行。

     ADR 定稿即不可变：**不要改正文，要改就再写一篇、互相写 superseded-by**（§9.4）。
     这也是 ADR 豁免 last-verified 陈旧检查的原因——时效靠"被谁取代"表达，不靠日期。 -->

## 背景

<什么情况下必须做这个决定？不写背景的 ADR，半年后没人看得懂为什么。>

## 决定

<决定做什么。一句话说完最好；说不完，通常说明决定还没想清楚。>

## 被否掉的选项

| 选项 | 为什么没选 |
|---|---|
| <选项 A> | <原因> |

<!-- 这一节是 ADR 最值钱的部分：它防的是"半年后又有人提同样的方案"。 -->

## 后果

- 好处：<...>
- 代价：<...>

<!-- 必须写代价。只写好处的 ADR 是宣传稿，不是决策记录。 -->
