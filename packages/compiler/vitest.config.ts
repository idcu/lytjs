import { defineConfig } from "vitest/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const commonRoot = resolve(__dirname, "../../common/packages");

export default defineConfig({
  resolve: {
    alias: {
      "@lytjs/common-vnode": `${commonRoot}/vnode/dist/index.mjs`,
      "@lytjs/common-string": `${commonRoot}/string/dist/index.mjs`,
      "@lytjs/common-error": `${commonRoot}/error/dist/index.mjs`,
    },
  },
  test: {
    globals: true,
    environment: "node",
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
