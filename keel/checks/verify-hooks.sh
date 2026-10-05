#!/usr/bin/env bash
# verify-hooks.sh —— 闭环钩子"验谎"（《Keel 设计稿》§10.4）
# 用法: bash keel/checks/verify-hooks.sh [项目根] [--allow-unset]
# 退出码: 0 = 钩子就绪；1 = 钩子缺失 / 不可执行 / 挂载点不符；2 = 用法错误
#
# 为什么需要它：
#   lint 第 16 项只能验"钩子本体在不在仓库里"（防误删）。而闭环真正会静默失效的
#   是第二种方式：**本体在、但没人装**。
#   `core.hooksPath` 是仓库级本地配置、不进版本历史，所以"装没装"只能本地验——
#   本脚本就是那个本地关卡；CI 用 --allow-unset 只验本体（新 clone 天然没装）。
#   挂载有两种形态（ADR 0017）：直挂（== <keel>/checks/hooks）与链式
#   （既有钩子框架的钩子文件调用 keel 本体）——链式判定见下方 ②。
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
KEEL=$(cd "$HERE/.." && pwd)
ROOT=""
ALLOW_UNSET=0
for a in "$@"; do
  case "$a" in
    --allow-unset) ALLOW_UNSET=1 ;;
    -*) echo "❌ 未知参数: $a"; exit 2 ;;
    *) ROOT="$a" ;;
  esac
done
ROOT=${ROOT:-$(cd "$KEEL/.." && pwd)}
# 归一化：传入相对路径时，下面的前缀匹配会失效（KEEL_ABS 永远是绝对路径）
ROOT=$(cd "$ROOT" 2>/dev/null && pwd) || { echo "❌ 项目根不存在: $ROOT"; exit 2; }

[ -d "$KEEL/checks/hooks" ] || { echo "❌ 缺钩子本体目录: $KEEL/checks/hooks"; exit 1; }

fail=0
fail_msg() { echo "❌ $1"; fail=1; }
warn_msg() { echo "⚠️ $1"; }

# ① 本体：存在且可执行（与 lint 第 16 项同口径，但这里能直接给出修复命令）
for h in pre-commit commit-msg; do
  hf="$KEEL/checks/hooks/$h"
  if [ ! -f "$hf" ]; then
    fail_msg "缺钩子本体: checks/hooks/$h"
  elif [ ! -x "$hf" ]; then
    fail_msg "钩子不可执行: ${h}（修：chmod +x keel/checks/hooks/${h}，并确认 git 记录了 100755）"
  fi
done

# ② 挂载：core.hooksPath 必须指向 <keel>/checks/hooks
KEEL_ABS=$(cd "$KEEL" && pwd)
if ! git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  warn_msg "不是 git 仓库（$ROOT），跳过挂载检查"
else
  WANT=""
  case "$KEEL_ABS" in
    "$ROOT"/*) WANT="${KEEL_ABS#"$ROOT"/}/checks/hooks" ;;
    *) warn_msg "keel 目录不在仓库根之下，core.hooksPath 无法用相对路径表达" ;;
  esac
  if [ -n "$WANT" ]; then
    cur=$(git -C "$ROOT" config --get core.hooksPath || true)
    if [ -z "${cur:-}" ]; then
      if [ "$ALLOW_UNSET" -eq 1 ]; then
        warn_msg "本地未挂载钩子（CI / 新 clone 属正常）：跑一次 bash ${WANT%/hooks}/install-hooks.sh"
      else
        fail_msg "本地未挂载钩子——闭环此刻是静默失效的：跑一次 bash ${WANT%/hooks}/install-hooks.sh"
      fi
    elif [ "$cur" != "$WANT" ]; then
      # v3.4.7（ADR 0017）：链式挂载——core.hooksPath 归既有钩子框架所有
      # （典型：husky 的 .husky/_），但 git 实际执行的钩子文件、或其**父目录的同名文件**
      # 里调用了 keel 钩子本体（husky 的委托形态正是 .husky/_ → .husky/<钩子>）。
      case "$cur" in
        /*) HOOKDIR="$cur" ;;
        *)  HOOKDIR="$ROOT/$cur" ;;
      esac
      chain_ok=1; chain_at=""
      for h in pre-commit commit-msg; do
        hit=""
        for cand in "$HOOKDIR/$h" "$(dirname "$HOOKDIR")/$h"; do
          if [ -f "$cand" ] && grep -qF "$WANT/$h" "$cand" 2>/dev/null; then hit="$cand"; break; fi
        done
        if [ -n "$hit" ]; then chain_at="$hit"; else chain_ok=0; fi
      done
      if [ "$chain_ok" -eq 1 ]; then
        echo "✅ 链式挂载成立：core.hooksPath=${cur}，两个钩子均调用 keel 本体（例：${chain_at#"$ROOT"/}）"
      elif [ "$ALLOW_UNSET" -eq 1 ]; then
        warn_msg "core.hooksPath 指向 ${cur}，未检出链式调用（应为 ${WANT}）——并入说明见 install-hooks.sh"
      else
        fail_msg "core.hooksPath 指向 ${cur}，且未检出链式调用 keel 钩子（应为 ${WANT}）——并入说明见 install-hooks.sh"
      fi
    fi
  fi
fi

echo "──"
if [ "$fail" -eq 0 ]; then echo "✅ 闭环钩子就绪"; else echo "❌ 闭环钩子未就绪（见上方 ❌ 项）"; fi
exit "$fail"
