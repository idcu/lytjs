# LytJS v6.3.0 发布公告

**版本**: v6.3.0  
**发布日期**: 2026-05-16  
**主题**: 生态繁荣  
**标签**: https://gitee.com/lytjs/lytjs/releases/v6.3.0

---

## 🎉 公告

LytJS v6.3.0 "生态繁荣" 正式发布！

本次版本在 ErrorBoundary 增强、第三方生态建设、CI/CD 增强等方面带来重要更新，为大规模应用做好准备。

---

## ✨ 主要更新

### 1. ErrorBoundary 增强

**错误边界组件完善**

- 完整的 ErrorBoundary 组件实现
- 自定义降级 UI 支持（`fallback`、`fallbackRender`）
- 错误重试机制（`maxRetries`、`retryDelay`、`onRetry`）
- 60 个单元测试用例全部通过

**错误报告系统**

- ErrorReporter 接口定义
- ConsoleErrorReporter 默认实现
- `setGlobalErrorReporter()` 全局报告器设置
- 支持自定义错误报告器集成

**错误日志系统**

- ErrorLogManager 错误日志管理器
- 日志记录、查询、统计、导出、清理
- 日志数量限制（默认 100 条）

### 2. 第三方生态建设

**插件审核机制**

- 完整的审核标准文档
- 审核流程（GitHub Issue → 代码审查 → 功能测试 → 安全扫描 → 发布）
- 审核维度：代码质量、文档完整性、功能完整性、安全性

**官方推荐插件列表**

| 插件 | 版本 | 说明 |
|------|------|------|
| @lytjs/plugin-form | 6.2.0 | 表单验证 |
| @lytjs/plugin-animation | 6.2.0 | 动画效果 |
| @lytjs/plugin-router | 6.0.0 | 路由管理 |
| @lytjs/plugin-store | 6.0.0 | 状态管理 |
| @lytjs/ssr | 6.2.0 | 服务端渲染 |

**社区治理文档**

- 行为准则（CODE_OF_CONDUCT.md）
- 联系方式：邮箱 idcu@qq.com、官网 https://idcu.github.io/lytjs/

### 3. CI/CD 增强

- 覆盖率检查 Workflow
- ErrorBoundary 专项覆盖率检查
- 体积回归检查
- Codecov 集成支持

### 4. 文档完善

- [ErrorBoundary 使用指南](docs/guides/error-boundary.md)
- [ErrorBoundary 实战教程](docs/tutorial/error-boundary-best-practices.md)
- [贡献者指南](docs/community/CONTRIBUTING.md)
- [行为准则](docs/community/CODE_OF_CONDUCT.md)

---

## 📦 安装方式

```bash
# npm
npm install @lytjs/core

# pnpm
pnpm add @lytjs/core

# yarn
yarn add @lytjs/core
```

---

## 🆕 快速开始

```typescript
import { ErrorBoundary, h } from '@lytjs/core';

function App() {
  return h(ErrorBoundary, {
    fallback: ({ error, reset }) => h('div', null, [
      h('p', null, `错误: ${error.message}`),
      h('button', { onClick: reset }, '重试')
    ]),
    maxRetries: 3,
    retryDelay: 1000
  }, [
    // 你的组件
  ]);
}
```

---

## 📚 文档资源

| 资源 | 链接 |
|------|------|
| 官网 | https://idcu.github.io/lytjs/ |
| 文档 | https://idcu.github.io/lytjs/guide/ |
| API | https://idcu.github.io/lytjs/api/ |
| GitHub | https://github.com/idcu/lytjs |
| Gitee | https://gitee.com/lytjs/lytjs |

---

## 🐛 问题反馈

如发现问题，请通过以下方式反馈：

- GitHub Issues: https://github.com/idcu/lytjs/issues
- Gitee Issues: https://gitee.com/lytjs/lytjs/issues
- 邮箱: idcu@qq.com

---

## 🙏 致谢

感谢所有为 LytJS v6.3.0 做出贡献的开发者！

---

## 📝 更新日志

详细更新内容请查看 [CHANGELOG.md](docs/development/CHANGELOG.md)

---

**LytJS Team**  
**2026-05-16**
