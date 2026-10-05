#!/usr/bin/env python3
"""keel-mcp-server.py —— 把 Keel 的必读文件暴露成 MCP 只读资源（《Keel 设计稿》§4.2）

为什么需要它：
    §4.2 写着一句关键话——「支持 MCP 的客户端：把 INDEX + NOW 暴露成 MCP resource /
    只读工具，让『必读』变成协议动作，而不是提示词里的礼貌请求」。
    但 §4.3 同时承认：没有 shell / grep 的环境里，降级模式**没有任何机制能阻止它多读**。
    本文件就是那句话的最小兑现：AI 不再"被请求去读"，而是**从协议里拿到**。

边界（刻意保持最小）：
    · 只读：不写任何文件，不接受任何写操作；
    · 零第三方依赖：python3 标准库 + stdio（MCP 官方 stdio 传输，换行分隔 JSON-RPC 2.0）；
    · 与内核解耦：不进 keel-lint.sh，不改变 §9.3 的零依赖前提；
    · 只暴露"必读 + 入口"三件，不替代 §8 的 grep 检索协议。

用法：
    python3 keel/checks/mcp/keel-mcp-server.py            # 自动向上找 keel 目录
    python3 keel/checks/mcp/keel-mcp-server.py --keel DIR # 显式指定
    python3 keel/checks/mcp/keel-mcp-server.py --self-test # 不开客户端也能验证它工作

客户端配置（Claude Desktop / Cursor / Cline 等）：
    {"mcpServers": {"keel": {"command": "python3",
      "args": ["<绝对路径>/keel/checks/mcp/keel-mcp-server.py"]}}}
"""

import argparse
import json
import os
import sys

PROTOCOL_FALLBACK = "2024-11-05"
SERVER_NAME = "keel"


def _read_version(keel_dir):
    """版本号从 keel/INDEX.md 的 keel-version 读——**它是唯一真源**（ADR 0010）。

    原实现在这里硬编码 "3.1.0"，到 v3.4.0 时已落后三个版本：
    MCP 客户端看到的 serverInfo 与实际装到的版本对不上，
    而 §7.1 的 SSOT 原则说「每类事实只有一个定义位置」。
    读不到就回落到 "0.0.0-unknown"——**宁可显式说不知道，不报一个假版本**。
    """
    try:
        p = os.path.join(keel_dir, "INDEX.md")
        with open(p, encoding="utf-8") as f:
            for line in f:
                if line.startswith("keel-version:"):
                    v = line.split(":", 1)[1].strip()
                    if v:
                        return v
    except Exception:
        pass
    return "0.0.0-unknown"


URI_INDEX = "keel://index"
URI_CONSTITUTION = "keel://constitution"
URI_NOW = "keel://now"


class McpError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


# 逐级向上探测的相对位置：常规项目 ./keel/，本项目自身的两仓布局 keel-starter/keel/，最后是当前目录
CANDIDATE_SUBDIRS = ("keel", "keel-starter/keel", "")


def find_keel(start):
    """从 start 向上找含 INDEX.md + CONSTITUTION.md 的目录（见 CANDIDATE_SUBDIRS）。"""
    d = os.path.abspath(start)
    while True:
        for rel in CANDIDATE_SUBDIRS:
            cand = os.path.join(d, rel) if rel else d
            if os.path.isfile(os.path.join(cand, "INDEX.md")) and \
               os.path.isfile(os.path.join(cand, "CONSTITUTION.md")):
                return cand
        parent = os.path.dirname(d)
        if parent == d:
            return None
        d = parent


def list_now_files(keel):
    try:
        return sorted(f for f in os.listdir(keel)
                      if f.startswith("NOW") and f.endswith(".md"))
    except OSError:
        return []


def now_uri(fname):
    """NOW.md → keel://now；NOW-<stream>.md → keel://now/<stream>"""
    if fname == "NOW.md":
        return URI_NOW
    return URI_NOW + "/" + fname[4:-3]


def resource_map(keel):
    """uri → 绝对路径（只含真实存在的文件）。"""
    m = {
        URI_INDEX: os.path.join(keel, "INDEX.md"),
        URI_CONSTITUTION: os.path.join(keel, "CONSTITUTION.md"),
    }
    for f in list_now_files(keel):
        m[now_uri(f)] = os.path.join(keel, f)
    return {k: v for k, v in m.items() if os.path.isfile(v)}


DESCRIPTIONS = {
    URI_INDEX: "唯一必读入口：检索协议 + 路由表 + project-state（INDEX.md）",
    URI_CONSTITUTION: "红线 + 人审关卡 + 项目状态机（CONSTITUTION.md）",
}


def list_resources(keel):
    out = []
    for uri in resource_map(keel):
        desc = DESCRIPTIONS.get(uri, "当前焦点、下一步与阻塞（会话交接契约）")
        out.append({
            "uri": uri,
            "name": uri.replace("keel://", "keel "),
            "description": desc,
            "mimeType": "text/markdown",
        })
    return out


def read_resource(keel, uri):
    path = resource_map(keel).get(uri)
    if not path:
        raise McpError(-32602, "unknown resource uri: %s" % uri)
    with open(path, encoding="utf-8") as fh:
        return {"contents": [{"uri": uri, "mimeType": "text/markdown", "text": fh.read()}]}


def handle(keel, msg):
    """处理一条 JSON-RPC 消息；通知（无 id）返回 None。"""
    mid = msg.get("id")
    if mid is None:
        return None
    method = msg.get("method") or ""
    params = msg.get("params") or {}
    try:
        if keel is None:
            raise McpError(-32000, "找不到 keel 目录（缺 INDEX.md / CONSTITUTION.md），"
                                   "请用 --keel 指定或用 KEEL_DIR 指定")
        if method == "initialize":
            result = {
                "protocolVersion": params.get("protocolVersion") or PROTOCOL_FALLBACK,
                "capabilities": {"resources": {"listChanged": False}},
                "serverInfo": {"name": SERVER_NAME, "version": _read_version(keel)},
            }
        elif method == "resources/list":
            result = {"resources": list_resources(keel)}
        elif method == "resources/read":
            result = read_resource(keel, params.get("uri"))
        elif method == "ping":
            result = {}
        else:
            raise McpError(-32601, "method not found: %s" % method)
        return {"jsonrpc": "2.0", "id": mid, "result": result}
    except McpError as e:
        return {"jsonrpc": "2.0", "id": mid, "error": {"code": e.code, "message": e.message}}
    except Exception as e:  # 读文件失败等：返回协议错误而不是崩掉服务
        return {"jsonrpc": "2.0", "id": mid,
                "error": {"code": -32603, "message": "internal error: %s" % e}}


def serve(keel):
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except ValueError:
            continue  # 无法解析的行直接忽略，不污染 stdout
        resp = handle(keel, msg)
        if resp is not None:
            sys.stdout.write(json.dumps(resp, ensure_ascii=False) + "\n")
            sys.stdout.flush()


def self_test(keel):
    """不开 MCP 客户端也能验证：初始化 / 列举 / 读取 / 未知资源 / 未知方法。"""
    def call(method, params=None):
        return handle(keel, {"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}})

    checks = []
    r = call("initialize", {"protocolVersion": "2024-11-05"})
    checks.append(("initialize 回协议版本", r["result"]["protocolVersion"] == "2024-11-05"))
    checks.append(("initialize 声明 resources 能力", "resources" in r["result"]["capabilities"]))

    r = call("resources/list")
    uris = [x["uri"] for x in r["result"]["resources"]]
    checks.append(("resources/list 含 INDEX", URI_INDEX in uris))
    checks.append(("resources/list 含 NOW", any(u.startswith(URI_NOW) for u in uris)))

    r = call("resources/read", {"uri": URI_INDEX})
    body = r["result"]["contents"][0]["text"]
    checks.append(("resources/read 取到 INDEX 正文", "INDEX" in body))

    r = call("resources/read", {"uri": "keel://nope"})
    checks.append(("未知资源报错而非崩溃", "error" in r and r["error"]["code"] == -32602))

    r = call("no/such/method")
    checks.append(("未知方法报 -32601", "error" in r and r["error"]["code"] == -32601))

    r = handle(keel, {"jsonrpc": "2.0", "method": "notifications/initialized"})
    checks.append(("通知不产生响应", r is None))

    print("keel-mcp 自测 · keel 目录 = %s" % keel)
    bad = 0
    for name, ok in checks:
        print("  [%s] %s" % ("PASS" if ok else "FAIL", name))
        bad += not ok
    print("=" * 40)
    print("✅ %d/%d 通过" % (len(checks) - bad, len(checks)) if not bad
          else "❌ %d 项失败" % bad)
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument("--keel", default=os.environ.get("KEEL_DIR", ""),
                    help="keel 目录（默认：从 cwd 向上自动查找）")
    ap.add_argument("--self-test", action="store_true", help="跑内置自测后退出")
    args = ap.parse_args()

    keel = os.path.abspath(args.keel) if args.keel else find_keel(os.getcwd())
    if args.self_test:
        if keel is None:
            print("❌ 找不到 keel 目录，请用 --keel 指定")
            return 2
        return self_test(keel)

    serve(keel)  # keel 为 None 时仍可服务，但每个请求会返回可读的错误
    return 0


if __name__ == "__main__":
    for stream in (sys.stdin, sys.stdout):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass
    sys.exit(main())
