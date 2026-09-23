#!/usr/bin/env bash
#
# 基线验证 —— 在系统终端（不经 agent 沙箱）跑完整门禁，输出 PASS / FAIL 摘要。
#
# 用法：
#   bash scripts/verify-baseline.sh            # 跑全部 6 项
#   bash scripts/verify-baseline.sh --no-cov   # 跳过覆盖率（最慢的一项）
#
# 为什么要这个脚本：
#   在 agent 沙箱里跑门禁出现过几类**环境**干扰（与代码无关）：
#     - WorkBuddy broker IPC 超时 / 不可用（eslint、prettier 阶段）
#     - safe-delete 守卫拦截构建清理（tsup / vitest-coverage 阶段）
#     - 整体耗时劣化导致 vitest 5000ms 超时误判
#   拿可信基线请在本脚本里（即系统终端）跑，而不是在沙箱里跑。
#
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

# ── 探测包管理器 ──────────────────────────────────────────
# 不同终端的 PATH 差异很大（nvm / conda / 官方安装 / agent 沙箱），
# 不能硬编码 corepack —— 2026-09-24 首次在用户终端跑就因 `corepack: command not found` 全项失败。
# 优先级：corepack pnpm@11.3.0（锁版本）> 直接 pnpm > node 同目录的 corepack。
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

PNPM=()
if command -v corepack >/dev/null 2>&1; then
  PNPM=(corepack pnpm@11.3.0)
elif command -v pnpm >/dev/null 2>&1; then
  PNPM=(pnpm)
else
  node_path="$(command -v node 2>/dev/null || true)"
  if [ -n "$node_path" ] && [ -x "$(dirname "$node_path")/corepack" ]; then
    PNPM=("$(dirname "$node_path")/corepack" pnpm@11.3.0)
  fi
fi

if [ ${#PNPM[@]} -eq 0 ]; then
  echo "❌ 找不到 pnpm 或 corepack。请先准备其一，例如："
  echo "     npm i -g pnpm@11.3.0"
  echo "   或确认 node 已在 PATH（node -v）后再试（corepack 通常随 node 提供）。"
  exit 127
fi

echo "包管理器：${PNPM[*]}"
echo "node：$(node -v 2>/dev/null || echo '未知')"

SKIP_COV=0
for arg in "$@"; do
  [ "$arg" = "--no-cov" ] && SKIP_COV=1
done

pass=0
fail=0
failed_names=()

run() {
  local name="$1"
  shift
  echo ""
  echo "────────────────────────────────────────────────────────"
  echo "▶ $name"
  echo "────────────────────────────────────────────────────────"
  local start=$SECONDS
  if "$@"; then
    echo "✅ PASS  $name  ($((SECONDS - start))s)"
    pass=$((pass + 1))
  else
    echo "❌ FAIL  $name  ($((SECONDS - start))s)"
    fail=$((fail + 1))
    failed_names+=("$name")
  fi
}

echo "lytjs 基线验证 —— 开始于 $(date '+%F %T')"

run "check-build-order" "${PNPM[@]}" run check-build-order
run "build (76 包)"     "${PNPM[@]}" run build
run "type-check"        "${PNPM[@]}" -r run type-check
run "lint:check"        "${PNPM[@]}" run lint:check
run "format:check"      "${PNPM[@]}" run format:check

if [ "$SKIP_COV" -eq 1 ]; then
  run "test (不含覆盖率)" "${PNPM[@]}" run test
else
  run "test:coverage"     "${PNPM[@]}" run test:coverage
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "基线验证结果： ✅ $pass 项通过 · ❌ $fail 项失败 · 耗时 $((SECONDS / 60))m$((SECONDS % 60))s"
if [ "$fail" -gt 0 ]; then
  printf '失败项：%s\n' "${failed_names[*]}"
fi
echo "════════════════════════════════════════════════════════"

exit "$fail"
