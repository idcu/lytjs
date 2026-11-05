---
scope: compiler
status: active
severity: P1
last-verified: 2026-11-06
triggers: 1
keywords: [SignalRenderer, 参数名, 短别名, import 剥离, 盈亏平衡]
---
## 症状
**已回退（2026-11-06，决策 `0014`）。** B01b 的产物短别名（别名表 + 替换 + 首行
`//lytjs-signal:` 映射 + renderer 参数缩短）实测净负，已整体回退；保留按引用裁剪 import。
原症状：renderer 报 `ReferenceError: <单字母> is not defined`，栈无模板行号，产物单看完整。
实测：100 模板 65,052 vs 58,797 B（100/100 变大）；N=1/5/20/50 gzip +179/+182/+191/+180；
去映射省 78 B/模板，但编译器 +431 B / +103 B gzip ⇒ raw 平衡点≈6，gzip 50 个未回本。
## 根因
产物 import 行被按行剥离，helper 只能靠 `new Function(paramNames)` 注入：编译期短名与
运行期参数名是同一契约的两份表示，改一侧漏一侧即断链；首行映射只是注释，不能自动还原。
## 正解
产物保持全名；`paramNames` 与 import 全名一一对应、顺序同 args；改任一侧都跑
`scripts/check-compiler-parity.mjs`（真实执行产物）。
