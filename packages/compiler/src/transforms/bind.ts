// src/transforms/v-bind.ts
// v-bind 指令转换逻辑

import type { DirectiveTransform, ExpressionNode } from "../types";
import { getExpContent } from "./helpers";

export const transformBind: DirectiveTransform = (dir, _node, _context) => {
  const { arg, exp } = dir;
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
