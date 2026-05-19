# js-framework-benchmark PR 准备文档

> 本文档用于准备 LytJS 提交到 js-framework-benchmark 的 PR。

---

## 📋 准备工作清单

- [x] 本地实现 benchmark
- [ ] 性能优化
- [ ] 准备 PR 材料
- [ ] 提交 PR
- [ ] 响应 Review

---

## 1. 当前状态

### 本地实现
- ✅ 已创建本地 benchmark 实现
- ✅ 包含所有标准测试场景
- ✅ 支持框架构建

### 性能指标（预估）
| 指标 | 预估值 | 目标值 |
|------|--------|--------|
| 启动时间 | ~50ms | <100ms |
| 内存使用 | ~20MB | <50MB |
| DOM 操作 | O(1) | 最优 |

---

## 2. 提交前检查清单

### 代码质量
- [x] TypeScript 类型检查通过
- [x] ESLint 检查通过
- [x] 单元测试覆盖
- [ ] 性能测试通过

### Benchmark 规范
- [x] 实现所有必需测试场景
- [x] 支持 production build
- [x] 实现 key 保持
- [x] 实现 requestAnimationFrame
- [ ] 性能优化完成

---

## 3. PR 模板

```markdown
## LytJS - 轻量级响应式框架

### 框架简介
LytJS 是一个轻量级高性能前端框架，核心约 8KB (gzip)，提供：
- 基于 Signal 的响应式系统
- 高性能虚拟 DOM
- 流式 SSR 支持
- 插件化架构

### 测试结果
| 测试类型 | 得分 | 排名 |
|---------|------|------|
| 启动 | TBD | TBD |
| 运行 | TBD | TBD |
| 内存 | TBD | TBD |
| 总分 | TBD | TBD |

### 实现说明
- 使用自定义 Signal 实现细粒度响应式
- 高性能虚拟 DOM diff 算法
- 无需编译的运行时框架
- 完整 TypeScript 类型支持

### 关键文件
- `frameworks/keyed/lytjs/src/index.ts` - 框架入口
- `frameworks/keyed/lytjs/package.json` - 依赖配置
- `frameworks/keyed/lytjs/build.js` - 构建脚本

### 如何测试
```bash
# 安装依赖
npm install

# 运行 benchmark
npm run build-prod
# 在浏览器中打开 index.html
```

### 相关链接
- 官网: https://idcu.github.io/lytjs/
- 文档: https://idcu.github.io/lytjs/guide/
- GitHub: https://github.com/idcu/lytjs
```

---

## 4. 提交步骤

### 步骤 1: Fork 官方仓库
```bash
git remote add upstream https://github.com/krausest/js-framework-benchmark.git
git fetch upstream
```

### 步骤 2: 创建分支
```bash
git checkout -b add/lytjs
```

### 步骤 3: 复制框架文件
```bash
# 创建目录结构
mkdir -p frameworks/keyed/lytjs/src
mkdir -p frameworks/keyed/lytjs/results

# 复制文件
cp -r local-benchmark/* frameworks/keyed/lytjs/
```

### 步骤 4: 验证构建
```bash
cd frameworks/keyed/lytjs
npm install
npm run build-prod
```

### 步骤 5: 提交并推送
```bash
git add .
git commit -m "feat: add LytJS v6.3 keyed implementation"
git push origin add/lytjs
```

### 步骤 6: 创建 PR
访问 https://github.com/krausest/js-framework-benchmark/compare

---

## 5. 响应 Review

### 常见问题
1. **构建失败**: 检查依赖版本和路径
2. **测试超时**: 优化性能或增加超时时间
3. **类型错误**: 使用 `any` 作为临时方案

### 注意事项
- 保持框架代码简洁
- 不要添加不必要的依赖
- 遵循现有代码风格

---

## 6. 后续优化

根据 benchmark 结果，持续优化：
1. 启动时间优化
2. 内存使用优化
3. DOM 操作优化

---

## 7. 参考资料

- [js-framework-benchmark 官方仓库](https://github.com/krausest/js-framework-benchmark)
- [提交指南](https://github.com/krausest/js-framework-benchmark/blob/master/CONTRIBUTING.md)
- [框架列表](https://github.com/krausest/js-framework-benchmark/blob/master/frameworks/keyed/README.md)

---

*最后更新: 2026-05-16*
