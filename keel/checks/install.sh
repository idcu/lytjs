#!/usr/bin/env bash
# keel-install.sh —— 把 Keel 装进你的项目（一条命令）
# 用法:
#   bash <(curl -fsSL https://gitee.com/idcu/keel-starter/raw/main/install.sh) <项目根>
#   bash install.sh <项目根>              # 已 clone 下来时
#   bash install.sh <项目根> --ref v3.2.0  # 指定版本
#   bash install.sh <项目根> --with-anchor # 顺手把点火锚点写进 AGENTS.md（默认不写）
#
# 退出码: 0 = 装好且 lint 通过；1 = lint 未通过；2 = 用法/环境错误
#
# ── 为什么 --with-anchor 默认关闭（v3.3.8）─────────────────────────
# 装完还差三步，第 1 步"贴锚点"是最大的流失点：不贴，lint 当场判死、
# 本脚本以非零退出，新用户看到的是"装失败了"。
# 但**默认写入**等于未经允许改用户的 AGENTS.md——那是他的文件。
# 所以：默认只提示，加这个开关才写；已存在锚点时无论开关都不动文件。
#
# 为什么不用 npm（v3.2 实测结论）：
#   `npm pack` 会把 hooks/ 从 100755 打成 644 —— 而 lint 第 13 项要求
#   "闭环钩子本体存在**且可执行**"，所以从 npm 装出来的 keel 开箱即 fail。
#   git 则天然记录权限位（git ls-files -s 显示 100755），clone 下来就是对的。
#   本项目零编译、零运行时，引入 node 依赖树换可发现性不划算。
set -uo pipefail

REPO="https://gitee.com/idcu/keel-starter.git"
REF="main"
TARGET=""

# 参数解析：**用 while + shift 逐个取**，不要写 `for a in "$@"` 里带 shift 的写法——
# 那样会在遍历途中改掉 "$@"，实测 `install.sh <根> --ref v3.2.0` 会把 "v3.2.0"
# 当成项目根（"❌ 目录不存在: v3.2.0"）。教训同 §7：集合被遍历时不要改它。
#
# EXPLICIT_REF 必须在这里（循环内）置位：循环用 shift 消耗参数，结束后 "$*"
# 已空，那时再回头判断 " $* " 永远匹配不到——实测 --ref=v9.9.9 仍静默装了 main。
EXPLICIT_REF=0
WITH_ANCHOR=0
while [ $# -gt 0 ]; do
  case "$1" in
    --with-anchor) WITH_ANCHOR=1; shift ;;
    --ref)
      [ $# -ge 2 ] || { echo "❌ --ref 后面要跟版本号或分支名"; exit 2; }
      REF="$2"; EXPLICIT_REF=1; shift 2 ;;
    --ref=*) REF="${1#--ref=}"; EXPLICIT_REF=1; shift ;;
    -*) echo "❌ 未知参数: $1"; exit 2 ;;
    *)
      [ -z "$TARGET" ] || { echo "❌ 只能给一个项目根（多了: $1）"; exit 2; }
      TARGET="$1"; shift ;;
  esac
done

[ -n "$TARGET" ] || { echo "用法: bash install.sh <项目根> [--ref v3.2.0]"; exit 2; }
command -v git >/dev/null 2>&1 || { echo "❌ 需要 git（本项目用 git 分发以保留钩子可执行位）"; exit 2; }
[ -d "$TARGET" ] || { echo "❌ 目录不存在: $TARGET"; exit 2; }
TARGET=$(cd "$TARGET" && pwd)

# 已有 keel/ 就地升级（不覆盖用户内容），否则全新复制
EXISTING=0
[ -d "$TARGET/keel" ] && EXISTING=1

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
echo "keel-install · 目标=$TARGET · ref=$REF · 模式=$([ "$EXISTING" -eq 1 ] && echo '就地升级（保留你的内容）' || echo '全新安装')"

echo "── 1. 取模板"
# 显式指定 --ref 时，拉不到就**报错**，不静默回落到 main——
# 用户以为自己固定了版本，实际拿到别的东西，比直接失败更坏。
# 只有默认（未指定 --ref）才允许回落，那是"跟随最新版"的本意。
if ! git clone --depth 1 --branch "$REF" "$REPO" "$tmp/starter" 2>/dev/null; then
  if [ "$EXPLICIT_REF" -eq 1 ]; then
    echo "❌ 拉取失败：$REPO 的 '$REF' 不存在（或该地址不是可 clone 的 git 仓库）"
    echo "   可用版本："
    # 去掉 ^{}（那是 annotated tag 的 peeled ref，用户不需要看到）
    git ls-remote --tags "$REPO" 2>/dev/null | grep -v '\^{}' | sed 's#.*refs/tags/#   #' | tail -5
    echo "   也可去掉 --ref 跟随最新版（不推荐：版本会随 main 变动）"
    exit 2
  fi
  # 未指定 --ref：分支名可能不存在（默认是 main），回落即可
  if ! git clone --depth 1 "$REPO" "$tmp/starter" 2>/dev/null; then
    echo "❌ 拉取失败: $REPO"
    echo "   也可手工下载后运行: bash install.sh <项目根>"
    exit 2
  fi
  echo "   ⚠️  '$REF' 不是分支/tag，已用默认分支"
fi
[ -d "$tmp/starter/keel" ] || { echo "❌ 仓库里没有 keel/ 目录，不是 keel-starter"; exit 2; }

echo "── 2. 装文件"
if [ "$EXISTING" -eq 1 ]; then
  # 只补缺失与工具链，**不覆盖**用户的 INDEX/NOW/pitfalls/decisions
  # （对应设计稿 §12.3：升级按字段增量合并，不允许一键覆盖）
  # 工具链逐个补：这些是"实现"，升级应当覆盖（用户改的是文档，不是脚本）
  # compliance.sh 也在列——漏了它，老用户升级后就没有基线记录能力
  for f in checks/budget.env checks/keel-lint.sh checks/load-estimate.sh \
           checks/keel-lite.sh checks/verify-hooks.sh checks/install-hooks.sh \
           checks/compliance.sh checks/check-mcp-config.sh checks/keel-doctor.sh \
           checks/perf-findings.txt \
           checks/mcp/keel-mcp-server.py \
           checks/hooks/pre-commit checks/hooks/commit-msg; do
    if [ -e "$tmp/starter/keel/$f" ]; then
      # keel-doctor.sh 例外：**总是覆盖**。它是纯诊断脚本（只读不改），
      # 没有"用户改过"这种语义——留在旧版等于让新用户拿不到能用的诊断入口。
      # 漏一个文件的代价实测过：老用户升级后 doctor 脚本不存在，
      # 而白名单不补它**没有任何检查会报**（工具链缺失不在判据覆盖内）。
      case "$f" in
        checks/keel-doctor.sh|checks/perf-findings.txt)
          cp -R "$tmp/starter/keel/$f" "$TARGET/keel/$f" && echo "   ↑ 更新 $f（诊断/记录类总是最新）" ;;
        *)
          if [ -e "$TARGET/keel/$f" ]; then
            echo "   · 保留 $f（你的版本）"
          else
            cp -R "$tmp/starter/keel/$f" "$TARGET/keel/$f" && echo "   + 补上 $f"
          fi ;;
      esac
    fi
  done
  # 新增层（目录不存在才复制）
  for d in contracts env skills decisions; do
    [ -d "$TARGET/keel/$d" ] || { cp -R "$tmp/starter/keel/$d" "$TARGET/keel/$d" 2>/dev/null && echo "   + 补上 $d/"; }
  done
else
  cp -R "$tmp/starter/keel" "$TARGET/keel" && echo "   + 已复制 keel/（含 checks / hooks / 模板）"
fi

# 记一条基线：装模板本身不是"一次工作"，不该进遵守率的分母。
# 否则新用户第一次看 `compliance.sh report` 会被 50 个模板文件的初始化噪声吓到。
if [ -f "$TARGET/keel/checks/compliance.sh" ]; then
  bash "$TARGET/keel/checks/compliance.sh" record --baseline 1 --checked 0 --fails 0 --warns 0 --files 0 --md 0 2>/dev/null || true
fi

echo "── 3. 钩子可执行位（git 保留 100755，这里再确认一次）"
for h in pre-commit commit-msg; do
  f="$TARGET/keel/checks/hooks/$h"
  [ -f "$f" ] && { chmod +x "$f" 2>/dev/null; echo "   ✓ $h"; }
done

echo "── 4. 装钩子（core.hooksPath）"
bash "$TARGET/keel/checks/install-hooks.sh" "$TARGET" 2>&1 | sed 's/^/   /'

# §4.1 门外锚点原文——一字不能改（lint 第 7 段按原文比对）
ANCHOR='任何任务开始前，先读 keel/INDEX.md 与其中指向的 NOW.md，并遵守 INDEX.md 里的检索协议。'
anchor_present() {
  for f in AGENTS.md CLAUDE.md .cursorrules .cursor/rules/keel.mdc; do
    if [ -f "$TARGET/$f" ] && grep -qF "$ANCHOR" "$TARGET/$f" 2>/dev/null; then return 0; fi
  done
  return 1
}

echo "── 5. 点火锚点（钥匙必须在门外）"
if anchor_present; then
  echo "   ✓ 已存在锚点，未改动任何文件"
elif [ "$WITH_ANCHOR" -eq 1 ]; then
  if [ -f "$TARGET/AGENTS.md" ]; then
    printf '\n%s\n' "$ANCHOR" >> "$TARGET/AGENTS.md"
    echo "   + 已把锚点追加到 AGENTS.md 末尾（原有内容一行未动）"
  else
    printf '# AGENTS\n\n%s\n' "$ANCHOR" > "$TARGET/AGENTS.md"
    echo "   + 已创建 AGENTS.md 并写入锚点"
  fi
  anchor_present || { echo "   ❌ 写入后仍未读到锚点（权限或编码问题？）"; exit 1; }
else
  echo "   · 未写入——默认不动你的文件"
  echo "     想让我直接写进去：bash install.sh <项目根> --with-anchor"
fi

echo "── 6. 内核校验：必须 0 fail"
# 不把输出丢进 /dev/null：**新装的项目必然报"点火锚点缺失"**（这是设计意图，
# 不是故障）。若只说"lint 未通过"而不说判了什么，新用户会以为装坏了。
# **必须 cd 到目标目录再跑 lint**：install.sh 通常从别处调用（下载到 /tmp 再执行），
# 而 keel-lint.sh 的入参 `keel` 是**相对当前目录**解析的。
# 实测踩过：不 cd 时，cwd 在发布仓 → lint 校验的是发布仓自己（绿），
# 于是"装到新项目"这一步的验证全是假的——比不验证更坏。
lintout=$(cd "$TARGET" && bash keel/checks/keel-lint.sh keel 2>&1)
lint_rc=$?
if [ "$lint_rc" -eq 0 ]; then
  echo "   ✅ lint 通过"
else
  echo "   ❌ lint 未通过。以下是它判死的原因："
  printf '%s\n' "$lintout" | grep -E '^❌' | head -10 | sed 's/^/      /'
  # 注意：必须匹配 **lint 自己的报错文案**，不能匹配本脚本后面打印的提示语——
  # 否则会出现"提示说缺锚点、实际缺的是别的"这种自证陷阱（实测踩过：
  # 实际判死是「坑条目未登记」+「孤儿」，提示却说缺锚点）。
  # 判据：lint 报锚点缺失时原文含「锚点缺失或与 §4.1 原文不一致」。
  if printf '%s\n' "$lintout" | grep -q '锚点缺失或与'; then
    echo
    echo "   👉 缺的是**点火锚点**——那是第 1 步"贴锚点"还没做。"
    echo "      Keel 的检索协议写在 INDEX.md 里，但 AI 不会凭空去读它："
    echo "      协议在门内，钥匙必须在门外。这一句必须放进你的工具规则："
    echo
    echo "        任何任务开始前，先读 keel/INDEX.md 与其中指向的 NOW.md，并遵守 INDEX.md 里的检索协议。"
    echo
    echo "      放进 AGENTS.md / CLAUDE.md / .cursor/rules/keel.mdc 任一处即可。"
  else
    echo
    echo "   逐条跑一次看完整原因：bash keel/checks/keel-lint.sh keel"
  fi
  exit 1
fi

if anchor_present; then
  cat <<'EOF'

✅ 装好了。第 1 步（点火）已完成，还差两步：

  1. 填自己的内容——CONSTITUTION.md 里的「<项目名>」「<技术栈>」还是占位：
       编辑 keel/CONSTITUTION.md 写清身份、硬约束、人审关卡
       编辑 keel/INDEX.md 把路由表里的占位换成你项目的真实入口

  2. 小项目先裁剪——全量骨架带 6 个按需层，用不上就先裁掉：
       bash keel/checks/keel-lite.sh keel            # dry-run，看要删什么
       bash keel/checks/keel-lite.sh keel --apply    # 确认后执行

先跑这个（3 分钟看到你这套 Keel 现在什么样，只读不改）：
  bash keel/checks/keel-doctor.sh         # 闭环 / lint / 预算 / 自检 / 还差你做什么

日常三个命令：
  bash keel/checks/keel-lint.sh keel    # 一致性校验：0 fail 才放行
  bash keel/checks/test-lint.sh         # lint 自测：41 用例 + 1 元检查
  bash keel/checks/load-estimate.sh 关键词  # 本轮要读多少字节？超预算即非零退出
EOF
else
  cat <<'EOF'

✅ 装好了。还差三步（缺任一步，这套系统等于不存在）：

  1. 点火——把这一句放进你的工具规则（CLAUDE.md / .cursor/rules/keel.mdc / 系统提示）：
       任何任务开始前，先读 keel/INDEX.md 与其中指向的 NOW.md，并遵守 INDEX.md 里的检索协议。
     协议写在 INDEX.md 里，但 AI 不会凭空去读——协议在门内，钥匙必须在门外。
     不想手抄：bash install.sh <项目根> --with-anchor（我直接写进 AGENTS.md）

  2. 填自己的内容——CONSTITUTION.md 里的「<项目名>」「<技术栈>」还是占位：
       编辑 keel/CONSTITUTION.md 写清身份、硬约束、人审关卡
       编辑 keel/INDEX.md 把路由表里的占位换成你项目的真实入口

  3. 小项目先裁剪——全量骨架带 6 个按需层，用不上就先裁掉：
       bash keel/checks/keel-lite.sh keel            # dry-run，看要删什么
       bash keel/checks/keel-lite.sh keel --apply    # 确认后执行

先跑这个（3 分钟看到你这套 Keel 现在什么样，只读不改）：
  bash keel/checks/keel-doctor.sh         # 闭环 / lint / 预算 / 自检 / 还差你做什么

日常三个命令：
  bash keel/checks/keel-lint.sh keel    # 一致性校验：0 fail 才放行
  bash keel/checks/test-lint.sh         # lint 自测：41 用例 + 1 元检查
  bash keel/checks/load-estimate.sh 关键词  # 本轮要读多少字节？超预算即非零退出
EOF
fi
exit 0
