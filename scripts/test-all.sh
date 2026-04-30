#!/usr/bin/env bash
#
# 根仓库统一测试脚本
#
# 运行所有包的测试，支持按层级筛选。
#
# 用法:
#   bash scripts/test-all.sh              # 运行所有测试
#   bash scripts/test-all.sh --watch      # 监听模式
#   bash scripts/test-all.sh --coverage   # 覆盖率模式
#   bash scripts/test-all.sh --layer L0   # 仅运行 L0 层测试
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

# 解析参数
WATCH_MODE=false
COVERAGE_MODE=false
TARGET_LAYER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch)
      WATCH_MODE=true
      shift
      ;;
    --coverage)
      COVERAGE_MODE=true
      shift
      ;;
    --layer)
      shift
      TARGET_LAYER="${1:-}"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

# 构建 vitest 参数
VITEST_ARGS="run"

if [ "$WATCH_MODE" = true ]; then
  VITEST_ARGS=""
fi

if [ "$COVERAGE_MODE" = true ]; then
  VITEST_ARGS="$VITEST_ARGS --coverage"
fi

# 按层级运行测试
run_layer_tests() {
  local layer=$1
  local filter=$2

  log_info "========================================="
  log_info "运行 ${layer} 层测试..."
  log_info "========================================="

  if [ -n "$filter" ]; then
    pnpm --filter "$filter" run test -- $VITEST_ARGS || {
      log_error "${layer} 层测试失败"
      return 1
    }
  fi

  log_success "${layer} 层测试通过"
}

if [ -n "$TARGET_LAYER" ]; then
  # 按指定层级运行
  case "$TARGET_LAYER" in
    L0)
      run_layer_tests "L0" "@lytjs/common-*"
      ;;
    L1)
      run_layer_tests "L1" "@lytjs/reactivity @lytjs/vdom @lytjs/compiler"
      ;;
    L2)
      run_layer_tests "L2" "@lytjs/renderer @lytjs/component"
      ;;
    L3)
      run_layer_tests "L3" "@lytjs/core"
      ;;
    *)
      log_error "未知层级: $TARGET_LAYER (支持: L0, L1, L2, L3)"
      exit 1
      ;;
  esac
else
  # 运行所有测试
  log_info "运行全部测试...\n"

  pnpm vitest $VITEST_ARGS || {
    log_error "测试失败"
    exit 1
  }
fi

log_success "========================================="
log_success "所有测试通过！"
log_success "========================================="
