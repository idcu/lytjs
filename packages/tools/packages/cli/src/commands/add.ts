/**
 * @lytjs/cli - add command
 *
 * Generate components, pages, and stores.
 */

import type { CreateOptions } from '../types';
import { logger } from '../utils/logger';
import { ensureDir, writeFile, exists } from '../utils/fs';
import { join, resolve } from 'path';

type AddType = 'component' | 'page' | 'store';

const TEMPLATES: Record<AddType, (name: string, path: string) => { filePath: string; content: string }[]> = {
  component(name, basePath) {
    const filePath = join(basePath, `${name}.lyt`);
    return [{
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
    }];
  },

  page(name, basePath) {
    const filePath = join(basePath, `${name}.lyt`);
    return [{
      filePath,
      content: `<template>
  <div class="page-${name}">
    <h1>${toPascalCase(name)}</h1>
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
    }];
  },

  store(name, basePath) {
    const filePath = join(basePath, `${name}.ts`);
    return [{
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
    }];
  },
};

/**
 * Convert kebab-case or snake_case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
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
  }
}

/**
 * Add a component, page, or store
 */
export async function add(type: AddType, name: string, options: CreateOptions = {}): Promise<void> {
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
