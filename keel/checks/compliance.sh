#!/usr/bin/env bash
# compliance.sh —— 遵守率度量（Keel 设计稿 §11.2，ADR 0009）
# 用法:
#   bash keel/checks/compliance.sh record            # 记录一轮（钩子自动调用，一般不手动跑）
#   bash keel/checks/compliance.sh report [--json]   # 出报告：总轮次 / 命中轮次 / 遵守率
#   bash keel/checks/compliance.sh backfill [--max N] [--dry]   # 回填历史提交（存量合规率）
#   bash keel/checks/compliance.sh reset             # 全清（换基线时用；**实时记录清掉后无法重建**）
#   bash keel/checks/compliance.sh reset --backfill  # 只清回填记录（重跑 backfill 前用这个）
# 退出码: 0 = 正常；1 = 用法错误
#
# ── backfill 回填的是什么（v3.3.5 / ADR 0011）────────────────────
# 它对每个历史提交建一个临时 worktree，用**当前的 lint 判据**跑一遍，
# 得到「这个仓库现存的内容，按今天的判据看有多干净」——**存量合规率**。
#
# 它**不是遵守率**：遵守率的分母是"门禁有机会拦的次数"，
# 而装上钩子之前的历史提交**根本没有门禁**，分母不存在，回填造不出分母。
# 所以回填轮次**不进遵守率的分母**，只在报告里单列一段，且必须标明这一点。
# 它解决的是另一件事：**新用户装完第一天就能看到一个数**，不用等几周攒数据。
#
# ── 为什么是这个口径 ──────────────────────────────────────────────
# 调研（2026-10，逐个读源码而非读 README）确认**没有任何项目真正实现了
# "度量 AI 是否遵守规则"**：
#   · dsh-rule-lens 面板写"遵守率"，但数据结构里只有拦截计数、没有分母——
#     加载 10 条违反 1 条 → 拦截 0 次 → 显示"0 次拦截"，读起来像 100% 遵守。
#     数字方向是反的，比没有数字更危险。
#   · aegis 让 AI 自报（adapter 规则第 5 步 "Self-Review"）。
#   · holaOS 全仓 grep 遵守率 → 零实现。
#
# 而 holaOS 的一份 223 行取证文档给出了最关键的反例：
#   **门禁全部正确触发、AI 对目标目录零编辑、然后宣布任务完成。**
#   它试过加重门禁措辞 → 得到**更精致的形式合规**。
#
# 所以本脚本**不读 AI 的任何自述**。它只观测两件客观事实：
#   1. 这一轮 lint 报了几条 ❌ / ⚠️        （来自 keel-lint.sh 的真实输出）
#   2. 这一轮提交动了哪些文件             （来自 git diff --cached）
# 两个数据源都不经过 AI，**AI 一个都改不了**。
#
# ── 分子分母的定义（这是全部的关键）──────────────────────────────
#   分母 = 记录过的总轮次（每次 pre-commit 记一条）
#   分子 = 至少命中一条检查项的轮次数
#   遵守率 = 1 − 分子/分母
#
#   **故意不把"命中条数"当分子**：一次提交踩 3 条和踩 1 条，
#   对"这轮守没守规矩"是同一件事（没守住）。按条数算会让数字随检查项
#   数量漂移——加一条检查项就能让历史遵守率"变差"，那是指标自己骗自己。
#
# ── 这个指标会骗人的地方（请连同数字一起读）────────────────────────
#   1. **规则本身可能不可遵守**。若某条规则 §2 原则 4 判死不了，
#      遵守率低不代表 AI 不听话，可能代表规则写得不对。**低遵守率时先查规则。**
#   2. **只覆盖被钩子触发的轮次**。没提交就不记，所以它量的是
#      "提交时的合规率"，不是"所有工作的合规率"。
#   3. **没有基线就没有意义**。第一次跑出来的数字别当成绩。
set -uo pipefail

# 从**脚本自身位置**推 KEEL_DIR，不要写死相对路径 "keel"：
# 本脚本会被别的脚本以不同 cwd 调用（install.sh 从任意目录调它），
# 写死相对路径会让它误报"不像 keel 目录"——实测在 install.sh 第 3 步就是这么错的。
KEEL_DIR="${KEEL_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
[ -d "$KEEL_DIR/checks" ] || { echo "❌ 不像 keel 目录（缺 $KEEL_DIR/checks）"; exit 1; }
. "$KEEL_DIR/checks/budget.env" 2>/dev/null || true

# 指标数据不进版本库（它是本机观测，不是规格）——故放 checks/.metrics/
METRICS="$KEEL_DIR/checks/.metrics"
VIO="$METRICS/violations.jsonl"
LOAD="$METRICS/load.jsonl"
mkdir -p "$METRICS" 2>/dev/null || true

cmd="${1:-report}"
shift 2>/dev/null || true

# ── record：记一轮 ──────────────────────────────────────────────
# 参数（由 pre-commit 传入）：--fails N --warns N --files N
record() {
  local fails=0 warns=0 files=0 checked=1 md=0 baseline=0 backfill=0
  local rcommit="" rat=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --fails) fails="${2:-0}"; shift 2 ;;
      --warns) warns="${2:-0}"; shift 2 ;;
      --files) files="${2:-0}"; shift 2 ;;
      --checked) checked="${2:-1}"; shift 2 ;;
      --md) md="${2:-0}"; shift 2 ;;
      --baseline) baseline="${2:-0}"; shift 2 ;;
      --backfill) backfill="${2:-0}"; shift 2 ;;
      --commit) rcommit="${2:-}"; shift 2 ;;
      --at) rat="${2:-}"; shift 2 ;;
      *) shift ;;
    esac
  done
  [ -f "$VIO" ] || : > "$VIO"
  local ts commit
  # 回填轮次用**提交自己的时间**，否则历史数据的时间戳会挤在同一秒
  ts="${rat:-$(date '+%Y-%m-%dT%H:%M:%S%z')}"
  commit="${rcommit:-$(git rev-parse --short HEAD 2>/dev/null || echo '-')}"
  # 只记数字与事实，不记 AI 的任何自述。
  # checked=0 表示"这轮没跑 lint"（没改 keel 的 md）——分母里有它，
  # 分子里没有它，于是"没被检查"不会伪装成"检查通过"（v3.3.2 修正）。
  # baseline=1 表示"这是初始化/换基线，不算违反轮次"（install.sh 装完会记一条）。
  # 否则新用户第一次看报告，会被 50 个模板文件的初始化噪声吓到。
  # backfill=1 表示"回填的历史提交"：不进遵守率分母（当时没有门禁，分母不存在），
  # 只在报告里单列成"存量合规率"（ADR 0011）。
  printf '%s\tcommit=%s\tchecked=%s\tfails=%s\twarns=%s\tfiles=%s\tmd=%s\tbaseline=%s\tbackfill=%s\n' \
    "$ts" "$commit" "$checked" "$fails" "$warns" "$files" "$md" "$baseline" "$backfill" >> "$VIO"
}

# ── report：出报告 ──────────────────────────────────────────────
report() {
  local as_json=0
  for a in "$@"; do [ "$a" = "--json" ] && as_json=1; done

  # ── 放行后被回滚的提交（v3.3.1 起纳入分子）──────────────────
  # 为什么必须算：lint 说"通过"、提交成功，但后来被 revert 了——
  # **那才是真正的"不遵守"**，而且是 lint 自己看不见的那一类。
  # 只看 lint 命中会把"事后被推翻的提交"算成遵守，虚高。
  #
  # 匹配 `^Revert "` 是精确的 git 自动生成格式；**不用 `-i --grep=revert`**——
  # 实测后者会把"实现 revert 按钮的功能"这类普通提交误计进去。
  local reverts=0
  if git rev-parse --git-dir >/dev/null 2>&1; then
    reverts=$(git log --oneline --grep='^Revert "' 2>/dev/null | wc -l | tr -d '[:space:]')
  fi

  if [ ! -s "$VIO" ]; then
    if [ "$as_json" -eq 1 ]; then
      printf '{"rounds":0,"violating":0,"reverted":%s,"rate":null,"note":"no data"}\n' "$reverts"
    else
      echo "compliance · 还没有任何记录"
      echo "   记录由 pre-commit 自动写入；先提交一次（哪怕 --no-verify 也会记）再来看。"
      [ "$reverts" -gt 0 ] && echo "   （已发现 $reverts 笔 revert 提交——它们会计入分子）"
    fi
    return 0
  fi

  # 一次 awk 算完：轮次、命中轮次、累计 fails/warns/files（回填单列）
  local agg
  agg=$(awk -F'\t' '
    # baseline 轮次（初始化/换基线）不计入分母——它不是"一次工作"，是"装了个模板"。
    # backfill 轮次同样**不进遵守率的分母**：历史上没有门禁，分母根本不存在，
    # 把它算进去等于伪造"这些提交被检查过"。它只在报告里单列成"存量合规率"。
    # 写法上刻意用最朴素的 if：早先试过三元表达式和 next+块 两种写法，
    # 都在部分 awk 实现上直接语法报错（且报错信息指向上面那行，看不出真正原因）。
    {
      fv = 0
      r = match($0, /fails=[0-9]+/)
      if (r > 0) fv = substr($0, RSTART + 6, RLENGTH - 6) + 0
      wv = 0
      r = match($0, /warns=[0-9]+/)
      if (r > 0) wv = substr($0, RSTART + 6, RLENGTH - 6) + 0
      fz = 0
      r = match($0, /files=[0-9]+/)
      if (r > 0) fz = substr($0, RSTART + 6, RLENGTH - 6) + 0

      if (match($0, /baseline=1/) > 0) { baselines++; next }
      if (match($0, /backfill=1/) > 0) {
        br++; btf += fv; btw += wv; bfz += fz
        if (fv > 0) bv++
        next
      }

      rounds++
      # 老记录没有 checked 字段（v3.3.1 及之前）——按"已检查"处理，保持连续性
      ck = 1
      r = match($0, /checked=[01]/)
      if (r > 0) ck = substr($0, RSTART + 8, 1) + 0
      if (ck > 0) checked++

      tf += fv; tw += wv; tfz += fz
      if (fv > 0) violating++
    }
    END { printf "%d %d %d %d %d %d %d %d %d %d %d %d", \
          rounds, checked, violating, tf, tw, tfz, baselines + 0, \
          br + 0, bv + 0, btf + 0, btw + 0, bfz + 0 }
  ' "$VIO")
  set -- $agg
  local rounds="$1" checked="$2" violating="$3" tfails="$4" twarns="$5" tfiles="$6" baselines="$7"
  local brounds="$8" bviol="$9" btfails="${10}" btwarns="${11}" bfiles="${12}"

  # 遵守率 = 1 − (被拦截的轮次 + 事后被回滚的提交) / 总轮次
  #
  # 分子为什么是"命中轮次 + 回滚数"而不是"命中条数"：
  #   一次提交踩 3 条和踩 1 条，对"这轮守没守规矩"是同一件事；
  #   而"lint 放行、事后被 revert"与"lint 拦截"在**守没守规矩**这件事上也是同一件——
  #   都是这一轮没有产出可接受的结果。放行后回滚甚至更严重：
  #   它先是骗过了门禁，之后才被推翻。
  local viol_total=$((violating + reverts))
  # rate 在 JSON 里必须是合法 null，不能是字符串 "n/a"——否则 jq / node -e 之类
  # 的消费者会解析失败（实测发现：手写 JSON 很容易漏这一点）
  local rate_json="null" rate_txt="—"
  if [ "$rounds" -gt 0 ]; then
    rate_json=$(awk -v v="$viol_total" -v r="$rounds" 'BEGIN { printf "%.1f", (1 - v/r) * 100 }')
    rate_txt="${rate_json}%"
  fi

  # 存量合规率（回填）：分母是"被回填的历史提交数"，与遵守率是**两个数**
  local brate_json="null" brate_txt="—"
  if [ "$brounds" -gt 0 ]; then
    brate_json=$(awk -v v="$bviol" -v r="$brounds" 'BEGIN { printf "%.1f", (1 - v/r) * 100 }')
    brate_txt="${brate_json}%"
  fi

  # 预算超限率（调研报告 §5.2）：测的是"上下文基座够不够用"，与遵守率正相关
  local over_n=0 over_r=0
  if [ -s "$LOAD" ]; then
    set -- $(awk -F'\t' '
      { n++
        if (match($0, /bytes=[0-9]+/)) { v = substr($0, RSTART+6, RLENGTH-6)+0; s += v; if (v > max) max = v }
        if (match($0, /over=[01]/)) { if (substr($0, RSTART+5, 1) == "1") o++ }
      }
      END { printf "%d %d %d", n+0, o+0, (n>0 ? s/n : 0) }' "$LOAD")
    over_n="$1"; over_r="$2"
  fi

  if [ "$as_json" -eq 1 ]; then
    printf '{"rounds":%s,"checked":%s,"coverage":%s,"violating":%s,"reverted":%s,"violationsTotal":%s,"rate":%s,"totalFails":%s,"totalWarns":%s,"filesTotal":%s,"filesAvg":%s,"loadOverRate":%s,"backfillRounds":%s,"backfillViolating":%s,"backfillRate":%s}\n' \
      "$rounds" "$checked" \
      "$( [ "$rounds" -gt 0 ] && awk -v c="$checked" -v r="$rounds" 'BEGIN{printf "%.1f", c/r*100}' || echo "null" )" \
      "$violating" "$reverts" "$viol_total" "$rate_json" "$tfails" "$twarns" "$tfiles" \
      "$( [ "$rounds" -gt 0 ] && awk -v f="$tfiles" -v r="$rounds" 'BEGIN{printf "%.1f", f/r}' || echo 0 )" \
      "$( [ "$over_n" -gt 0 ] && awk -v o="$over_r" -v n="$over_n" 'BEGIN{printf "%.1f", o/n*100}' || echo "null" )" \
      "$brounds" "$bviol" "$brate_json"
    return 0
  fi

  echo "compliance · 遵守率（ADR 0009 · 口径见设计稿 §11.2）"
  echo "  提交轮次（分母）   : $rounds"
  echo "  ├ 其中跑过 lint    : $checked（覆盖 $( [ "$rounds" -gt 0 ] && awk -v c="$checked" -v r="$rounds" 'BEGIN{printf "%.0f", c/r*100}' || echo 0 )%）"
  echo "  └ 未跑（没改 md）  : $((rounds - checked))  ← 这些不算"通过"，只算"未检查""
  echo "  ├ lint 命中被拦    : $violating"
  echo "  └ 放行后被回滚     : $reverts   ← lint 看不见的那一类"
  echo "  违反合计（分子）   : $viol_total"
  echo "  遵守率             : ${rate_txt}"
  [ "$baselines" -gt 0 ] && echo "  （另有 $baselines 条基线记录已排除：装模板/换基线，不算工作轮次）"
  echo "  累计 ❌ / ⚠️       : $tfails / $twarns"
  echo "  平均每轮改动文件    : $( [ "$rounds" -gt 0 ] && awk -v f="$tfiles" -v r="$rounds" 'BEGIN{printf "%.1f", f/r}' || echo 0 ) 个"
  if [ -s "$LOAD" ]; then
    echo "  ── 单轮加载量（load-estimate.sh 口径 · 预算 ${BYTES_SESSION:-15000}）"
    awk -F'\t' '{ if (match($0, /bytes=[0-9]+/)) { v=substr($0,RSTART+6,RLENGTH-6)+0; s+=v; n++; if (v>max) max=v } }
         END { if (n>0) printf "    已记录 %d 轮 · 平均 %d 字节 · 峰值 %d 字节\n", n, s/n, max }' "$LOAD"
    if [ "$over_n" -gt 0 ]; then
      echo "    超限率 $over_r/$over_n 轮 = $(awk -v o="$over_r" -v n="$over_n" 'BEGIN{printf "%.1f", o/n*100}')%"
    fi
  fi
  if [ "$brounds" -gt 0 ]; then
    echo "  ── 存量合规率（回填 ${brounds} 个历史提交 · ADR 0011）"
    echo "     命中 ${bviol} 个 · 存量合规率 ${brate_txt} · 累计 ❌ ${btfails} / ⚠️ ${btwarns}"
    echo "     ⚠️ 它**不是**遵守率：那些提交当时没有门禁，分母不存在，回填造不出分母。"
    echo "        它只回答「仓库现存内容用今天的判据看有多干净」，用来给遵守率做对照。"
  fi
  echo
  echo "  ⚠️ 读数字之前先读这五条："
  echo "     1. 遵守率低**先查规则是否可遵守**（§2 原则 4），不是先怪 AI"
  echo "     2. 看遵守率**必须同时看覆盖率**：覆盖率低时高分没有意义"
  echo "        （未检查的提交计入分母但不计入分子，会把数字压低而非抬高——"
  echo "         所以真正的风险是「覆盖率低 + 遵守率高」= 大量提交根本没被检查）"
  echo "     3. 回滚数高 → 多半是**门禁放行了不该放的东西**（不是 AI 不听话）"
  echo "     4. 它只量「提交时的合规」，没提交的工作不计入"
  echo "     5. 没有基线就没有意义——第一次的数字别当成绩"
}

# ── backfill：回填历史提交，得"存量合规率" ─────────────────────────
# 用法: bash keel/checks/compliance.sh backfill [--max N] [--dry]
#
# 它**不是**遵守率的替代品（ADR 0011）：装上钩子之前没有门禁，分母不存在。
# 它给的是"新用户装完第一天就能看到的那个数"。
backfill() {
  local max=10 dry=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --max) max="${2:-10}"; shift 2 ;;
      --dry) dry=1; shift ;;
      *) shift ;;
    esac
  done

  local proj
  proj=$(cd "$KEEL_DIR/.." && pwd)
  git -C "$proj" rev-parse --git-dir >/dev/null 2>&1 || { echo "❌ 不在 git 仓库里: $proj"; exit 1; }

  # 从旧到新，回填记录才有时间顺序
  local shas
  shas=$(git -C "$proj" log --format='%H' --max-count="$max" --reverse 2>/dev/null)
  [ -n "$shas" ] || { echo "❌ 读不到提交历史"; exit 1; }

  local n=0 hit=0 skip=0
  local base="${TMPDIR:-/tmp}/keel-backfill-$$"
  local sha wt out rc f w files md at short
  for sha in $shas; do
    # 自举之前 / 还没有 keel/ 目录的提交不参与（它们不是"用了 Keel 的一次工作"）
    if ! git -C "$proj" cat-file -e "$sha:keel/INDEX.md" 2>/dev/null; then
      skip=$((skip + 1)); continue
    fi
    n=$((n + 1))
    short=$(git -C "$proj" rev-parse --short "$sha")
    if [ "$dry" -eq 1 ]; then echo "   [dry] $short"; continue; fi

    wt="$base-$short"
    rm -rf "$wt" 2>/dev/null
    # 行尾必须与主工作树一致，否则回填出来的数全是假的（实测踩过，见坑库条目）：
    # core.autocrlf=true 时新建 worktree 会检出成 CRLF，而主工作树是 LF——
    # 后果有两个：① 字节数虚高（实测同一文件 1181 → 1211，直接假报"超字节"）；
    # ② 链接目标末尾带上 \r，匹配不上文件清单，**所有文档被判成孤儿**。
    if ! git -C "$proj" -c core.autocrlf=false -c core.eol=lf \
         worktree add --detach -q "$wt" "$sha" >/dev/null 2>&1; then
      echo "   ⚠️ $short worktree 建立失败，跳过"; continue
    fi
    # 判据必须统一：否则每个历史提交自带一套 budget.env，数字不可比。
    # 用**当前**的预算真源覆盖临时工作树里的那一份（只影响临时目录，不动历史）。
    cp "$KEEL_DIR/checks/budget.env" "$wt/keel/checks/budget.env" 2>/dev/null || true

    # 子模块**不会**被 worktree 检出，指向子模块内部文件的链接会全部假报死链
    # （实测：项目仓 INDEX.md 指向 ../keel-starter/keel/INDEX.md，每个提交都报 1 条）。
    # 用当前工作树里那份填上——死链判的是"文件在不在"，填的是占位而非结论。
    if [ -f "$proj/.gitmodules" ]; then
      sm_paths=$(git -C "$proj" config -f .gitmodules --get-regexp '^submodule\..*\.path$' 2>/dev/null | sed 's/^[^ ]* //')
      for sm in $sm_paths; do
        [ -d "$proj/$sm" ] || continue
        mkdir -p "$wt/$(dirname "$sm")" 2>/dev/null
        cp -R "$proj/$sm" "$wt/$(dirname "$sm")/" 2>/dev/null || true
      done
    fi

    # 入参必须传**相对**的 `keel` 并在 $wt 里跑：lint 的目录入参是按 cwd 解析的，
    # 传绝对路径会让所有文档被判成孤儿（实测 27 条假 fail → 传相对路径是 0）。
    # 与坑库 `install-verifies-wrong-dir.md` 同一类：路径入参 + cwd 必须同时对。
    out=$(cd "$wt" && bash "$KEEL_DIR/checks/keel-lint.sh" keel 2>&1); rc=$?
    f=$(printf '%s\n' "$out" | grep -c '^❌')
    # 结尾那行「❌ keel-lint 失败（见上方 ❌ 项）」是汇总，不算一条命中
    printf '%s\n' "$out" | grep -q '^❌ keel-lint' && f=$((f - 1))
    [ "$f" -lt 0 ] && f=0
    w=$(printf '%s\n' "$out" | grep -c '^⚠️')

    files=$(git -C "$proj" diff-tree --no-commit-id --name-only -r "$sha" | wc -l | tr -d '[:space:]')
    md=$(git -C "$proj" diff-tree --no-commit-id --name-only -r "$sha" | grep -c '^keel/.*\.md$')
    at=$(git -C "$proj" log -1 --format='%aI' "$sha")

    record --fails "$f" --warns "$w" --files "$files" --md "$md" \
           --checked 1 --commit "$short" --at "$at" --backfill 1
    git -C "$proj" worktree remove --force "$wt" >/dev/null 2>&1 || rm -rf "$wt" 2>/dev/null

    [ "$f" -gt 0 ] && hit=$((hit + 1))
    echo "   $short  ❌ $f  ⚠️ $w  （改动 $files 文件 / keel md $md）"
  done

  echo "compliance · 回填：检查 $n 个历史提交，命中 $hit 个，跳过 $skip 个（那些提交里还没有 keel/）"
  if [ "$dry" -eq 1 ]; then
    echo "   （--dry 只预演，没写任何记录；去掉 --dry 才真跑）"
  else
    echo "   ⚠️ 它是**存量合规率**，不是遵守率——历史提交当时没有门禁，分母不存在（ADR 0011）"
    echo "     跑 bash keel/checks/compliance.sh report 看两个数（遵守率 / 存量合规率）"
  fi
}

# ── reset：清空 ─────────────────────────────────────────────────
reset() {
  local only_backfill=0
  for a in "$@"; do [ "$a" = "--backfill" ] && only_backfill=1; done

  # 只清回填记录：重跑 backfill 前的正常动作。
  # **不能**用裸 reset 来"刷新存量合规率"——那会把实时遵守率的真实记录一起删掉
  # （实测就这么丢过一轮已累积的数据；遵守率的记录无法重建，因为它只由 pre-commit 产生）。
  if [ "$only_backfill" -eq 1 ]; then
    local kept=0 dropped=0
    if [ -s "$VIO" ]; then
      local tmp="${VIO}.tmp"
      : > "$tmp"
      while IFS= read -r line; do
        case "$line" in
          *backfill=1*) dropped=$((dropped + 1)) ;;
          *) printf '%s\n' "$line" >> "$tmp"; kept=$((kept + 1)) ;;
        esac
      done < "$VIO"
      mv "$tmp" "$VIO"
    fi
    echo "compliance · 已清掉 ${dropped} 条回填记录，保留 ${kept} 条实时记录（遵守率数据未动）"
    return 0
  fi

  local n=0
  [ -f "$VIO" ] && n=$(wc -l < "$VIO" | tr -d '[:space:]') && : > "$VIO"
  [ -f "$LOAD" ] && : > "$LOAD"
  echo "compliance · 已清空 ${n} 条记录（**含实时遵守率，且无法重建**；换基线时才该这么做）"
  echo "   只想刷新存量合规率的话，用：reset --backfill"
}

case "$cmd" in
  record)   record "$@" ;;
  report)   report "$@" ;;
  backfill) backfill "$@" ;;
  reset)    reset "$@" ;;
  *)        echo "用法: bash keel/checks/compliance.sh {record|report [--json]|backfill [--max N] [--dry]|reset [--backfill]}"; exit 1 ;;
esac
exit 0
