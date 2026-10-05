#!/usr/bin/env bash
# check-mcp-config.sh —— 可选"检索增强"的接入位检查（《Keel 设计稿》§9.5）
# 用法: bash keel/checks/check-mcp-config.sh [项目根]
# 退出码: 恒为 0（优雅降级型检查：**未接入不是缺陷**，本检查只防"声明落空"）
#
# 为什么恒 0：
#   Keel 内核只有 grep，召回停在关键词级——这是它在评估里公开承认的短板。
#   补齐它的方式是接语义检索（Serena 的 LSP 符号检索、code-graph 的预计算图等），
#   但**接不接入是团队决策**，不能变成 lint 的 fail 项。
#   于是本检查只做一件有意义的事：**声明了就必须真的能用**——
#   项目根一旦写了 MCP 配置，就验证它能解析、且每个 server 的 command 在 PATH 上。
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
KEEL=$(cd "$HERE/.." && pwd)
ROOT=${1:-$(cd "$KEEL/.." && pwd)}
ROOT=$(cd "$ROOT" 2>/dev/null && pwd) || { echo "❌ 项目根不存在: $ROOT"; exit 2; }

decl=""
for c in ".mcp.json" ".cursor/mcp.json"; do
  if [ -f "$ROOT/$c" ]; then decl="$ROOT/$c"; break; fi
done

if [ -z "$decl" ]; then
  echo "⚠️  未声明外部检索增强（正常）：Keel 检索止步于 grep，语义召回见《Keel 设计稿》§9.5"
  exit 0
fi

echo "check-mcp-config · 声明文件=$decl"
if ! command -v python3 >/dev/null 2>&1; then
  echo "⚠️  无 python3，跳过解析（本检查不阻断）"
  exit 0
fi

python3 - "$decl" <<'PY'
import json
import shutil
import sys

path = sys.argv[1]
try:
    with open(path, encoding="utf-8") as fh:
        cfg = json.load(fh)
except Exception as exc:
    print("⚠️  MCP 配置无法解析：%s（%s）" % (path, exc))
    raise SystemExit(0)

servers = cfg.get("mcpServers") or {}
if not servers:
    print("⚠️  配置里没有 mcpServers —— 声明落空（要么删掉该文件，要么把内容补上）")
    raise SystemExit(0)

bad = 0
for name, spec in servers.items():
    cmd = (spec or {}).get("command")
    if not cmd:
        print("   ⚠️  %s：未写 command" % name)
        bad += 1
    elif shutil.which(cmd):
        print("   ✅ %s：command=%s（在 PATH 中）" % (name, cmd))
    else:
        print("   ⚠️  %s：command=%s 不在 PATH —— 该 server 起不来" % (name, cmd))
        bad += 1

print("──")
if bad:
    print("⚠️  %d 个 server 不可达（不阻断提交）" % bad)
else:
    print("✅ 声明的 MCP server 全部可达")
PY

exit 0
