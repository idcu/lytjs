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
# 优先级：corepack(PATH) > corepack(node 同目录) > 全局 pnpm（最后手段，见下方预检）。
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# 项目声明 `packageManager: pnpm@11.3.0`，因此**优先能锁版本的方式**（corepack），
# 最后才回退全局 pnpm —— 2026-09-24 第二次踩坑：全局 pnpm（新版）报
#   "Cannot verify the identity of the @pnpm/exe.darwin-x64 native binary:
#    it is missing from pnpm-lock.yaml"
# 导致 6 项在 1s 内全红；改由 corepack 提供 pnpm@11.3.0 即可。
PNPM=()
node_path="$(command -v node 2>/dev/null || true)"

if command -v corepack >/dev/null 2>&1; then
  PNPM=(corepack pnpm@11.3.0)
elif [ -n "$node_path" ] && [ -x "$(dirname "$node_path")/corepack" ]; then
  PNPM=("$(dirname "$node_path")/corepack" pnpm@11.3.0)
elif command -v pnpm >/dev/null 2>&1; then
  PNPM=(pnpm)
  echo "⚠️  未找到 corepack，回退到全局 pnpm（可能与项目声明的 pnpm@11.3.0 版本不同）。"
fi

if [ ${#PNPM[@]} -eq 0 ]; then
  echo "❌ 找不到 corepack 或 pnpm。请准备其一："
  echo "     corepack enable          （corepack 通常随 node 提供）"
  echo "     或直接安装：npm i -g pnpm@11.3.0"
  exit 127
fi

echo "包管理器：${PNPM[*]}"
echo "node：$(node -v 2>/dev/null || echo '未知')"

# ── 预检：避免 6 项重复报同一个环境错误 ──
if ! "${PNPM[@]}" -v >/dev/null 2>&1; then
  echo ""
  echo "❌ 包管理器自检失败（下面是它的原始输出）："
  "${PNPM[@]}" -v 2>&1 | sed 's/^/   /'
  echo ""
  echo "常见原因：全局 pnpm 的新版完整性校验（@pnpm/exe 不在 pnpm-lock.yaml）。"
  echo "修复建议（任选其一）："
  echo "  1) 启用 corepack 以使用项目声明的 pnpm@11.3.0：  corepack enable"
  echo "  2) 直接用 node 自带的 corepack（本脚本已尝试）："
  echo "       \$(dirname \$(command -v node))/corepack enable pnpm"
  exit 127
fi
echo "pnpm：$("${PNPM[@]}" -v 2>/dev/null)"

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
