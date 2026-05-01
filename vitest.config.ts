import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const commonRoot = resolve("/workspace/lytjs/packages/common/packages");

export default defineConfig({
  resolve: {
    alias: {
      "@lytjs/common-is": resolve(commonRoot, "is/dist/index.mjs"),
      "@lytjs/common-scheduler": resolve(
        commonRoot,
        "scheduler/dist/index.mjs",
      ),
      "@lytjs/common-error": resolve(commonRoot, "error/dist/index.mjs"),
      "@lytjs/common-vnode": resolve(commonRoot, "vnode/dist/index.mjs"),
      "@lytjs/common-string": resolve(commonRoot, "string/dist/index.mjs"),
      "@lytjs/common-events": resolve(commonRoot, "events/dist/index.mjs"),
      "@lytjs/common-object": resolve(commonRoot, "object/dist/index.mjs"),
      "@lytjs/common-algorithm": resolve(
        commonRoot,
        "algorithm/dist/index.mjs",
      ),
      "@lytjs/common-timing": resolve(commonRoot, "timing/dist/index.mjs"),
      "@lytjs/common-cache": resolve(commonRoot, "cache/dist/index.mjs"),
      "@lytjs/common-env": resolve(commonRoot, "env/dist/index.mjs"),
      "@lytjs/shared-types": resolve(
        "/workspace/lytjs/packages/shared-types/src",
      ),
      "@lytjs/vdom": resolve("/workspace/lytjs/packages/vdom/dist/index.mjs"),
      "@lytjs/core": resolve("/workspace/lytjs/packages/core/dist/index.mjs"),
      "@lytjs/reactivity": resolve(
        "/workspace/lytjs/packages/reactivity/dist/index.mjs",
      ),
      "@lytjs/renderer": resolve(
        "/workspace/lytjs/packages/renderer/dist/index.mjs",
      ),
      "@lytjs/component": resolve(
        "/workspace/lytjs/packages/component/dist/index.mjs",
      ),
      "@lytjs/compiler": resolve(
        "/workspace/lytjs/packages/compiler/dist/index.mjs",
      ),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./packages/reactivity/tests/setup.ts"],
  },
});
