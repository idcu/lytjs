#!/usr/bin/env bash
# keel-lint.sh —— Keel 一致性校验（v3）
# 用法:  bash keel/checks/keel-lint.sh keel            # 从项目根目录调用
#        bash checks/keel-lint.sh                     # 在 keel/ 内调用（默认 .）
# 退出码: 0 = 通过（含 warn）；1 = 存在 fail；2 = keel 目录不存在
# 口径:  热区 = 全部 md 减去 archive/ 与 NOW-history/；冷区只做死链检查。
# 依赖:  bash 3.2+ / awk / sed / find / tsort（可选）/ git（仅 frozen 检查用）
set -uo pipefail

KEEL_DIR="${1:-.}"; KEEL_DIR="${KEEL_DIR%/}"
[ -d "$KEEL_DIR" ] || { echo "❌ 目录不存在: $KEEL_DIR"; exit 2; }

# ---------- 硬预算默认值（兜底；真源是 checks/budget.env） ----------
MAX_INDEX=100;        BYTES_INDEX=4500
MAX_DOMAIN_INDEX=80;  BYTES_DOMAIN_INDEX=3000
MAX_NOW=60;           BYTES_NOW=2400
MAX_PIT=30;           BYTES_PIT=1200
MAX_DOC=160;          BYTES_DOC=4800
BYTES_FM=600
MAX_LINE=360
MAX_DIR_FILES=20
STALE_DAYS=30
NOW_STALE_DAYS=7
DISTILL_AT=3
LINT_SECONDS=300                 # 工具自身的时限预算（ADR 0008）；超时只告警不 fail

# §4.1 门外锚点原文（唯一允许存在于 Keel 之外的一句）
ANCHOR='任何任务开始前，先读 keel/INDEX.md 与其中指向的 NOW.md，并遵守 INDEX.md 里的检索协议。'

fail=0
fail_msg() { echo "❌ $1"; fail=1; }
warn_msg() { echo "⚠️ $1"; }

# ---------- budget.env（唯一真源；缺失即 fail，兜底用上方默认值） ----------
if [ -f "$KEEL_DIR/checks/budget.env" ]; then
  . "$KEEL_DIR/checks/budget.env"
else
  fail_msg "缺预算真源 checks/budget.env（§9.3），已退回内置默认值"
fi

hot_files() { find "$KEEL_DIR" -name '*.md' -not -path '*/archive/*' -not -path '*/NOW-history/*' 2>/dev/null; }
all_files() { find "$KEEL_DIR" -name '*.md' 2>/dev/null; }
rel_of() { printf '%s' "${1#"$KEEL_DIR"/}"; }
# 取首个 --- 块（v3 修正：不再只扫前 12 行，否则字段放后面会被误判为"缺失"）
fm_block() { awk 'NR==1 && $0=="---" { f=1; next } f && $0=="---" { exit } f { print }' "$1" 2>/dev/null; }
fm_end_line() { awk 'NR==1 && $0=="---" { next } /^---$/ { print NR; exit }' "$1" 2>/dev/null; }
# frontmatter 按 YAML 解析：`key: value   # 注释` 里的行内注释必须剥掉
# （§5.2 / §5.3 的模板自带注释，不剥就会把注释当成值的一部分，直接误判值域非法）
# `key: # 注释` 这种"值整个是注释"的写法同样按空值处理（YAML 语义），否则
# 会得到一个假的非空值——例如占位用的 `superseded-by:` 会被误判成"指向不存在的文件"
yaml_val() { sed -E "s/^#.*$//; s/[[:space:]]+#.*$//; s/[[:space:]]+$//"; }
fm_val() { fm_block "$1" | grep -m1 "^$2:" | sed -E "s/^$2:[[:space:]]*//" | yaml_val; }
# YYYY-MM-DD → epoch 秒，**纯 shell 算术，零 fork**（v3.4.0 / ADR 0013 续）
# 原实现每次调用跑两次 `date`（先试 BSD 的 -j -f，在 Linux/Git Bash 上必然失败，
# 再试 GNU 的 -d）—— 实测每次 ~250ms，段 10 每文件调 1–2 次，是剩余最大的一块。
# 改用 Howard Hinnant 的 days_from_civil（公历恒等式，无闰年特殊分支）。
# **该算法已对 23 个日期与 `date -u -d` 逐字对照**（含 1900/2100 非闰年世纪、
# 2000/2024 闰年、1600/9999 边界），非法输入一律拒绝——判据与报错文案不变。
to_epoch() {
  case "$1" in
    [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) ;;
    *) return 1 ;;
  esac
  _y=${1%%-*}; _r=${1#*-}; _m=${_r%%-*}; _d=${1##*-}
  # 显式去前导零：bash 里 08 会被当八进制（$((08)) 直接报错）
  _y=$((10#$_y)); _m=$((10#$_m)); _d=$((10#$_d))
  [ "$_m" -ge 1 ] && [ "$_m" -le 12 ] || return 1
  [ "$_d" -ge 1 ] && [ "$_d" -le 31 ] || return 1
  [ "$_y" -ge 1 ] || return 1
  [ "$_m" -le 2 ] && _y=$((_y - 1))
  _era=$(( _y / 400 ))
  _yoe=$(( _y - _era * 400 ))
  if [ "$_m" -gt 2 ]; then _doy=$(( (153*(_m-3) + 2) / 5 + _d - 1 ))
  else _doy=$(( (153*(_m+9) + 2) / 5 + _d - 1 )); fi
  _doe=$(( _yoe*365 + _yoe/4 - _yoe/100 + _doy ))
  REPLY=$(( (_era*146097 + _doe - 719468) * 86400 ))
  return 0
}

# ---------- 性能：零 fork 的取值方式（v3.3.9 / ADR 0013）----------
# 实测（Windows/Git Bash，N=30）：**`v=$(纯 shell 函数)` 本身就要 ~100ms**，
# 因为命令替换会开一个子 shell——**与函数体内有没有外部命令无关**。
# 直接调用（不取返回值）是 ~0ms；用全局变量回传也是 ~0ms。
# 全脚本原有 30 个 `$(rel_of|basename|fmq|…)` 站点 × 39 文件 ≈ 1,170 次 fork ≈ 117s，
# 占实测 142s 的大头（ADR 0008 只消掉了真外部命令那层，没消掉这层）。
#
# 所以下面每个"取 X"函数都配一个 **setter 版**：结果写进 REPLY / REL / BASE，
# 调用处不写 `$(...)`。**语义、判据、报错文案一字不改**——只换传值方式。
rel_set() { REL="${1#"$KEEL_DIR"/}"; }
base_set() { BASE="${1##*/}"; }

# ---------- 性能：把 per-file 的 fork 批量化（v3.2）----------
# 动因：实测 24 个文档的目录，单次 lint 要 319 秒（Windows / Git Bash）。
# 根因不是检查本身复杂，而是**进程创建成本**——单次 fork 在该环境约 370ms，
# 而原实现有 ~1500 次 per-file fork（wc×2、awk、grep、sed 各自单文件调用）。
# 同样的检查用 xargs 批量做，实测 16.1s → 0.52s（31×）。
# 做法：文件清单先落成一份 NUL 分隔的清单，再整体喂给 awk / wc。
# 语义不变——同样的输入、同样的判据、同一套报错文案；只是把 N 次进程换成 1 次。

# 临时目录：**创建后立刻归一化成 POSIX 路径**再往下用，否则清理在部分环境下静默失败。
# 起因（坑 safe-delete-shim-blocks-cleanup）：Windows 上 `mktemp -d` 返回
# `C:\Users\...\Temp/tmp.XXXXXXXX`——**含盘符且混用两种分隔符**，本身就是畸形路径。
# PATH 前段的安全删除垫片按规则拒绝内嵌盘符 → trap 的 `rm -rf` 被拒（rc=1）→
# 每次 lint 都在 %TEMP% 留一个目录（历史实测堆积 301 个）。
# 修法不是"让判据闭嘴"（那是迎合环境），而是消除路径表示的歧义。
# 用 `pwd -P`（POSIX 平台与 Git Bash 都有，不依赖 MSYS 专有的 -W）：
# 它给出规范的绝对路径，实测垫片放行、目录确实被删。
# 注意：`pwd` 失败时**不赋空值**——那样trap 会去删空路径，而 tmp 下游文件也会跟着失效。
tmp=$(mktemp -d)
if _tp=$(cd "$tmp" 2>/dev/null && pwd -P 2>/dev/null) && [ -n "$_tp" ]; then
  tmp="$_tp"
fi
unset _tp
trap 'rm -rf "$tmp"' EXIT
# 用临时文件收集结果：兼容 bash 3.2（case 不能直接出现在 $() 内），也避开管道子 shell 吞掉 fail 计数
deadf="$tmp/dead"; refd="$tmp/refd"; longf="$tmp/long"; idxbad="$tmp/idxbad"; edges="$tmp/edges"; pitmiss="$tmp/pitmiss"; pitmisslist="$tmp/pitmisslist"

HOTLIST="$tmp/hot.z"     # 热区清单（NUL 分隔，供 xargs 批量消费）
ALLLIST="$tmp/all.z"     # 全量清单（含冷区，NUL 分隔）
HOTLINES="$tmp/hot.ln"   # 热区清单（换行分隔，供 while read 消费）
ALLLINES="$tmp/all.ln"   # 全量清单（换行分隔）
# 两种视图各存一份的原因：xargs -0 读 NUL 清单（路径含空格安全），
# 而后面 10 处 `while IFS= read -r f` 是按行读的——若让 hot_files 直接吐 NUL，
# 那些循环会读到一个空行就 EOF，于是**所有后续检查静默跳过**（不报错、判死失效）。
# 路径含空格在这份换行清单里也不安全，但 keel 约定文件名 kebab-case 不含空格
# （§3.4，且 lint 第 4 项会判含空格的文件名），故按行读是安全的。
hot_files() { cat "$HOTLINES"; }
all_files() { cat "$ALLLINES"; }
# 供 xargs 消费：-0 读 NUL 分隔。
# **用法约定（踩过坑，务必照此写）**：清单路径必须走环境变量 XLIST，
# 不能作为 xrun 的第一个位置参数——`xargs -0 CMD "$@"` 里 xargs 会把 "$@"
# 里的每一项都当成"要追加到 CMD 后面的文件名"。于是 `xrun list awk 'prog'`
# 会执行成 `awk list prog file1 file2…`：awk 把清单和脚本都当输入文件名，
# 结果读不到任何文件、输出为空——**而且不报任何错**（实测踩过：
# "xargs: hot.z: No such file or directory" 只在清单路径不完整时才现形）。
# 正确形态：XLIST=清单; xrun awk 'prog'   （xrun 内部只做 xargs -0 CMD < "$XLIST"）
XLIST=""
xrun() { [ -s "$XLIST" ] || return 0; xargs -0 "$@" < "$XLIST"; return 0; }

find "$KEEL_DIR" -name '*.md' -not -path '*/archive/*' -not -path '*/NOW-history/*' -print0 2>/dev/null | sort -z > "$HOTLIST"
find "$KEEL_DIR" -name '*.md' -print0 2>/dev/null | sort -z > "$ALLLIST"
tr '\0' '\n' < "$HOTLIST" > "$HOTLINES"
tr '\0' '\n' < "$ALLLIST" > "$ALLLINES"
HOTN=$(wc -l < "$HOTLINES" | tr -d '[:space:]')

# ---------- frontmatter 一次提取，后续全部查表（v3.2 性能）----------
# 原实现里 fm_val 每次调用 fork 4 次（awk + grep + sed + sed），而段 2/3/10
# 对每个文件要调 5–6 次 → 单文件 20+ 次 fork，24 文件就是 500+ 次。
# 这里改成：一个 awk 扫全部文件，把每个文件的 fm 字段一次算完落成查询表，
# 之后 fmq 直接查表（零 fork）。行为等价，判据与报错文案不变。
FMQ="$tmp/fmq"      # 查询表：<路径>\t<key>\t<value>
FMHAS="$tmp/fmhas"  # 每个文件的 fm 原始行（供"字段是否存在"判断）
if [ "$HOTN" -gt 0 ]; then
  # 一次 awk 扫全部文件，把每个文件的 fm 字段算完落成查询表。
  # 收尾 flush 用 END，**不用 gawk 专有 ENDFILE**——BWK awk（macOS）把它当未定义
  # 变量、末文件字段静默丢失（坑 awk-gawk-gaps）；产物为空仍回落逐文件版。
  : > "$FMQ"
  XLIST="$HOTLIST"; xrun awk -v OFS='\t' '
    function trim(v) { sub(/^[[:space:]]+/, "", v); sub(/[[:space:]]+$/, "", v); return v }
    function yval(v) { if (v ~ /^#/) return ""; sub(/[[:space:]]+#.*$/, "", v); return trim(v) }
    FNR==1 {
      if (NR > 1) { for (kk in seen) print pf, kk, val[kk]; delete seen; delete val }
      infm = ($0 == "---"); pf = FILENAME; next
    }
    infm && $0 == "---" { infm = 0; next }
    infm {
      ci = index($0, ":")
      if (ci > 0) { k = substr($0, 1, ci - 1)
        if (k ~ /^[A-Za-z0-9_-]+$/ && !(k in val)) { seen[k] = 1; val[k] = yval(trim(substr($0, ci + 1))) } }
      next
    }
    END     { for (kk in seen) print pf, kk, val[kk] }
  ' > "$FMQ" 2>/dev/null
  if [ ! -s "$FMQ" ]; then
    : > "$FMQ"
    while IFS= read -r f; do
      awk -v OFS='\t' -v P="$f" '
        function trim(v) { sub(/^[[:space:]]+/, "", v); sub(/[[:space:]]+$/, "", v); return v }
        function yval(v) { if (v ~ /^#/) return ""; sub(/[[:space:]]+#.*$/, "", v); return trim(v) }
        NR==1 { infm = ($0 == "---"); next }
        infm && $0 == "---" { infm = 0; next }
        infm { ci = index($0, ":"); if (ci > 0) { k = substr($0, 1, ci-1)
                 if (k ~ /^[A-Za-z0-9_-]+$/ && !(k in val)) { val[k] = yval(trim(substr($0, ci+1))) } } }
        END { for (kk in val) print P, kk, val[kk] }
      ' "$f" >> "$FMQ" 2>/dev/null
    done < "$HOTLINES"
  fi
fi
# fmq <文件> <键> / fmhas <文件> <键>：查表取值 / 判断字段存在。
# v3.2：原来每次调用 fork 一个 awk（段 2/3/10/11/12 合计 ~200 次）。
# 现在把查询表整份读进一个 shell 变量，用 case 做行首匹配——**零 fork**。
# 规模前提：查询表 = 文件数 × 字段数（keel-starter 实测 131 行），
# 几百个文档也只到几千行，shell 变量完全装得下。
# 换来的约束：值里不能有换行（frontmatter 是逐行键值对，天然满足）。
# 查表用**纯 shell 循环**（没有 printf/grep/cut/head 任何子进程）。
# 中间试过 `printf | grep | head | cut`，那仍是 4 次 fork／次调用，
# 200 次调用反而比原来的 1 次 fork 更慢（实测 119s → 154s）——
# 批量化不能只看"调用次数"，要看**每次调用内部有几个进程**。
KEEL_NL='
'
FMQ_RAW=""
if [ -s "$FMQ" ]; then FMQ_RAW=$(cat "$FMQ"); fi
# fmq <文件> <键>：命中则打印值（首行），未命中返回空
fmq() {
  [ -n "$FMQ_RAW" ] || return 0
  _want="$1	$2	"
  _rest="$FMQ_RAW"
  while [ -n "$_rest" ]; do
    _line="${_rest%%$KEEL_NL*}"
    if [ "$_line" = "$_rest" ]; then _rest=""; else _rest="${_rest#*$KEEL_NL}"; fi
    case "$_line" in
      "$_want"*) printf '%s' "${_line#"$_want"}"; return 0 ;;
    esac
  done
  return 0
}
# 零 fork 版：结果写进 REPLY（未命中时为空，与 fmq 打印空串的行为一致）
fmq_set() {
  REPLY=""
  [ -n "$FMQ_RAW" ] || return 0
  _want="$1	$2	"
  _rest="$FMQ_RAW"
  while [ -n "$_rest" ]; do
    _line="${_rest%%$KEEL_NL*}"
    if [ "$_line" = "$_rest" ]; then _rest=""; else _rest="${_rest#*$KEEL_NL}"; fi
    case "$_line" in
      "$_want"*) REPLY="${_line#"$_want"}"; return 0 ;;
    esac
  done
  return 0
}
# fmhas <文件> <键>：字段是否存在（值可为空，故与 fmq 分开判断）
fmhas() {
  [ -n "$FMQ_RAW" ] || return 1
  _want="$1	$2	"
  _rest="$FMQ_RAW"
  while [ -n "$_rest" ]; do
    _line="${_rest%%$KEEL_NL*}"
    if [ "$_line" = "$_rest" ]; then _rest=""; else _rest="${_rest#*$KEEL_NL}"; fi
    case "$_line" in
      "$_want"*) return 0 ;;
    esac
  done
  return 1
}

# ---------- 链接一次提取，段 6/8/9 共用（v3.2 性能）----------
# 段 6（引用环）、段 8（死链）、段 9（孤儿）原本各自对每个文件跑
# `grep -oE + sed + tr`；段 9 还要为**每条链接** fork 2 次 cd + dirname/basename。
# 实测：24 文件的段 9 单独跑要 49 秒（占整体 325 秒的大头）。
# 这里改成一次 awk 抽出所有链接落表，三段各自消费——把 N×M 次进程降到 1 次。
#
# 关键写法说明：awk 的脚本用单引号包住，**不能**把文件清单直接接在脚本后面
# （那是给 awk 当输入文件名，bash 会先执行它 —— 实测踩过，报了一屏
# "scope:: command not found"）。正确做法是用 `xargs ... | awk` 或
# `awk -f 脚本文件`，这里统一走 xargs 管道。
LINKS="$tmp/links"
if [ "$HOTN" -gt 0 ]; then
  # 注意喂的是 $HOTLIST（NUL 分隔），不是 $HOTLINES —— xargs -0 只认 NUL。
  # 喂错的话 xargs 会把整份换行清单当成**一个文件名**，awk 读不到文件、
  # LINKS 变空，于是段 9 把所有文档误报成孤儿（实测踩过）。
  XLIST="$HOTLIST"; xrun awk '
    { line = $0
      while (match(line, /\]\([^)]+\)/)) {
        seg = substr(line, RSTART + 2, RLENGTH - 3)
        p = seg; sub(/[ \t].*$/, "", p)
        if (p != "") print FILENAME "\t" p
        line = substr(line, RSTART + RLENGTH)
      }
      line = $0
      while (match(line, /@[A-Za-z0-9_.\/-]+\.md/)) {
        print FILENAME "\t" substr(line, RSTART + 1, RLENGTH - 1)
        line = substr(line, RSTART + RLENGTH)
      }
    }
  ' 2>/dev/null | sort -u > "$LINKS"
fi


_t0=$(date +%s 2>/dev/null || echo 0)
echo "keel-lint · $(date '+%Y-%m-%d %H:%M') · 目录=$KEEL_DIR · 热区文档=$HOTN"
echo "── 1. 预算：行数 / 字节 / 单行 / 目录文件数"
# 1a. 行数 + 字节：**一次 wc 扫全部文件**（原为每文件 2 次 wc + 2 次 tr = 4 次 fork）
# 路径含空格安全：wc 由 xargs -0 喂 NUL 分隔清单，不经过 shell 分词。
# 输出形如 "  42  1234 /path/to/file"，末列含空格时用 tab 切分前两列、其余归到末列。
if [ "$HOTN" -gt 0 ]; then
  XLIST="$HOTLIST"; xrun wc -lc > "$tmp/sizes" 2>/dev/null
  # wc 多文件模式会追加一行 "total"，必须显式排除（实测踩过：
  # 那行被当成文件名 total，报出 "超行数 793>160: total" 的假 fail）
  while IFS=$' \t' read -r n b f; do
    [ -n "${f:-}" ] || continue
    [ "${f##*/}" = "total" ] && continue
    case "$n" in ''|*[!0-9]*) continue ;; esac
    rel_set "$f"; rel=$REL
    case "$rel" in
      */INDEX.md)          lim=$MAX_DOMAIN_INDEX; blim=$BYTES_DOMAIN_INDEX ;;
      INDEX.md)            lim=$MAX_INDEX;        blim=$BYTES_INDEX ;;
      NOW*.md|*/NOW*.md)   lim=$MAX_NOW;          blim=$BYTES_NOW ;;
      pitfalls/*)          lim=$MAX_PIT;          blim=$BYTES_PIT ;;
      *)                   lim=$MAX_DOC;          blim=$BYTES_DOC ;;
    esac
    [ "$n" -gt "$lim" ]  && fail_msg "超行数 ${n}>${lim}: $rel"
    [ "$b" -gt "$blim" ] && fail_msg "超字节 ${b}>${blim}: $rel"
  done < "$tmp/sizes"
fi

# 单行上限：LC_ALL=C 保证 awk 的 length() 按字节而非字符计
# 批量版：一次 awk 扫全部文件（原来每文件 1 次 awk = 24 次 fork）
if [ "$HOTN" -gt 0 ]; then
  LC_ALL=C XLIST="$HOTLIST"; xrun awk -v L="$MAX_LINE" '
    { if (length($0) > L) printf "❌ 单行超限 %d>%d 字节: %s:%d\n", length($0), L, FILENAME, FNR }
  ' > "$longf" 2>/dev/null
fi
if [ -s "$longf" ]; then sed -n '1,10p' "$longf"; fail=1; fi

# 目录文件数：一次 find -printf 风格不可移植，改用 find 出行 + 一次 awk 聚合
find "$KEEL_DIR" -type d 2>/dev/null | while IFS= read -r d; do
  case "$d" in */archive|*/archive/*|*/NOW-history|*/NOW-history/*) continue ;; esac
  echo "$d"
done > "$tmp/dirs" 2>/dev/null
# 每个目录一次 ls 仍是 per-dir fork；这里用一次 find 输出全部条目后 awk 按目录聚合
if [ -s "$tmp/dirs" ]; then
  find "$KEEL_DIR" -type f 2>/dev/null | awk -v K="$KEEL_DIR" -v MAXD="$MAX_DIR_FILES" '
    { p=$0; sub("/[^/]*$", "", p); if (p!=K) cnt[p]++ }
    END { for (d in cnt) if (cnt[d] > MAXD) {
             r=d; sub("^" K "/", "", r)
             printf "❌ 目录文件超限 %d>%d: %s/\n", cnt[d], MAXD, r } }
  ' > "$tmp/dirbig" 2>/dev/null
  if [ -s "$tmp/dirbig" ]; then sort -u "$tmp/dirbig"; fail=1; fi
fi

echo "── 2. frontmatter：存在性 / 字段 / 行数 / 字节"
while IFS= read -r f; do
  base_set "$f"; base=$BASE
  case "$base" in _template*) continue ;; esac
  rel_set "$f"; rel=$REL
  # 存在性与闭合：仍需读首行与 fm 结束行，各 1 次 awk（可与字段查表合并，此处保持独立以免耦合）
  if [ "$(head -1 "$f")" != "---" ]; then fail_msg "缺 frontmatter: $rel"; continue; fi
  end=$(awk 'NR==1{next} /^---$/{print NR; exit}' "$f" 2>/dev/null)
  if [ -z "$end" ]; then fail_msg "frontmatter 未闭合: $rel"; continue; fi
  nl=$((end - 2))
  [ "$nl" -gt 10 ] && fail_msg "frontmatter 超行数 ${nl}>10: $rel"
  nb=$(sed -n "1,${end}p" "$f" | wc -c | tr -d '[:space:]')
  [ "$nb" -gt "$BYTES_FM" ] && fail_msg "frontmatter 超字节 ${nb}>${BYTES_FM}: $rel"
  for k in scope status last-verified keywords; do
    fmhas "$f" "$k" || fail_msg "frontmatter 缺 $k: $rel"
  done
  case "$rel" in
    */INDEX.md) ;;   # 域索引只查基础字段
    skills/*)   fmhas "$f" trigger  || fail_msg "skill 缺 trigger: $rel" ;;
    pitfalls/*) fmhas "$f" severity || fail_msg "坑条目缺 severity: $rel"
                fmhas "$f" triggers || fail_msg "坑条目缺 triggers: $rel" ;;
  esac
  case "$rel" in
    INDEX.md)   fmhas "$f" keel-version  || fail_msg "根 INDEX 缺 keel-version: $rel"
                fmhas "$f" project-state || fail_msg "根 INDEX 缺 project-state: $rel" ;;
  esac
done < "$HOTLINES"

echo "── 3. 值域与格式（status / severity / keywords / last-verified / triggers）"
# v3.4.8：流式扫描——FMQ 表按文件分组且与 HOTLINES 同序，**单趟扫完**，
# 在文件边界结算该文件。原实现对每个文件 fmq_set 5 次（每次重扫全表），
# 复杂度 O(文件数 × 表行数)；现在 O(表行数)。判据与报错文案逐字不变。
s3_f() {   # $1 = 文件路径；用本趟已累积的 _s3_* 变量结算
  base_set "$1"; case "$BASE" in _template*) return ;; esac
  [ "$_s3_has" = 1 ] || return
  rel_set "$1"; rel=$REL
  case "${_s3_st:-}" in
    active|distilled|archived|"") ;;
    *) fail_msg "status 值域非法（${_s3_st}）: $rel" ;;
  esac
  if [ -n "${_s3_lv:-}" ]; then
    case "$_s3_lv" in
      [0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]) ;;
      *) fail_msg "last-verified 非 YYYY-MM-DD（${_s3_lv}）: $rel" ;;
    esac
  fi
  case "${_s3_kw:-}" in ""|"[]"|"[ ]") fail_msg "keywords 为空: $rel" ;; esac
  case "$rel" in
    pitfalls/*)
      case "${_s3_sv:-}" in
        P0|P1|P2|P3|"") ;;
        *) fail_msg "severity 值域非法（${_s3_sv}）: $rel" ;;
      esac
      case "${_s3_tg:-}" in
        ''|*[!0-9]*) [ -n "${_s3_tg:-}" ] && fail_msg "triggers 非数字（${_s3_tg}）: $rel" ;;
      esac
      ;;
  esac
}
_s3_cur=""; _s3_st=""; _s3_lv=""; _s3_kw=""; _s3_sv=""; _s3_tg=""; _s3_has=0
while IFS=$'\t' read -r _s3_p _s3_k _s3_v || [ -n "$_s3_p" ]; do
  if [ "$_s3_p" != "$_s3_cur" ]; then
    [ -n "$_s3_cur" ] && s3_f "$_s3_cur"
    _s3_cur="$_s3_p"; _s3_st=""; _s3_lv=""; _s3_kw=""; _s3_sv=""; _s3_tg=""; _s3_has=0
  fi
  case "$_s3_k" in
    status) _s3_st="$_s3_v"; _s3_has=1 ;;
    last-verified) _s3_lv="$_s3_v" ;;
    keywords) _s3_kw="$_s3_v" ;;
    severity) _s3_sv="$_s3_v" ;;
    triggers) _s3_tg="$_s3_v" ;;
  esac
done < "$FMQ"
[ -n "$_s3_cur" ] && s3_f "$_s3_cur"

echo "── 4. 命名（kebab-case / 热区禁日期）"
while IFS= read -r f; do
  base_set "$f"; base=$BASE; rel_set "$f"; rel=$REL
  # 固定名豁免：根级入口/地图/宪法/术语/NOW 由 §3.2 定义，不受 kebab-case 约束
  case "$base" in
    _template*|INDEX.md|CONSTITUTION.md|ARCHITECTURE.md|GLOSSARY.md|NOW.md|NOW-*.md) continue ;;
  esac
  case "$base" in *[A-Z]*)     fail_msg "命名含大写（应 kebab-case）: $rel" ;; esac
  case "$base" in *"_"*|*" "*) fail_msg "命名含下划线/空格（应 kebab-case）: $rel" ;; esac
  case "$base" in *[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]*) fail_msg "热区文件名含日期: $rel" ;; esac
done < <(hot_files)

echo "── 5. 域索引：纯表格 / 坑条目登记"
# 5a. 任何域索引（*/INDEX.md）只允许表格行；根 INDEX.md 例外（它是唯一入口，见 §5.1）
: > "$idxbad"
while IFS= read -r x; do
  rel_set "$x"; xrel=$REL
  case "$xrel" in */INDEX.md) ;; *) continue ;; esac
  awk -v R="$xrel" '
    NR==1 && $0=="---" { f=1; next }
    f==1 && $0=="---" { f=0; next }
    f==1 { next }
    $0 ~ /^[[:space:]]*$/ { next }
    $0 !~ /^\|/ { printf "❌ 域索引含非表格正文: %s 第%d行: %s\n", R, NR, substr($0,1,30) }
  ' "$x"
done < <(hot_files) >> "$idxbad"
if [ -s "$idxbad" ]; then sed -n '1,6p' "$idxbad"; fail=1; fi
# 5b. 坑条目必须登记进 pitfalls/INDEX.md
if [ -f "$KEEL_DIR/pitfalls/INDEX.md" ]; then
  while IFS= read -r p; do
    base_set "$p"; b=$BASE
    case "$b" in INDEX.md|_template*) continue ;; esac
    grep -qF "$b" "$KEEL_DIR/pitfalls/INDEX.md" || { rel_set "$p"; fail_msg "坑条目未登记进 pitfalls/INDEX.md: $REL"; }
  done < <(find "$KEEL_DIR/pitfalls" -name '*.md' 2>/dev/null)
else
  fail_msg "缺 pitfalls/INDEX.md"
fi

echo "── 6. 引用图环检测（md → md；§3.1 禁止循环引用，路由枢纽 INDEX.md 除外）"
# 边表由 LINKS 一次 awk 得出（v3.2：不再每文件跑 grep+sed+tr）
if [ -s "$LINKS" ]; then
  awk -F'\t' '
    { f = $1; l = $2
      if (l ~ /^https?:/ || l ~ /^mailto:/ || l == "") next
      sub(/#.*$/, "", l)
      if (l !~ /\.md$/) next
      n = split(f, a, "/"); from = a[n]
      if (from == "INDEX.md") next
      m = split(l, b, "/"); to = b[m]
      # 索引是路由枢纽（人人都指向它、它也指向人人），把它当普通节点必然误报
      if (to == "INDEX.md") next
      if (from == to) next
      print from, to
    }
  ' "$LINKS" | sort -u > "$edges" 2>/dev/null
fi
sort -u "$edges" -o "$edges"
if [ -s "$edges" ]; then
  if command -v tsort >/dev/null 2>&1; then
    tsort "$edges" >/dev/null 2>"$tmp/tsort.err"; tsort_rc=$?
    # 注意：BSD/macOS 的 tsort 遇环仍返回 0，只把 "cycle in data" 写到 stderr；
    # GNU tsort 返回 1。所以"退出码非 0"和"stderr 非空"两个条件要一起看。
    if [ "$tsort_rc" -ne 0 ] || [ -s "$tmp/tsort.err" ]; then
      fail_msg "引用存在环（§3.1 禁止循环引用）: $(head -1 "$tmp/tsort.err")"
    fi
  else
    warn_msg "环境无 tsort，跳过循环引用检查"
  fi
fi

echo "── 7. 必读文件与点火锚点"
for need in INDEX.md CONSTITUTION.md; do
  [ -f "$KEEL_DIR/$need" ] || fail_msg "缺必读文件: $need"
done
[ "$(find "$KEEL_DIR" -maxdepth 1 -name 'NOW*.md' | wc -l | tr -d '[:space:]')" -eq 0 ] && fail_msg "缺必读文件: NOW*.md"
anchor_ok=0
for cand in CLAUDE.md AGENTS.md .cursorrules .cursor/rules/keel.mdc; do
  for pfx in "$KEEL_DIR/.." "$KEEL_DIR"; do
    [ -f "$pfx/$cand" ] || continue
    grep -qF "$ANCHOR" "$pfx/$cand" && anchor_ok=1
  done
done
[ "$anchor_ok" -eq 1 ] || fail_msg "点火锚点缺失或与 §4.1 原文不一致（查 CLAUDE.md / AGENTS.md / .cursorrules / .cursor/rules）"

echo "── 8. 死链（@路径 与 markdown 链接，相对所在文件目录）"
# 死链要查冷区（archive / NOW-history），所以按全量清单再抽一次链接。
# 冷区文件极少（keel-starter 里 1 个），这次额外 awk 的成本可忽略。
DEADL="$tmp/deadlinks"
if [ -s "$ALLLINES" ]; then
  xargs -0 awk '
    { line = $0
      while (match(line, /\]\([^)]+\)/)) {
        seg = substr(line, RSTART + 2, RLENGTH - 3)
        p = seg; sub(/[ \t].*$/, "", p)
        if (p != "") print FILENAME "\t" p
        line = substr(line, RSTART + RLENGTH)
      }
      line = $0
      while (match(line, /@[A-Za-z0-9_.\/-]+\.md/)) {
        print FILENAME "\t" substr(line, RSTART + 1, RLENGTH - 1)
        line = substr(line, RSTART + RLENGTH)
      }
    }
  ' < "$ALLLIST" 2>/dev/null | sort -u > "$DEADL"
fi
: > "$deadf"
if [ -s "$DEADL" ]; then
  while IFS=$'\t' read -r f link; do
    [ -n "${link:-}" ] || continue
    case "$link" in http*|mailto:*|"") continue ;; esac
    t="${link%%#*}"; [ -z "$t" ] && continue
    case "$f" in
      */*) dir=${f%/*} ;;
      *)   dir="." ;;
    esac
    [ -e "$dir/$t" ] || echo "❌ 死链: $t  (见 ${f#"$KEEL_DIR"/})"
  done < "$DEADL" >> "$deadf"
fi
if [ -s "$deadf" ]; then cat "$deadf"; fail=1; fi

echo "── 9. 孤儿（热区文档未被任何热区文档以链接引用；INDEX/_template 豁免）"
# v3.1 修正：孤儿判定改用"真实链接图"——把每条链接解析成目标文件的绝对路径再比对。
# 旧实现是「grep 文件名」的近似：正文里偶然出现同名子串会漏报，文件改名会误报。
# 被引用目标集合：把 LINKS 里每条链接按"相对所在文件目录"解析成规范化路径。
# v3.2：原实现对**每条链接** fork 2 次 cd + 2 次 dirname/basename，
# 24 文件 × 平均 8 条链接 ≈ 400 次进程，实测这一段单独就 49 秒。
# 现在改成一次 awk 做纯字符串路径规范化（不依赖 cd —— cd 在 Windows 上
# 还会把路径分隔符与预期搞乱），存在性判断留给后面一次批量 test。
# 注意：LINKS 里的 $1 已经是 find 输出的路径（本身就含 $KEEL_DIR 前缀），
# 所以这里只做"相对所在文件目录"的拼接，**不能再拼一次 K** ——
# 拼两次会得到 keel/keel/xxx，于是每个文件都"未被引用"、全量误报孤儿（实测踩过）。
awk -F'\t' '
  function norm(p,   parts, np, i, out, seg) {
    np = split(p, parts, "/"); out = ""
    for (i = 1; i <= np; i++) {
      seg = parts[i]
      if (seg == "" || seg == ".") continue
      if (seg == "..") { sub(/\/[^\/]*$/, "", out); continue }
      out = (out == "" ? seg : out "/" seg)
    }
    return out
  }
  { f = $1; l = $2
    if (l ~ /^https?:/ || l ~ /^mailto:/ || l == "") next
    sub(/#.*$/, "", l); if (l == "") next
    n = split(f, a, "/"); fdir = ""
    for (i = 1; i < n; i++) fdir = fdir a[i] "/"
    tgt = norm(fdir l)
    if (tgt != "") print tgt
  }
' "$LINKS" 2>/dev/null | sort -u > "$refd.raw" 2>/dev/null
# 存在性过滤：awk 不知道文件系统状态，用一次 while + [ -e ] 判定（无 fork）
: > "$refd"
if [ -s "$refd.raw" ]; then
  while IFS= read -r cand; do
    [ -e "$cand" ] && printf '%s\n' "$cand" >> "$refd"
  done < "$refd.raw"
fi
while IFS= read -r f; do
  base_set "$f"; base=$BASE
  case "$base" in INDEX.md|_template*) continue ;; esac
  grep -qxF "$f" "$refd" || fail_msg "孤儿（未被任何热区文档链接引用）: ${f#"$KEEL_DIR"/}"
done < "$HOTLINES"

echo "── 10. 陈旧（last-verified / NOW updated；豁免类目见 §9.4）"
today=$(date +%s)
# v3.4.8：同段 3，改流式扫描（单趟 O(表行数)）；判据与文案逐字不变。
s10_f() {
  base_set "$1"; case "$BASE" in _template*) return ;; esac
  rel_set "$1"; rel=$REL
  case "$rel" in decisions/*) return ;; esac              # ADR 定稿即不可变，见 §9.4
  [ "${_s10_sc:-}" = "off" ] && return   # 逃生口，需在 decisions/ 留理由
  d="${_s10_lv:-}"
  if [ -n "$d" ]; then
    if to_epoch "$d"; then e=$REPLY
    else e=""; fi
    if [ -n "$e" ]; then
      age=$(( (today - e) / 86400 ))
      [ "$age" -gt "$STALE_DAYS" ] && warn_msg "stale(${age}d): $rel"
    else
      warn_msg "last-verified 无法解析: $rel ($d)"
    fi
  fi
  case "$rel" in NOW*.md|*/NOW*.md)
    u="${_s10_upd:-}"
    if [ -z "$u" ]; then fail_msg "NOW 缺 updated: $rel"
    else
      to_epoch "$u" && { e=$REPLY
        [ -n "$e" ] && { age=$(( (today - e) / 86400 )); [ "$age" -gt "$NOW_STALE_DAYS" ] && warn_msg "NOW 已 ${age}d 未更新: $rel"; } }
    fi ;;
  esac
}
_s10_cur=""; _s10_sc=""; _s10_lv=""; _s10_upd=""
while IFS=$'\t' read -r _s10_p _s10_k _s10_v || [ -n "$_s10_p" ]; do
  if [ "$_s10_p" != "$_s10_cur" ]; then
    [ -n "$_s10_cur" ] && s10_f "$_s10_cur"
    _s10_cur="$_s10_p"; _s10_sc=""; _s10_lv=""; _s10_upd=""
  fi
  case "$_s10_k" in
    stale-check) _s10_sc="$_s10_v" ;;
    last-verified) _s10_lv="$_s10_v" ;;
    updated) _s10_upd="$_s10_v" ;;
  esac
done < "$FMQ"
[ -n "$_s10_cur" ] && s10_f "$_s10_cur"

echo "── 11. 坑条目（三段式 + 蒸馏阈值）"
# 三段式批量化（v3.4.1）：原为每条坑 3 次 grep（12 坑 = 36 次 fork，~3.6s）。
# **过滤与判断必须分开**：上一版把过滤写进 awk 的 `FNR==1` + `ENDFILE`，
# 而 `ENDFILE` **不受 skip 状态约束** → 12 条真坑全漏判、39 个非坑文件误报
# （坑：awk-enfile-ignores-skip-state）。
# 现在：① 过滤在 shell 侧（纯 `case`，零 fork）落成清单；② 一次 awk 扫清单里的全部文件。
# ② 用 `FNR==1` 切文件 + `END` 收尾——**POSIX awk 即可**，不依赖 gawk 的 ENDFILE。
: > "$pitmiss"
: > "$pitmisslist"
while IFS= read -r f; do
  rel_set "$f"; rel=$REL
  case "$rel" in pitfalls/*) ;; *) continue ;; esac
  base_set "$f"; case "$BASE" in INDEX.md|_template*) continue ;; esac
  printf '%s\n' "$f" >> "$pitmisslist"
done < <(hot_files)
if [ -s "$pitmisslist" ]; then
  tr '\n' '\0' < "$pitmisslist" | xargs -0 awk '
    function rel(p) { sub(/^.*\/keel\//, "keel/", p); return p }
    function report(  i) {
      for (i = 1; i <= 3; i++) if (!seen[i]) printf "❌ 坑条目缺失【%s】: %s\n", h[i], r
    }
    BEGIN { h[1]="## 症状"; h[2]="## 根因"; h[3]="## 正解" }
    FNR == 1 { if (NR > 1) report(); r = rel(FILENAME); seen[1]=seen[2]=seen[3]=0 }
    { for (i = 1; i <= 3; i++) if (index($0, h[i]) > 0) seen[i] = 1 }
    END { if (NR > 0) report() }
  ' 2>/dev/null | sort -u > "$pitmiss"
  if [ -s "$pitmiss" ]; then sed -n '1,10p' "$pitmiss"; fail=1; fi
fi

# v3.4.8：同段 3，改流式扫描（只关心 pitfalls/ 的 triggers 与 status）——
# 已蒸馏的不再提醒（v3.4.4）：`status: distilled` 就是"这条已被提炼进宪法"的标记，
# 它的存在意义就是让这条告警停下来；§7.4 的流程是
# 「triggers ≥ 3 → 提醒 → 提炼 + 置 distilled」，故蒸馏状态必须参与判断。
s11_f() {
  base_set "$1"; case "$BASE" in INDEX.md|_template*) return ;; esac
  rel_set "$1"; rel=$REL
  case "$rel" in pitfalls/*) ;; *) return ;; esac
  t="${_s11_tg:-0}"
  case "$t" in
    ''|*[!0-9]*) [ -n "${_s11_tg:-}" ] && warn_msg "triggers 非数字: $rel" ;;
    *)
      if [ "$t" -ge "$DISTILL_AT" ] && [ "${_s11_st:-}" != "distilled" ]; then
        warn_msg "待蒸馏（triggers=${t} ≥ ${DISTILL_AT}）: $rel"
      fi
      ;;
  esac
}
_s11_cur=""; _s11_tg=""; _s11_st=""
while IFS=$'\t' read -r _s11_p _s11_k _s11_v || [ -n "$_s11_p" ]; do
  if [ "$_s11_p" != "$_s11_cur" ]; then
    [ -n "$_s11_cur" ] && s11_f "$_s11_cur"
    _s11_cur="$_s11_p"; _s11_tg=""; _s11_st=""
  fi
  case "$_s11_k" in
    triggers) _s11_tg="$_s11_v" ;;
    status) _s11_st="$_s11_v" ;;
  esac
done < "$FMQ"
[ -n "$_s11_cur" ] && s11_f "$_s11_cur"


echo "── 12. 状态机（frozen 契约冻结 / 例外计数）"
IDX="$KEEL_DIR/INDEX.md"
if [ -f "$IDX" ]; then
  fmq_set "$IDX" project-state; ps=$REPLY
  case "${ps:-}" in
    frozen)
      if command -v git >/dev/null 2>&1 && git -C "$KEEL_DIR" rev-parse --git-dir >/dev/null 2>&1; then
        added=$(git -C "$KEEL_DIR" log --since="$(date '+%Y-%m-01')" --diff-filter=A --name-only --pretty=format: 2>/dev/null | grep -E '(^|/)contracts/' | grep -v '/_template' | sort -u)
        [ -n "$added" ] && fail_msg "frozen 期新增契约文件（§5.2 禁止）: $(printf '%s' "$added" | tr '\n' ' ')"
      fi ;;
    exploring|architecture-locked|building) ;;
    "") fail_msg "project-state 缺失或为空: INDEX.md" ;;
    *)  fail_msg "project-state 值域非法（${ps}）: INDEX.md" ;;
  esac
fi
# decisions 清单一次生成，两个子检查共用（v3.2：原来两个独立的 find）
DECL="$tmp/decl"
find "$KEEL_DIR/decisions" -name '*.md' 2>/dev/null | sort > "$DECL"
if [ -s "$DECL" ]; then
  mon=$(date '+%Y-%m'); exc=0
  while IFS= read -r d; do
    case "${d##*/}" in _template*) continue ;; esac   # 模板不是真实记录（§3.4 豁免）
    fmq_set "$d" type
    [ "$REPLY" = "exception" ] || continue
    fmq_set "$d" created; made=$REPLY
    if [ -z "${made:-}" ]; then fail_msg "例外决策缺 created 字段: ${d#"$KEEL_DIR"/}"; continue; fi
    case "$made" in "$mon"*) exc=$((exc + 1)) ;; esac
  done < "$DECL"
  [ "$exc" -gt 2 ] && fail_msg "本月例外决策 ${exc}>2，强制退回 building（§5.2）"
  # 取代关系：superseded-by 必须指向存在的文件（ADR 靠"被谁取代"表达时效，而非 last-verified）
  while IFS= read -r d; do
    case "${d##*/}" in _template*) continue ;; esac     # 模板里的占位值不算数
    fmq_set "$d" superseded-by; sb=$REPLY
    [ -n "${sb:-}" ] || continue
    case "$d" in */*) sbdir=${d%/*} ;; *) sbdir="." ;; esac
    [ -e "$sbdir/$sb" ] || fail_msg "superseded-by 指向不存在的文件（${sb}）: ${d#"$KEEL_DIR"/}"
  done < "$DECL"
fi

echo "── 13. 闭环钩子（本体存在且可执行；§10.4 铁律：缺一，闭环不成立）"
for h in pre-commit commit-msg; do
  hf="$KEEL_DIR/checks/hooks/$h"
  if [ ! -f "$hf" ]; then fail_msg "缺闭环钩子本体: checks/hooks/$h"
  elif [ ! -x "$hf" ]; then fail_msg "闭环钩子不可执行（需 chmod +x）: checks/hooks/$h"; fi
done

# 段 14（v3.4.5）：版本声明的三处副本必须一致。
#
# 为什么加这项：ADR 0010 立了"版本声明与可获取必须同时成立"，
# 发布仓 CI 也有 CHANGELOG 检查——**但两者都只存在于发布仓**。
# 2026-10-04 实测发现：keel-version 已到 3.4.4，CHANGELOG 最新小节还停在
# 3.4.2（缺两节 → CI 必然 exit 1），两仓 README 徽章停在 3.3.8。
# **判据存在却两周无人看**，这正是本项目引用的 Lint Leakage（62%）在自己身上复现。
#
# 所以这里补的是**机制性修复**：把"发布后门面会漂"从一次性补正变成判死。
# 三处副本任一滞后即 fail——**价值不在补上这一版，在拦住下一次**。
#
# 适用范围的诚实说明（§9.5 同类边界，v3.4.7 收窄触发）：
#   - 触发条件是「根或 keel/ 的 README 写了 keel 徽章」——徽章 = 自认 keel 发行仓；
#     真实用户项目（自带自己的 CHANGELOG、无徽章）→ 跳过，不误判
#     （实测：首个采用方 lytjs 安装当日被旧触发条件误判"缺当期小节"，ADR 0016）。
#   - 只查"副本存在时是否一致"，不负责生成它们（生成是发布脚本的事）。
VER_IDX="$KEEL_DIR/INDEX.md"
if [ -f "$VER_IDX" ]; then
  _v=$(sed -n 's/^keel-version:[[:space:]]*\([^[:space:]]*\).*/\1/p' "$VER_IDX" | head -1)
  case "${_v:-}" in
    ""|*[!0-9.]*) ;;# 缺失/非法：段 2 已在管，这里不重复报
    *)
      _root=$(dirname "$KEEL_DIR")
      # 副本二（先查）：README 徽章里的版本号。只在写了徽章时查——
      # 徽章同时是副本一（CHANGELOG）的触发条件：没徽章 = 不是 keel 发行仓。
      _badge_seen=""
      for _rd in "$_root/README.md" "$KEEL_DIR/README.md"; do
        [ -f "$_rd" ] || continue
        _badge=$(grep -o 'keel--version-[0-9][0-9.]*' "$_rd" 2>/dev/null | head -1 | sed 's/^keel--version-//')
        [ -n "${_badge:-}" ] || continue
        _badge_seen=1
        [ "$_badge" = "$_v" ] || fail_msg "README 徽章版本 ${_badge} 与 keel-version ${_v} 不一致（§9.1-14）: ${_rd#"$PWD"/}"
      done
      # 副本一：根 CHANGELOG 的当期小节。仅发行仓（写了徽章）检查。
      if [ -n "$_badge_seen" ]; then
        _cl="$_root/CHANGELOG.md"
        if [ -f "$_cl" ]; then
          grep -qE "^## ${_v} —" "$_cl" \
            || fail_msg "CHANGELOG.md 缺 ${_v} 小节（版本已声明 ${_v}，用户装不到/读不到这次变更；ADR 0010）"
        fi
      fi
      ;;
  esac
  unset _v _root _cl _rd _badge _badge_seen
fi

# 自报耗时并对照 LINT_SECONDS（ADR 0008）：
# **只告警不 fail**——机器慢不等于文件错。把性能当 fail 会让人在慢机器上
# 开始绕过 lint，那是比慢更坏的结果（§9.4 同类教训：制造大规模假告警）。
_el=$(date +%s 2>/dev/null || echo 0)
if [ "$_t0" -gt 0 ] && [ "$_el" -ge "$_t0" ]; then
  _spent=$((_el - _t0))
  if [ "$_spent" -gt "${LINT_SECONDS:-300}" ]; then
    warn_msg "lint 耗时 ${_spent}s 超过预算 ${LINT_SECONDS}s —— 文件数变多或存在 per-file fork；改预算只改 checks/budget.env"
  fi
  echo "   耗时 ${_spent}s（预算 ${LINT_SECONDS:-300}s）"
fi
echo "──"
if [ "$fail" -eq 0 ]; then echo "✅ keel-lint 通过"; else echo "❌ keel-lint 失败（见上方 ❌ 项）"; fi
exit "$fail"
