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

# 项目记忆：根 type-check 的内层 pnpm 会用本机版本 ≠ 声明版本而失败，
# 故统一走 corepack pnpm@11.3.0（免交互下载）。
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
PNPM=(corepack pnpm@11.3.0)

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
