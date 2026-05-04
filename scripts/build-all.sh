#!/usr/bin/env bash
#
# 根仓库统一构建脚本
#
# 按依赖层级从低到高依次构建，确保依赖关系正确。
#
# 用法: bash scripts/build-all.sh [--clean]
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
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 清理模式
if [[ "${1:-}" == "--clean" ]]; then
  log_info "清理所有构建产物..."
  pnpm -r exec rm -rf dist
  rm -rf node_modules/.cache
  log_success "清理完成"
fi

# 检查依赖方向
log_info "检查依赖方向..."
if ! pnpm run check-deps; then
  log_error "依赖方向检查失败，请修复后再构建"
  exit 1
fi
log_success "依赖方向检查通过"

# 按层级构建
# L0: common 子仓库
log_info "========================================="
log_info "构建 L0: common 子仓库..."
log_info "========================================="

# 先构建 common 下的所有孙仓库（并行构建）
PIDS=""
for pkg in packages/common/packages/*/; do
  if [ -d "$pkg" ]; then
    pkg_name=$(basename "$pkg")
    # 跳过 common 聚合包（它不是 @lytjs/common-* 子包）
    if [ "$pkg_name" = "common" ]; then
      continue
    fi
    log_info "构建 @lytjs/common-${pkg_name}..."
    pnpm --filter "@lytjs/common-${pkg_name}" run build &
    PIDS="$PIDS $!"
  fi
done

# 等待所有并行构建完成，任一失败则终止
for pid in $PIDS; do
  if ! wait "$pid"; then
    log_error "L0 层并行构建失败 (pid: $pid)"
    exit 1
  fi
done

# 构建 common 聚合包
log_info "构建 @lytjs/common 聚合包..."
pnpm --filter "@lytjs/common" run build || {
  log_error "构建 @lytjs/common 聚合包失败"
  exit 1
}

# 构建 host-contract（L0: 零外部依赖）
log_info "构建 @lytjs/host-contract..."
pnpm --filter "@lytjs/host-contract" run build || {
  log_error "构建 @lytjs/host-contract 失败"
  exit 1
}

# L1: reactivity, vdom, compiler, dom-runtime
log_info "========================================="
log_info "构建 L1: reactivity / vdom / compiler / dom-runtime..."
log_info "========================================="

for pkg in reactivity vdom compiler dom-runtime; do
  log_info "构建 @lytjs/${pkg}..."
  pnpm --filter "@lytjs/${pkg}" run build || {
    log_error "构建 @lytjs/${pkg} 失败"
    exit 1
  }
done

# L2: renderer, component, adapter-web, runtime-convergence
log_info "========================================="
log_info "构建 L2: renderer / component / adapter-web / runtime-convergence..."
log_info "========================================="

for pkg in renderer component adapter-web runtime-convergence; do
  log_info "构建 @lytjs/${pkg}..."
  pnpm --filter "@lytjs/${pkg}" run build || {
    log_error "构建 @lytjs/${pkg} 失败"
    exit 1
  }
done

# L3: core, core-vnode, core-signal
log_info "========================================="
log_info "构建 L3: core / core-vnode / core-signal..."
log_info "========================================="

for pkg in core core-vnode core-signal; do
  log_info "构建 @lytjs/${pkg}..."
  pnpm --filter "@lytjs/${pkg}" run build || {
    log_error "构建 @lytjs/${pkg} 失败"
    exit 1
  }
done

# L4-L6: ecosystem, lytui, plugins, tools
log_info "========================================="
log_info "构建 L4-L6: ecosystem / lytui / plugins / tools..."
log_info "========================================="

for subrepo in ecosystem lytui plugins tools; do
  if [ -d "packages/${subrepo}/packages" ]; then
    for pkg in packages/${subrepo}/packages/*/; do
      if [ -d "$pkg" ]; then
        pkg_name=$(basename "$pkg")
        log_info "构建 @lytjs/${pkg_name}..."
        pnpm --filter "@lytjs/${pkg_name}" run build || {
          log_error "构建 @lytjs/${pkg_name} 失败"
          exit 1
        }
      fi
    done
  fi
done

# 体积检查
log_info "========================================="
log_info "体积检查..."
log_info "========================================="

if pnpm run size-check; then
  log_success "体积检查通过"
else
  log_warn "体积检查未通过（部分包可能尚未构建）"
fi

log_success "========================================="
log_success "全部构建完成！"
log_success "========================================="
