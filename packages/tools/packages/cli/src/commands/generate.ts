/**
 * @lytjs/cli - 代码生成器命令
 *
 * 提供组件、页面、服务等代码生成功能
 */

import { logger } from '../utils/logger';
import { ensureDir, writeFile } from '../utils/fs';
import * as path from 'path';

export interface GenerateOptions {
  type: 'component' | 'page' | 'service' | 'hook' | 'store';
  name: string;
  path?: string;
  withStyles?: boolean;
  withTest?: boolean;
  withStorybook?: boolean;
  description?: string;
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
  component: (data: TemplateData, withStyles: boolean, withTest: boolean) => {
    const styleImport = withStyles ? `\nimport './${data.kebabName}.styles.css';` : '';
    const testImport = withTest ? `\nimport { describe, it, expect } from 'vitest';\nimport { render } from '@testing-library/preact';\nimport { ${data.pascalName} } from './${data.kebabName}';\n\ndescribe('${data.pascalName}', () => {\n  it('should render', () => {\n    const { container } = render(<${data.pascalName} />);\n    expect(container).toBeDefined();\n  });\n});` : '';

    return `/**
 * ${data.pascalName} 组件
 *
 * @description ${data.description}
 * @created ${data.date}
 */

import { h, defineComponent } from '@lytjs/core';${styleImport}

export interface ${data.pascalName}Props {
  className?: string;
  children?: any;
}

export function ${data.pascalName}(props: ${data.pascalName}Props) {
  const { className = '', children } = props;

  return (
    <div className={\`${data.kebabName} \${className}\`}>
      {children || '${data.pascalName} Component'}
    </div>
  );
}

export default ${data.pascalName};${testImport}
`;
  },

  page: (data: TemplateData, withStyles: boolean, withTest: boolean) => {
    const styleImport = withStyles ? `\nimport './${data.kebabName}.styles.css';` : '';
    const testImport = withTest ? `\nimport { describe, it, expect } from 'vitest';\nimport { render } from '@testing-library/preact';\nimport { ${data.pascalName}Page } from './${data.kebabName}';\n\ndescribe('${data.pascalName}Page', () => {\n  it('should render', () => {\n    const { container } = render(<${data.pascalName}Page />);\n    expect(container).toBeDefined();\n  });\n});` : '';

    return `/**
 * ${data.pascalName} 页面
 *
 * @description ${data.description}
 * @created ${data.date}
 */

import { h, useState } from '@lytjs/core';
${styleImport}

export interface ${data.pascalName}PageProps {
  title?: string;
}

export function ${data.pascalName}Page(props: ${data.pascalName}PageProps) {
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

  service: (data: TemplateData) => {
    return `/**
 * ${data.pascalName} 服务
 *
 * @description ${data.description}
 * @created ${data.date}
 */

export interface ${data.pascalName}ServiceOptions {
  baseUrl?: string;
  timeout?: number;
}

export class ${data.pascalName}Service {
  private baseUrl: string;
  private timeout: number;

  constructor(options: ${data.pascalName}ServiceOptions = {}) {
    this.baseUrl = options.baseUrl || '/api';
    this.timeout = options.timeout || 30000;
  }

  async getAll(): Promise<any[]> {
    const response = await fetch(\`\${this.baseUrl}/${data.kebabName}s\`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.json();
  }

  async getById(id: string): Promise<any> {
    const response = await fetch(\`\${this.baseUrl}/${data.kebabName}s/\${id}\`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.json();
  }

  async create(data: any): Promise<any> {
    const response = await fetch(\`\${this.baseUrl}/${data.kebabName}s\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.json();
  }

  async update(id: string, data: any): Promise<any> {
    const response = await fetch(\`\${this.baseUrl}/${data.kebabName}s/\${id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.timeout),
    });
    return response.json();
  }

  async delete(id: string): Promise<void> {
    await fetch(\`\${this.baseUrl}/${data.kebabName}s/\${id}\`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(this.timeout),
    });
  }
}

export default ${data.pascalName}Service;
`;
  },

  hook: (data: TemplateData) => {
    return `/**
 * ${data.pascalName} Hook
 *
 * @description ${data.description}
 * @created ${data.date}
 */

import { signal, effect } from '@lytjs/reactivity';

export interface ${data.pascalName}Options {
  immediate?: boolean;
}

export interface ${data.pascalName}Return {
  data: ReturnType<typeof signal>;
  loading: ReturnType<typeof signal>;
  error: ReturnType<typeof signal>;
  execute: () => Promise<void>;
  reset: () => void;
}

export function use${data.pascalName}(options: ${data.pascalName}Options = {}): ${data.pascalName}Return {
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

  store: (data: TemplateData) => {
    return `/**
 * ${data.pascalName} Store
 *
 * @description ${data.description}
 * @created ${data.date}
 */

import { signal, computed } from '@lytjs/reactivity';

export interface ${data.pascalName}State {
  items: any[];
  selectedId: string | null;
  loading: boolean;
  error: Error | null;
}

export function create${data.pascalName}Store() {
  const state = signal<${data.pascalName}State>({
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

  function setItems(items: any[]) {
    state.value = { ...state.value, items };
  }

  function selectItem(id: string | null) {
    state.value = { ...state.value, selectedId: id };
  }

  function addItem(item: any) {
    state.value = {
      ...state.value,
      items: [...state.value.items, item],
    };
  }

  function updateItem(id: string, updates: Partial<any>) {
    state.value = {
      ...state.value,
      items: state.value.items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    };
  }

  function removeItem(id: string) {
    state.value = {
      ...state.value,
      items: state.value.items.filter(item => item.id !== id),
      selectedId: state.value.selectedId === id ? null : state.value.selectedId,
    };
  }

  function setLoading(loading: boolean) {
    state.value = { ...state.value, loading };
  }

  function setError(error: Error | null) {
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

export type ${data.pascalName}Store = ReturnType<typeof create${data.pascalName}Store>;
export default create${data.pascalName}Store;
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
  const { type, name, path: basePath = './src', withStyles = false, withTest = false, description = '' } = options;

  const templateData: TemplateData = {
    name,
    pascalName: toPascalCase(name),
    kebabName: toKebabCase(name),
    camelName: toCamelCase(name),
    date: new Date().toISOString().split('T')[0] as string,
    description: description || `${toPascalCase(name)} ${type}`,
  };

  const targetDir = path.join(
    process.cwd(),
    basePath,
    type === 'page' ? 'pages' : type === 'service' ? 'services' : type === 'hook' ? 'hooks' : type === 'store' ? 'stores' : 'components'
  );
  await ensureDir(targetDir);

  const template = TEMPLATES[type];
  if (!template) {
    logger.error(`Unknown type: ${type}`);
    logger.info('Available types: component, page, service, hook, store');
    process.exit(1);
  }

  const filename = `${templateData.kebabName}${type === 'page' ? '.page' : ''}.ts`;
  const filePath = path.join(targetDir, filename);
  const content = template(templateData, withStyles, withTest);

  await writeFile(filePath, content);
  logger.success(`Generated ${type}: ${filePath}`);

  if (withStyles) {
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

  if (withTest) {
    logger.info('Test file included in generated component');
  }

  logger.info(`\nNext steps:`);
  logger.info(`  cd ${targetDir}`);
  logger.info(`  Import your ${type}: import { ${templateData.pascalName} } from './${templateData.kebabName}'`);
}

export default generate;
