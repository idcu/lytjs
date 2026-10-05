#!/usr/bin/env bash
# perf-baseline.sh —— lint 性能基线测量（ADR 0013 的配套工具）
# 用法: bash keel/checks/perf-baseline.sh [次数=3] [目录=keel]
# 输出: 每次耗时 + 中位/最小/最大，并按 §7.3 的口径对照 LINT_SECONDS
#
# 为什么需要它：ADR 0008 优化过一次，ADR 0013 查清了抖动根因（fork 成本），
# 但**每次改动到底省了多少**没有客观记录——靠"感觉快了"不算数。
# 本脚本只做一件事：在同一台机器、同一份代码上重复采样，给出可比较的数字。
#
# 刻意不做的事：不 judge 性能好坏、不自动改 LINT_SECONDS。
# 阈值归 budget.env 管（放宽它需 owner + 双签，见 CONSTITUTION 人审关卡）。
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
N=${1:-3}
DIR=${2:-keel}
LINT="$HERE/keel-lint.sh"
BUDGET="$HERE/budget.env"

[ -f "$LINT" ] || { echo "❌ 找不到 $LINT"; exit 2; }

# 预算真源是唯一口径来源（§7.1：不复制数字）
LIMIT=$(grep -E '^LINT_SECONDS=' "$BUDGET" 2>/dev/null | tail -1 | cut -d= -f2 | tr -d '[:space:]')
[ -n "$LIMIT" ] || LIMIT=300

echo "perf-baseline · 次数=$N · 目录=$DIR · 预算=${LIMIT}s（来自 budget.env）"
times=""
for i in $(seq 1 "$N"); do
  t0=$(date +%s)
  bash "$LINT" "$DIR" >/dev/null 2>&1
  t1=$(date +%s)
  d=$((t1 - t0))
  times="$times $d"
  # 立刻给反馈：慢的那次要看得见，否则容易只记住最快那次
  if [ "$d" -gt "$LIMIT" ]; then
    echo "  采样 $i: ${d}s  ⚠️ 超预算（仅告警，不 fail —— ADR 0008）"
  else
    echo "  采样 $i: ${d}s"
  fi
done

# 统计：中位数比平均数更抗单次抖动（ADR 0013 记录过 7 倍散布）
printf '%s\n' $times | sort -n | awk -v lim="$LIMIT" '
  { a[NR]=$1; sum+=$1 }
  END {
    med = (NR % 2) ? a[(NR+1)/2] : int((a[NR/2]+a[NR/2+1])/2)
    printf "\n  最小 %ds · 中位 %ds · 最大 %ds · 平均 %ds\n", a[1], med, a[NR], sum/NR
    ratio = med ? lim/med : 0
    printf "  余量：预算/中位 = %.2f×\n", ratio
    if (med*2 > lim) print "  ⚠️ 中位已用掉预算的一半以上——文档数再涨就该做 ADR 0013 的优化项了"
    else print "  ✅ 中位在预算的一半以内"
  }'
