#!/usr/bin/env bash
# install-hooks.sh —— 安装 Keel 闭环钩子（《Keel 设计稿》§10.4 之二 / 之三）
# 用法: bash keel/checks/install-hooks.sh [项目根]      # 默认 = keel 的上一级
# 退出码: 0 = 已安装；1 = 有冲突未安装；2 = 用法 / 环境错误
#
# 做法: 钩子本体版本化在 keel/checks/hooks/（可评审、团队共享、跟着分支走），
#       本脚本只把 core.hooksPath 指向它——**不往 .git/hooks/ 写不可见文件**。
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
KEEL=$(cd "$HERE/.." && pwd)
ROOT=${1:-$(cd "$KEEL/.." && pwd)}
# 归一化：core.hooksPath 必须用相对仓库根的路径表达，传入相对路径会让下面的前缀匹配失效
ROOT=$(cd "$ROOT" 2>/dev/null && pwd) || { echo "❌ 项目根不存在: $ROOT"; exit 2; }

[ -d "$KEEL/pitfalls" ] || { echo "❌ 这里不像 keel 目录: $KEEL"; exit 2; }
[ -d "$HERE/hooks" ] || { echo "❌ 缺钩子本体目录: $HERE/hooks"; exit 2; }

if ! git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  echo "❌ 不是 git 仓库: $ROOT"
  echo "   钩子依赖 git（core.hooksPath / git add），请在仓库内运行。"
  exit 2
fi

# 钩子在仓库根执行，core.hooksPath 必须用相对仓库根的路径
KEEL_ABS=$(cd "$KEEL" && pwd)
case "$KEEL_ABS" in
  "$ROOT"/*) HOOKS_REL="${KEEL_ABS#"$ROOT"/}/checks/hooks" ;;
  *) echo "❌ keel 目录不在仓库根之下，core.hooksPath 无法用相对路径表达"; exit 2 ;;
esac

cur=$(git -C "$ROOT" config --get core.hooksPath || true)
if [ -n "${cur:-}" ] && [ "$cur" != "$HOOKS_REL" ]; then
  echo "❌ 本仓库已有 core.hooksPath=${cur}，本脚本不覆盖它。"
  echo "   请把 keel 的两个钩子并入该目录（在框架钩子里调用 keel/checks/hooks/<钩子名>，
   verify-hooks.sh 认可这种链式挂载，ADR 0017），或先 git config --unset core.hooksPath 再重跑。"
  exit 1
fi

git -C "$ROOT" config core.hooksPath "$HOOKS_REL"
chmod +x "$HERE/hooks/pre-commit" "$HERE/hooks/commit-msg" 2>/dev/null

echo "✅ 已安装 Keel 钩子：core.hooksPath = ${HOOKS_REL}"
echo "   ② pre-commit  keel/ 下 md 有变更时跑 keel-lint.sh，0 fail 才放行"
echo "   ③ commit-msg  message 里的「pitfall: <文件名>」自动给该条 triggers +1"
echo
echo "⚠️  core.hooksPath 是仓库级设置：挂上之后 .git/hooks/ 下的钩子全部失效。"
echo "    如果你原本依赖 .git/hooks/ 里的东西，请先把它们迁进 ${HOOKS_REL}。"
echo "    团队协作时这一步每个人都要跑一次（或用 CI 兜底）。"

# 复核：装完立刻验一遍（§10.4 "验谎"）——安装脚本自己也要能被验，
# 否则"装好了"就只是脚本的一句自述，而不是可复核的事实。
echo
echo "── 复核（verify-hooks.sh）"
bash "$HERE/verify-hooks.sh" "$ROOT"
