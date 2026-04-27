# Lyt.js MiniApp Todo 示例

使用 Lyt.js MiniApp 渲染器开发的微信小程序 Todo 应用。

## 功能

- 添加 / 删除 / 编辑 Todo
- 标记完成 / 取消完成
- 全选 / 取消全选
- 筛选（全部 / 进行中 / 已完成）
- 清除已完成项
- 本地存储持久化
- 空状态提示

## 快速开始

### 1. 打开微信开发者工具

下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。

### 2. 导入项目

1. 打开微信开发者工具
2. 选择「导入项目」
3. 项目目录选择本文件夹（`examples/miniapp-todo`）
4. AppID 可以使用测试号（点击「使用测试号」）
5. 点击「确定」

### 3. 运行

导入成功后，微信开发者工具会自动编译并预览。

## 模板语法映射

本示例展示了 Lyt.js 模板语法到小程序 WXML 的映射关系：

| Lyt.js 语法 | 小程序 WXML |
|---|---|
| `v-if="condition"` | `wx:if="{{condition}}"` |
| `v-for="item in list"` | `wx:for="{{list}}" wx:key="id"` |
| `@click="handler"` | `bindtap="handler"` |
| `:class="{ active: isActive }"` | `class="{{isActive ? 'active' : ''}}"` |
| `v-model="value"` | `value="{{value}}" bindinput="handler"` |
| `v-show="visible"` | `hidden="{{!visible}}"` |

## 生命周期映射

| Lyt.js 生命周期 | 小程序页面生命周期 |
|---|---|
| `onBeforeMount` | `onLoad` |
| `onMounted` | `onReady` |
| `onShow` | `onShow` |
| `onUnmounted` | `onUnload` |

## 项目结构

```
miniapp-todo/
  app.js              # 小程序入口
  app.json            # 小程序配置
  app.wxss            # 全局样式
  sitemap.json        # 站点地图
  project.config.json # 项目配置
  pages/
    index/
      index.js        # 首页逻辑
      index.wxml      # 首页模板
      index.wxss      # 首页样式
      index.json      # 页面配置
```

## 技术栈

- Lyt.js MiniApp Renderer
- 微信小程序原生框架
- 微信开发者工具
