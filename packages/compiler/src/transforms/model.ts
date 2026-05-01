// src/transforms/v-model.ts
// v-model 指令转换逻辑

import type { DirectiveTransform } from "../types";
import { getExpContent } from "./helpers";
import { warn } from "@lytjs/common-error";

/**
 * 验证 v-model 表达式是否为合法的简单属性访问表达式
 * 只允许标识符和属性访问（如 foo、foo.bar、foo[0]）
 */
function isValidModelExpression(exp: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*(\[\d+\])?)*$/.test(
    exp,
  );
}

export const transformModel: DirectiveTransform = (dir, _node, _context) => {
  const { exp } = dir;
  const props: Array<{ key: string; value: string }> = [];

  const expContent = getExpContent(exp);

  if (expContent) {
    if (!isValidModelExpression(expContent)) {
      warn(
        `v-model expression "${expContent}" is not a valid simple expression`,
      );
      return;
    }
    props.push({
      key: "modelValue",
      value: expContent,
    });
    props.push({
      key: "onUpdate:modelValue",
      value: `$event => (${expContent} = $event)`,
    });
  }

  return { props };
};
