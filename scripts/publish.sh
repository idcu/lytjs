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
BACKUP_DIR="$ROOT_DIR/.publish-backup"

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
  common
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
  plugin-theme
  plugin-storage
  test-utils
  plugins
  lytjs
  lytx
  vscode-extension
)

log "Lyt.js Publishing Pipeline"
log "==========================="

if [ "$DRY_RUN" = true ]; then
  warn "DRY RUN MODE - No packages will actually be published"
fi

# Step 0: 检查所有包版本是否一致
log ""
log "Step 0: Checking package versions..."
echo ""

node "$ROOT_DIR/scripts/version.js" current
echo ""

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

if ! "$TSX" "$ROOT_DIR/tests/test-runner.ts" 2>&1; then
  err "Tests failed. Aborting publish."
  exit 1
fi

ok "All tests passed"

# Step 2.5: 备份并替换 workspace:* 为实际版本号
log ""
log "Step 2.5: Replacing workspace:* with actual version numbers..."
echo ""

# 获取当前版本号（从根 package.json 读取，这是唯一真值）
CURRENT_VERSION=$(node -e "
  const pkg = require('$ROOT_DIR/package.json');
  console.log(pkg.version);
")

# 创建备份目录
rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

FIXED_COUNT=0
for pkg in "${PUBLISH_ORDER[@]}"; do
  pkg_json="$PACKAGES_DIR/$pkg/package.json"
  [ ! -f "$pkg_json" ] && continue

  # 检查是否包含 workspace:*
  if grep -q '"workspace:\*"' "$pkg_json"; then
    # 备份原始文件
    cp "$pkg_json" "$BACKUP_DIR/$pkg.json"
    # 替换 workspace:* 为 ^当前版本号
    sed -i.bak "s/\"workspace:\*\"/\"^${CURRENT_VERSION}\"/g" "$pkg_json"
    rm -f "$pkg_json.bak"
    log "  Fixed: $pkg (workspace:* → ^${CURRENT_VERSION})"
    FIXED_COUNT=$((FIXED_COUNT + 1))
  fi
done

if [ $FIXED_COUNT -eq 0 ]; then
  ok "No workspace:* references found"
else
  ok "Fixed $FIXED_COUNT package(s)"
fi

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

  if (cd "$pkg_dir" && npm publish $PUBLISH_ARGS --access public --registry https://registry.npmjs.org 2>&1); then
    ok "$pkg_name published successfully"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    err "$pkg_name publish failed"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

# Step 4: 从备份还原 workspace:*（发布完成后恢复开发状态）
log ""
log "Step 4: Restoring workspace:* references from backup..."
echo ""

RESTORED_COUNT=0
for backup_file in "$BACKUP_DIR"/*.json; do
  [ ! -f "$backup_file" ] && continue

  pkg_name=$(basename "$backup_file" .json)
  pkg_json="$PACKAGES_DIR/$pkg_name/package.json"

  if [ -f "$pkg_json" ]; then
    cp "$backup_file" "$pkg_json"
    log "  Restored: $pkg_name"
    RESTORED_COUNT=$((RESTORED_COUNT + 1))
  fi
done

# 清理备份目录
rm -rf "$BACKUP_DIR"

ok "Restored $RESTORED_COUNT package(s) from backup"

echo ""
log "=========================================="
log "Publish Summary: $SUCCESS_COUNT published, $FAIL_COUNT failed"
if [ "$DRY_RUN" = true ]; then
  warn "This was a DRY RUN - no packages were actually published"
fi
log "=========================================="

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
