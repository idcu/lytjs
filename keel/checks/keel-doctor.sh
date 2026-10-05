#!/usr/bin/env bash
# keel-doctor.sh —— 装完先跑这个：3 分钟看到你这套 Keel 现在什么样
#
# 用法:  bash keel/checks/keel-doctor.sh [项目根]
# 退出码: 0 = 一切就绪；1 = 有需要处理的项（逐条列了，不给模糊结论）
#
# 为什么要有这个：装完 Keel 的第一分钟是决定会不会继续用的那一分钟。
# 但"读 README 理解价值"要 30 分钟，"跑一条命令看到自己的数字"要 10 秒。
# **价值应该可自证，而不是靠说明书说服。**
#
# 本脚本**只读不写**（除 .metrics/ 里的本地观测记录，那是脚本自己的账本）：
# 它不修任何东西、不改任何文件——诊断与修复分开，避免"顺手改掉你的东西"。

set -uo pipefail

ROOT="${1:-.}"
ROOT="${ROOT%/}"
KEEL="$ROOT/keel"
[ -d "$KEEL" ] || { echo "❌ 这里没有 keel/ 目录：$ROOT"; exit 1; }

# ---------- 硬预算真源（同一份，不复制） ----------
BYTES_SESSION=15000
if [ -f "$KEEL/checks/budget.env" ]; then
  # shellcheck disable=SC1091
  . "$KEEL/checks/budget.env"
fi

echo "keel-doctor · $(date '+%Y-%m-%d %H:%M')"
echo

# ---------- 五项检查 ----------
prob=0

# 1. 门禁是否闭合（锚点 + 钩子本体 + 挂载点）
printf '%s' "1. 闭环门禁"
anchor_ok=0
for f in AGENTS.md CLAUDE.md .cursorrules; do
  if [ -f "$ROOT/$f" ] && grep -qF '任何任务开始前，先读 keel/INDEX.md' "$ROOT/$f" 2>/dev/null; then
    anchor_ok=1; anchor_at="$f"; break
  fi
done
if [ -d "$ROOT/.cursor/rules" ] && grep -qF '任何任务开始前，先读 keel/INDEX.md' "$ROOT/.cursor/rules/keel.mdc" 2>/dev/null; then
  anchor_ok=1; anchor_at=".cursor/rules/keel.mdc"
fi

hook_body=0; hook_mount="未挂载"
if [ -f "$KEEL/checks/hooks/pre-commit" ] && [ -x "$KEEL/checks/hooks/pre-commit" ]; then
  hook_body=1
  if [ -f "$KEEL/checks/verify-hooks.sh" ]; then
    if (cd "$ROOT" && bash "$KEEL/checks/verify-hooks.sh" "$ROOT" >/dev/null 2>&1); then
      hook_mount="已挂载"
    elif (cd "$ROOT" && bash "$KEEL/checks/verify-hooks.sh" "$ROOT" --allow-unset >/dev/null 2>&1); then
      hook_mount="本体在·未挂载"
    fi
  fi
fi

if [ "$anchor_ok" = 1 ] && [ "$hook_body" = 1 ] && [ "$hook_mount" = "已挂载" ]; then
  echo "✅ 锚点在 $anchor_at ·钩子本体在 · 已挂载 —— 闭环成立"
elif [ "$anchor_ok" = 0 ]; then
  echo "❌ 点火锚点不在——**整套系统等于不存在**"
  echo "     协议写在 keel/INDEX.md 里，但 AI 不会凭空去读它（协议在门内，钥匙必须在门外）。"
  echo "     修法：重跑 install.sh 加 --with-anchor，或手动把锚点那一句放进你的工具规则。"
  prob=1
else
  [ "$hook_body" = 1 ] || echo "❌ 钩子本体缺失或不可执行 —— 提交不会被拦"
  [ "$hook_mount" = "已挂载" ] || echo "⚠️ 钩子未挂载（core.hooksPath）—— 本地不会被拦，CI 仍会。修法：bash $KEEL/checks/install-hooks.sh"
  prob=1
fi
echo

# 2. lint 是否 0 fail
printf '%s' "2. 内核校验"
lint_out=$( (cd "$ROOT" && bash "$KEEL/checks/keel-lint.sh" keel) 2>&1 )
lint_rc=$?
nf=$(printf '%s' "$lint_out" | grep -ac '❌' || true)
nw=$(printf '%s' "$lint_out" | grep -ac '⚠️' || true)
spent=$(printf '%s' "$lint_out" | sed -n 's/.*耗时 \([0-9]*\)s.*/\1/p' | tail -1)
if [ "$lint_rc" = 0 ]; then
  echo "✅ 0 fail${nw:+ · $nw warn}（${spent:-?}s）"
else
  echo "❌ ${nf} 条 fail${nw:+ · $nw warn}"
  printf '%s\n' "$lint_out" | grep -a '❌' | head -5 | sed 's/^/     /'
  echo "     全量：cd $ROOT && bash keel/checks/keel-lint.sh keel"
  prob=1
fi
echo

# 3. 单轮加载预算（用你项目真实的检索词）
printf '%s' "3. 上下文预算"
if [ -f "$KEEL/checks/load-estimate.sh" ]; then
  est=$( (cd "$ROOT" && bash "$KEEL/checks/load-estimate.sh" 遵守率) 2>&1 )
  tot=$(printf '%s' "$est" | sed -n 's/.*本轮合计 *: *\([0-9]*\).*/\1/p' | tail -1)
  [ -n "${tot:-}" ] || tot=$(printf '%s' "$est" | grep -oa '本轮合计[^0-9]*[0-9]*' | tail -1 | grep -oa '[0-9]*$')
  if [ -n "${tot:-}" ]; then
    if [ "$tot" -le "$BYTES_SESSION" ]; then
      echo "✅ 检索「遵守率」需${tot} 字节（预算 ${BYTES_SESSION}，余量 $((BYTES_SESSION - tot))）"
    else
      echo "❌ 检索「遵守率」需 ${tot} 字节，**超预算 ${BYTES_SESSION}**（超 $((tot - BYTES_SESSION))）"
      echo "     这不是 bug，是你的上下文文档太胖了。修法见设计稿 §7.3：拆 / 提 / 沉。"
      echo "     换你自己的关键词再测：bash keel/checks/load-estimate.sh 你的关键词"
    fi
  else
    echo "⚠️ 无法测量（load-estimate.sh 输出未识别）"
  fi
else
  echo "⚠️ 缺 load-estimate.sh（可能被裁剪掉了）"
fi
echo

# 4. 判据本身能不能判死（**这一项最容易被跳过，也最重要**）
printf '%s' "4. 判据自检"
if [ -f "$KEEL/checks/test-lint.sh" ]; then
  #用例数**从自测脚本里数出来**，不硬编码——硬编码过一次就漂过一次（38 → 41）。
  # 判据能抓文档滞后，但抓不到脚本里的一句文案；能自动推导的就不该写死。
  _nc=$(grep -c '^@case(' "$KEEL/checks/test-lint.py" 2>/dev/null || echo 0)
  echo "⏳ 跑全量自测要几分钟（${_nc} 个故障注入 + 元检查 + 文档一致性）…"
  echo "     全量：bash keel/checks/test-lint.sh"
  echo "     **只验你刚改的那几条**（秒级，不必等全量）："
  echo "       bash keel/checks/test-lint.sh --only 06,39-41"
  echo "     ⚠️ 子集通过**不等于**可以发版——发版前仍须跑全量（漏掉的用例不会报）。"
  echo "     它验的是「你手上的 lint 到底能不能判死它声称能判死的问题」——将来你改检查项时，它是唯一护栏。"
else
  echo "⚠️ 缺 test-lint.sh（可能被裁剪掉了）——没有自测，改判据就是盲改"
fi
echo

# 5. 还需要你亲手做的（机器替不了的那部分）
printf '%s' "5. 还差你亲手"
todo=0
if grep -qE '<项目名>|<技术栈>|占位' "$KEEL/CONSTITUTION.md" 2>/dev/null; then
  echo "   ☐ keel/CONSTITUTION.md 还是占位——填它（红线 / 人审关卡）"; todo=1
fi
if grep -qE '<项目名>|待填|占位' "$KEEL/INDEX.md" 2>/dev/null; then
  echo "   ☐ keel/INDEX.md 路由表还有占位——换成你项目的真实入口"; todo=1
fi
if [ ! -s "$KEEL/NOW.md" ] || grep -q '待填\|占位' "$KEEL/NOW.md" 2>/dev/null; then
  echo "   ☐ keel/NOW.md 还没写当前焦点（每轮会话都要改它）"; todo=1
fi
if [ "$todo" = 0 ]; then
  echo "   ✅ 骨架已填上你自己的内容"
else
  echo "     （这三项机器替不了：它们是「你的项目是什么」，只有你知道）"
fi
echo

# ---------- 结论 ----------
if [ "$prob" = 0 ]; then
  echo "════结论：机制层就绪 ════"
  echo "接下来真正要做的只有一件事：**用几天，看 AI 在哪类事上仍反复出错**，然后补那一条。"
  echo "想立刻看这套系统的度量数字：bash keel/checks/compliance.sh report"
else
  echo "════结论：机制层有断点 ════"
  echo "上面标❌ 的必须先修——它们会让整套系统**静默失效**（不是"看起来不好"，是白装）。"
fi
exit "$prob"