#!/bin/bash
# ============================================================
# Lyt.js js-framework-benchmark PR 准备脚本
#
# 功能：
#   1. 克隆 js-framework-benchmark 仓库
#   2. 复制 Lyt.js keyed 和 non-keyed 实现
#   3. 生成配置文件（package.json, tsconfig.json, esbuild.mjs, index.html）
#   4. 构建验证
#
# 用法：
#   bash prepare-pr.sh [js-framework-benchmark-dir]
#
# 参数：
#   js-framework-benchmark-dir  js-framework-benchmark 仓库的本地路径
#                               如果未提供，将自动克隆
# ============================================================

set -e

# ============================================================
# 配置
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BENCHMARK_DIR="${1:-}"
LYTJS_SOURCE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LYTJS_ROOT="$(cd "$LYTJS_SOURCE_DIR/../.." && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================
# 工具函数
# ============================================================

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "命令 '$1' 未找到，请先安装"
        exit 1
    fi
}

# ============================================================
# 前置检查
# ============================================================

log_info "=== Lyt.js js-framework-benchmark PR 准备脚本 ==="
echo ""

check_command "node"
check_command "npm"
check_command "git"

# 检查 Lyt.js 源码目录
if [ ! -d "$LYTJS_SOURCE_DIR/lytjs/src" ]; then
    log_error "Lyt.js benchmark 源码目录不存在: $LYTJS_SOURCE_DIR/lytjs/src"
    exit 1
fi

log_success "前置检查通过"

# ============================================================
# 步骤 1: 获取 js-framework-benchmark 仓库
# ============================================================

echo ""
log_info "步骤 1: 获取 js-framework-benchmark 仓库"

if [ -z "$BENCHMARK_DIR" ]; then
    # 自动克隆
    CLONE_DIR="$SCRIPT_DIR/js-framework-benchmark"

    if [ -d "$CLONE_DIR" ]; then
        log_warn "目录 $CLONE_DIR 已存在，跳过克隆"
        BENCHMARK_DIR="$CLONE_DIR"
    else
        log_info "正在克隆 js-framework-benchmark..."
        git clone --depth 1 https://github.com/krausest/js-framework-benchmark.git "$CLONE_DIR"
        BENCHMARK_DIR="$CLONE_DIR"
        log_success "克隆完成: $CLONE_DIR"
    fi
else
    if [ ! -d "$BENCHMARK_DIR" ]; then
        log_error "指定目录不存在: $BENCHMARK_DIR"
        exit 1
    fi
    log_success "使用已有目录: $BENCHMARK_DIR"
fi

# ============================================================
# 步骤 2: 复制 Lyt.js 实现
# ============================================================

echo ""
log_info "步骤 2: 复制 Lyt.js 实现"

# --- Keyed 实现 ---
KEYED_DIR="$BENCHMARK_DIR/frameworks/keyed/lytjs"
log_info "创建 keyed 实现: $KEYED_DIR"

mkdir -p "$KEYED_DIR/src"

# 复制 keyed 源文件
cp "$LYTJS_SOURCE_DIR/lytjs/src/keyed-signal.ts" "$KEYED_DIR/src/main.ts"
log_success "  复制 keyed-signal.ts -> src/main.ts"

cp "$LYTJS_SOURCE_DIR/lytjs/src/shared.ts" "$KEYED_DIR/src/shared.ts"
log_success "  复制 shared.ts -> src/shared.ts"

# 复制 reactivity 包（signal 系统依赖）
if [ -d "$LYTJS_ROOT/packages/reactivity" ]; then
    cp -r "$LYTJS_ROOT/packages/reactivity" "$KEYED_DIR/src/reactivity"
    log_success "  复制 reactivity 包"
else
    log_warn "  reactivity 包目录不存在，跳过"
fi

# 复制 common 包
if [ -d "$LYTJS_ROOT/packages/common" ]; then
    cp -r "$LYTJS_ROOT/packages/common" "$KEYED_DIR/src/common"
    log_success "  复制 common 包"
else
    log_warn "  common 包目录不存在，跳过"
fi

# --- Non-Keyed 实现 ---
NON_KEYED_DIR="$BENCHMARK_DIR/frameworks/non-keyed/lytjs"
log_info "创建 non-keyed 实现: $NON_KEYED_DIR"

mkdir -p "$NON_KEYED_DIR/src"

# 复制 non-keyed 源文件
cp "$LYTJS_SOURCE_DIR/lytjs/src/non-keyed-signal.ts" "$NON_KEYED_DIR/src/main.ts"
log_success "  复制 non-keyed-signal.ts -> src/main.ts"

cp "$LYTJS_SOURCE_DIR/lytjs/src/shared.ts" "$NON_KEYED_DIR/src/shared.ts"
log_success "  复制 shared.ts -> src/shared.ts"

# 复制 reactivity 包
if [ -d "$LYTJS_ROOT/packages/reactivity" ]; then
    cp -r "$LYTJS_ROOT/packages/reactivity" "$NON_KEYED_DIR/src/reactivity"
    log_success "  复制 reactivity 包"
fi

# 复制 common 包
if [ -d "$LYTJS_ROOT/packages/common" ]; then
    cp -r "$LYTJS_ROOT/packages/common" "$NON_KEYED_DIR/src/common"
    log_success "  复制 common 包"
fi

# ============================================================
# 步骤 3: 生成配置文件
# ============================================================

echo ""
log_info "步骤 3: 生成配置文件"

# --- 生成 package.json ---
generate_package_json() {
    local target_dir="$1"
    cat > "$target_dir/package.json" << 'PKGJSON'
{
  "name": "lytjs",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "js-framework-benchmark": {
    "frameworkHomeURL": "https://gitee.com/lytjs/lytjs",
    "customURL": false
  },
  "scripts": {
    "build-prod": "node esbuild.mjs",
    "dev": "node esbuild.mjs --dev"
  },
  "devDependencies": {
    "esbuild": "^0.20.0",
    "typescript": "^5.0.0"
  }
}
PKGJSON
    log_success "  生成 $target_dir/package.json"
}

generate_package_json "$KEYED_DIR"
generate_package_json "$NON_KEYED_DIR"

# --- 生成 tsconfig.json ---
generate_tsconfig() {
    local target_dir="$1"
    cat > "$target_dir/tsconfig.json" << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
TSCONFIG
    log_success "  生成 $target_dir/tsconfig.json"
}

generate_tsconfig "$KEYED_DIR"
generate_tsconfig "$NON_KEYED_DIR"

# --- 生成 esbuild.mjs ---
generate_esbuild() {
    local target_dir="$1"
    cat > "$target_dir/esbuild.mjs" << 'ESBUILD'
import * as esbuild from 'esbuild';

const isDev = process.argv.includes('--dev');

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/main.js',
  format: 'esm',
  target: 'es2020',
  minify: !isDev,
  sourcemap: false,
  treeShaking: true,
  alias: {
    '@lytjs/reactivity/signal': './src/reactivity/signal.ts',
    '@lytjs/common': './src/common/index.ts',
  },
});

console.log(`Build ${isDev ? 'dev' : 'prod'} complete`);
ESBUILD
    log_success "  生成 $target_dir/esbuild.mjs"
}

generate_esbuild "$KEYED_DIR"
generate_esbuild "$NON_KEYED_DIR"

# --- 生成 index.html ---
generate_index_html() {
    local target_dir="$1"
    cat > "$target_dir/index.html" << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lyt.js</title>
  <link rel="stylesheet" href="../../css/bootstrap.min.css">
</head>
<body>
  <div class="container">
    <div class="jumbotron">
      <div class="row">
        <div class="col-md-6">
          <h1>Lyt.js</h1>
        </div>
        <div class="col-md-6">
          <div class="row">
            <div class="col-sm-6 small">
              <div class="form-group">
                <label for="run">Create 1,000 rows</label>
                <button type="button" class="btn btn-primary btn-block" id="run">Create 1,000 rows</button>
              </div>
              <div class="form-group">
                <label for="runlots">Create 10,000 rows</label>
                <button type="button" class="btn btn-primary btn-block" id="runlots">Create 10,000 rows</button>
              </div>
              <div class="form-group">
                <label for="add">Append 1,000 rows</label>
                <button type="button" class="btn btn-primary btn-block" id="add">Append 1,000 rows</button>
              </div>
            </div>
            <div class="col-sm-6 small">
              <div class="form-group">
                <label for="update">Update every 10th row</label>
                <button type="button" class="btn btn-primary btn-block" id="update">Update every 10th row</button>
              </div>
              <div class="form-group">
                <label for="clear">Clear</label>
                <button type="button" class="btn btn-primary btn-block" id="clear">Clear</button>
              </div>
              <div class="form-group">
                <label for="swaprows">Swap Rows</label>
                <button type="button" class="btn btn-primary btn-block" id="swaprows">Swap Rows</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <table class="table table-striped table-bordered">
      <tbody id="main"></tbody>
    </table>
  </div>
  <script type="module" src="dist/main.js"></script>
</body>
</html>
HTML
    log_success "  生成 $target_dir/index.html"
}

generate_index_html "$KEYED_DIR"
generate_index_html "$NON_KEYED_DIR"

# ============================================================
# 步骤 4: 构建验证
# ============================================================

echo ""
log_info "步骤 4: 构建验证"

# 构建 keyed 实现
log_info "构建 keyed 实现..."
cd "$KEYED_DIR"

if npm install --ignore-scripts 2>&1; then
    log_success "  npm install 成功"
else
    log_error "  npm install 失败"
    exit 1
fi

if npm run build-prod 2>&1; then
    log_success "  npm run build-prod 成功"
else
    log_error "  npm run build-prod 失败"
    exit 1
fi

if [ -f "$KEYED_DIR/dist/main.js" ]; then
    SIZE=$(wc -c < "$KEYED_DIR/dist/main.js")
    log_success "  构建产物: dist/main.js (${SIZE} bytes, $(echo "scale=2; $SIZE/1024" | bc) KB)"
else
    log_error "  构建产物 dist/main.js 未找到"
    exit 1
fi

# 构建 non-keyed 实现
log_info "构建 non-keyed 实现..."
cd "$NON_KEYED_DIR"

if npm install --ignore-scripts 2>&1; then
    log_success "  npm install 成功"
else
    log_error "  npm install 失败"
    exit 1
fi

if npm run build-prod 2>&1; then
    log_success "  npm run build-prod 成功"
else
    log_error "  npm run build-prod 失败"
    exit 1
fi

if [ -f "$NON_KEYED_DIR/dist/main.js" ]; then
    SIZE=$(wc -c < "$NON_KEYED_DIR/dist/main.js")
    log_success "  构建产物: dist/main.js (${SIZE} bytes, $(echo "scale=2; $SIZE/1024" | bc) KB)"
else
    log_error "  构建产物 dist/main.js 未找到"
    exit 1
fi

# ============================================================
# 完成
# ============================================================

echo ""
log_success "=== PR 准备完成 ==="
echo ""
echo "文件已放置到以下位置："
echo ""
echo "  Keyed 实现:   $KEYED_DIR"
echo "  Non-Keyed 实现: $NON_KEYED_DIR"
echo ""
echo "后续步骤："
echo ""
echo "  1. cd $BENCHMARK_DIR"
echo "  2. git checkout -b add-lytjs-framework"
echo "  3. git add frameworks/keyed/lytjs frameworks/non-keyed/lytjs"
echo "  4. git commit -m 'Add Lyt.js framework (keyed + non-keyed)'"
echo "  5. git push origin add-lytjs-framework"
echo ""
echo "  然后在 GitHub 上创建 Pull Request，参考 pr-description.md 填写描述。"
echo ""
