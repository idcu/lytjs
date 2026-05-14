# 生态与社区

LytJS 致力于打造一个健康、活跃的开源生态系统。我们欢迎并鼓励社区成员贡献代码、分享组件和插件，共同推动 LytJS 的发展。

## 生态组成

### 核心生态

LytJS 官方提供了完整的核心生态系统：

| 包名 | 说明 |
|------|------|
| `@lytjs/reactivity` | 响应式系统（Signal、Ref、Computed、Effect） |
| `@lytjs/vdom` | 虚拟 DOM（VNode、h 函数、diff 算法） |
| `@lytjs/compiler` | 模板编译器（SFC 解析、代码生成） |
| `@lytjs/core` | 核心框架（defineComponent、生命周期） |
| `@lytjs/renderer` | 渲染引擎（Vapor、VDOM 双模式） |
| `@lytjs/ui` | UI 组件库（60+ 组件） |
| `@lytjs/router` | 路由管理 |
| `@lytjs/store` | 状态管理 |
| `@lytjs/ssr` | 服务端渲染 |
| `@lytjs/devtools` | 开发者工具 |

### 官方插件

| 插件 | 说明 |
|------|------|
| `@lytjs/plugin-theme` | 主题管理（深色/浅色模式） |
| `@lytjs/plugin-logger` | 日志记录（分级日志、性能追踪） |
| `@lytjs/plugin-i18n` | 国际化（多语言支持） |
| `@lytjs/plugin-auth` | 权限控制（角色、权限验证） |
| `@lytjs/plugin-storage` | 本地存储（localStorage/sessionStorage） |
| `@lytjs/plugin-chart` | 图表渲染（柱状图、折线图、饼图） |
| `@lytjs/plugin-vite` | Vite 集成插件 |

## 社区贡献

### 贡献类型

我们欢迎各种形式的贡献：

#### 1. 代码贡献

- 修复 Bug
- 实现新功能
- 优化性能
- 改进代码质量

#### 2. 文档贡献

- 改进现有文档
- 翻译文档到其他语言
- 编写教程和使用案例
- 添加代码示例

#### 3. 社区贡献

- 回答其他用户的问题
- 分享使用经验
- 组织技术分享活动
- 推广 LytJS

### 如何贡献代码

1. **Fork 项目**：Fork `https://gitee.com/lytjs/lytjs`
2. **克隆代码**：`git clone https://gitee.com/your-username/lytjs.git`
3. **安装依赖**：`pnpm install`
4. **创建分支**：`git checkout -b feature/your-feature`
5. **开发开发**：
   ```bash
   pnpm lint:check  # 检查代码规范
   pnpm type-check  # 检查类型
   pnpm test        # 运行测试
   ```
6. **提交代码**：`git commit -m "feat(scope): add new feature"`
7. **推送代码**：`git push origin feature/your-feature`
8. **创建 PR**：在 Gitee 上创建 Pull Request

### 代码规范

贡献代码时请遵循以下规范：

- 遵循项目的 [编码规范](../guide/typescript)
- 使用 TypeScript 严格模式
- 确保通过所有测试
- 添加适当的测试用例
- 更新相关文档
- 遵循 [8 层架构约束](../development/ARCHITECTURE.md)

## 第三方生态

### 组件库

我们鼓励社区开发高质量的组件库：

#### 优秀组件库标准

1. **代码质量**
   - 完整的 TypeScript 类型支持
   - 遵循零依赖原则（运行时）
   - 通过单元测试（覆盖率 ≥ 70%）
   - 提供完整的 API 文档

2. **文档质量**
   - 完整的使用文档
   - 丰富的代码示例
   - API 文档清晰
   - 包含 TypeScript 类型说明

3. **维护更新**
   - 及时跟进框架版本
   - 积极响应 Issue
   - 定期更新维护
   - 提供良好的技术支持

### 插件开发

如果你想开发插件：

1. 参考 [插件开发指南](../development/PLUGIN_DEVELOPMENT.md)
2. 使用 `definePlugin` API
3. 确保零第三方依赖
4. 提供完整测试
5. 编写清晰的使用文档

### 包发布

#### 命名规范

建议的包命名规范：

```
@lytjscommunity/plugin-{name}    # 社区插件
@lytjscommunity/ui-{name}       # 社区组件库
@{username}/lytjs-{name}       # 个人发布的包
```

#### 发布步骤

1. 确保包符合质量标准
2. 编写完整的 README
3. 在 npm/gitee 上发布包
4. 在 [GitHub Issues](https://gitee.com/lytjs/lytjs/issues) 提交展示申请
5. 等待审核通过

## 展示与认可

### 优秀项目展示

我们将定期在官网展示优秀的社区项目。展示类别包括：

- **高质量组件库**：功能完整、文档完善
- **创新应用案例**：展示 LytJS 强大能力
- **有趣实验项目**：探索框架可能性
- **实用工具插件**：解决实际问题

#### 展示申请

提交展示申请请提供：

1. **项目名称和简介**
2. **Git 仓库链接**
3. **在线演示地址**（如有）
4. **截图或演示视频**
5. **使用技术栈说明**

提交方式：在 [GitHub Issues](https://gitee.com/lytjs/lytjs/issues) 创建 `community-showcase` 标签的 Issue

#### 展示标准

| 标准 | 要求 |
|------|------|
| 开源协议 | 使用开源协议（MIT、Apache 等） |
| 代码质量 | 结构清晰、注释完善 |
| 功能完整性 | 功能稳定可用 |
| 文档质量 | 有 README 和使用示例 |
| 活跃维护 | 近期有更新维护 |

### 贡献者榜单

感谢所有为 LytJS 做出贡献的社区成员！

贡献方式：
- 提交代码 Pull Request
- 完善文档
- 回答社区问题
- 分享使用经验

贡献者权益：
- 在贡献者榜单中展示
- Issue 优先处理
- 重大贡献者特别鸣谢

## 学习资源

### 官方资源

- [官方文档](../guide/)
- [API 参考](../api/)
- [示例项目](../examples/)
- [教程](../tutorial/)
- [开发文档](../development/)

### 推荐学习路径

```
1. 入门
   - 快速上手 → 基础概念 → 响应式系统
   
2. 组件开发
   - 组件基础 → 组件通信 → 插槽系统
   
3. 生态掌握
   - 路由管理 → 状态管理 → 插件系统
   
4. 进阶主题
   - 性能优化 → SSR → 自定义渲染器
```

### 社区资源

- [GitHub Issues](https://gitee.com/lytjs/lytjs/issues) - 问题反馈
- [GitHub Discussions](https://gitee.com/lytjs/lytjs/discussions) - 讨论区
- [问题排查手册](../tutorial/troubleshooting.md) - 常见问题解答

## 插件与组件审核

### 审核流程

1. **提交申请**：在 Issues 中提交审核申请
2. **材料审查**：检查材料完整性和质量
3. **代码审查**：审核代码质量和规范
4. **功能测试**：验证功能是否符合描述
5. **展示批准**：审核通过后在官网展示

### 审核标准

| 类别 | 标准 |
|------|------|
| **代码质量** | TypeScript 严格模式、无 any 类型（测试除外） |
| **依赖规范** | 运行时零第三方依赖 |
| **测试覆盖** | 核心功能测试覆盖 ≥ 70% |
| **文档完整** | README、API 文档、示例代码 |
| **开源协议** | 明确的开源协议 |

### 审核周期

- **提交后 7 天内**：初审反馈
- **修改后 3 天内**：二审反馈
- **通过后 3 天内**：官网展示

## 行为准则

我们期望所有社区成员：

- **尊重**：尊重他人的观点和贡献
- **包容**：欢迎不同背景的参与者
- **专业**：保持专业和建设性的交流
- **开放**：接受合理的批评和建议
- **友善**：友好对待每一位社区成员

### 禁止行为

- 人身攻击或侮辱
- 垃圾信息或广告
- 与项目无关的内容
- 侵犯他人隐私
- 违反开源协议

## 联系我们

如果你有任何问题或建议：

- [GitHub Issues](https://gitee.com/lytjs/lytjs/issues) - 报告问题
- [GitHub Discussions](https://gitee.com/lytjs/lytjs/discussions) - 讨论交流
- [提交 PR](https://gitee.com/lytjs/lytjs/pulls) - 贡献代码

## 加入我们

### 成为维护者

如果你对 LytJS 充满热情，并且：

- 持续为项目贡献高质量代码
- 积极帮助社区成员
- 深入理解框架设计理念

欢迎申请成为官方维护者！

### 成为布道师

如果你愿意推广 LytJS：

- 撰写技术博客
- 在社区分享经验
- 组织技术分享活动

欢迎加入 LytJS 布道师团队！

---

让我们一起建设更好的 LytJS 生态！
