---
scope: now
status: active
last-verified: 2026-11-09
updated: 2026-11-09
keywords: [S25, 测试解耦, vdom, compiler, B01d, C3]
---

# NOW · main

## 当前焦点
- **S25 测试解耦**：84c70f5a / d751b968 / 7804e7ee。
  - 类1 `getBlockStackDepth` 18 处 → Block 作用域 LIFO/子节点行为。
  - 类2 `patchFlag === 16` 1 处 → 公开 `PatchFlags.FULL_PROPS`。
  - 类3 `ctx._instance` 待决：只写不读，无公开行为可断，未删断言。
  - 类4 `codegen.test.ts` 56 处产物字符串断言 → 执行产物断 VNode/插槽/双向绑定/缓存；55 改，动态属性名 1 处待决。
- **实测**：fast 56/56；vdom 573/573；compiler 1686/1686；signal 115×2；parity 115/115、divergent 0；api 39/1961。
- **alias**：54 个配置文件 / 213 条目标（订正旧记 54/216）。
- **C1/C2/C3** 已完成，见 NOW-history；B01d 仍延后。

## 下一步
1. 待决：动态属性名被写成字面量 key；`_instance` 无读取点（可随 S29 清理）。
2. compiler 其余 476 处 code/preamble 断言可分批行为化（battery 边界见 check-e2e-assertions）。
3. 0023 死包删除等 8.0.0 窗口。

## 阻塞
- 覆盖率并发/safe-delete → 单包复核/reportsDirectory。
