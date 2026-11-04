# @lytjs/config

## [未发布] - 2026-11-04

### 🐞 修复（7 个「不抛异常」的语义缺陷 + 1 个 P0 安全）

- **`set('__proto__.x')` 污染 `Object.prototype`**（P0 安全）：`ConfigManager` 按字符串
  路径写对象，路径段 `__proto__` / `constructor` / `prototype` 会走到原型链上 ——
  实测 `config.set('__proto__.polluted', 'yes')` 之后 **`({}).polluted === 'yes'`**，
  进程内所有对象都被污染（`set('constructor.prototype.x')` 同样成立）。
  现在所有按路径读写的入口（`get` / `set` / `has` / `delete`）都先过白名单，
  命中危险段即拒绝并告警。
- **`get` / `has` 顺原型链读**：`has('__proto__.toString')` 返回 `true`、
  `get('toString')` 返回函数（用的是 `in` 而不是自有属性判断）。改用 `hasOwnProperty`。
- **`get()` 返回内部引用**：`config.get('api').baseURL = '/hacked'` 会改掉内部状态，
  且**一个监听器都不触发**（配置静默漂移）。`getAll()` 一直是深拷贝，现在 `get()` 对齐。
- **`delete()` 不通知**：删掉配置后 `watch('a.b')` 与 `watch('a')` 都不触发
  （`notify` 的父路径分支需要旧值快照，而 `delete` 没传）。现在与 `set` 一致。
- **`setMultiple(config, false)` 不通知被移除的键**：整个配置被替换，监听器不知道旧键没了。
  现在替换前收集叶子路径，替换后对「已不存在」的键以 `undefined` 通知。
- **扁平 JSON Schema 写法静默通过**：`{ type: 'object', properties: {…} }`（JSON Schema 的
  惯例写法）此前因 `schema.object` 为空而**直接返回 `valid: true`** —— 一条规则都没跑，
  却报告「校验通过」。现在两种形状都接受（`normalizeFlatSchema`）。
- **嵌套对象的字段默认值不生效**：`{ api: { url: { default: '/x' } } }` + 输入 `{}`
  得到 `{}`（`transformObject` 只在属性自身有 `default` 时赋值，从不递归子 schema），
  而 README 承诺「自动应用默认值」。现在父值缺失时也会递归一次。
- 同一类型错误被报两次（子层 `transform` 与父层整体校验各一次）⇒ 按 `path+code+message` 去重。

## [6.9.6] - 2026-06-06

### 🚀 版本升级

- 版本升级至 v6.9.6
- 保持完全向后兼容
- 所有依赖包已更新至 6.9.6