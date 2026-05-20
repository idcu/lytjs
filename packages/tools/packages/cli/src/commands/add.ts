/**
 * @lytjs/cli - add command
 *
 * Generate components, pages, and stores.
 */

import type { AddOptions } from '../types';
import { logger } from '../utils/logger';
import { ensureDir, writeFile, exists } from '../utils/fs';
import { join, resolve } from 'path';

type AddType =
  | 'component'
  | 'page'
  | 'store'
  | 'directive'
  | 'composable'
  | 'util'
  | 'middleware'
  | 'hook';

const TEMPLATES: Record<
  AddType,
  (name: string, path: string) => { filePath: string; content: string }[]
> = {
  component(name, basePath) {
    const filePath = join(basePath, `${name}.lyt`);
    return [
      {
        filePath,
        content: `<template>
  <div class="${name}">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** Component props */
}>();

defineEmits<{
  /** Component events */
}>();
</script>

<style scoped>
.${name} {
  /* styles */
}
</style>
`,
      },
    ];
  },

  page(name, basePath) {
    const pascalName = toPascalCase(name);
    const filePath = join(basePath, `${name}.lyt`);
    return [
      {
        filePath,
        content: `<template>
  <div class="page-${name}">
    <h1>${pascalName}</h1>
  </div>
</template>

<script setup lang="ts">
// Page logic here
</script>

<style scoped>
.page-${name} {
  padding: 1rem;
}
</style>
`,
      },
    ];
  },

  store(name, basePath) {
    const filePath = join(basePath, `${name}.ts`);
    return [
      {
        filePath,
        content: `import { defineStore } from '@lytjs/store';
import { signal, computed } from '@lytjs/reactivity';

export const use${toPascalCase(name)}Store = defineStore('${name}', () => {
  // State
  const count = signal(0);

  // Getters
  const doubleCount = computed(() => count.value * 2);

  // Actions
  function increment() {
    count.value++;
  }

  function decrement() {
    count.value--;
  }

  function reset() {
    count.value = 0;
  }

  return {
    count,
    doubleCount,
    increment,
    decrement,
    reset,
  };
});
`,
      },
    ];
  },

  directive(name, basePath) {
    const filePath = join(basePath, `${name}.ts`);
    const camelCaseName = toCamelCase(name);
    return [
      {
        filePath,
        content: `import type { Directive } from '@lytjs/core';

/**
 * ${toPascalCase(name)} Directive
 *
 * @example
 * \`\`\`vue
 * <div v-${camelCaseName} />
 * \`\`\`
 */
export const v${toPascalCase(name)}: Directive = {
  mounted(el, binding) {
    // Directive mounted
  },

  updated(el, binding) {
    // Directive updated
  },

  unmounted(el) {
    // Directive unmounted
  },
};
`,
      },
    ];
  },

  composable(name, basePath) {
    const filePath = join(basePath, `use${toPascalCase(name)}.ts`);
    return [
      {
        filePath,
        content: `import { signal, computed } from '@lytjs/reactivity';

/**
 * ${toPascalCase(name)} Composable
 *
 * @example
 * \`\`\`typescript
 * const { state, actions } = use${toPascalCase(name)}();
 * \`\`\`
 */
export function use${toPascalCase(name)}() {
  // State
  const isLoading = signal(false);
  const error = signal<Error | null>(null);
  const data = signal<any>(null);

  // Computed
  const hasData = computed(() => data.value !== null);

  // Actions
  async function fetch() {
    isLoading.value = true;
    error.value = null;
    try {
      // TODO: Fetch logic here
      // data.value = await someApi();
    } catch (e) {
      error.value = e as Error;
    } finally {
      isLoading.value = false;
    }
  }

  function reset() {
    isLoading.value = false;
    error.value = null;
    data.value = null;
  }

  return {
    isLoading,
    error,
    data,
    hasData,
    fetch,
    reset,
  };
}
`,
      },
    ];
  },

  hook(name, basePath) {
    const filePath = join(basePath, `use${toPascalCase(name)}.ts`);
    return [
      {
        filePath,
        content: `import { signal, onMounted, onUnmounted } from '@lytjs/core';

/**
 * ${toPascalCase(name)} Hook
 */
export function use${toPascalCase(name)}() {
  const state = signal(null);

  onMounted(() => {
    // Setup code on mount
  });

  onUnmounted(() => {
    // Cleanup on unmount
  });

  return {
    state,
  };
}
`,
      },
    ];
  },

  util(name, basePath) {
    const filePath = join(basePath, `${name}.ts`);
    return [
      {
        filePath,
        content: `/**
 * ${toPascalCase(name)} Utility Functions
 */

/**
 * ${toPascalCase(name)} function
 *
 * @param input - The input value
 * @returns The processed result
 */
export function ${toCamelCase(name)}(input: any) {
  // TODO: Implement function
  return input;
}
`,
      },
    ];
  },

  middleware(name, basePath) {
    const filePath = join(basePath, `${name}.ts`);
    return [
      {
        filePath,
        content: `import type { NavigationGuard } from '@lytjs/router';

/**
 * ${toPascalCase(name)} Middleware
 */
export const ${toCamelCase(name)}Middleware: NavigationGuard = (to, from, next) => {
  // Middleware logic
  console.log('Middleware:', to.path);
  next();
};
`,
      },
    ];
  },
};

/**
 * Convert kebab-case or snake_case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Convert string to camelCase
 */
function toCamelCase(str: string): string {
  const pascalCase = toPascalCase(str);
  return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
}

/**
 * Resolve the target directory for the add command
 */
function resolveTargetDir(type: AddType): string {
  const cwd = process.cwd();
  switch (type) {
    case 'component':
      return join(cwd, 'src', 'components');
    case 'page':
      return join(cwd, 'src', 'pages');
    case 'store':
      return join(cwd, 'src', 'stores');
    case 'directive':
      return join(cwd, 'src', 'directives');
    case 'composable':
      return join(cwd, 'src', 'composables');
    case 'util':
      return join(cwd, 'src', 'utils');
    case 'middleware':
      return join(cwd, 'src', 'middleware');
    case 'hook':
      return join(cwd, 'src', 'hooks');
  }
}

/**
 * Add a component, page, or store
 */
export async function add(type: AddType, name: string, options: AddOptions = {}): Promise<void> {
  const targetDir = resolveTargetDir(type);
  const fullPath = resolve(targetDir);

  if (!exists(join(process.cwd(), 'package.json'))) {
    logger.error('No package.json found. Are you in a LytJS project directory?');
    process.exit(1);
  }

  const template = TEMPLATES[type];
  if (!template) {
    logger.error(`Unknown type: ${type}. Supported types: component, page, store`);
    process.exit(1);
  }

  const files = template(name, fullPath);

  for (const file of files) {
    if (exists(file.filePath) && !options.force) {
      logger.warning(`File already exists: ${file.filePath}`);
      logger.info('Use --force to overwrite.');
      continue;
    }

    ensureDir(resolve(file.filePath, '..'));
    writeFile(file.filePath, file.content);
    logger.success(`Created ${type}: ${file.filePath}`);
  }
}
