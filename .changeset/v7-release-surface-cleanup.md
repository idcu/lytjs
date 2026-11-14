---
'@lytjs/bundler': major
'@lytjs/devtools': major
'@lytjs/shared-types': major
---

补齐 7.0.0 发布面删除项的 CHANGELOG 记录（此前只写在迁移指南，未进 changeset）。

- **`@lytjs/bundler`**：删除 `createWebpackPlugin`。该函数只打印「尚未实现」警告，
  从未产出插件；需要 Webpack/Rspack 时按 loader 自行接入。
- **`@lytjs/devtools`**：删除 `./style.css` 子路径导出。包内不再提供样式文件，
  `import '@lytjs/devtools/style.css'` 会报 `ERR_PACKAGE_PATH_NOT_EXPORTED`，删除该导入即可。
- **`@lytjs/shared-types`**：删除 `EventEmitter` 与 `createEventEmitter`。
  `EventEmitter` 改用 `@lytjs/common-events`；`createEventEmitter(...)` 改为 `new EventEmitter()`。

迁移步骤见 `docs/migration/v7.0.0.md`。
