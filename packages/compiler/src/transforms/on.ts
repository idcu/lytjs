// src/transforms/v-on.ts
// v-on 指令转换逻辑

import type { DirectiveTransform, ExpressionNode } from "../types";
import { getExpContent, capitalize } from "./helpers";

export const transformOn: DirectiveTransform = (dir, _node, _context) => {
  const { arg, exp, modifiers } = dir;
  const props: Array<{ key: string; value: string }> = [];

  const argContent = arg ? getExpContent(arg as ExpressionNode) : undefined;
  const expContent = getExpContent(exp);

  if (argContent && expContent) {
    let eventName = argContent;
    if (modifiers.length > 0) {
      eventName += modifiers.map((m) => `_${m}`).join("");
    }
    props.push({
      key: `on${capitalize(eventName)}`,
      value: expContent,
    });
  }

  return { props };
};
