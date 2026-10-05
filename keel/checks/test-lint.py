#!/usr/bin/env python3
"""keel-lint 自测套件（DESIGN.md §9.3）

用法：
    bash   keel/checks/test-lint.sh  [-v] [--keep]
    python3 keel/checks/test-lint.py [-v] [--keep]

做什么：
    1. 为 §9.1 检查表的每一项，造一个"**应该被判死**"的故障仓库；另加若干
       "**应该放行**"的合法基线（含 `_template`、`decisions/`、`stale-check: off`
       三类豁免）。逐例跑 checks/keel-lint.sh，断言输出与退出码。
    2. DOC 检查：若能在上级目录找到 DESIGN.md，则比对随仓库发布的
       keel-lint.sh 与文档 §9.3 代码块是否**逐字一致**——防止"文档一套、脚本一套"。

为什么需要它：
    §9 的整个主张是"机器验"。**验证脚本自己也是规则，也会腐烂**——改了检查项却
    忘了改用例、或改了文档却忘了改脚本，都会让 lint 悄悄变成摆设。这个套件就是
    规则本身的回归测试：**改 keel-lint.sh 必须同时改这里，否则 CI 红**。

依赖：
    python3（仅测试用）。keel-lint.sh 本身只依赖 bash 3.2+ / awk / sed / find，
    加可选的 tsort（环检测）与 git（frozen 检查）。

退出码：
    0 = 全部用例通过（含跳过）；1 = 有用例失败。
"""

import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------- 零 stderr 噪声（ADR 0014）----------
# 设计稿 §9.3 声称自测达到"零 stderr 噪声"。此前那是**描述性的**——
# stderr 被捕获（run_lint）也被打印，却从没有任何一处断言它为空。
# 本列表把那条描述变成判据。
#
# 为什么需要豁免：判据一旦生效，**任何**环境噪声都会让套件变红，
# 而"变红的套件"比"没有套件"更糟（§10.4 的推论）——它会被习惯性忽略，
# 于是真错误也一起被忽略。所以豁免是判据的**组成部分**，不是例外。
#
# 纪律（防止白名单变垃圾桶）：
#   ① 每条必须写明**为什么它是环境噪声、不是 lint 的问题**；
#   ② 命中时**必须打印**"本次豁免了哪几条"，不许静默；
#   ③ 新增条目要能回答"为什么不改 lint 就能消掉它"。
STDERR_ALLOW = [
    # 本机 PATH 上的安全删除垫片（…/shim/safe-bin/{rm,rmdir,unlink}）拒绝带盘符的
    # 路径，导致 keel-lint.sh 里 `trap 'rm -rf "$tmp"'` 被拦。**不是 Keel 所发**
    # （不写行号：行号本身会随脚本改动漂移，写死就等于给自己埋一个陈旧引用）
    # （grep -rn SAFE_DELETE keel/checks/keel-lint.sh = 0 命中），见坑
    # safe-delete-shim-blocks-cleanup。
    #
    # 这里豁免整个 `SAFE_DELETE_*` 前缀而不是逐条枚举：该垫片有多个变体
    # （BULK_CONFIRM_REQUIRED / INVALID_PATH / …），逐条加会让白名单变成垃圾桶，
    # 而它们**同源、同因、同解**——换环境就没了。
    "SAFE_DELETE_",
]
LINT = os.path.join(HERE, "keel-lint.sh")
BUDGET_SRC = os.path.join(HERE, "budget.env")

ANCHOR = "任何任务开始前，先读 keel/INDEX.md 与其中指向的 NOW.md，并遵守 INDEX.md 里的检索协议。"

# 合法基线仓库：一个合规到不能再合规的 MVP（§12.1）
FILES = {
    "keel/INDEX.md": """---
scope: meta
status: active
last-verified: 2026-01-01
keywords: [索引, 入口, 路由]
keel-version: 2.1.0
project-state: building
---

# keel · INDEX

## 检索协议（必须遵守）
1. 必读：INDEX.md（唯一入口）+ 当前 NOW*.md
2. 定位：先 grep -rl "关键词" keel/ --exclude-dir=archive --exclude-dir=NOW-history
3. 读取：只 read 命中的那一个文件
4. 预算：单次检索输出 ≤100 行；本轮 Keel 加载总量 ≤15,000 字节
5. 写回：完成任务必须写回 NOW*.md

## 路由（scope → 入口）
| scope | 一句话 | 入口 |
|---|---|---|
| meta | 宪法与地图 | [CONSTITUTION.md](CONSTITUTION.md) |
| now | 当前焦点 | [NOW.md](NOW.md) |
| db | 数据库 | [pitfalls/INDEX.md](pitfalls/INDEX.md) |
| meta | 校验规则 | [rules.md](checks/rules.md) |

## 冷区指针（只此一行）
[archive/](archive/) · [NOW-history/](NOW-history/)
""",
    "keel/CONSTITUTION.md": """---
scope: meta
status: active
last-verified: 2026-01-01
keywords: [宪法, 红线]
---
# CONSTITUTION

## 硬约束
1. 单次会话 Keel 加载量 ≤5k token（见 @INDEX.md）
""",
    "keel/NOW.md": """---
scope: now
status: active
last-verified: 2026-01-01
updated: 2026-01-01
keywords: [焦点, 交接]
---
# NOW · main

## 当前焦点
跑通 keel-lint
## 下一步
1. 接 CI
""",
    "keel/pitfalls/INDEX.md": """---
scope: meta
status: active
last-verified: 2026-01-01
keywords: [坑库, 索引]
---
| 症状（一行） | scope | 严重度 | → 文件 |
|---|---|---|---|
| 压测下 DB 连接耗尽 | db | P1 | [conn-pool.md](db/connection-pool-exhausted.md) |
""",
    "keel/pitfalls/_template.md": """## 症状
## 根因
## 正解
""",
    "keel/pitfalls/db/connection-pool-exhausted.md": """---
scope: db
status: active
severity: P1
last-verified: 2026-01-01
triggers: 0
keywords: [连接池, 超时]
---
## 症状
压测下接口大面积 500。
## 根因
DAO 层循环内建连。
## 正解
- 连接必须走全局池
""",
    "keel/checks/rules.md": """---
scope: meta
status: active
last-verified: 2026-01-01
keywords: [校验, 规则]
---
# 扩展检查
- 契约漂移：npm run check:contracts
""",
}

# 一处注入 = 一个用例：(编号, 说明, §9.1 对应项, 期望输出片段, 期望退出码, 注入函数)
CASES = []


def case(cid, name, ref, expect, rc=1):
    def deco(fn):
        CASES.append((cid, name, ref, expect, rc, fn))
        return fn
    return deco


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def sub(dst, rel, old, new, count=1):
    p = os.path.join(dst, rel)
    t = open(p, encoding="utf-8").read()
    assert old in t, "注入失败（未找到锚点）: %s :: %r" % (rel, old)
    open(p, "w", encoding="utf-8").write(t.replace(old, new, count))


def app(dst, rel, text):
    with open(os.path.join(dst, rel), "a", encoding="utf-8") as fh:
        fh.write(text)


# ---------------- 合法基线（应放行） ----------------
@case("00", "合法基线 MVP 全绿", "§12.1", [], rc=0)
def c00(d):
    pass


@case("29", "`_template` 三级豁免（无 frontmatter / 无三段式）", "§3.4", [], rc=0)
def c29(d):
    pass


@case("30", "`decisions/` 豁免陈旧", "§9.4", [], rc=0)
def c30(d):
    write(os.path.join(d, "keel/decisions/0001-old-adr.md"),
          "---\nscope: meta\nstatus: active\nlast-verified: 2026-01-01\nkeywords: [adr]\n---\n# 老 ADR\n")
    app(d, "keel/NOW.md", "\n见 @decisions/0001-old-adr.md\n")


@case("32", "`stale-check: off` 逃生口", "§9.4", [], rc=0)
def c32(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md",
        "last-verified: 2026-01-01", "last-verified: 2026-01-01\nstale-check: off")


# ---------------- 预算（§9.1-1） ----------------
@case("01", "文件超行数", "§9.1-1", ["超行数"])
def c01(d):
    app(d, "keel/INDEX.md", "".join("- r%d\n" % i for i in range(100)))


@case("02", "文件超字节（行数合法）", "§9.1-1", ["超字节"])
def c02(d):
    row = "| 压测下数据库连接池耗尽导致接口大面积 500 报错 | db | P1 | [conn-pool.md](db/connection-pool-exhausted.md) |\n"
    app(d, "keel/pitfalls/INDEX.md", row * 60)


@case("03", "单行超字节", "§9.1-1", ["单行超限"])
def c03(d):
    app(d, "keel/checks/rules.md", "x" * 400 + "\n")


@case("25", "单目录文件数超限", "§9.1-1", ["目录文件超限"])
def c25(d):
    for i in range(21):
        write(os.path.join(d, "keel/checks/gen-%d.sh" % i), "#!/bin/sh\n")


# ---------------- frontmatter（§9.1-2） ----------------
@case("04", "frontmatter 超行数", "§9.1-2", ["frontmatter 超行数"])
def c04(d):
    p = os.path.join(d, "keel/pitfalls/db/connection-pool-exhausted.md")
    t = open(p, encoding="utf-8").read().split("---\n")
    extra = "".join("a%d: v\n" % i for i in range(1, 8))
    open(p, "w", encoding="utf-8").write("---\n" + t[1] + extra + "---\n" + t[2])


@case("05", "frontmatter 超字节", "§9.1-2", ["frontmatter 超字节"])
def c05(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md",
        "keywords: [连接池, 超时]",
        "keywords: [" + ", ".join("术语%d" % i for i in range(1, 60)) + "]")


@case("06", "缺基础字段 keywords", "§9.1-2", ["缺 keywords"])
def c06(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md", "keywords: [连接池, 超时]\n", "")


@case("11", "坑条目缺角色字段 triggers", "§9.1-2", ["缺 triggers"])
def c11(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md", "triggers: 0\n", "")


# ---------------- 死链 / 孤儿 / 三段式（§9.1-3 / 4 / 5） ----------------
@case("22", "死链（热区 + 冷区都要查）", "§9.1-3", ["死链"])
def c22(d):
    app(d, "keel/NOW.md", "\n见 [gone.md](../gone.md)\n")
    write(os.path.join(d, "keel/archive/old.md"), "见 [vanish.md](vanish.md)\n")


@case("23", "孤儿（未被任何热区文档引用）", "§9.1-4", ["孤儿"])
def c23(d):
    write(os.path.join(d, "keel/skills/orphan.md"),
          "---\nscope: meta\nstatus: active\nlast-verified: 2026-01-01\nkeywords: [x]\ntrigger: t\n---\n# orphan\n")


@case("37", "正文提及文件名但无链接——仍判孤儿（真实链接图）", "§9.1-4", ["孤儿"])
def c37(d):
    write(os.path.join(d, "keel/skills/orphan.md"),
          "---\nscope: meta\nstatus: active\nlast-verified: 2026-01-01\nkeywords: [x]\ntrigger: t\n---\n# orphan\n")
    # 只在正文里"提到"文件名、不建立链接：旧的 grep 近似会因此放过它
    app(d, "keel/NOW.md", "\n本轮参考了 orphan.md 的做法。\n")


@case("24", "坑条目缺三段式", "§9.1-5", ["缺失【## 根因】"])
def c24(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md", "## 根因\n", "")


# ---------------- 值域与格式（§9.1-6） ----------------
@case("07", "status 值域非法", "§9.1-6", ["status 值域非法"])
def c07(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md", "status: active", "status: bogus")


@case("08", "severity 值域非法", "§9.1-6", ["severity 值域非法"])
def c08(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md", "severity: P1", "severity: P9")


@case("09", "keywords 为空", "§9.1-6", ["keywords 为空"])
def c09(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md", "keywords: [连接池, 超时]", "keywords: []")


@case("10", "last-verified 非 YYYY-MM-DD", "§9.1-6", ["last-verified 非 YYYY-MM-DD"])
def c10(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md",
        "last-verified: 2026-01-01", "last-verified: 2026-1-1")


# ---------------- 登记与索引（§9.1-7） ----------------
@case("14", "pitfalls 索引混入非表格正文", "§9.1-7", ["域索引含非表格正文"])
def c14(d):
    app(d, "keel/pitfalls/INDEX.md", "\n## 说明\n本索引按严重度倒序维护。\n")


@case("15", "坑条目未登记进索引", "§9.1-7", ["未登记进 pitfalls/INDEX.md"])
def c15(d):
    write(os.path.join(d, "keel/pitfalls/db/unregistered.md"),
          "---\nscope: db\nstatus: active\nseverity: P2\nlast-verified: 2026-01-01\ntriggers: 0\nkeywords: [x]\n---\n## 症状\na\n## 根因\nb\n## 正解\nc\n")


# ---------------- 命名（§9.1-8） ----------------
@case("12", "热区文件名含日期", "§9.1-8", ["热区文件名含日期"])
def c12(d):
    write(os.path.join(d, "keel/pitfalls/db/2026-01-02-note.md"),
          "---\nscope: db\nstatus: active\nseverity: P2\nlast-verified: 2026-01-01\ntriggers: 0\nkeywords: [笔记]\n---\n## 症状\na\n## 根因\nb\n## 正解\nc\n")
    app(d, "keel/pitfalls/INDEX.md", "| 随手笔记 | db | P2 | [n.md](db/2026-01-02-note.md) |\n")


@case("13", "命名含大写 / 非 kebab-case", "§9.1-8", ["命名含大写"])
def c13(d):
    write(os.path.join(d, "keel/pitfalls/db/BadName.md"),
          "---\nscope: db\nstatus: active\nseverity: P2\nlast-verified: 2026-01-01\ntriggers: 0\nkeywords: [x]\n---\n## 症状\na\n## 根因\nb\n## 正解\nc\n")
    app(d, "keel/pitfalls/INDEX.md", "| 大写名 | db | P2 | [b.md](db/BadName.md) |\n")


# ---------------- 引用环（§9.1-9） ----------------
@case("16", "引用成环", "§9.1-9", ["引用存在环"])
def c16(d):
    write(os.path.join(d, "keel/pitfalls/db/alpha.md"),
          "---\nscope: db\nstatus: active\nseverity: P2\nlast-verified: 2026-01-01\ntriggers: 0\nkeywords: [a]\n---\n## 症状\n见 @./beta.md\n## 根因\nb\n## 正解\nc\n")
    write(os.path.join(d, "keel/pitfalls/db/beta.md"),
          "---\nscope: db\nstatus: active\nseverity: P2\nlast-verified: 2026-01-01\ntriggers: 0\nkeywords: [b]\n---\n## 症状\na\n## 根因\n见 @./alpha.md\n## 正解\nc\n")
    app(d, "keel/pitfalls/INDEX.md",
        "| alpha | db | P2 | [a.md](db/alpha.md) |\n| beta | db | P2 | [b.md](db/beta.md) |\n")


# ---------------- 必读与点火（§9.1-10） ----------------
@case("17", "缺必读文件 NOW.md", "§9.1-10", ["缺必读文件: NOW"])
def c17(d):
    os.remove(os.path.join(d, "keel/NOW.md"))


@case("18", "根 INDEX 缺 keel-version", "§9.1-10", ["缺 keel-version"])
def c18(d):
    sub(d, "keel/INDEX.md", "keel-version: 2.1.0\n", "")


@case("19", "根 INDEX 缺 project-state", "§9.1-10", ["缺 project-state"])
def c19(d):
    sub(d, "keel/INDEX.md", "project-state: building\n", "")


@case("21", "缺 §4.1 点火锚点", "§9.1-10", ["点火锚点缺失"])
def c21(d):
    os.remove(os.path.join(d, "CLAUDE.md"))


# ---------------- 状态机（§9.1-11） ----------------
@case("28", "例外决策缺 created 字段", "§9.1-11", ["例外决策缺 created"])
def c28(d):
    write(os.path.join(d, "keel/decisions/0001-exception.md"),
          "---\nscope: meta\nstatus: active\nlast-verified: 2026-01-01\nkeywords: [例外]\ntype: exception\n---\n# 例外\n")


# ---------------- 取代关系（§9.1-14） ----------------
@case("31", "superseded-by 指向不存在的文件", "§9.1-14", ["superseded-by 指向不存在"])
def c31(d):
    write(os.path.join(d, "keel/decisions/0001-old-adr.md"),
          "---\nscope: meta\nstatus: active\nlast-verified: 2026-01-01\nkeywords: [adr]\nsuperseded-by: 0009-nope.md\n---\n# 老 ADR\n")
    app(d, "keel/NOW.md", "\n见 @decisions/0001-old-adr.md\n")


# ---------------- 预算真源（§9.3） ----------------
@case("20", "缺预算真源 budget.env", "§9.3", ["缺预算真源"])
def c20(d):
    os.remove(os.path.join(d, "keel/checks/budget.env"))


# ---------------- 闭环钩子本体（§9.1-16） ----------------
@case("36", "缺闭环钩子本体（§10.4 铁律：缺一，闭环不成立）", "§9.1-16", ["缺闭环钩子本体"])
def c36(d):
    os.remove(os.path.join(d, "keel/checks/hooks/commit-msg"))


# ---------------- 版本副本一致（§9.1-17） ----------------
# 这一项是本项目自身的 Lint Leakage 修复：ADR 0010 的 CI 检查只存在于
# 发布仓、且两周无人查看，实测 keel-version 到3.4.4 而 CHANGELOG 停在 3.2。
# **判据存在却没人看= 没有判据**，故把一致性补成第 17 项。
# 基线里没有 CHANGELOG / README（纯模板安装态），所以第 17 项应当**跳过不误判**——
# 这本身就是一个必须验的合法基线：副本不存在时不能凭空fail。
@case("39", "版本副本一致（基线无 CHANGELOG/README → 应跳过不误判）", "§9.1-17", [], rc=0)
def c39(d):
    # 故意什么都不改：基线本就无 CHANGELOG / README，
    # 若第 17 项在这里报fail，说明"副本不存在"被当成了"副本不一致"。
    return


@case("40", "CHANGELOG 缺当期版本小节（声明了却没写变更）", "§9.1-17", ["CHANGELOG.md 缺"])
def c40(d):
    write(os.path.join(d, "CHANGELOG.md"),
          "# CHANGELOG\n\n## 1.0.0 — 2026-01-01\n\n旧的远期版本。\n")


@case("41", "README 徽章版本与 keel-version 不一致", "§9.1-17", ["README 徽章版本"])
def c41(d):
    write(os.path.join(d, "README.md"),
          "# 项目\n\n[![keel-version](https://img.shields.io/badge/keel--version-9.9.9-000000)](keel/INDEX.md)\n")


# ---------------- 告警（warn，不应导致失败） ----------------
@case("26", "陈旧告警", "§9.1-12", ["stale"], rc=0)
def c26(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md",
        "last-verified: 2026-01-01", "last-verified: 2020-01-01")


@case("27", "待蒸馏告警", "§9.1-13", ["待蒸馏"], rc=0)
def c27(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md", "triggers: 0", "triggers: 3")


def build_base(dst, budget):
    for rel, text in FILES.items():
        write(os.path.join(dst, rel), text)
    write(os.path.join(dst, "keel/checks/budget.env"), budget)
    write(os.path.join(dst, "CLAUDE.md"), ANCHOR + "\n")
    # 闭环钩子本体（§10.4 铁律）：lint 第 13 项要求存在且可执行
    for h in ("pre-commit", "commit-msg"):
        hp = os.path.join(dst, "keel/checks/hooks", h)
        write(hp, "#!/usr/bin/env bash\nexit 0\n")
        os.chmod(hp, 0o755)
    for d in ("keel/archive", "keel/NOW-history"):
        os.makedirs(os.path.join(dst, d), exist_ok=True)


def run_lint(cwd):
    # 解释器必须用绝对路径：Windows 上裸 "bash" 会被解析成
    # C:\Windows\system32\bash.exe（WSL 垫片），它只打印安装提示就 exit 1，
    # 于是每次调用都拿到零 lint 输出、全部用例假失败，且报"未通过"而非报错。
    # 教训见 pitfalls/meta/harness-invokes-bare-bash.md（判据不得隐含假设运行环境）。
    bash = shutil.which("bash") or "bash"
    p = subprocess.run([bash, LINT, "keel"], cwd=cwd,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out = p.stdout.decode("utf-8", "replace")
    err = p.stderr.decode("utf-8", "replace")
    return p.returncode, out, err


def find_doc():
    """向上找 DESIGN.md（只有开发本设计稿的仓库里才有）。"""
    d = HERE
    for _ in range(6):
        cand = os.path.join(d, "DESIGN.md")
        if os.path.isfile(cand):
            return cand
        d = os.path.dirname(d)
    return None


def check_doc_consistency():
    """随仓库发布的 keel-lint.sh 必须与 DESIGN.md §9.3 逐字一致。"""
    doc = find_doc()
    if not doc:
        return None, "未找到 DESIGN.md（发布版 starter 里正常）"
    text = open(doc, encoding="utf-8").read()
    for block in re.findall(r"```bash\n(.*?)```", text, re.S):
        if block.startswith("#!/usr/bin/env bash"):
            shipped = open(LINT, encoding="utf-8").read()
            if block.rstrip("\n") == shipped.rstrip("\n"):
                return True, "与 DESIGN.md §9.3 逐字一致"
            return False, "与 DESIGN.md §9.3 不一致——改了脚本请同步文档，反之亦然"
    return False, "DESIGN.md 里找不到 §9.3 的脚本代码块"


@case("33", "frontmatter 行内注释（YAML 语义）", "§6.1", [], rc=0)
def c33(d):
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md",
        "status: active", "status: active          # active | distilled | archived")
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md",
        "severity: P1", "severity: P1            # P0–P3")
    sub(d, "keel/pitfalls/db/connection-pool-exhausted.md",
        "triggers: 0", "triggers: 0             # 每被触发一次 +1")
    sub(d, "keel/INDEX.md",
        "project-state: building", "project-state: building     # exploring | architecture-locked | building | frozen")


@case("34", "域索引（非 pitfalls）含正文", "§9.1-7", ["域索引含非表格正文"])
def c34(d):
    write(os.path.join(d, "keel/skills/INDEX.md"),
          "---\nscope: meta\nstatus: active\nlast-verified: 2026-01-01\nkeywords: [技能]\n---\n\n## 说明\n本索引按加入顺序维护。\n")


@case("35", "决策模板的占位字段不算数（应通过）", "§3.4", [], rc=0)
def c35(d):
    write(os.path.join(d, "keel/decisions/_template.md"),
          "---\nscope: meta\nstatus: active\nlast-verified: 2026-01-01\nkeywords: [adr]\n"
          "type: exception   # 冻结期例外才改\n"
          "superseded-by:   # 占位注释，值整行是注释\n"
          "---\n# 模板\n")


def main():
    argv = [a for a in sys.argv[1:]]
    verbose = "-v" in argv or "--verbose" in argv
    keep = "--keep" in argv

    # v3.4.6：`--only 39,40`（或 `--only 6-9`）跑指定用例子集。
    # 为什么需要它：全量 41 例 ×单次 lint（Windows 上约 32s）≈ 13 分钟，
    # **改一条判据时的等待是真成本**——而实际只想验两三个相关用例。
    # 这是纯筛选，**不改任何判据**（与"抽离慢的那几个检查"不同：
    # 那种做法会让本地门禁与 CI 不一致，可能漏判）。
    # 提醒：子集通过**不等于**可以发版——发版前必须跑全量（子集漏掉的用例不会报）。
    only = None
    for i, a in enumerate(argv):
        if a == "--only" and i + 1 < len(argv):
            only = argv[i + 1]
            argv = argv[:i] + argv[i + 2:]
            break
        if a.startswith("--only="):
            only = a.split("=", 1)[1]
            argv = [x for x in argv if x != a]
            break
    if only is not None:
        want = set()
        for part in only.replace(" ", "").split(","):
            if not part:
                continue
            if "-" in part:
                try:
                    a1, a2 = part.split("-", 1)
                    for n in range(int(a1), int(a2) + 1):
                        want.add(str(n).zfill(2))
                except ValueError:
                    print("❌ --only 区间格式应为 6-9：%s" % part)
                    return 2
            else:
                want.add(part.zfill(2))   # 用例号是补零的两位（"06"），比较前先对齐
        known = {cid for cid, *_ in CASES}
        unknown = want - known
        if unknown:
            print("❌ 没有这些用例: %s" % ", ".join(sorted(unknown)))
            print("   可用例号: %s" % ", ".join(sorted(known, key=lambda x: int(x))))
            return 2

    if not os.path.isfile(LINT):
        print("❌ 找不到 %s" % LINT)
        return 1
    if not os.path.isfile(BUDGET_SRC):
        print("❌ 找不到 %s" % BUDGET_SRC)
        return 1

    budget = open(BUDGET_SRC, encoding="utf-8").read()
    root = tempfile.mkdtemp(prefix="keel-test-lint-")
    base = os.path.join(root, "base")
    build_base(base, budget)

    cases = CASES if only is None else [c for c in CASES if c[0] in want]

    tools = []
    for t in ("tsort", "git"):
        tools.append("%s:%s" % (t, "有" if shutil.which(t) else "无（相关检查会跳过）"))

    print("keel-lint 自测 · 用例 %d 例 · 临时目录 %s" % (len(cases), root))
    if only is not None:
        print("  ⚠️ 子集运行（%s）：**发版前仍须跑全量**" % only)
    print("  工具可用性: " + "  ".join(tools))
    print("=" * 76)

    ok = bad = 0
    stderr_noise_log = []   # 收集全部非空 stderr（ADR 0014），末尾统一判一次
    for cid, name, ref, expect, want_rc, fn in cases:
        d = os.path.join(root, cid)
        shutil.copytree(base, d)
        fn(d)
        rc, out, err = run_lint(d)
        fails = re.findall(r"❌.*", out)
        warns = re.findall(r"⚠️.*", out)
        lines = fails + warns
        # 去重后收集：同一台机器上 38 例通常是同一条环境噪声刷屏
        for ln in {l.strip() for l in err.splitlines() if l.strip()}:
            stderr_noise_log.append(ln)

        if expect:
            hit = all(any(e in ln for ln in lines) for e in expect)
            passed = hit and rc == want_rc
            detail = "命中" if hit else "**未命中**"
        else:
            passed = not fails and rc == 0
            detail = "干净" if not fails else "**不该有 ❌**"
        ok += passed
        bad += not passed

        print("[%s] %s %-42s %s" % ("PASS" if passed else "FAIL", cid, name, ref))
        if verbose or not passed:
            print("        期望=%s 实际=%s  退出码=%d（期望 %d）" % (expect or "无 ❌", detail, rc, want_rc))
            if err.strip():
                print("        [stderr] %s" % err.strip()[:200].replace("\n", " | "))
            for ln in lines[:6]:
                print("        " + ln)
            if not passed and not lines:
                print("        （无任何 ❌/⚠️ 输出）")

    print("=" * 76)
    # ---------- 零 stderr 噪声（ADR 0014）----------
    # 放在这里而不是每例中间：噪声是**环境级**的（同一台机器每例都一样），
    # 逐例判会刷 38 行同样的错，把真信号淹掉。判一次、豁免一次、报一次。
    noise = stderr_noise_log or []
    allowed = [n for n in noise if any(a in n for a in STDERR_ALLOW)]
    unexpected = [n for n in noise if n not in allowed]
    if unexpected:
        print("[FAIL] NOISE stderr 有未豁免噪声    %d 条，例：%s"
              % (len(unexpected), unexpected[0][:120]))
        bad += 1
    else:
        # 豁免条数**打印出来**：白名单一旦静默就等于没有判据（ADR 0014）
        if allowed:
            uniq = sorted(set(allowed))
            print("[PASS] NOISE stderr 噪声已豁免      %d 条（去重 %d 类，例：%s）"
                  % (len(allowed), len(uniq), uniq[0][:90]))
        else:
            print("[PASS] NOISE stderr 零噪声          %d 例全部无 stderr" % len(cases))
        ok += 1
    print("=" * 76)
    doc_ok, doc_msg = check_doc_consistency()
    if doc_ok is None:
        print("[SKIP] DOC  脚本与文档一致性          %s" % doc_msg)
    else:
        print("[%s] DOC  脚本与文档一致性          %s" % ("PASS" if doc_ok else "FAIL", doc_msg))
        if not doc_ok:
            bad += 1

    print("=" * 76)
    # 分母要说清：cases 是故障注入用例，NOISE 是元检查（ADR 0014）——
    # 两者都算"检查"，但不同类，混在一个分母里会让人误读成"多了 1 个用例"。
    total = len(cases) + 1   # +1 = NOISE 元检查
    if bad == 0:
        print("✅ 自测通过：%d/%d（%d 用例 + 1 元检查）" % (ok, total, len(cases)))
    else:
        print("❌ 自测失败：%d 项未通过（共 %d 项）" % (bad, total))
    if keep:
        print("   临时目录保留：%s" % root)
    else:
        shutil.rmtree(root, ignore_errors=True)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
