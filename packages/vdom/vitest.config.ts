import { defineConfig } from "vitest/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, "../common/packages");

export default defineConfig({
  resolve: {
    alias: {
      "@lytjs/common-is": `${commonRoot}/is/dist/index.mjs`,
      "@lytjs/common-vnode": `${commonRoot}/vnode/dist/index.mjs`,
      "@lytjs/common-string": `${commonRoot}/string/dist/index.mjs`,
      "@lytjs/common-events": `${commonRoot}/events/dist/index.mjs`,
      "@lytjs/common-error": `${commonRoot}/error/dist/index.mjs`,
      "@lytjs/common-algorithm": `${commonRoot}/algorithm/dist/index.mjs`,
      "@lytjs/shared-types": resolve(
        __dirname,
        "../shared-types/dist/index.mjs",
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
