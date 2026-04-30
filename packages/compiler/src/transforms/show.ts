// src/transforms/v-show.ts
// v-show 指令转换逻辑

import type { DirectiveTransform } from "../types";
import { getExpContent } from "./helpers";

export const transformShow: DirectiveTransform = (dir, _node, _context) => {
  const { exp } = dir;
  const props: Array<{ key: string; value: string }> = [];

  const expContent = getExpContent(exp);

  if (expContent) {
    props.push({
      key: "style",
      value: expContent + " ? undefined : { display: 'none' }",
    });
  }

  return { props };
};
