---
scope: meta
status: active
last-verified: 2026-10-05
keywords: [坑库, 索引, 转发链, dist, 假绿, 门禁]
---

| 症状（一行，供 grep 命中） | scope | 严重度 | → 文件 |
|---|---|---|---|
| 跨层转发：中间层静默丢弃新增字段/回调 | core | P1 | [core/forwarding-chain-drops-options.md](core/forwarding-chain-drops-options.md) |
| 循环依赖：类型环/懒加载环被当成技术债 | core | P2 | [core/circular-deps-three-layers.md](core/circular-deps-three-layers.md) |
| signal 被当普通值：插值输出函数源码 | core | P1 | [core/signal-callable-contract.md](core/signal-callable-contract.md) |
| 测试全绿但门禁报缺导出（陈旧 dist） | build | P1 | [build/dist-src-split-brain.md](build/dist-src-split-brain.md) |
| 文件 failed 但 Tests 全绿（297 未执行） | build | P1 | [build/alias-missing-tests-never-run.md](build/alias-missing-tests-never-run.md) |
| 根 build/coverage 跑不了（沙箱守卫） | build | P2 | [build/sandbox-safe-delete-block.md](build/sandbox-safe-delete-block.md) |
| 测试手写生产不会产生的输入 → 假绿 | verify | P1 | [verify/self-fulfilling-green.md](verify/self-fulfilling-green.md) |
| 检测器假阳性把人引去修不存在的问题 | verify | P1 | [verify/detector-false-positive.md](verify/detector-false-positive.md) |
| 宽松匹配把注释当引用 → 判错依赖 | verify | P2 | [verify/dep-reference-not-dependency.md](verify/dep-reference-not-dependency.md) |
| grep 判导出缺失，实为 export{} 重导出 | verify | P2 | [verify/runtime-export-probe.md](verify/runtime-export-probe.md) |
| 判据转绿但现象仍在（还有第二/三道关） | verify | P1 | [verify/multi-gate-fix.md](verify/multi-gate-fix.md) |
| --list 通过但真跑全失败（退出码 null） | verify | P1 | [verify/verifier-must-really-run.md](verify/verifier-must-really-run.md) |
| 恢复错版本：cp 备份拍在注入之后 | verify | P2 | [verify/verification-order-backup.md](verify/verification-order-backup.md) |
| hydration 判据：新旧 DOM 相同 ⇒ 恒绿 | verify | P2 | [verify/hydration-needs-difference.md](verify/hydration-needs-difference.md) |
| commitlint 三规则拦提交（scope/subject/100 列） | process | P2 | [process/commitlint-rules.md](process/commitlint-rules.md) |
| 批量改写"成功"但代码坏（缩进/花括号） | process | P1 | [process/bulk-edit-must-compile.md](process/bulk-edit-must-compile.md) |
| Node ≥26 内置 localStorage 抢占 jsdom → 存储用例假失败（本机红/CI 绿） | verify | P1 | [verify/node26-localstorage-hijacks-jsdom.md](verify/node26-localstorage-hijacks-jsdom.md) |
