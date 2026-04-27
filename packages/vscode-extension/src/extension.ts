/**
 * Lyt.js VSCode Extension
 * 提供语法高亮、类型检查、代码补全、调试支持、代码片段和 Emmet 功能
 */

import * as vscode from 'vscode';
import { parseSFC, generateDtsForLytFile } from '@lytjs/compiler';
import { getSnippetCompletions } from './snippets';
import {
  LytDebugConfigurationProvider,
  LytDebugAdapterDescriptorFactory,
} from './debug-provider';
import { registerCommands } from './commands';

// ============================================================
// 激活函数
// ============================================================

export function activate(context: vscode.ExtensionContext) {
  console.log('Lyt.js extension is now active!');

  // 注册欢迎命令
  const welcomeCommand = vscode.commands.registerCommand('lytjs.showWelcome', () => {
    vscode.window.showInformationMessage('Welcome to Lyt.js! 🎉');
  });

  // 注册代码补全提供者
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    { language: 'lyt', scheme: 'file' },
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
      ) {
        return provideLytCompletion(document, position);
      }
    },
    'v-', '@', ':' // 触发字符
  );

  // 注册类型检查
  const typeCheckProvider = vscode.languages.registerCodeActionsProvider(
    { language: 'lyt', scheme: 'file' },
    {
      provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
      ) {
        return provideTypeCheckActions(document, range, context);
      }
    }
  );

  // 监听文档变化进行实时类型检查
  const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.languageId === 'lyt') {
      checkDocumentTypes(event.document);
    }
  });

  // 初始化诊断集合
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('lytjs');

  // --------------------------------------------------------
  // 代码片段补全提供者 (SnippetCompletionItemProvider)
  // --------------------------------------------------------
  const snippetEnabled = () =>
    vscode.workspace.getConfiguration('lytjs.snippets').get<boolean>('enabled') !== false;

  const snippetCompletionProvider = vscode.languages.registerCompletionItemProvider(
    { language: 'lyt', scheme: 'file' },
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
      ) {
        if (!snippetEnabled()) {
          return undefined;
        }
        return getSnippetCompletions();
      }
    }
  );

  // --------------------------------------------------------
  // Emmet 配置提供者
  // --------------------------------------------------------
  const emmetEnabled = () =>
    vscode.workspace.getConfiguration('lytjs.emmet').get<boolean>('enabled') !== false;

  const emmetConfigurationProvider: vscode.EmmetConfigurationProvider = {
    getEmmetMode(document: vscode.TextDocument): string | undefined {
      if (document.languageId === 'lyt' && emmetEnabled()) {
        return 'html';
      }
      return undefined;
    },
  };

  // --------------------------------------------------------
  // 调试支持
  // --------------------------------------------------------
  const debugConfigProvider = new LytDebugConfigurationProvider();
  const debugAdapterFactory = new LytDebugAdapterDescriptorFactory();

  const debugConfigDisposable = vscode.debug.registerDebugConfigurationProvider(
    'lytjs',
    debugConfigProvider
  );

  const debugAdapterDisposable = vscode.debug.registerDebugAdapterDescriptorFactory(
    'lytjs',
    debugAdapterFactory
  );

  // --------------------------------------------------------
  // 命令注册
  // --------------------------------------------------------
  registerCommands(context);

  // 添加到上下文订阅
  context.subscriptions.push(
    welcomeCommand,
    completionProvider,
    typeCheckProvider,
    documentChangeDisposable,
    diagnosticCollection,
    snippetCompletionProvider,
    debugConfigDisposable,
    debugAdapterDisposable
  );

  // 保存诊断集合到全局上下文
  (context as any).diagnosticCollection = diagnosticCollection;
}

export function deactivate() {}

// ============================================================
// 代码补全
// ============================================================

function provideLytCompletion(
  document: vscode.TextDocument,
  position: vscode.Position
): vscode.CompletionItem[] {
  const completions: vscode.CompletionItem[] = [];

  // Lyt.js 内置指令
  const directives = [
    { label: 'v-if', detail: '条件渲染', documentation: '根据表达式条件渲染元素' },
    { label: 'v-else', detail: '条件渲染 - else', documentation: 'v-if 的 else 分支' },
    { label: 'v-else-if', detail: '条件渲染 - else if', documentation: 'v-if 的 else if 分支' },
    { label: 'v-each', detail: '列表渲染', documentation: '遍历数组或对象渲染列表' },
    { label: 'v-bind', detail: '属性绑定', documentation: '动态绑定属性' },
    { label: 'v-model', detail: '双向绑定', documentation: '表单元素双向绑定' },
    { label: 'v-on', detail: '事件监听', documentation: '监听 DOM 事件' },
    { label: 'v-show', detail: '显示切换', documentation: '通过 CSS 控制显示/隐藏' },
  ];

  directives.forEach(({ label, detail, documentation }) => {
    const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Keyword);
    item.detail = detail;
    item.documentation = new vscode.MarkdownString(documentation);
    completions.push(item);
  });

  // Lyt.js 内置组件
  const components = [
    { label: 'Transition', detail: '过渡动画组件' },
    { label: 'TransitionGroup', detail: '列表过渡组件' },
    { label: 'KeepAlive', detail: '缓存组件' },
    { label: 'Suspense', detail: '异步组件加载' },
  ];

  components.forEach(({ label, detail }) => {
    const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Class);
    item.detail = detail;
    completions.push(item);
  });

  return completions;
}

// ============================================================
// 类型检查
// ============================================================

function checkDocumentTypes(document: vscode.TextDocument) {
  // 简单的类型检查示例
  // 实际项目中可以集成 TypeScript 编译器 API
}

function provideTypeCheckActions(
  document: vscode.TextDocument,
  range: vscode.Range,
  context: vscode.CodeActionContext
): vscode.CodeAction[] {
  const actions: vscode.CodeAction[] = [];

  // 生成类型声明文件的快速修复
  const generateTypesAction = new vscode.CodeAction(
    'Generate Type Declarations for .lyt',
    vscode.CodeActionKind.QuickFix
  );
  generateTypesAction.command = {
    command: 'lytjs.generateTypes',
    title: 'Generate Type Declarations',
  };
  actions.push(generateTypesAction);

  return actions;
}
