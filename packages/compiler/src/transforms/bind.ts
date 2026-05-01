// src/transforms/v-bind.ts
// v-bind 指令转换逻辑

import type { DirectiveTransform, ExpressionNode } from "../types";
import { getExpContent } from "./helpers";

export const transformBind: DirectiveTransform = (dir, _node, _context) => {
  const { arg, exp } = dir;
  // Returns a plain object array instead of JSProperty nodes because this
  // directive transform produces string-based key-value pairs that are later
  // consumed by codegen as literal strings, not as AST property nodes.
  const props: Array<{ key: string; value: string }> = [];

  const argContent = arg ? getExpContent(arg as ExpressionNode) : undefined;
  const expContent = getExpContent(exp);

  if (argContent && expContent) {
    props.push({
      key: argContent,
      value: expContent,
    });
  }

  return { props };
};
