#!/usr/bin/env bash
#
# 根仓库统一发布脚本
#
# 按依赖层级从低到高依次发布所有包。
# 使用 changeset 管理版本号和 CHANGELOG。
*
* 用法:
*   bash scripts/publish.sh              # 正式发布
*   bash scripts/publish.sh --dry-run    # 预演模式（不实际发布）
*   bash scripts/publish.sh --tag next   # 发布到 next 标签
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# 解析参数
DRY_RUN=false
TAG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --tag)
      shift
      TAG="--tag ${1:-latest}"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# 前置检查
log_info "前置检查..."

# 检查是否在正确的分支
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "develop" ]; then
  log_warn "当前分支: $BRANCH（建议在 main 或 develop 分支发布）"
fi

# 检查是否有未提交的更改
if ! git diff --quiet; then
  log_error "存在未提交的更改，请先提交"
  exit 1
fi

# 检查是否已登录 npm
if [ "$DRY_RUN" = false ]; then
  if ! npm whoami > /dev/null 2>&1; then
    log_error "未登录 npm，请先运行: npm login"
    exit 1
  fi
fi

# 构建
log_info "构建所有包..."
pnpm run build || {
  log_error "构建失败"
  exit 1
}

# 运行测试
log_info "运行测试..."
pnpm test || {
  log_error "测试失败"
  exit 1
}

# 检查依赖方向
log_info "检查依赖方向..."
pnpm run check-deps || {
  log_error "依赖方向检查失败"
  exit 1
}

# 发布
if [ "$DRY_RUN" = true ]; then
  log_info "========================================="
  log_info "预演模式（不会实际发布）"
  log_info "========================================="
  pnpm changeset publish --dry-run "$TAG"
  log_success "预演完成"
else
  log_info "========================================="
  log_info "开始发布..."
  log_info "========================================="
  pnpm changeset publish "$TAG"
  log_success "========================================="
  log_success "发布完成！"
  log_success "========================================="

  # 推送版本变更
  log_info "推送版本变更..."
  git push --follow-tags
  log_success "推送完成"
fi
