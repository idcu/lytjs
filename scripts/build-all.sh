#!/bin/bash
# ============================================================
# Lyt.js Build All Script — 统一构建脚本
#
# 按依赖顺序构建所有包，包含以下步骤：
#   1. 清理旧的 dist 目录（可选）
#   2. 使用 esbuild CLI 打包所有包（ESM + CJS）
#   3. 生成 .d.ts 类型声明文件
#   4. 输出构建体积报告
#
# 用法：
#   bash scripts/build-all.sh              # 完整构建
#   bash scripts/build-all.sh --clean      # 清理后构建
#   bash scripts/build-all.sh --bundle-only # 仅打包
#   bash scripts/build-all.sh --types-only  # 仅类型声明
#   bash scripts/build-all.sh --filter reactivity
# ============================================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PACKAGES_DIR="$ROOT_DIR/packages"
ESBUILD="$ROOT_DIR/node_modules/.bin/esbuild"
TSC="$ROOT_DIR/node_modules/.bin/tsc"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${BLUE}[build-all]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; }
header() { echo -e "${BOLD}${CYAN}$1${NC}"; }

# ============================================================
# 包列表（按依赖顺序）
# ============================================================
ALL_PACKAGES=(
  reactivity vdom compiler renderer component core
  router store cli devtools components
  plugin-i18n plugin-auth plugin-logger
  test-utils plugins agg lytx
)

# ============================================================
# 解析参数
# ============================================================
CLEAN=false
BUNDLE_ONLY=false
TYPES_ONLY=false
FILTER=""

for arg in "$@"; do
  case "$arg" in
    --clean)        CLEAN=true ;;
    --bundle-only)  BUNDLE_ONLY=true ;;
    --types-only)   TYPES_ONLY=true ;;
    --filter=*)     FILTER="${arg#--filter=}" ;;
  esac
done

# ============================================================
# 确定构建目标
# ============================================================
if [ -n "$FILTER" ]; then
  FILTER_NAME="${FILTER#@lytjs/}"
  TARGETS=()
  for pkg in "${ALL_PACKAGES[@]}"; do
    [ "$pkg" = "$FILTER_NAME" ] && TARGETS=("$pkg") && break
  done
  [ ${#TARGETS[@]} -eq 0 ] && err "Package '$FILTER' not found" && exit 1
else
  TARGETS=("${ALL_PACKAGES[@]}")
fi

# ============================================================
# Step 0: 清理
# ============================================================
if [ "$CLEAN" = true ]; then
  header "  Step 0: Cleaning dist directories..."
  for pkg in "${TARGETS[@]}"; do
    dist_dir="$PACKAGES_DIR/$pkg/dist"
    [ -d "$dist_dir" ] && rm -rf "$dist_dir" && log "  Cleaned: $pkg/dist"
  done
  ok "Clean completed"
fi

# ============================================================
# Step 1: esbuild CLI 打包
# ============================================================
if [ "$TYPES_ONLY" = false ]; then
  header ""
  header "  Step 1: Building packages with esbuild..."
  header ""

  if [ ! -f "$ESBUILD" ]; then
    err "esbuild not found. Run 'pnpm install' first."
    exit 1
  fi

  log "Packages: ${TARGETS[*]}"
  echo ""

  SUCCESS=0
  SKIP=0
  FAIL=0

  for pkg in "${TARGETS[@]}"; do
    pkg_dir="$PACKAGES_DIR/$pkg"
    entry="$pkg_dir/src/index.ts"
    dist_dir="$pkg_dir/dist"

    if [ ! -f "$entry" ]; then
      warn "  $pkg: no src/index.ts, skipping"
      SKIP=$((SKIP + 1))
      continue
    fi

    mkdir -p "$dist_dir"
    log "  Building $pkg..."

    # 根据包类型选择 platform 和 external
    # cli / lytx: Node.js 包，使用 --platform=node
    # components: 使用相对路径导入 @lytjs/component，需要额外 external
    case "$pkg" in
      cli)
        PLATFORM="node"
        EXTRA_EXTERNAL="--external:esbuild"
        ;;
      lytx)
        PLATFORM="node"
        EXTRA_EXTERNAL=""
        ;;
      components)
        PLATFORM="browser"
        EXTRA_EXTERNAL="--external:../../component/src/index.ts"
        ;;
      *)
        PLATFORM="browser"
        EXTRA_EXTERNAL=""
        ;;
    esac

    # 清理旧的 CJS 输出（cli 包使用 .js 替代 .cjs）
    rm -f "$dist_dir/index.cjs" 2>/dev/null
    rm -f "$dist_dir/index.js" 2>/dev/null

    # ESM (.mjs)
    if "$ESBUILD" "$entry" \
        --bundle --minify --tree-shaking=true \
        --platform="$PLATFORM" --target=es2018 \
        --format=esm \
        --outfile="$dist_dir/index.mjs" \
        --external:@lytjs/* \
        $EXTRA_EXTERNAL \
        --log-level=warning 2>&1; then
      ok "  $pkg: ESM OK"
    else
      err "  $pkg: ESM failed"
      FAIL=$((FAIL + 1))
      continue
    fi

    # CJS (.cjs) — cli 包输出为 .js 以兼容 npm bin
    cjs_ext="cjs"
    [ "$pkg" = "cli" ] && cjs_ext="js"
    if "$ESBUILD" "$entry" \
        --bundle --minify --tree-shaking=true \
        --platform="$PLATFORM" --target=es2018 \
        --format=cjs \
        --outfile="$dist_dir/index.${cjs_ext}" \
        --external:@lytjs/* \
        $EXTRA_EXTERNAL \
        --log-level=warning 2>&1; then
      ok "  $pkg: CJS OK"
    else
      err "  $pkg: CJS failed"
      FAIL=$((FAIL + 1))
      continue
    fi

    # 为 cli/lytx 包生成 bin 入口脚本
    if [ "$pkg" = "cli" ] || [ "$pkg" = "lytx" ]; then
      cjs_bin="index.js"
      [ "$pkg" = "lytx" ] && cjs_bin="index.cjs"
      printf '#!/usr/bin/env node\nrequire("./%s")\n' "$cjs_bin" > "$dist_dir/cli.js"
      chmod +x "$dist_dir/cli.js"
    fi

    SUCCESS=$((SUCCESS + 1))
  done

  echo ""
  log "  =========================================="
  log "  Bundle: $SUCCESS success, $SKIP skipped, $FAIL failed"
  log "  =========================================="

  [ $FAIL -gt 0 ] && err "Build failed with $FAIL errors" && exit 1
fi

# ============================================================
# Step 2: .d.ts 类型声明
# ============================================================
if [ "$BUNDLE_ONLY" = false ]; then
  header ""
  header "  Step 2: Generating .d.ts type declarations..."
  header ""

  if [ ! -f "$TSC" ]; then
    warn "TypeScript not found. Skipping type declarations."
  else
    TYPE_PKGS=(reactivity vdom compiler renderer component core router store)

    if [ -n "$FILTER" ]; then
      FT=()
      for p in "${TYPE_PKGS[@]}"; do [ "$p" = "$FILTER_NAME" ] && FT=("$p") && break; done
      TYPE_TARGETS=("${FT[@]:-${TYPE_PKGS[@]}}")
    else
      TYPE_TARGETS=("${TYPE_PKGS[@]}")
    fi

    TS=0; TSK=0; TF=0

    for pkg in "${TYPE_TARGETS[@]}"; do
      pkg_dir="$PACKAGES_DIR/$pkg"
      [ ! -d "$pkg_dir/src" ] && warn "  $pkg: no src/, skip" && TSK=$((TSK+1)) && continue
      [ ! -f "$pkg_dir/tsconfig.json" ] && warn "  $pkg: no tsconfig.json, skip" && TSK=$((TSK+1)) && continue

      log "  Generating declarations for $pkg..."
      if (cd "$pkg_dir" && "$TSC" -p tsconfig.json 2>&1); then
        ok "  $pkg: declarations OK"
        TS=$((TS + 1))
      elif [ -d "$pkg_dir/dist/types" ] && [ "$(ls -A "$pkg_dir/dist/types" 2>/dev/null)" ]; then
        ok "  $pkg: declarations OK (with warnings)"
        TS=$((TS + 1))
      else
        err "  $pkg: declarations failed"
        TF=$((TF + 1))
      fi
    done

    # agg 聚合包声明
    if [ -z "$FILTER" ] && [ -d "$PACKAGES_DIR/agg" ]; then
      log "  Generating declarations for agg..."
      AGG_DIR="$PACKAGES_DIR/agg/dist/types"
      mkdir -p "$AGG_DIR"
      cat > "$AGG_DIR/index.d.ts" << 'AGG_EOF'
// Lyt.js Aggregate Entry — Auto-generated
export { createApp, h, Fragment, defineAsyncComponent } from '../core/dist/types/index';
export type { App, ComponentOptions, VNode, Plugin, PluginObject, AppAPI, AppConfig } from '../core/dist/types/index';
export { reactive, ref, computed, watch, watchEffect, effect, nextTick, toRaw, isReactive, isRef, shallowReactive, shallowRef, triggerRef, unref, toRef, toRefs, readonly } from '../reactivity/dist/types/index';
export type { Ref, ComputedRef, WatchOptions, WatchSource } from '../reactivity/dist/types/index';
export { compile, parseHTML, transform, optimize, generate, parseSFC, compileSFC } from '../compiler/dist/types/index';
export { createRenderer, ssrRenderer, renderToString, renderToStream } from '../renderer/dist/types/index';
export { defineComponent, defineAsyncComponent as defineAsync, Transition, TransitionGroup, KeepAlive, Suspense } from '../component/dist/types/index';
export { createRouter } from '../router/dist/types/index';
export type { Router, RouterOptions, Route } from '../router/dist/types/index';
export { createStore, getStore, getStoreIds } from '../store/dist/types/index';
export type { StoreOptions, StoreApi } from '../store/dist/types/index';
AGG_EOF
      ok "  agg: declarations OK"
    fi

    echo ""
    log "  =========================================="
    log "  Types:  $TS generated, $TSK skipped, $TF failed"
    log "  =========================================="
    [ $TF -gt 0 ] && warn "Type generation had $TF failures (non-blocking)"
  fi
fi

# ============================================================
# Step 3: 体积报告
# ============================================================
header ""
header "  Step 3: Build Size Report"
header ""

echo ""
printf "  ${BOLD}%-18s %10s %12s %10s %12s${NC}\n" "Package" "ESM" "ESM gzip" "CJS" "CJS gzip"
echo "  $(printf '%.0s-' {1..64})"

total_esm=0; total_gzip=0; total_cjs=0; total_cjs_gzip=0

for pkg in "${TARGETS[@]}"; do
  dist_dir="$PACKAGES_DIR/$pkg/dist"
  [ ! -f "$dist_dir/index.mjs" ] && [ ! -f "$dist_dir/index.cjs" ] && continue

  if [ -f "$dist_dir/index.mjs" ]; then
    es=$(wc -c < "$dist_dir/index.mjs"); eg=$(gzip -c "$dist_dir/index.mjs" | wc -c)
    total_esm=$((total_esm+es)); total_gzip=$((total_gzip+eg))
    es_s="${es} B"; eg_s="${eg} B"
  else
    es_s="-"; eg_s="-"
  fi

  if [ -f "$dist_dir/index.cjs" ]; then
    cs=$(wc -c < "$dist_dir/index.cjs"); cg=$(gzip -c "$dist_dir/index.cjs" | wc -c)
    total_cjs=$((total_cjs+cs)); total_cjs_gzip=$((total_cjs_gzip+cg))
    cs_s="${cs} B"; cg_s="${cg} B"
  else
    cs_s="-"; cg_s="-"
  fi

  printf "  ${GREEN}%-18s${NC} %10s %12s %10s %12s\n" "@lytjs/$pkg" "$es_s" "$eg_s" "$cs_s" "$cg_s"
done

echo "  $(printf '%.0s-' {1..64})"
printf "  ${BOLD}%-18s${NC} %10s %12s %10s %12s\n" "TOTAL" "${total_esm} B" "${total_gzip} B" "${total_cjs} B" "${total_cjs_gzip} B"

echo ""
ekb=$(echo "scale=2; $total_esm / 1024" | bc 2>/dev/null || echo "N/A")
gkb=$(echo "scale=2; $total_gzip / 1024" | bc 2>/dev/null || echo "N/A")
log "  Total ESM: ${ekb} KB (gzip: ${gkb} KB)"

echo ""
ok "Build all completed successfully!"
