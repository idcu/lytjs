// src/transforms/v-model.ts
// v-model 指令转换逻辑

import type { DirectiveTransform } from "../types";
import { getExpContent } from "./helpers";

/**
 * 验证 v-model 表达式是否为合法的简单属性访问表达式
 * 只允许标识符和属性访问（如 foo、foo.bar、foo[0]、items[0]）
 * 空字符串视为有效表达式
 */
function isValidModelExpression(exp: string): boolean {
  if (exp === "") return true;
  return /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[\s*(?:['"][\w$]+['"]|\d+)\s*\])*$/.test(
    exp,
  );
}

export const transformModel: DirectiveTransform = (dir, _node, context) => {
  const { exp } = dir;
  const props: Array<{ key: string; value: string }> = [];

  const expContent = getExpContent(exp);

  if (expContent != null) {
    if (!isValidModelExpression(expContent)) {
      context.error(
        `v-model expression "${expContent}" is not a valid simple expression`,
      );
      return { props: [] };
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
