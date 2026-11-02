#!/usr/bin/env python3
"""keel-search —— Keel 热区文档的最小可用语义检索（BM25）。

定位（ADR 0007 / ADR 0019）：
    语义检索在 Keel 里是「接入位」而非内核职责——内核（keel-lint.sh）必须
    零外部依赖。本工具是该接入位的**参考实现**：纯 python3 标准库，可直接用，
    也可被 Serena / embedding 服务等替换（实现同一 Retriever 接口即可）。

用法：
    python3 keel/checks/retrieval/keel-search.py <query> [--top N] [--keel-dir DIR]
    python3 keel/checks/retrieval/keel-search.py --self-test

算法：Okapi BM25（k1=1.5, b=0.75）。
分词：拉丁字母按词边界切；CJK 按单字切（无分词器时的折中，召回优先）。
索引范围：热区 *.md（排除 archive/、NOW-history/），与 lint 热区口径一致。

零外部依赖；不进 keel-lint.sh；不进 §9.1 检查面。
"""
import math
import os
import re
import sys
from abc import ABC, abstractmethod

K1 = 1.5
B = 0.75


def tokenize(text):
    """分词：拉丁按词；CJK 按字。统一小写。"""
    out = []
    for tok in re.findall(r"[A-Za-z0-9_]+|[\u4e00-\u9fff]", text.lower()):
        out.append(tok)
    return out


class Retriever(ABC):
    @abstractmethod
    def search(self, query, top_k=10):
        """返回 [(rel_path, score), ...]，按分数降序。"""


class BM25Retriever(Retriever):
    def __init__(self, docs):
        """docs: {rel_path: token_list}"""
        self.docs = docs
        self.N = len(docs)
        self.dl = {p: len(t) for p, t in docs.items()}
        self.avgdl = (sum(self.dl.values()) / self.N) if self.N else 0.0
        # document frequency
        self.df = {}
        for toks in docs.values():
            for term in set(toks):
                self.df[term] = self.df.get(term, 0) + 1
        self.idf = {t: math.log(1 + (self.N - n + 0.5) / (n + 0.5))
                    for t, n in self.df.items()}

    def search(self, query, top_k=10):
        qterms = tokenize(query)
        scores = {}
        for path, toks in self.docs.items():
            tf = {}
            for t in toks:
                tf[t] = tf.get(t, 0) + 1
            dl = self.dl[path]
            s = 0.0
            for qt in qterms:
                if qt not in self.idf:
                    continue
                f = tf.get(qt, 0)
                if f == 0:
                    continue
                idf = self.idf[qt]
                denom = f + K1 * (1 - B + B * dl / (self.avgdl or 1))
                s += idf * (f * (K1 + 1)) / denom
            if s > 0:
                scores[path] = s
        return sorted(scores.items(), key=lambda x: -x[1])[:top_k]


def collect_hot_docs(keel_dir):
    """收集热区 md，返回 {rel_path: content}。口径同 lint 热区。"""
    docs = {}
    for root, _dirs, files in os.walk(keel_dir):
        if "/archive" in root or "/NOW-history" in root:
            continue
        for fn in files:
            if not fn.endswith(".md"):
                continue
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, keel_dir)
            try:
                with open(full, encoding="utf-8") as fh:
                    docs[rel] = fh.read()
            except OSError:
                continue
    return docs


def build_index(keel_dir):
    docs = {p: tokenize(c) for p, c in collect_hot_docs(keel_dir).items()}
    return BM25Retriever(docs)


def main():
    argv = sys.argv[1:]
    if "--self-test" in argv:
        return self_test()
    if not argv or argv[0].startswith("-"):
        print(__doc__)
        return 0
    query = argv[0]
    top_k = 10
    keel_dir = "keel"
    i = 1
    while i < len(argv):
        if argv[i] == "--top" and i + 1 < len(argv):
            top_k = int(argv[i + 1]); i += 2
        elif argv[i] == "--keel-dir" and i + 1 < len(argv):
            keel_dir = argv[i + 1]; i += 2
        else:
            i += 1
    if not os.path.isdir(keel_dir):
        print("❌ keel 目录不存在: %s" % keel_dir, file=sys.stderr)
        return 2
    r = build_index(keel_dir)
    for path, score in r.search(query, top_k):
        print("%.4f  %s" % (score, path))
    return 0


def self_test():
    """用内嵌语料验证 BM25 排序正确性。"""
    corpus = {
        "db/pool.md": "连接池 连接池 耗尽 压测 500 接口超时 DAO 循环建连",
        "meta/lint.md": "lint fork 批量化 性能 319秒 基线",
        "db/conn.md": "数据库 连接串 超时 配置 参数",
        "now.md": "当前焦点 下一步 阻塞",
    }
    docs = {p: tokenize(c) for p, c in corpus.items()}
    r = BM25Retriever(docs)
    # 查询「连接池」：db/pool.md 含「池」且词频高，应排第一；db/conn.md 无「池」
    res = r.search("连接池", top_k=4)
    paths = [p for p, _ in res]
    assert paths and paths[0] == "db/pool.md", "top1 应为 db/pool.md，实得 %s" % paths
    # 查询「lint 性能」：meta/lint.md 应排第一
    res2 = r.search("lint 性能", top_k=2)
    assert res2 and res2[0][0] == "meta/lint.md", "lint 查询 top1 错: %s" % res2
    # 无命中词返回空
    assert r.search("不存在的词xyz") == []
    print("[PASS] keel-search self-test：BM25 排序 3 项断言全绿")
    return 0


if __name__ == "__main__":
    sys.exit(main())
