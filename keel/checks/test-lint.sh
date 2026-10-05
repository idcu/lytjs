#!/usr/bin/env bash
# test-lint.sh —— keel-lint 自测入口（DESIGN.md §9.3）
# 用法: bash keel/checks/test-lint.sh [-v] [--keep]
# 退出码: 0 = 全部通过；1 = 有用例失败；2 = 环境缺 python3（跳过，不算失败）
#
# 为什么要跑它: §9 主张"机器验"，而验证脚本自己也会腐烂——改了检查项却忘了改
# 用例、或改了文档却忘了改脚本，lint 就会悄悄变成摆设。这个套件是规则自己的
# 回归测试：每个用例对应 §9.1 检查表里的一项。
#
# 依赖说明: 自测用 python3 写（fixture 生成与断言更可靠）；
#           keel-lint.sh 本体只依赖 bash 3.2+ / awk / sed / find（+ 可选 tsort / git）。
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)

if ! command -v python3 >/dev/null 2>&1; then
  echo "⚠️  未找到 python3，跳过 keel-lint 自测（lint 本体不受影响）"
  exit 2
fi

exec python3 "$HERE/test-lint.py" "$@"
