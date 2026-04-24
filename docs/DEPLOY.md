# GitHub Pages 部署指南

本指南帮助你将 Lyt.js 文档部署到 GitHub Pages。

## 📋 前置条件

1. 项目托管在 GitHub 上
2. 你有仓库的管理员权限
3. 已创建 `.github/workflows/deploy-docs.yml` 工作流文件（本项目已包含）

## 🚀 配置步骤

### 1. 配置仓库设置

在你的 GitHub 仓库中进行以下设置：

1. 进入仓库的 **Settings**
2. 点击左侧菜单的 **Pages**
3. 在 **Build and deployment** 部分：
   - **Source**: 选择 `GitHub Actions`（重要！）
   - **Branch**: 不需要手动设置分支，Actions 会自动处理
4. 保存设置

### 2. 配置 VitePress 基础路径（如需要）

如果你的仓库不是 `<username>.github.io` 格式，需要修改 VitePress 配置：

编辑 `docs/.vitepress/config.ts`：

```typescript
export default defineConfig({
  // 根据你的仓库名修改，例如仓库是 lytjs/lytjs，则：
  base: '/lytjs/',  // 注意开头和结尾的斜杠
  
  // 其他配置保持不变...
})
```

| 仓库类型 | base 配置 | 示例 URL |
|---------|----------|---------|
| 用户/组织主页 | `/` | `https://lytjs.github.io` |
| 项目仓库 | `/仓库名/` | `https://lytjs.github.io/lytjs` |

### 3. 第一次部署

将工作流文件推送到 GitHub：

```bash
# 添加文件
git add .github/workflows/deploy-docs.yml

# 提交
git commit -m "docs: add GitHub Pages deployment workflow"

# 推送到 main 分支
git push origin main
```

推送后，GitHub Actions 会自动运行部署流程。

## 🔄 触发部署

部署会在以下情况自动触发：

### 自动部署

1. **推送到 main 分支** - 当修改 `docs/**` 目录或工作流文件时
2. **手动触发** - 在 GitHub Actions 页面手动运行

### 手动触发部署

1. 进入仓库的 **Actions** 页面
2. 选择 **Deploy Documentation** 工作流
3. 点击 **Run workflow**
4. 选择 `main` 分支
5. 点击 **Run workflow**

## 👀 查看部署状态

1. 进入仓库的 **Actions** 页面
2. 选择 **Deploy Documentation** 工作流
3. 查看最新的运行记录：
   - ✅ **Success** - 部署成功
   - ❌ **Failed** - 部署失败，查看日志

## 📝 访问文档

部署成功后，文档将在以下地址访问：

```
https://你的用户名.github.io/仓库名/
```

例如：
- 仓库：`https://github.com/lytjs/lytjs`
- 文档：`https://lytjs.github.io/lytjs/`

## 🔧 本地预览

在部署前，可以本地预览文档：

```bash
# 进入 docs 目录
cd docs

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或构建预览
npm run build
npm run preview
```

## ⚠️ 常见问题

### Q: 部署后页面空白？

**A:** 检查 `base` 路径配置是否正确。

### Q: 静态资源 404？

**A:** 确保在 `config.ts` 中正确设置了 `base` 路径。

### Q: 如何回滚部署？

**A:** 
1. 回退代码到上一个版本
2. 重新推送到 main 分支
3. Actions 会自动重新部署

### Q: 部署后看不到最新更改？

**A:**
- 清除浏览器缓存
- 或使用无痕模式访问
- 等待 1-2 分钟让 CDN 生效

### Q: 自定义域名？

**A:** 在 `docs/public/` 目录创建 `CNAME` 文件，内容为你的域名：

```
docs.lytjs.com
```

## 📊 工作流说明

工作流 `deploy-docs.yml` 包含两个任务：

1. **Build** - 构建文档
   - 检出代码
   - 安装 Node.js 和依赖
   - 运行 `npm run build`
   - 上传构建产物

2. **Deploy** - 部署到 GitHub Pages
   - 下载构建产物
   - 部署到 GitHub Pages

## 🎯 下一步

- 文档部署成功后，在 README 中添加文档链接
- 配置自定义域名（可选）
- 设置部署状态徽章

---

祝你部署顺利！🎉
