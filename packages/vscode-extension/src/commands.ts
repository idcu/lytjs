/**
 * Lyt.js 命令注册模块
 * 提供快速创建组件、页面、Store 和切换主题等命令
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================
// 命令注册
// ============================================================

/**
 * 注册所有 Lyt.js 命令
 */
export function registerCommands(context: vscode.ExtensionContext): void {
  // 创建组件命令
  context.subscriptions.push(
    vscode.commands.registerCommand('lytjs.createComponent', async () => {
      await createComponent();
    })
  );

  // 创建页面命令
  context.subscriptions.push(
    vscode.commands.registerCommand('lytjs.createPage', async () => {
      await createPage();
    })
  );

  // 创建 Store 命令
  context.subscriptions.push(
    vscode.commands.registerCommand('lytjs.createStore', async () => {
      await createStore();
    })
  );

  // 切换主题命令
  context.subscriptions.push(
    vscode.commands.registerCommand('lytjs.toggleTheme', async () => {
      await toggleTheme();
    })
  );
}

// ============================================================
// 命令实现
// ============================================================

/**
 * 快速创建组件
 */
async function createComponent(): Promise<void> {
  const componentName = await vscode.window.showInputBox({
    prompt: '请输入组件名称',
    placeHolder: '例如: MyButton',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return '组件名称不能为空';
      }
      if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
        return '组件名称必须以大写字母开头，只能包含字母和数字 (PascalCase)';
      }
      return undefined;
    },
  });

  if (!componentName) {
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('没有打开的工作区');
    return;
  }

  // 让用户选择目标目录
  const targetUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: workspaceFolders[0].uri,
    openLabel: '选择组件创建目录',
    title: '选择组件创建目录',
  });

  if (!targetUri || targetUri.length === 0) {
    return;
  }

  const targetDir = targetUri[0].fsPath;
  const fileName = `${componentName}.lyt`;
  const filePath = path.join(targetDir, fileName);

  // 检查文件是否已存在
  if (fs.existsSync(filePath)) {
    const overwrite = await vscode.window.showWarningMessage(
      `文件 ${fileName} 已存在，是否覆盖？`,
      { modal: true },
      '覆盖'
    );
    if (overwrite !== '覆盖') {
      return;
    }
  }

  // 生成组件内容
  const componentContent = generateComponentContent(componentName);

  // 写入文件
  fs.writeFileSync(filePath, componentContent, 'utf-8');

  // 打开新创建的文件
  const document = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(document);

  vscode.window.showInformationMessage(`组件 ${componentName} 创建成功！`);
}

/**
 * 快速创建页面
 */
async function createPage(): Promise<void> {
  const pageName = await vscode.window.showInputBox({
    prompt: '请输入页面名称',
    placeHolder: '例如: home, user-profile',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return '页面名称不能为空';
      }
      if (!/^[a-z][a-zA-Z0-9-]*$/.test(value)) {
        return '页面名称必须以小写字母开头，只能包含小写字母、数字和连字符 (kebab-case)';
      }
      return undefined;
    },
  });

  if (!pageName) {
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('没有打开的工作区');
    return;
  }

  // 默认在 src/pages 目录下创建
  const defaultPagesDir = path.join(workspaceFolders[0].uri.fsPath, 'src', 'pages');

  // 让用户选择目标目录
  const targetUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: vscode.Uri.file(
      fs.existsSync(defaultPagesDir) ? defaultPagesDir : workspaceFolders[0].uri.fsPath
    ),
    openLabel: '选择页面创建目录',
    title: '选择页面创建目录',
  });

  if (!targetUri || targetUri.length === 0) {
    return;
  }

  const targetDir = targetUri[0].fsPath;
  const fileName = `${pageName}.lyt`;
  const filePath = path.join(targetDir, fileName);

  // 检查文件是否已存在
  if (fs.existsSync(filePath)) {
    const overwrite = await vscode.window.showWarningMessage(
      `文件 ${fileName} 已存在，是否覆盖？`,
      { modal: true },
      '覆盖'
    );
    if (overwrite !== '覆盖') {
      return;
    }
  }

  // 生成页面内容
  const pageContent = generatePageContent(pageName);

  // 写入文件
  fs.writeFileSync(filePath, pageContent, 'utf-8');

  // 打开新创建的文件
  const document = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(document);

  vscode.window.showInformationMessage(`页面 ${pageName} 创建成功！`);
}

/**
 * 快速创建 Store
 */
async function createStore(): Promise<void> {
  const storeName = await vscode.window.showInputBox({
    prompt: '请输入 Store 名称',
    placeHolder: '例如: counter, user',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Store 名称不能为空';
      }
      if (!/^[a-z][a-zA-Z0-9]*$/.test(value)) {
        return 'Store 名称必须以小写字母开头，只能包含字母和数字 (camelCase)';
      }
      return undefined;
    },
  });

  if (!storeName) {
    return;
  }

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('没有打开的工作区');
    return;
  }

  // 默认在 src/stores 目录下创建
  const defaultStoresDir = path.join(workspaceFolders[0].uri.fsPath, 'src', 'stores');

  // 让用户选择目标目录
  const targetUri = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    defaultUri: vscode.Uri.file(
      fs.existsSync(defaultStoresDir) ? defaultStoresDir : workspaceFolders[0].uri.fsPath
    ),
    openLabel: '选择 Store 创建目录',
    title: '选择 Store 创建目录',
  });

  if (!targetUri || targetUri.length === 0) {
    return;
  }

  const targetDir = targetUri[0].fsPath;
  const fileName = `${storeName}.ts`;
  const filePath = path.join(targetDir, fileName);

  // 检查文件是否已存在
  if (fs.existsSync(filePath)) {
    const overwrite = await vscode.window.showWarningMessage(
      `文件 ${fileName} 已存在，是否覆盖？`,
      { modal: true },
      '覆盖'
    );
    if (overwrite !== '覆盖') {
      return;
    }
  }

  // 生成 Store 内容
  const storeContent = generateStoreContent(storeName);

  // 写入文件
  fs.writeFileSync(filePath, storeContent, 'utf-8');

  // 打开新创建的文件
  const document = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(document);

  vscode.window.showInformationMessage(`Store ${storeName} 创建成功！`);
}

/**
 * 切换 VSCode 颜色主题
 */
async function toggleTheme(): Promise<void> {
  const currentTheme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme');
  const extensions = vscode.extensions.all.filter(
    (ext) => ext.packageJSON?.contributes?.themes?.length > 0
  );

  const themes: Array<{ label: string; id: string }> = [];

  for (const ext of extensions) {
    const extThemes = ext.packageJSON.contributes.themes;
    for (const theme of extThemes) {
      themes.push({
        label: theme.label || theme.id,
        id: theme.id,
      });
    }
  }

  if (themes.length === 0) {
    vscode.window.showInformationMessage('没有可用的主题');
    return;
  }

  // 快速选择：在亮色和暗色之间切换
  const isDark = currentTheme?.toLowerCase().includes('dark') ?? true;
  const preferredThemes = themes.filter((t) =>
    isDark ? !t.label.toLowerCase().includes('dark') : t.label.toLowerCase().includes('dark')
  );

  if (preferredThemes.length > 0) {
    const targetTheme = preferredThemes[0];
    await vscode.workspace.getConfiguration('workbench').update(
      'colorTheme',
      targetTheme.id,
      vscode.ConfigurationTarget.Global
    );
    vscode.window.showInformationMessage(`已切换到主题: ${targetTheme.label}`);
  } else {
    // 如果没有找到对应主题，显示选择列表
    const selected = await vscode.window.showQuickPick(
      themes.map((t) => ({
        label: t.label,
        description: t.id === currentTheme ? '$(check) 当前' : '',
        id: t.id,
      })),
      {
        placeHolder: '选择一个主题',
        title: '切换颜色主题',
      }
    );

    if (selected) {
      await vscode.workspace.getConfiguration('workbench').update(
        'colorTheme',
        selected.id,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(`已切换到主题: ${selected.label}`);
    }
  }
}

// ============================================================
// 模板生成
// ============================================================

/**
 * 生成组件模板内容
 */
function generateComponentContent(componentName: string): string {
  const tagName = componentName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');

  return `<template>
  <div class="${tagName}">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'lytjs';

// Props
const props = withDefaults(defineProps<{
  /** 组件标题 */
  title?: string;
}>(), {
  title: '',
});

// Emits
const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void;
  (e: 'update:modelValue', value: string): void;
}>();

// Reactive state
const isActive = ref(false);

// Computed
const displayTitle = computed(() => props.title || '${componentName}');

// Methods
function handleClick(event: MouseEvent) {
  isActive.value = !isActive.value;
  emit('click', event);
}

// Lifecycle
onMounted(() => {
  console.log('${componentName} mounted');
});
</script>

<style scoped>
.${tagName} {
  display: block;
}
</style>
`;
}

/**
 * 生成页面模板内容
 */
function generatePageContent(pageName: string): string {
  const title = pageName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return `<template>
  <div class="page-${pageName}">
    <h1>${title}</h1>
    <p>${title} page content</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'lytjs';
import { useRouter, useRoute } from 'lytjs/router';

const router = useRouter();
const route = useRoute();

// Page state
const loading = ref(false);
const error = ref<string | null>(null);

// Lifecycle
onMounted(async () => {
  await fetchPageData();
});

// Methods
async function fetchPageData() {
  loading.value = true;
  error.value = null;
  try {
    // Fetch data here
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    loading.value = false;
  }
}

function navigateTo(path: string) {
  router.push(path);
}
</script>

<style scoped>
.page-${pageName} {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-${pageName} h1 {
  font-size: 24px;
  margin-bottom: 16px;
}
</style>
`;
}

/**
 * 生成 Store 模板内容
 */
function generateStoreContent(storeName: string): string {
  const capitalizedStoreName =
    storeName.charAt(0).toUpperCase() + storeName.slice(1);

  return `import { ref, computed } from 'lytjs';
import { defineStore } from 'lytjs/store';

/**
 * ${capitalizedStoreName} Store
 */
export const use${capitalizedStoreName}Store = defineStore('${storeName}', () => {
  // ============================
  // State
  // ============================
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ============================
  // Getters
  // ============================
  const isLoading = computed(() => loading.value);
  const hasError = computed(() => error.value !== null);

  // ============================
  // Actions
  // ============================
  async function fetch${capitalizedStoreName}() {
    loading.value = true;
    error.value = null;
    try {
      // TODO: Implement fetch logic
      const response = await fetch('/api/${storeName}');
      const data = await response.json();
      return data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    loading.value = false;
    error.value = null;
  }

  return {
    // State
    loading,
    error,
    // Getters
    isLoading,
    hasError,
    // Actions
    fetch${capitalizedStoreName},
    reset,
  };
});
`;
}
