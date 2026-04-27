#!/bin/bash
# ============================================================
# Lyt.js Build All Script — 统一构建脚本
#
# 按依赖顺序构建所有包，包含以下步骤：
#   1. 清理旧的 dist 目录（可选）
#   2. 使用 esbuild CLI 打包所有包（ESM + CJS）
#   3. 生成 .d.ts 类型声明文件
#   4. 输出构建体积报告
#   5. 验证 external 依赖与 package.json dependencies 一致性
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
  common reactivity vdom compiler renderer component core
  router store cli devtools components performance
  plugin-i18n plugin-auth plugin-logger plugin-theme plugin-storage plugin-sdk
  plugin-chart plugin-highlight plugin-virtual-list plugin-registry
  micro-frontend
  test-utils plugins lytjs lytx vscode-extension ai compat
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
    case "$pkg" in
      plugin-sdk)
        PLATFORM="node"
        EXTRA_EXTERNAL=""
        ;;
      cli)
        PLATFORM="node"
        EXTRA_EXTERNAL="--external:esbuild"
        ;;
      lytx)
        PLATFORM="node"
        EXTRA_EXTERNAL=""
        ;;
      test-utils)
        PLATFORM="node"
        EXTRA_EXTERNAL=""
        ;;
      ai)
        PLATFORM="node"
        EXTRA_EXTERNAL=""
        ;;
      compat)
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

    rm -f "$dist_dir/index.cjs" 2>/dev/null
    rm -f "$dist_dir/index.js" 2>/dev/null

    # ESM (.mjs)
    esbuild_args=(
      "$entry"
      --bundle --minify --tree-shaking=true
      --platform="$PLATFORM" --target=es2018
      --format=esm
      --outfile="$dist_dir/index.mjs"
      --external:@lytjs/*
      $EXTRA_EXTERNAL
      --legal-comments=none
      --log-level=warning
    )
    # 对于 cli/lytx/test-utils 包，不 drop:console，保留输出
    if [ "$pkg" != "cli" ] && [ "$pkg" != "lytx" ] && [ "$pkg" != "test-utils" ]; then
      esbuild_args+=(--drop:console --drop:debugger)
    fi
    if "$ESBUILD" "${esbuild_args[@]}" 2>&1; then
      ok "  $pkg: ESM OK"
    else
      err "  $pkg: ESM failed"
      FAIL=$((FAIL + 1))
      continue
    fi

    # CJS (.cjs)
    cjs_ext="cjs"
    [ "$pkg" = "cli" ] && cjs_ext="js"
    esbuild_args_cjs=(
      "$entry"
      --bundle --minify --tree-shaking=true
      --platform="$PLATFORM" --target=es2018
      --format=cjs
      --outfile="$dist_dir/index.${cjs_ext}"
      --external:@lytjs/*
      $EXTRA_EXTERNAL
      --legal-comments=none
      --log-level=warning
    )
    if [ "$pkg" != "cli" ] && [ "$pkg" != "lytx" ] && [ "$pkg" != "test-utils" ]; then
      esbuild_args_cjs+=(--drop:console --drop:debugger)
    fi
    if "$ESBUILD" "${esbuild_args_cjs[@]}" 2>&1; then
      ok "  $pkg: CJS OK"
    else
      err "  $pkg: CJS failed"
      FAIL=$((FAIL + 1))
      continue
    fi

    # 为 cli/lytx/ai/compat 包生成 bin 入口脚本
    if [ "$pkg" = "cli" ] || [ "$pkg" = "lytx" ] || [ "$pkg" = "ai" ] || [ "$pkg" = "compat" ]; then
      cjs_bin="index.js"
      [ "$pkg" = "lytx" ] || [ "$pkg" = "ai" ] || [ "$pkg" = "compat" ] && cjs_bin="index.cjs"
      
      # 构建 bin 入口
      bin_entry=""
      bin_out=""
      
      if [ "$pkg" = "cli" ]; then
        bin_entry="$pkg_dir/src/bin/cli.ts"
        bin_out="cli.js"
      elif [ "$pkg" = "lytx" ]; then
        bin_entry="$pkg_dir/src/bin/lytx.ts"
        bin_out="lytx.js"
      elif [ "$pkg" = "ai" ]; then
        bin_entry="$pkg_dir/src/bin/lyt-ai.ts"
        bin_out="lyt-ai.js"
      elif [ "$pkg" = "compat" ]; then
        bin_entry="$pkg_dir/src/bin/vue-to-lyt.ts"
        bin_out="vue-to-lyt.js"
      fi
      
      if [ -f "$bin_entry" ]; then
        log "  Building $pkg bin..."
        # 构建 bin 的 ESM
        "$ESBUILD" "$bin_entry" \
          --bundle --minify --tree-shaking=true \
          --platform=node --target=ES2018 \
          --format=esm \
          --outfile="$dist_dir/bin/${bin_out%.js}.mjs" \
          --external:@lytjs/* \
          --legal-comments=none \
          --log-level=warning >/dev/null 2>&1 && ok "  $pkg bin: ESM OK"
        # 构建 bin 的 CJS
        "$ESBUILD" "$bin_entry" \
          --bundle --minify --tree-shaking=true \
          --platform=node --target=ES2018 \
          --format=cjs \
          --outfile="$dist_dir/bin/${bin_out%.js}.cjs" \
          --external:@lytjs/* \
          --legal-comments=none \
          --log-level=warning >/dev/null 2>&1 && ok "  $pkg bin: CJS OK"
        # 创建可执行入口
        printf '#!/usr/bin/env node\nrequire("./%s")\n' "${bin_out%.js}.cjs" > "$dist_dir/bin/$bin_out"
        chmod +x "$dist_dir/bin/$bin_out"
      fi
    fi

    # 为 renderer 包构建平台子路径入口（dom/ssr/native/miniapp/vapor）
    if [ "$pkg" = "renderer" ]; then
      RENDERER_SUBS=("dom" "ssr" "native" "miniapp" "vapor")
      for sub in "${RENDERER_SUBS[@]}"; do
        sub_entry="$pkg_dir/src/$sub/index.ts"
        if [ -f "$sub_entry" ]; then
          log "  Building $pkg/$sub..."
          if "$ESBUILD" "$sub_entry" \
              --bundle --minify --tree-shaking=true \
              --platform=browser --target=es2018 \
              --format=esm \
              --outfile="$dist_dir/${sub}.mjs" \
              --external:@lytjs/* \
              --drop:console --drop:debugger \
              --legal-comments=none \
              --log-level=warning 2>&1; then
            ok "  $pkg/$sub: ESM OK"
          else
            err "  $pkg/$sub: ESM failed"
          fi
          if "$ESBUILD" "$sub_entry" \
              --bundle --minify --tree-shaking=true \
              --platform=browser --target=es2018 \
              --format=cjs \
              --outfile="$dist_dir/${sub}.cjs" \
              --external:@lytjs/* \
              --drop:console --drop:debugger \
              --legal-comments=none \
              --log-level=warning 2>&1; then
            ok "  $pkg/$sub: CJS OK"
          else
            err "  $pkg/$sub: CJS failed"
          fi
        else
          warn "  $pkg/$sub: no src/$sub/index.ts, skipping"
        fi
      done
    fi

    # 为 compiler 包构建子路径入口（sfc/wasm）
    if [ "$pkg" = "compiler" ]; then
      COMPILER_SUBS=("sfc-entry" "wasm-entry")
      COMPILER_SUB_NAMES=("sfc" "wasm")
      for i in "${!COMPILER_SUBS[@]}"; do
        sub="${COMPILER_SUBS[$i]}"
        sub_name="${COMPILER_SUB_NAMES[$i]}"
        sub_entry="$pkg_dir/src/${sub}.ts"
        if [ -f "$sub_entry" ]; then
          log "  Building $pkg/$sub_name..."
          if "$ESBUILD" "$sub_entry" \
              --bundle --minify --tree-shaking=true \
              --platform=browser --target=es2018 \
              --format=esm \
              --outfile="$dist_dir/${sub}.mjs" \
              --external:@lytjs/* \
              --drop:console --drop:debugger \
              --legal-comments=none \
              --log-level=warning 2>&1; then
            ok "  $pkg/$sub_name: ESM OK"
          else
            err "  $pkg/$sub_name: ESM failed"
          fi
          if "$ESBUILD" "$sub_entry" \
              --bundle --minify --tree-shaking=true \
              --platform=browser --target=es2018 \
              --format=cjs \
              --outfile="$dist_dir/${sub}.cjs" \
              --external:@lytjs/* \
              --drop:console --drop:debugger \
              --legal-comments=none \
              --log-level=warning 2>&1; then
            ok "  $pkg/$sub_name: CJS OK"
          else
            err "  $pkg/$sub_name: CJS failed"
          fi
        else
          warn "  $pkg/$sub_name: no src/${sub}.ts, skipping"
        fi
      done
    fi

    # 为 core 包构建子路径入口（plugin/error/web-component/shared）
    if [ "$pkg" = "core" ]; then
      CORE_SUBS=("plugin-entry" "error-entry" "web-component-entry" "shared-entry")
      CORE_SUB_NAMES=("plugin" "error" "web-component" "shared")
      for i in "${!CORE_SUBS[@]}"; do
        sub="${CORE_SUBS[$i]}"
        sub_name="${CORE_SUB_NAMES[$i]}"
        sub_entry="$pkg_dir/src/${sub}.ts"
        if [ -f "$sub_entry" ]; then
          log "  Building $pkg/$sub_name..."
          if "$ESBUILD" "$sub_entry" \
              --bundle --minify --tree-shaking=true \
              --platform=browser --target=es2018 \
              --format=esm \
              --outfile="$dist_dir/${sub}.mjs" \
              --external:@lytjs/* \
              --drop:console --drop:debugger \
              --legal-comments=none \
              --log-level=warning 2>&1; then
            ok "  $pkg/$sub_name: ESM OK"
          else
            err "  $pkg/$sub_name: ESM failed"
          fi
          if "$ESBUILD" "$sub_entry" \
              --bundle --minify --tree-shaking=true \
              --platform=browser --target=es2018 \
              --format=cjs \
              --outfile="$dist_dir/${sub}.cjs" \
              --external:@lytjs/* \
              --drop:console --drop:debugger \
              --legal-comments=none \
              --log-level=warning 2>&1; then
            ok "  $pkg/$sub_name: CJS OK"
          else
            err "  $pkg/$sub_name: CJS failed"
          fi
        else
          warn "  $pkg/$sub_name: no src/${sub}.ts, skipping"
        fi
      done
    fi

    # 为 component 包构建子路径入口（builtins）
    if [ "$pkg" = "component" ]; then
      COMPONENT_SUBS=("builtins-entry")
      COMPONENT_SUB_NAMES=("builtins")
      for i in "${!COMPONENT_SUBS[@]}"; do
        sub="${COMPONENT_SUBS[$i]}"
        sub_name="${COMPONENT_SUB_NAMES[$i]}"
        sub_entry="$pkg_dir/src/${sub}.ts"
        if [ -f "$sub_entry" ]; then
          log "  Building $pkg/$sub_name..."
          if "$ESBUILD" "$sub_entry" \
              --bundle --minify --tree-shaking=true \
              --platform=browser --target=es2018 \
              --format=esm \
              --outfile="$dist_dir/${sub}.mjs" \
              --external:@lytjs/* \
              --drop:console --drop:debugger \
              --legal-comments=none \
              --log-level=warning 2>&1; then
            ok "  $pkg/$sub_name: ESM OK"
          else
            err "  $pkg/$sub_name: ESM failed"
          fi
          if "$ESBUILD" "$sub_entry" \
              --bundle --minify --tree-shaking=true \
              --platform=browser --target=es2018 \
              --format=cjs \
              --outfile="$dist_dir/${sub}.cjs" \
              --external:@lytjs/* \
              --drop:console --drop:debugger \
              --legal-comments=none \
              --log-level=warning 2>&1; then
            ok "  $pkg/$sub_name: CJS OK"
          else
            err "  $pkg/$sub_name: CJS failed"
          fi
        else
          warn "  $pkg/$sub_name: no src/${sub}.ts, skipping"
        fi
      done
    fi

    # 为 reactivity 包构建子路径入口（signal）
    if [ "$pkg" = "reactivity" ]; then
      REACTIVITY_SUBS=("signal")
      for sub in "${REACTIVITY_SUBS[@]}"; do
        sub_entry="$pkg_dir/src/${sub}.ts"
        if [ -f "$sub_entry" ]; then
          log "  Building $pkg/$sub..."
          if "$ESBUILD" "$sub_entry" \
              --bundle --minify --tree-shaking=true \
              --platform=browser --target=es2018 \
              --format=esm \
              --outfile="$dist_dir/${sub}.mjs" \
              --external:@lytjs/* \
              --drop:console --drop:debugger \
              --legal-comments=none \
              --log-level=warning 2>&1; then
            ok "  $pkg/$sub: ESM OK"
          else
            err "  $pkg/$sub: ESM failed"
          fi
          if "$ESBUILD" "$sub_entry" \
              --bundle --minify --tree-shaking=true \
              --platform=browser --target=es2018 \
              --format=cjs \
              --outfile="$dist_dir/${sub}.cjs" \
              --external:@lytjs/* \
              --drop:console --drop:debugger \
              --legal-comments=none \
              --log-level=warning 2>&1; then
            ok "  $pkg/$sub: CJS OK"
          else
            err "  $pkg/$sub: CJS failed"
          fi
        else
          warn "  $pkg/$sub: no src/${sub}.ts, skipping"
        fi
      done
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
# Step 1.5: 验证 external 依赖一致性
# ============================================================
if [ "$TYPES_ONLY" = false ] && [ "$BUNDLE_ONLY" = false ]; then
  header ""
  header "  Step 1.5: Validating external dependencies..."
  header ""

  DEP_WARN=0

  for pkg in "${TARGETS[@]}"; do
    pkg_json="$PACKAGES_DIR/$pkg/package.json"
    [ ! -f "$pkg_json" ] && continue

    # 提取 --external 参数中声明的模块
    case "$pkg" in
      cli)
        EXTERNAL_MODULES=("esbuild")
        ;;
      *)
        EXTERNAL_MODULES=()
        ;;
    esac

    # 检查每个 external 模块是否在 dependencies 或 peerDependencies 中声明
    for ext_mod in "${EXTERNAL_MODULES[@]}"; do
      # 使用 node 提取 dependencies 和 peerDependencies
      has_dep=$(node -e "
        const pkg = require('$pkg_json');
        const deps = pkg.dependencies || {};
        const peers = pkg.peerDependencies || {};
        const has = deps['$ext_mod'] || peers['$ext_mod'];
        process.exit(has ? 0 : 1);
      " 2>/dev/null || echo "false")

      if [ "$has_dep" = "false" ]; then
        warn "  $pkg: '$ext_mod' is marked as --external but NOT declared in dependencies/peerDependencies"
        DEP_WARN=$((DEP_WARN + 1))
      fi
    done
  done

  if [ $DEP_WARN -eq 0 ]; then
    ok "  All external dependencies are properly declared"
  else
    warn "  $DEP_WARN external dependency warning(s) found"
    warn "  Please ensure all --external modules are listed in package.json dependencies"
  fi
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
    TYPE_PKGS=(common reactivity vdom compiler renderer component core router store cli devtools components performance plugin-i18n plugin-auth plugin-logger plugin-theme plugin-storage plugin-sdk plugin-chart plugin-highlight plugin-virtual-list plugin-registry micro-frontend test-utils plugins lytx ai compat)

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

    # lytjs 聚合包声明
  if [ -z "$FILTER" ] && [ -d "$PACKAGES_DIR/lytjs" ]; then
    log "  Generating declarations for lytjs..."
    AGG_DIR="$PACKAGES_DIR/lytjs/dist/types"
    mkdir -p "$AGG_DIR"
    cat > "$AGG_DIR/index.d.ts" << 'AGG_EOF'
// Lyt.js Aggregate Entry — Auto-generated
// common 公共工具
export * from '../common/dist/types/index';
// core 核心
export { createApp, h, Fragment } from '../core/dist/types/index';
export type { App, ComponentOptions, VNode, DirectiveHooks, DirectiveBinding, Children, Props } from '../core/dist/types/index';
export { ShapeFlags } from '../core/dist/types/index';
// core 公共工具（子路径，兼容旧版本）
export * from '../core/dist/types/shared-entry';
// core 插件系统（子路径）
export { createProvidesContext, installPlugin, uninstallPlugin, isPluginObject, isPluginFunction, getPluginName } from '../core/dist/types/plugin-entry';
export type { Plugin, PluginObject, AppAPI, AppConfig } from '../core/dist/types/plugin-entry';
// core 错误处理（子路径）
export { LytError, LytErrorCodes, ErrorBoundary, handleError, callWithErrorHandling, warn, warnOnce, setDevMode, createMessage, ErrorCategory, getErrorMessage, getCategory, createCompilerError, createRendererError, createComponentError, formatError, getComponentStack, createErrorOverlay } from '../core/dist/types/error-entry';
export type { ErrorBoundaryOptions, ErrorCategoryType, SourceLocation } from '../core/dist/types/error-entry';
// core Web Component（子路径）
export { defineCustomElement, registerComponents, unregisterElement, isBrowser, defineCustomElementFromSFC } from '../core/dist/types/web-component-entry';
export type { CustomElementOptions, ComponentRegistration } from '../core/dist/types/web-component-entry';
// reactivity
export { reactive, ref, computed, watch, watchEffect, effect, nextTick, toRaw, isReactive, isRef, shallowReactive, shallowRef, triggerRef, unref, toRef, toRefs, readonly } from '../reactivity/dist/types/index';
export type { Ref, ComputedRef, WatchOptions, WatchSource } from '../reactivity/dist/types/index';
// compiler 核心
export { compile, parseHTML, transform, optimize, generate } from '../compiler/dist/types/index';
// compiler SFC（子路径）
export { parseSFC, compileSFC, scopeCSS } from '../compiler/dist/types/sfc-entry';
export type { SFCDescriptor, SFCBlock, SFCStyleBlock, SFCCompileResult } from '../compiler/dist/types/sfc-entry';
// renderer（主入口仅含 DOM）
export { createRenderer } from '../renderer/dist/types/index';
// renderer SSR（子路径）
export { ssrRenderer, renderToString, renderToStream } from '../renderer/dist/types/ssr/index';
// component 核心
export { defineComponent } from '../component/dist/types/index';
// component 内置组件（子路径）
export { defineAsyncComponent, Transition, TransitionGroup, KeepAlive, Suspense } from '../component/dist/types/builtins-entry';
export type { TransitionProps, TransitionGroupProps, KeepAliveProps, SuspenseProps, AsyncComponentOptions } from '../component/dist/types/builtins-entry';
// router
export { createRouter } from '../router/dist/types/index';
export type { Router, RouterOptions, Route } from '../router/dist/types/index';
// store
export { createStore, getStore, getStoreIds } from '../store/dist/types/index';
export type { StoreOptions, StoreApi } from '../store/dist/types/index';
AGG_EOF
      ok "  lytjs: declarations OK"
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
