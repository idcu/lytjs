// src/transforms/v-model.ts
// v-model 指令转换逻辑

import type { DirectiveTransform } from "../types";
import { getExpContent } from "./helpers";

export const transformModel: DirectiveTransform = (dir, _node, _context) => {
  const { exp } = dir;
  const props: Array<{ key: string; value: string }> = [];

  const expContent = getExpContent(exp);

  if (expContent) {
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
