/**
 * @lytjs/cli - 代码生成器命令
 *
 * 提供组件、页面、服务等代码生成功能
 */

import { logger } from '../utils/logger';
import { ensureDir, writeFile } from '../utils/fs';
import * as path from 'path';

export interface GenerateOptions {
  type: 'component' | 'page' | 'service' | 'hook' | 'store' | 'layout' | 'middleware';
  name: string;
  path?: string;
  withStyles?: boolean;
  withTest?: boolean;
  withStorybook?: boolean;
  description?: string;
  template?: 'default' | 'sfc' | 'functional';
  language?: 'ts' | 'js';
}

interface TemplateData {
  name: string;
  pascalName: string;
  kebabName: string;
  camelName: string;
  date: string;
  description: string;
}

const TEMPLATES = {
  component: (data: TemplateData, withStyles: boolean, withTest: boolean, template: string, lang: string) => {
    const styleImport = withStyles ? `\nimport './${data.kebabName}.styles.css';` : '';
    const tsOnly = lang === 'ts';
    
    if (template === 'sfc') {
      return `<template>
  <div class="${data.kebabName}">
    <slot>
      ${data.pascalName} Component
    </slot>
  </div>
</template>

<script setup${tsOnly ? ' lang="ts"' : ''}>
${tsOnly ? `import { ref } from '@lytjs/reactivity';\n` : ''}
${tsOnly ? `
export interface ${data.pascalName}Props {
  className?: string;
}

const props = defineProps<${data.pascalName}Props>();
` : ''}

const title = ref('${data.pascalName}');
</script>

<style scoped>
.${data.kebabName} {
  /* Component styles */
}
</style>
`;
    }
    
    const testImport = withTest ? `\nimport { describe, it, expect } from 'vitest';\nimport { ${data.pascalName} } from './${data.kebabName}';\n\ndescribe('${data.pascalName}', () => {\n  it('should render', () => {\n    // Add test here\n    expect(true).toBe(true);\n  });\n});` : '';

    const propsDecl = tsOnly ? `['className', 'children']` : `[]`;
    
    return `/**
 * ${data.pascalName} 组件
 *
 * @description ${data.description}
 * @created ${data.date}
 */

import { h, defineComponent } from '@lytjs/core';${styleImport}

${tsOnly ? `export interface ${data.pascalName}Props {
  className?: string;
  children?: any;
}

` : ''}${template === 'functional' ? `export function ${data.pascalName}(${tsOnly ? `props: ${data.pascalName}Props` : 'props'}) {
  const { className = '', children } = props;

  return (
    <div className={\`${data.kebabName} \${className}\`}>
      {children || '${data.pascalName} Component'}
    </div>
  );
}` : `export const ${data.pascalName} = defineComponent({
  name: '${data.pascalName}',
  props: ${propsDecl},
  setup(props) {
    const { className = '', children } = props;

    return () => (
      <div className={\`${data.kebabName} \${className}\`}>
        {children || '${data.pascalName} Component'}
      </div>
    );
  },
});`}

export default ${data.pascalName};${testImport}
`;
  },

  page: (data: TemplateData, withStyles: boolean, withTest: boolean, template: string, lang: string) => {
    const styleImport = withStyles ? `\nimport './${data.kebabName}.styles.css';` : '';
    const tsOnly = lang === 'ts';

    if (template === 'sfc') {
      return `<template>
  <div class="${data.kebabName}-page">
    <h1>{title}</h1>
    <p>Page content for ${data.pascalName}</p>
    <slot />
  </div>
</template>

<script setup${tsOnly ? ' lang="ts"' : ''}>
${tsOnly ? `import { ref } from '@lytjs/reactivity';\n` : ''}
${tsOnly ? `
export interface ${data.pascalName}PageProps {
  title?: string;
}

const props = defineProps<${data.pascalName}PageProps>();
` : ''}

const title = ref(props.title || '${data.pascalName}');
</script>

<style scoped>
.${data.kebabName}-page {
  padding: 2rem;
}
</style>
`;
    }

    const testImport = withTest ? `\nimport { describe, it, expect } from 'vitest';\nimport { ${data.pascalName}Page } from './${data.kebabName}';\n\ndescribe('${data.pascalName}Page', () => {\n  it('should render', () => {\n    // Add test here\n    expect(true).toBe(true);\n  });\n});` : '';

    return `/**
 * ${data.pascalName} 页面
 *
 * @description ${data.description}
 * @created ${data.date}
 */

import { h, ${tsOnly ? 'signal' : 'signal'} } from '@lytjs/core';
${styleImport}

${tsOnly ? `export interface ${data.pascalName}PageProps {
  title?: string;
}

` : ''}export function ${data.pascalName}Page(${tsOnly ? `props: ${data.pascalName}PageProps` : 'props'}) {
  const { title = '${data.pascalName}' } = props;

  return (
    <div className="${data.kebabName}-page">
      <h1>{title}</h1>
      <p>Page content for ${data.pascalName}</p>
    </div>
  );
}

export default ${data.pascalName}Page;${testImport}
`;
  },

  service: (data: TemplateData, withStyles: boolean, withTest: boolean, template: string, lang: string) => {
    const tsOnly = lang === 'ts';

    return `/**
 * ${data.pascalName} 服务
 *
 * @description ${data.description}
 * @created ${data.date}
 */

${tsOnly ? `export interface ${data.pascalName}ServiceOptions {
  baseUrl?: string;
  timeout?: number;
}

` : ''}${tsOnly ? `export class ${data.pascalName}Service {
  private baseUrl: string;
  private timeout: number;
` : `export class ${data.pascalName}Service {
`}
  constructor(${tsOnly ? `options: ${data.pascalName}ServiceOptions = {}` : 'options = {}'}) {
    this.baseUrl = options.baseUrl || '/api';
    this.timeout = options.timeout || 30000;
  }

  async getAll()${tsOnly ? ': Promise<any[]>' : ''} {
    const response = await fetch(\`\${this.baseUrl}/${data.kebabName}s\`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.json();
  }

  async getById(id)${tsOnly ? ': Promise<any>' : ''} {
    const response = await fetch(\`\${this.baseUrl}/${data.kebabName}s/\${id}\`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.json();
  }

  async create(${tsOnly ? 'data: any' : 'data'})${tsOnly ? ': Promise<any>' : ''} {
    const response = await fetch(\`\${this.baseUrl}/${data.kebabName}s\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.json();
  }

  async update(id)${tsOnly ? ': Promise<any>' : ''} {
    const response = await fetch(\`\${this.baseUrl}/${data.kebabName}s/\${id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.json();
  }

  async delete(id)${tsOnly ? ': Promise<void>' : ''} {
    await fetch(\`\${this.baseUrl}/${data.kebabName}s/\${id}\`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(this.timeout),
    });
  }
}

export default ${data.pascalName}Service;
`;
  },

  hook: (data: TemplateData, withStyles: boolean, withTest: boolean, template: string, lang: string) => {
    const tsOnly = lang === 'ts';

    return `/**
 * ${data.pascalName} Hook
 *
 * @description ${data.description}
 * @created ${data.date}
 */

import { signal, effect } from '@lytjs/reactivity';

${tsOnly ? `export interface ${data.pascalName}Options {
  immediate?: boolean;
}

export interface ${data.pascalName}Return {
  data: ReturnType<typeof signal>;
  loading: ReturnType<typeof signal>;
  error: ReturnType<typeof signal>;
  execute: () => Promise<void>;
  reset: () => void;
}

` : ''}export function use${data.pascalName}(${tsOnly ? `options: ${data.pascalName}Options = {}` : 'options = {}'})${tsOnly ? `: ${data.pascalName}Return` : ''} {
  const { immediate = false } = options;

  const data = signal<any>(null);
  const loading = signal(false);
  const error = signal<Error | null>(null);

  async function execute() {
    loading.value = true;
    error.value = null;

    try {
      const result = await new Promise(resolve => setTimeout(() => resolve(null), 100));
      data.value = result;
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    data.value = null;
    loading.value = false;
    error.value = null;
  }

  if (immediate) {
    execute();
  }

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

export default use${data.pascalName};
`;
  },

  store: (data: TemplateData, withStyles: boolean, withTest: boolean, template: string, lang: string) => {
    const tsOnly = lang === 'ts';

    return `/**
 * ${data.pascalName} Store
 *
 * @description ${data.description}
 * @created ${data.date}
 */

import { signal, computed } from '@lytjs/reactivity';

${tsOnly ? `export interface ${data.pascalName}State {
  items: any[];
  selectedId: string | null;
  loading: boolean;
  error: Error | null;
}

` : ''}export function create${data.pascalName}Store() {
  const state = signal${tsOnly ? `<${data.pascalName}State>` : ''}({
    items: [],
    selectedId: null,
    loading: false,
    error: null,
  });

  const selectedItem = computed(() => {
    const currentState = state.value;
    return currentState.items.find(item => item.id === currentState.selectedId);
  });

  const itemCount = computed(() => state.value.items.length);

  function setItems(items) {
    state.value = { ...state.value, items };
  }

  function selectItem(id) {
    state.value = { ...state.value, selectedId: id };
  }

  function addItem(item) {
    state.value = {
      ...state.value,
      items: [...state.value.items, item],
    };
  }

  function updateItem(id, updates) {
    state.value = {
      ...state.value,
      items: state.value.items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    };
  }

  function removeItem(id) {
    state.value = {
      ...state.value,
      items: state.value.items.filter(item => item.id !== id),
      selectedId: state.value.selectedId === id ? null : state.value.selectedId,
    };
  }

  function setLoading(loading) {
    state.value = { ...state.value, loading };
  }

  function setError(error) {
    state.value = { ...state.value, error };
  }

  function reset() {
    state.value = {
      items: [],
      selectedId: null,
      loading: false,
      error: null,
    };
  }

  return {
    state,
    selectedItem,
    itemCount,
    setItems,
    selectItem,
    addItem,
    updateItem,
    removeItem,
    setLoading,
    setError,
    reset,
  };
}

${tsOnly ? `export type ${data.pascalName}Store = ReturnType<typeof create${data.pascalName}Store>;\n` : ''}export default create${data.pascalName}Store;
`;
  },

  layout: (data: TemplateData, withStyles: boolean, withTest: boolean, template: string, lang: string) => {
    const tsOnly = lang === 'ts';
    const styleImport = withStyles ? `\nimport './${data.kebabName}.styles.css';` : '';

    return `/**
 * ${data.pascalName} 布局
 *
 * @description ${data.description}
 * @created ${data.date}
 */

import { h, defineComponent } from '@lytjs/core';${styleImport}

${tsOnly ? `export interface ${data.pascalName}LayoutProps {
  children?: any;
}

` : ''}export const ${data.pascalName}Layout = defineComponent({
  name: '${data.pascalName}Layout',
  setup(props) {
    return () => (
      <div className="${data.kebabName}-layout">
        <header className="${data.kebabName}-header">
          <slot name="header">
            <h1>${data.pascalName}</h1>
          </slot>
        </header>
        <main className="${data.kebabName}-main">
          <slot />
        </main>
        <footer className="${data.kebabName}-footer">
          <slot name="footer" />
        </footer>
      </div>
    );
  },
});

export default ${data.pascalName}Layout;
`;
  },

  middleware: (data: TemplateData, withStyles: boolean, withTest: boolean, template: string, lang: string) => {
    const tsOnly = lang === 'ts';

    return `/**
 * ${data.pascalName} 中间件
 *
 * @description ${data.description}
 * @created ${data.date}
 */

${tsOnly ? `import type { Request, Response, NextFunction } from 'express';\n` : ''}
export function ${data.camelName}Middleware(${tsOnly ? `req: Request, res: Response, next: NextFunction` : 'req, res, next'}) {
  try {
    console.log('[${data.pascalName}] Middleware executed');
    next();
  } catch (error) {
    next(error);
  }
}

export default ${data.camelName}Middleware;
`;
  },
};

function toPascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export async function generate(options: GenerateOptions): Promise<void> {
  const {
    type,
    name,
    path: basePath = './src',
    withStyles = false,
    withTest = false,
    description = '',
    template = 'default',
    language = 'ts',
  } = options;

  const templateData: TemplateData = {
    name,
    pascalName: toPascalCase(name),
    kebabName: toKebabCase(name),
    camelName: toCamelCase(name),
    date: new Date().toISOString().split('T')[0] as string,
    description: description || `${toPascalCase(name)} ${type}`,
  };

  const typeDirs: Record<string, string> = {
    component: 'components',
    page: 'pages',
    service: 'services',
    hook: 'hooks',
    store: 'stores',
    layout: 'layouts',
    middleware: 'middleware',
  };

  const targetDir = path.join(
    process.cwd(),
    basePath,
    typeDirs[type] || 'components'
  );
  await ensureDir(targetDir);

  const templateFn = TEMPLATES[type];
  if (!templateFn) {
    logger.error(`Unknown type: ${type}`);
    logger.info('Available types: component, page, service, hook, store, layout, middleware');
    process.exit(1);
  }

  const extension = template === 'sfc' ? 'lyt' : language;
  const filename = `${templateData.kebabName}${type === 'page' ? '.page' : ''}.${extension}`;
  const filePath = path.join(targetDir, filename);
  const content = templateFn(templateData, withStyles, withTest, template, language);

  await writeFile(filePath, content);
  logger.success(`Generated ${type}: ${filePath}`);

  if (withStyles && template !== 'sfc') {
    const styleContent = `/**
 * ${templateData.pascalName} Styles
 */

.${templateData.kebabName} {
  /* Component styles */
}
`;
    const stylePath = path.join(targetDir, `${templateData.kebabName}.styles.css`);
    await writeFile(stylePath, styleContent);
    logger.success(`Generated styles: ${stylePath}`);
  }

  if (withTest && template !== 'sfc') {
    logger.info('Test file included in generated component');
  }

  logger.info('\nNext steps:');
  logger.info(`  cd ${targetDir}`);
  logger.info(`  Import your ${type}: import { ${template === 'sfc' ? 'default' : templateData.pascalName} } from './${templateData.kebabName}'`);

  logger.info('\nAvailable options:');
  logger.info('  --template=sfc : Single File Component (.lyt)');
  logger.info('  --template=functional : Functional component');
  logger.info('  --language=js : JavaScript output');
}

export default generate;
