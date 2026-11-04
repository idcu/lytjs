# @lytjs/adapter-web 更新日志

## [未发布] - 2026-11-04

### 🐞 修复（水合属性清理拿不到宿主能力）

- **`WebRendererHost` 补上 `getAttributeNames()`**：同名方法此前只存在于
  `createExtendedWebHost()` 的扩展宿主上，而 `web-dom-renderer` 用的是基类
  ⇒ 渲染器取不到 ⇒ 水合后「服务端有、客户端没有」的属性（`id` / `title` / `data-*`）
  全部残留。
- **`web-dom-renderer` 把它转发进 `RendererOptions`**：水合的三项内省能力
  （`getNodeType` / `getTagName` / `getChildNodes`）此前已逐个转发，本次补第 4 项。

## [未发布] - 2026-11-03

### 🐞 修复（事件修饰符 4 个「静默不触发」）

- **`.once` 更新 handler 后永不触发**：触发一次后监听已被浏览器摘掉，invoker 缓存却还留着
  ⇒ 下一次更新只换 `value` ⇒ 点击彻底失效。现在 `.once` 的更新走**重新绑定**（重新武装）。
- **修饰符更新不生效**：`@click` 改成 `@click.stop` / 加 `.capture` 时只换 `value`，
  新修饰符不生效（`.capture` 还会导致 removeEventListener 的 options 不匹配）。
  现在比较「实际生效的选项」，变化即重绑。
- **`.self` 判断顺序错误**：此前是 stop → prevent → self，于是 `@click.self.stop`
  在**子元素**上点击时仍然 stopPropagation（外层收不到）。现在 self 最先判断。
- **值对象 `{ once: true }` 改成普通值时 once 未取消**：`_parsed` 只记 prop 名的修饰符，
  漏掉了值对象那一半。新增 `_options` 记录实际传给 addEventListener 的选项。

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6



## [6.6.0] - 2026-05-21

### 🚀 版本升级

- 版本升级至 v6.6.0
- 保持完全向后兼容
- 所有依赖包已更新至 6.6.0

## [6.5.0] - 2026-05-19

### 🚀 版本升级

- 版本升级至 v6.5.0
- 保持完全向后兼容
- 所有依赖包已更新至 6.5.0

## [6.4.0] - 2026-05-18

### 🚀 Monorepo 包发布

本版本为 LytJS 6.4.0 Monorepo 统一发布的一部分。

### 📦 依赖更新

- `@lytjs/host-contract` 更新至 `^6.4.0`
- `@lytjs/common-dom` 更新至 `^6.4.0`
- `@lytjs/common-events` 更新至 `^6.4.0`
- `@lytjs/common-is` 更新至 `^6.4.0`
- `@lytjs/common-string` 更新至 `^6.4.0`
- `@lytjs/common-error` 更新至 `^6.4.0`
- `@lytjs/shared-types` 更新至 `^6.4.0`
- `@lytjs/vdom` 更新至 `^6.4.0`
- `@lytjs/reactivity` 更新至 `^6.4.0`

### 🔧 内部改进

- 构建工具 `tsup` 升级至 `^8.3.0`
- TypeScript 升级至 `^5.8.2`
