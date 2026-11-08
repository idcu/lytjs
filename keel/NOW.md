---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [S29, S31, S32, 单包测试, vitest alias, setupFiles]
---

# NOW · main

## 当前焦点
- **S32 单包配置统一 src 口径**已修：ca869f07（共享源）、37120e3b（A）、ead06043（B）、
  a75f3835（C）、9986e63f（负控）。
  - 新建 `vitest.shared.ts` 导出 sharedAliases / sharedDefine / sharedSetupFiles；
    根配置改为引用，行为不变（411 文件 / 8769 用例仍全绿）。
  - 30 份 dist 别名单包配置改为 `alias: sharedAliases`，只保留本包 environment /
    include / coverage / timeout；4 条非根 alias（config、metadata、test-utils、
    middleware）按根口径删除，改走包 exports。
  - 无「必须指向 dist」的正当理由，保留清单为空。
  - 54 份单包矩阵：改前 54/54、改后 54/54 全绿；fast 56/56；API 39/1961；
    signal 115×2、parity 115/115 未动；check-vitest-alias-dist 绿。
- S31 已修：3fa3fdc2（core 继承根配置）、5d9c48dc（storage setupFiles）。
- S29 已完成（d51eea43 / ba75eaa4 / aff7cec1 / 2432dd70）。
- B01d 仍延后。

## 下一步
1. 8.0.0 窗口删除 `createVaporRenderer` / `VaporRenderer`。
2. compiler 余量断言行为化；0023 死包删除等 8.0.0。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
