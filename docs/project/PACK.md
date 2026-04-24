# Lyt.js 打包指南

本指南说明如何生成 Lyt.js 项目的纯净下载压缩包。

## 📦 快速开始

### 安装打包依赖

```bash
npm install --save-dev archiver
```

### 执行打包

```bash
npm run pack
```

打包完成后，压缩包会直接生成在项目根目录中。

## 📋 生成的文件

打包脚本会生成两个压缩包：

| 文件名 | 说明 | 适用场景 |
|--------|------|---------|
| `lytjs-4.0.0-2026-04-23T...-source.zip` | 纯净源码包 | 学习、二次开发 |
| `lytjs-4.0.0-2026-04-23T....zip` | 完整版（包含构建产物） | 直接使用、分发 |

## 🎯 打包特性

### ✅ 包含内容

- ✅ 完整的源码
- ✅ package.json 和依赖配置
- ✅ 所有文档
- ✅ 示例项目
- ✅ 测试代码
- ✅ TypeScript 类型定义
- ✅ 构建工具配置

### ❌ 排除内容

- ❌ .git 目录
- ❌ node_modules
- ❌ dist 目录
- ❌ IDE 配置文件
- ❌ 临时文件和缓存
- ❌ 日志文件
- ❌ 调试文件
- ❌ LLM 相关文件

## 🔧 自定义配置

### 修改排除列表

编辑 `scripts/pack.js` 文件中的 `EXCLUDES` 数组：

```javascript
const EXCLUDES = [
  '.git',
  'node_modules',
  // 添加你需要排除的内容
  'your-custom-file.txt',
];
```

### 修改压缩级别

编辑 `scripts/pack.js`：

```javascript
const archive = archiver('zip', {
  zlib: { level: 9 } // 0-9，9 为最大压缩
});
```

## 📂 输出目录结构

```
lytjs-4.0.0-source.zip/
├── packages/
│   ├── reactivity/
│   ├── compiler/
│   ├── renderer/
│   ├── component/
│   ├── core/
│   ├── router/
│   ├── store/
│   ├── cli/
│   └── ...
├── docs/
├── examples/
├── benchmarks/
├── package.json
├── README.md
└── ...
```

## 🚀 使用压缩包

### 解压后使用

```bash
# 解压
unzip lytjs-4.0.0-source.zip

# 进入目录
cd lytjs-4.0.0

# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build
```

### 使用完整版

完整版已包含构建产物，可以直接使用：

```bash
unzip lytjs-4.0.0-2026-04-23T....zip
cd lytjs-4.0.0
# 直接使用
```

## 🔍 检查压缩包

解压后验证完整性：

```bash
# 检查必要文件
ls -la package.json
ls -la packages/reactivity/src/
ls -la docs/

# 检查大小
du -sh .
```

## ⚙️ 高级用法

### 集成到 CI/CD

在 GitHub Actions 中自动打包：

```yaml
- name: Package
  run: |
    npm install --save-dev archiver
    npm run pack
- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: lytjs-packages
    path: lytjs-*.zip
```

### 自动生成校验和

在 `scripts/pack.js` 末尾添加：

```javascript
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

async function generateChecksum(filePath) {
  const buffer = await readFile(filePath);
  const hash = createHash('sha256').update(buffer).digest('hex');
  await writeFile(`${filePath}.sha256`, hash);
}
```

## 📝 发布流程

完整的发布流程：

```bash
# 1. 运行测试
npm test

# 2. 构建
npm run build

# 3. 打包
npm install --save-dev archiver
npm run pack

# 4. 校验压缩包
unzip -l dist/lytjs-4.0.0-*.zip

# 5. 发布压缩包
# 上传到 GitHub Releases 或其他平台
```

## 🎯 版本号说明

压缩包文件名包含版本号和时间戳：

```
lytjs-4.0.0-2026-04-23T12-34-56-789Z.zip
      │    │                │
      │    │                └─ ISO 时间戳
      │    └─ 版本号
      └─ 项目名
```

## 💡 小贴士

1. **GitHub Releases**: 可以将压缩包上传到 GitHub Releases
2. **CDN 分发**: 可以将压缩包上传到 CDN 加速下载
3. **校验和**: 重要发布推荐提供 SHA256 校验和
4. **签名**: 对于正式发布，考虑对压缩包进行 GPG 签名

---

有问题？查看 `scripts/pack.js` 源码了解更多细节。
