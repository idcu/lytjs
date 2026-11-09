#!/usr/bin/env bash
# 定时任务入口：跑**慢档**门禁（发布前 / nightly / CI 用）
#
# 与日常开发的关系：**完全解耦** —— 日常只跑 `pnpm check:fast`（约 4~6s），
# 本脚本把全仓级检查（构建 / 类型 / lint / format / 循环依赖 / 测试）攒到
# 无人值守时段跑，不占用开发反馈路径。
#
# 用法：
#   bash scripts/nightly-gates.sh                    # 慢档全跑
#   bash scripts/nightly-gates.sh --no-cov          # 用 test 代替 test:coverage
#   bash scripts/nightly-gates.sh --only lint:check # 只跑一个按 gate 登记名指定的门禁
#
# ── cron 示例（每天 03:17 跑，把输出落盘）────────────────────────
#   17 3 * * *  cd /Volumes/Data/lytjs/lytjs && bash scripts/nightly-gates.sh \
#     >> /tmp/lytjs-nightly.log 2>&1
#
# ── launchd 示例（macOS 用户级定时任务）─────────────────────────
#   把它写进 ~/Library/LaunchAgents/com.lytjs.gates.plist：
#     ProgramArguments: ["/bin/bash", "/Volumes/Data/lytjs/lytjs/scripts/nightly-gates.sh"]
#     StartCalendarInterval: { Hour: 3, Minute: 17 }
#     StandardOutPath: /tmp/lytjs-nightly.log
#
# ⚠️ 退出码：任一门禁失败即非 0 ⇒ cron / CI 能据此报警。
#
# ★ 2026-11-09 实测留痕（N05 / ADR 0028）：`node scripts/gate.mjs build`
#   exit=0 / 355.3s（76 包全量构建通过）。旧注释所称「当前沙箱 build 与
#   test:coverage 被 safe-delete 守卫拦住」是当时的环境限制，**已解除**；
#   后续若在别的环境失败，按 ADR 0008 先判环境还是代码，不要放宽判据阈值。

set -uo pipefail
cd "$(dirname "$0")/.."

# 清理异常退出残留的 vitest 临时产物（只删一天前的；三处 ignore 已同步，N04）
find . -maxdepth 1 -name 'vitest.config.ts.timestamp-*.mjs' -mtime +1 -delete 2>/dev/null || true

GATE_ARGS=(--tier slow)
ONLY_NAME=''

# 用 while + shift 解析：`--only <name>` 必须消费掉后面的门禁名。
# 旧实现把名字当「未知参数」退出 2，且 `--filter-later` 从未被 gate 支持（N05）。
while [ $# -gt 0 ]; do
  case "$1" in
    --no-cov)
      # 用 test 代替 test:coverage（覆盖率棘轮在正式 CI 里跑）
      GATE_ARGS=(test build check-runtime-contract check-doc-imports type-check lint:check format:check check-circular check-circular:src)
      shift
      ;;
    --only)
      shift
      if [ $# -eq 0 ]; then
        echo "错误：--only 需要一个 gate 登记名，例如 --only lint:check" >&2
        exit 2
      fi
      ONLY_NAME="$1"
      shift
      ;;
    *)
      echo "未知参数：$1" >&2
      exit 2
      ;;
  esac
done

if [ -n "$ONLY_NAME" ]; then
  GATE_ARGS=("$ONLY_NAME")
fi

echo "════ lytjs 定时门禁 ════  开始于 $(date '+%F %T')"
node scripts/gate.mjs "${GATE_ARGS[@]}"
status=$?

echo "════ 结束于 $(date '+%F %T') · 退出码 $status"
exit "$status"
