#!/bin/bash
# ============================================================
# Lyt.js Publish Script
#
# 按依赖顺序构建并发布所有包到 npm
#
# 用法：
#   bash scripts/publish.sh              # 发布所有包
#   bash scripts/publish.sh --dry-run    # 试运行（不实际发布）
# ============================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGES_DIR="$ROOT_DIR/packages"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[publish]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; }

# 解析参数
DRY_RUN=false
for arg in "$@"; do
  if [ "$arg" == "--dry-run" ]; then
    DRY_RUN=true
  fi
done

# 按依赖顺序排列的发布包列表
PUBLISH_ORDER=(
  reactivity
  vdom
  compiler
  renderer
  component
  core
  router
  store
  cli
  devtools
  components
  plugin-i18n
  plugin-auth
  plugin-logger
  test-utils
  plugins
  agg
  lytx
)

log "Lyt.js Publishing Pipeline"
log "==========================="

if [ "$DRY_RUN" = true ]; then
  warn "DRY RUN MODE - No packages will actually be published"
fi

# Step 1: 构建所有包（含类型声明）
log ""
log "Step 1: Building all packages..."
echo ""

if ! bash "$ROOT_DIR/scripts/build-all.sh"; then
  err "Build failed. Aborting publish."
  exit 1
fi

ok "Build completed successfully"

# Step 2: 运行测试
log ""
log "Step 2: Running tests..."
echo ""

# 检查 tsx 是否已安装
TSX="$ROOT_DIR/node_modules/.bin/tsx"
if [ ! -f "$TSX" ]; then
  warn "tsx not found locally, attempting to install..."
  if npm install --save-dev tsx --prefer-offline 2>&1 | tail -1; then
    TSX="$ROOT_DIR/node_modules/.bin/tsx"
    ok "tsx installed successfully"
  else
    err "Failed to install tsx. Please run: npm install --save-dev tsx"
    exit 1
  fi
fi

if ! "$TSX" "$ROOT_DIR/test-runner.ts" 2>&1; then
  err "Tests failed. Aborting publish."
  exit 1
fi

ok "All tests passed"

# Step 3: 发布每个包
log ""
log "Step 3: Publishing packages..."
echo ""

PUBLISH_ARGS=""
if [ "$DRY_RUN" = true ]; then
  PUBLISH_ARGS="--dry-run"
fi

SUCCESS_COUNT=0
FAIL_COUNT=0

for pkg in "${PUBLISH_ORDER[@]}"; do
  pkg_dir="$PACKAGES_DIR/$pkg"

  # 检查 dist 目录
  if [ ! -d "$pkg_dir/dist" ]; then
    warn "$pkg: no dist/ directory, skipping"
    continue
  fi

  # 读取包名和 private 标记
  pkg_json="$pkg_dir/package.json"
  pkg_name=$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).name)" "$pkg_json")
  pkg_private=$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).private || false)" "$pkg_json")

  if [ "$pkg_private" = "true" ]; then
    warn "$pkg_name is private, skipping"
    continue
  fi

  log "Publishing $pkg_name..."

  if (cd "$pkg_dir" && npm publish $PUBLISH_ARGS --access public 2>&1); then
    ok "$pkg_name published successfully"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    err "$pkg_name publish failed"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

echo ""
log "=========================================="
log "Publish Summary: $SUCCESS_COUNT published, $FAIL_COUNT failed"
if [ "$DRY_RUN" = true ]; then
  warn "This was a DRY RUN - no packages were actually published"
fi
log "=========================================="

if [ $FAIL_COUNT -gt 0 ]; then
  exit 1
fi
