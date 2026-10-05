#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# 门禁分档（2026-10-05 实测后划分）
#
# 快档（秒级｜只读源码、不需要 dist）—— 日常改动 / 提交前用这一档：
#   check-build-order        ~1.2s
#   check-ui-slot-single-node ~0.1s
#   check-ui-props-wiring    ~0.1s（报告型）
#
# 慢档（分钟级｜与日常反馈无关）—— 发布前 / CI 跑这一档：
#   eslint  全仓             ~27s
#   prettier 全仓 format     ~89s
#   check-circular (dist)    ~14s（src 模式 ~29s）
#   build (76 包)            数分钟（需先有 dist）
#   check-runtime-contract   ~1.5s（依赖 dist）
#   check-doc-imports        ~4.7s（依赖 dist）
#   type-check / test:coverage  数分钟
#
# 用法：
#   bash scripts/verify-baseline.sh            # 完整（慢档 + 测试）
#   bash scripts/verify-baseline.sh --fast     # 只跑快档（秒级反馈）
#   bash scripts/verify-baseline.sh --no-cov   # 完整但跳过覆盖率
#
# 为什么这样分：**慢的四项（全仓 lint / 全仓 format / 循环依赖 / 全量构建）
# 都是「全仓级」检查**，它们的结论不随单次改动快速变化，
# 却会把秒级反馈拖成分钟级 ⇒ 日常内循环不该等它们；
# 但它们**必须**在发布/CI 前跑一次，所以完整档一次都不少。
# ─────────────────────────────────────────────────────────────────
#
# 基线验证 —— 在系统终端（不经 agent 沙箱）跑完整门禁（8 项），输出 PASS / FAIL 摘要。
#
# 用法：
#   bash scripts/verify-baseline.sh            # 跑全部 8 项
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
# npm 的全局目录可能是自定义的（本机为 /Volumes/Repos/npm/global），其 bin **不在 PATH**，
# 于是 `npm i -g corepack` 装好了却仍 `command not found` —— 需要显式去该目录找。
npm_bin="$(npm prefix -g 2>/dev/null || true)/bin"

if command -v corepack >/dev/null 2>&1; then
  PNPM=(corepack pnpm@11.3.0)
elif [ -n "$node_path" ] && [ -x "$(dirname "$node_path")/corepack" ]; then
  PNPM=("$(dirname "$node_path")/corepack" pnpm@11.3.0)
elif [ -n "$npm_bin" ] && [ -x "$npm_bin/corepack" ]; then
  PNPM=("$npm_bin/corepack" pnpm@11.3.0)
  echo "ℹ️  使用 npm 全局目录中的 corepack：$npm_bin/corepack"
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
  # 兜底：新版 pnpm 会对原生二进制做完整性校验，而 pnpm 自身的 @pnpm/exe
  # 不在项目的 pnpm-lock.yaml 里 ⇒ 直接报错。关掉该校验即可继续。
  if "${PNPM[@]}" --config.verifyDepsBeforeRun=false -v >/dev/null 2>&1; then
    echo "⚠️  包管理器自检告警，已自动追加 --config.verifyDepsBeforeRun=false 继续"
    PNPM+=("--config.verifyDepsBeforeRun=false")
  else
    echo ""
    echo "❌ 包管理器自检失败（下面是它的原始输出）："
    "${PNPM[@]}" -v 2>&1 | sed 's/^/   /'
    echo ""
    echo "常见原因：全局 pnpm 的新版完整性校验（@pnpm/exe 不在 pnpm-lock.yaml）。"
    echo "推荐修复（直接对齐项目声明的 pnpm@11.3.0）："
    echo "     npm i -g corepack && corepack enable"
    echo "  然后重跑本脚本。备选：npm i -g pnpm@11.3.0"
    exit 127
  fi
fi
echo "pnpm：$(pnpm -v 2>/dev/null || "${PNPM[@]}" -v 2>/dev/null)"

SKIP_COV=0
FAST=0
for arg in "$@"; do
  [ "$arg" = "--no-cov" ] && SKIP_COV=1
  # ★ 2026-10-05：--fast 只跑「快档」门禁（见文件头分档表）
  [ "$arg" = "--fast" ] && FAST=1
done

pass=0
fail=0
env_suspect=0
failed_names=()

# 环境干扰特征：命中即标注「疑似环境」，避免把环境的账记到代码上
ENV_PATTERN='safe-delete|SAFE_DELETE|ECONNREFUSED|Broker request timed out|Brokered program policy|broker\.sock'

run() {
  local name="$1"
  shift
  echo ""
  echo "────────────────────────────────────────────────────────"
  echo "▶ $name"
  echo "────────────────────────────────────────────────────────"
  local start=$SECONDS
  local logf
  logf="$(mktemp -t vb)"

  if "$@" >"$logf" 2>&1; then
    echo "✅ PASS  $name  ($((SECONDS - start))s)"
    pass=$((pass + 1))
    rm -f "$logf"
  else
    local dur=$((SECONDS - start))
    if grep -qE "$ENV_PATTERN" "$logf"; then
      echo "⚠️  FAIL  $name  (${dur}s) —— **疑似环境干扰**（未跑到实质内容）"
      env_suspect=$((env_suspect + 1))
      echo "   命中的环境特征行："
      grep -E "$ENV_PATTERN" "$logf" | head -2 | sed 's/^/     /'
    else
      echo "❌ FAIL  $name  (${dur}s)"
    fi
    echo "   尾部输出："
    tail -8 "$logf" | sed 's/^/     /'
    fail=$((fail + 1))
    failed_names+=("$name")
    rm -f "$logf"
  fi
}

echo "lytjs 基线验证 —— 开始于 $(date '+%F %T')"

# ── 门禁执行：委托给 scripts/gate.mjs（单一真相源）────────────────
# 之所以委托：门禁清单（名字 / 档位 / 耗时 / 说明）只写在 gate.mjs 一处，
# 本脚本与 `node scripts/gate.mjs` 不会各跑一套、也不会漏项。
if [ "$FAST" -eq 1 ]; then
  echo ""
  echo "▶ 快档门禁（--fast）"
  node scripts/gate.mjs --tier fast
  fast_status=$?
  echo ""
  echo "⏭  已跳过慢档（--fast）：build / 契约守卫 / 文档 import / type-check /"
  echo "    lint / format / 循环依赖 / 测试。"
  echo "    它们没有消失 —— 用下面任一方式跑："
  echo "      node scripts/gate.mjs --tier slow        # 慢档全跑（发布前 / 定时任务）"
  echo "      node scripts/gate.mjs build format:check # 只跑指定几项"
  if [ "$fast_status" -ne 0 ]; then fail=$((fail + 1)); failed_names+=("快档门禁"); fi
  pass=$((pass + 3))
  echo ""
  echo "════════════════════════════════════════════════════════"
  echo "快档结果：3 项门禁 · 耗时 $((SECONDS / 60))m$((SECONDS % 60))s"
  echo "════════════════════════════════════════════════════════"
  exit "$fast_status"
fi

echo ""
echo "▶ 完整档门禁"
node scripts/gate.mjs --tier slow
slow_status=$?
if [ "$slow_status" -ne 0 ]; then
  fail=$((fail + 1)); failed_names+=("慢档门禁")
else
  pass=$((pass + 1))
fi

# 说明：测试已并入 gate.mjs 的慢档清单（test / test:coverage 两项），
# 由上面的「完整档门禁」统一执行，此处不再重复调用。
if [ "$SKIP_COV" -eq 1 ]; then
  echo "ℹ️  --no-cov：完整档仍会跑 test（覆盖率项请用 node scripts/gate.mjs 显式指定）"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "基线验证结果： ✅ $pass 项通过 · ❌ $fail 项失败 · 耗时 $((SECONDS / 60))m$((SECONDS % 60))s"
if [ "$fail" -gt 0 ]; then
  printf '失败项：%s\n' "${failed_names[*]}"
  if [ "$env_suspect" -gt 0 ]; then
    echo "其中 $env_suspect 项疑似环境干扰（safe-delete 守卫 / broker IPC），建议换一个不经该沙箱的终端重跑以确认。"
  fi
fi
echo "════════════════════════════════════════════════════════"

exit "$fail"
