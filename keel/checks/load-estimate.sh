#!/usr/bin/env bash
# load-estimate.sh —— 把检索协议第 4 条变成可执行命令（《Keel 设计稿》§7.2 全局口径 / §8）
# 用法: bash keel/checks/load-estimate.sh <关键词> [更多关键词…] [--list]
# 退出码: 0 = 本轮估算在预算内；1 = 超预算；2 = 用法错误
#
# 为什么要它：
#   §7.1 只约束"单个文件多大"，真正会被击穿的口径是 **§7.2 的单轮总量**
#   ——真实会话里超预算最常见的方式不是"读了篇大文档"，而是 grep 命中十几个文件后顺手全读。
#   §8 协议第 4 条写了"≤15,000 字节"，但此前没有任何方式能验它。
#   本脚本按协议口径把这一轮要读的量算出来，超了就红——于是它从建议变成了命令。
#
# 口径（与 §8 协议第 1、2、4 条一致）：
#   固定成本 = INDEX.md + 当前 NOW*.md
#   按需     = grep -rlF <关键词> 命中的 md（冷区不计）
#   总量     = 两者之和，上限取自 budget.env 的 BYTES_SESSION（唯一真源）
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
KEEL=$(cd "$HERE/.." && pwd)

[ -f "$KEEL/checks/budget.env" ] || { echo "❌ 缺预算真源 checks/budget.env（§9.3）"; exit 2; }
. "$KEEL/checks/budget.env"
BYTES_SESSION=${BYTES_SESSION:-15000}

LIST=0
# 关键词收集：**先扫一遍 "$@" 分类，再统一重排**。
# 为什么不能边扫边 set --：set -- 会清空位置参数，正在进行的 for a in "$@"
# 随即失去输入、循环体只跑一次，于是任何带关键词的调用都误报"用法"（实测踩过）。
# 两趟法（先只读分类 → 再重排）规避了这个耦合，且在所有 bash 版本上行为一致。
LIST=0; NKWS=0
for a in "$@"; do
  case "$a" in
    --list) LIST=1 ;;
    -*) echo "❌ 未知参数: $a"; exit 2 ;;
    *)
      # 关键词含空白/引号会让"按词遍历"与"多 -e 传参"两处都失去边界，
      # 与其静默匹配错的东西，不如显式拒收。
      case "$a" in
        *[[:space:]]*|*"'"*|*"\"") echo "❌ 关键词不能含空白或引号: $a"; exit 2 ;;
      esac
      NKWS=$((NKWS + 1)) ;;
  esac
done
[ "$NKWS" -ge 1 ] || { echo "用法: bash keel/checks/load-estimate.sh <关键词> [更多关键词…] [--list]"; exit 2; }
# 第二趟：只保留关键词（"$@" 里还有 --list，传给 grep 会当模式）。
# 先把原参数快照进 args，**再** set -- —— set -- 会清空 "$@"，
# 若边遍历边重建，循环体只跑一次（同一个坑，上面已踩过一次，这里用快照隔开）。
args=""
for a in "$@"; do
  case "$a" in --list) ;; *) args="$args
$a" ;; esac
done
# 用换行分隔保存（关键词已在上一步拒收含空白，故此处按行还原是安全的）
OLDIFS=$IFS; IFS='
'
set --
for a in $args; do set -- "$@" "$a"; done
IFS=$OLDIFS

b_of() { wc -c < "$1" 2>/dev/null | tr -d '[:space:]'; }

# 固定成本：INDEX.md + 当前 NOW*.md（不存在时按 0 计，缺文件由 lint 负责报）
fixed=0
if [ -f "$KEEL/INDEX.md" ]; then n=$(b_of "$KEEL/INDEX.md"); fixed=$((fixed + n)); fi
nows=""
for f in "$KEEL"/NOW*.md; do
  [ -f "$f" ] || continue
  n=$(b_of "$f"); fixed=$((fixed + n)); nows="$nows $f"
done

# 按需：逐文件判断是否命中任一关键词（grep -F 避免关键词里的正则元字符被误解析）。
# 遍历全部 md 再逐个 grep，比 `grep -rlF -e k1 -e k2` 慢一点，但换来三个好处：
#   ① 路径含空格不会拆错（find 逐行输出，IFS= read 保留整行）；
#   ② 命中判定与字节累加在同一处，语义直白，不易写出"多关键词命中同一文件算两次"的错；
#   ③ 不依赖 read -d / mapfile（bash 3.2 没有）。
ondemand=0; listed=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  case "$f" in
    "$KEEL/INDEX.md"|"$KEEL"/NOW*.md) continue ;;   # 已在固定成本里，不重复计
  esac
  hit=0
  for k in "$@"; do
    if grep -qF -- "$k" "$f" 2>/dev/null; then hit=1; break; fi
  done
  [ "$hit" -eq 1 ] || continue
  n=$(b_of "$f"); ondemand=$((ondemand + n)); listed=$((listed + 1))
  [ "$LIST" -eq 1 ] && printf '      %6s  %s\n' "$n" "${f#"$KEEL"/}"
done < <(find "$KEEL" -name '*.md' -not -path '*/archive/*' -not -path '*/NOW-history/*' 2>/dev/null | sort)

total=$((fixed + ondemand))
echo "load-estimate · 目录=$KEEL · 预算（BYTES_SESSION）=$BYTES_SESSION 字节"
echo "  固定成本 INDEX+NOW      : $fixed"
echo "  按需命中（$listed 个文件）: $ondemand"
echo "  ─────────────────────────────"
printf '  本轮合计                : %s 字节  ≈ %s token（按 3 字节/token，§7.1）\n' "$total" "$((total / 3))"

# 记一轮加载量到 load.jsonl，给遵守率报告算「超限率」（ADR 0009 / §11.2）。
# 超限率测的是"上下文基座够不够用"——它是**基座健康度**，与遵守率正相关但不是一回事：
#   遵守率低 → AI 不守规矩；超限率高 → 基座装不下该装的东西，该拆/提/沉了。
# **超限时也必须记**（over=1）——超限那一轮恰恰最需要被看见。
if [ "${KEEL_NO_METRICS:-0}" != "1" ]; then
  mdir="$KEEL/checks/.metrics"
  if mkdir -p "$mdir" 2>/dev/null; then
    over=0
    [ "$total" -gt "$BYTES_SESSION" ] && over=1
    printf '%s\tbytes=%s\ttoken=%s\tover=%s\tkws=%s\n' \
      "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$total" "$((total / 3))" "$over" "$*" \
      >> "$mdir/load.jsonl" 2>/dev/null || true
  fi
fi

if [ "$total" -gt "$BYTES_SESSION" ]; then
  echo "❌ 超预算 ${total}>${BYTES_SESSION}：先收窄关键词，不要顺手全读（§7.3 拆 / 提 / 沉）"
  # 给出可操作的下一步：**先怀疑关键词太宽泛，而不是文档太胖**。
  # 实测（2026-10-04）：查「分母」超限 17,937，但同批文档换成「遵守率」只12,433 ✅。
  # 原因是"分母"这类泛词会命中讲别的领域的文档（自测用例计数、JSON 分母为零），
  # **而它们与你要找的内容无关**。协议第 3 条说"命中过多先收窄关键词"——
  # 这一行就是把那句话变成可执行的诊断。
  echo "   ↳ 先试更准确的词（往往一步就够）："
  echo "     · 宽泛词（分母/性能/检查）会命中讲别的领域的文件，先换领域词再测"
  echo "     · 用 --list 看命中清单：命中里有**与目标无关的**文件，就是词太宽的信号"
  echo "     · 若清单里全是相关文件，那才是文档太胖→ 按§7.3 拆 / 提 / 沉"
  exit 1
fi
echo "✅ 在预算内（余量 $((BYTES_SESSION - total)) 字节）"
exit 0
