#!/usr/bin/env bash
# keel-lite.sh —— 把全量骨架裁剪成"最小可用集"（《Keel 设计稿》§12.1）
# 用法: bash keel/checks/keel-lite.sh [keel目录] [--apply]
# 退出码: 0 = 已完成（含 dry-run）；1 = 裁剪后 lint 不通过；2 = 用法 / 环境错误
#
# 为什么需要它：
#   采用成本是 Keel 最短的那块板（评：4/10）。全量 starter 带 6 个"按需层"骨架，
#   小项目第一天就要面对 19 个 md。本脚本把按需层一次裁掉，并把 INDEX.md 路由表里
#   对应的行一并剥离——**否则删了目录就会留下死链，lint 立刻红**。
#
# 安全约定：**默认 dry-run**，只打印计划；加 --apply 才真动文件。
#   被裁的只允许是 §12.1 定义在 MVP 之外的按需层，白名单硬编码，不接受任意路径。
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
KEEL=${1:-$(cd "$HERE/.." && pwd)}
APPLY=0
for a in "$@"; do
  case "$a" in
    --apply) APPLY=1 ;;
    --dry-run) APPLY=0 ;;
  esac
done
[ -d "$KEEL" ] || { echo "❌ 目录不存在: $KEEL"; exit 2; }
[ -f "$KEEL/INDEX.md" ] || { echo "❌ 这里不像 keel 目录（缺 INDEX.md）: $KEEL"; exit 2; }
KEEL=$(cd "$KEEL" && pwd)

# 按需层白名单（§12.1 的"不进 MVP"清单）；顺序仅影响打印
LAYERS="contracts env skills decisions ARCHITECTURE.md GLOSSARY.md"
# 与每一层对应的 INDEX.md 路由行特征（用于剥离，避免留下死链）
pats=$(cat <<'EOF'
](contracts/INDEX.md)
](env/INDEX.md)
](skills/INDEX.md)
](decisions/INDEX.md)
](ARCHITECTURE.md)
](GLOSSARY.md)
EOF
)

echo "keel-lite · 目录=$KEEL · 模式=$([ "$APPLY" -eq 1 ] && echo '应用（会删文件）' || echo 'dry-run（只打印）')"

# ---------- 顺序很要紧：先算好新 INDEX，再删目录 ----------
# 实测踩过（v3.4.0 修）：先删目录再剥路由行，会出现两个问题——
#   ① 剥离用的特征表里有 `](decisions/INDEX.md)` 等，删完后 grep 仍能匹配（那是文本），
#      但 dry-run 与 --apply 的"剥离行数"会对不上（实测 dry-run 说 6 行、apply 说"无需剥离"），
#      因为 apply 跑的是同一份已被上一步改过的文件；
#   ② 更严重：INDEX 自己也是"必读文件"，它一旦不再链接 CONSTITUTION / NOW / pitfalls，
#      裁剪后 lint 会把**每一个**热区文档判成孤儿（实测 18 个里 6 个直接报孤儿），
#      脚本 exit 1 —— **裁剪反而把项目弄红了**，而用户只是照 README 跑了一条命令。
# 所以：① 先算出剥离后的 INDEX 全文；② 再删目录；③ 最后才替换 INDEX。
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
printf '%s\n' "$pats" > "$tmp/pats"
grep -v -F -f "$tmp/pats" "$KEEL/INDEX.md" > "$tmp/idx.new" 2>/dev/null || true
stripped=$(( $(wc -l < "$KEEL/INDEX.md") - $(wc -l < "$tmp/idx.new") ))

echo "── 1. 待裁剪的按需层"
found=0
for l in $LAYERS; do
  [ -e "$KEEL/$l" ] || continue
  found=$((found + 1))
  if [ "$APPLY" -eq 1 ]; then rm -rf "$KEEL/$l" && echo "   ✂️  已删除 $l"; else echo "   ·  将删除 $l"; fi
done
[ "$found" -eq 0 ] && echo "   （没有按需层可裁：已经是最小集）"

echo "── 2. 剥离 INDEX.md 里指向已裁层的路由行（否则留死链）"
if [ "$stripped" -gt 0 ]; then
  if [ "$APPLY" -eq 1 ]; then
    cp "$KEEL/INDEX.md" "$KEEL/INDEX.md.keelbak" && mv "$tmp/idx.new" "$KEEL/INDEX.md"
    echo "   ✂️  剥离 $stripped 行（原文件备份为 INDEX.md.keelbak，确认无误后自行删除）"
  else
    echo "   ·  将剥离 $stripped 行"
    grep -F -f "$tmp/pats" "$KEEL/INDEX.md" | sed 's/^/      /' || true
  fi
else
  echo "   （无需剥离）"
fi

echo "── 3. 复核"
if [ "$APPLY" -eq 1 ]; then
  echo "   剩余热区 md：$(find "$KEEL" -name '*.md' -not -path '*/archive/*' -not -path '*/NOW-history/*' | wc -l | tr -d '[:space:]') 个"
  # 复核必须**用相对路径**调 lint（v3.4.1 修）：
  # lint 内部按入参原样拼路径，传绝对路径会让它找 `$KEEL/../AGENTS.md` 之类的
  # 锚点与相对引用时全部错位 → 实测传绝对路径判 16 条 ❌，传相对路径 0 条。
  # 这与已登记的坑 `worktree-eol-differs-from-main` 同源（入参形态影响判据）。
  # 所以这里 cd 到 keel 的**父目录**再跑，与文档里"在项目根跑 lint"的口径一致。
  if ( cd "$KEEL/.." && bash "$KEEL/checks/keel-lint.sh" "$(basename "$KEEL")" ) > "$tmp/lint.out" 2>&1; then
    echo "   ✅ 裁剪后 keel-lint 通过"
  else
    echo "   ⚠️  裁剪后 keel-lint 未通过（若裁剪前也未通过，与本次无关）："
    grep -E '^❌' "$tmp/lint.out" | sed -n '1,6p' | sed 's/^/      /'
    exit 1
  fi
else
  echo "   （dry-run 不改文件）——确认无误后重跑：bash keel/checks/keel-lite.sh <keel目录> --apply"
fi
echo "──"
[ "$APPLY" -eq 1 ] && echo "✅ keel-lite 完成（按需层已裁，MVP 五件套完整保留）"
exit 0
