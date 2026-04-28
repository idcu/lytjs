/**
 * Lyt.js 调试配置提供者
 * 提供 DebugConfigurationProvider 和 DebugAdapterDescriptorFactory
 */

import * as vscode from 'vscode';

// ============================================================
// 调试配置提供者
// ============================================================

export class LytDebugConfigurationProvider
  implements vscode.DebugConfigurationProvider
{
  /**
   * 解析调试配置，填充默认值
   */
  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    // 如果没有配置，创建默认配置
    if (!config.type && !config.request && !config.name) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        config.type = 'lytjs';
        config.name = 'Launch Lyt.js App';
        config.request = 'launch';
        config.url = this.getDefaultUrl();
        config.webRoot = this.getWebRoot(folder);
      }
    }

    // 填充默认值
    if (!config.type) {
      config.type = 'lytjs';
    }
    if (!config.name) {
      config.name = config.request === 'attach' ? 'Attach to Lyt.js' : 'Launch Lyt.js App';
    }
    if (!config.request) {
      config.request = 'launch';
    }
    if (!config.port) {
      config.port = vscode.workspace.getConfiguration('lytjs.debug').get<number>('port') ?? 5173;
    }
    if (!config.url) {
      config.url = this.getDefaultUrl();
    }
    if (!config.webRoot) {
      config.webRoot = this.getWebRoot(folder);
    }
    if (!config.sourceMaps) {
      config.sourceMaps = true;
    }
    if (!config.sourceMapPathOverrides) {
      config.sourceMapPathOverrides = {
        'webpack:///./src/*': '${webRoot}/src/*',
        'webpack:///src/*': '${webRoot}/src/*',
      };
    }
    if (!config.pathMapping) {
      config.pathMapping = {
        '/': '${webRoot}',
      };
    }
    if (!config.runtimeArgs) {
      config.runtimeArgs = [];
    }
    if (!config.env) {
      config.env = {};
    }

    return config;
  }

  /**
   * 提供调试配置的补全选项
   */
  provideDebugConfigurations(
    folder: vscode.WorkspaceFolder | undefined,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration[]> {
    return [
      {
        type: 'lytjs',
        request: 'launch',
        name: 'Lyt.js: Launch Dev Server',
        url: this.getDefaultUrl(),
        webRoot: this.getWebRoot(folder),
        port: vscode.workspace.getConfiguration('lytjs.debug').get<number>('port') ?? 5173,
        sourceMaps: true,
        sourceMapPathOverrides: {
          'webpack:///./src/*': '${webRoot}/src/*',
          'webpack:///src/*': '${webRoot}/src/*',
        },
      },
      {
        type: 'lytjs',
        request: 'attach',
        name: 'Lyt.js: Attach to Dev Server',
        port: 9229,
        webRoot: this.getWebRoot(folder),
        sourceMaps: true,
        localRoot: this.getWebRoot(folder),
        remoteRoot: '/app',
      },
      {
        type: 'lytjs',
        request: 'launch',
        name: 'Lyt.js: Launch with Chrome',
        url: this.getDefaultUrl(),
        webRoot: this.getWebRoot(folder),
        runtimeExecutable: '${default}',
        runtimeArgs: ['--auto-open-devtools-for-tabs'],
        sourceMaps: true,
      },
    ];
  }

  private getDefaultUrl(): string {
    const configuredUrl = vscode.workspace
      .getConfiguration('lytjs.debug')
      .get<string>('url');
    if (configuredUrl) {
      return configuredUrl;
    }
    const port = vscode.workspace
      .getConfiguration('lytjs.debug')
      .get<number>('port') ?? 5173;
    return `http://localhost:${port}`;
  }

  private getWebRoot(folder: vscode.WorkspaceFolder | undefined): string {
    return folder?.uri.fsPath ?? '${workspaceFolder}';
  }
}

// ============================================================
// 调试适配器描述符工厂
// ============================================================

export class LytDebugAdapterDescriptorFactory
  implements vscode.DebugAdapterDescriptorFactory
{
  /**
   * 创建调试适配器描述符（使用内联调试适配器）
   */
  createDebugAdapterDescriptor(
    session: vscode.DebugSession,
    executable: vscode.DebugAdapterExecutable | undefined
  ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    // 使用内联调试适配器
    return new vscode.DebugAdapterInlineImplementation(
      new LytDebugAdapter(session)
    );
  }
}

// ============================================================
// 内联调试适配器
// ============================================================

/**
 * Lyt.js 内联调试适配器
 * 基于 Debug Adapter Protocol (DAP) 的最小实现
 */
class LytDebugAdapter implements vscode.DebugAdapter {
  private readonly _session: vscode.DebugSession;
  private _onDidSendMessage = new vscode.EventEmitter<vscode.DebugProtocolMessage>();
  private _disposed = false;

  constructor(session: vscode.DebugSession) {
    this._session = session;
  }

  get onDidSendMessage(): vscode.Event<vscode.DebugProtocolMessage> {
    return this._onDidSendMessage.event;
  }

  handleMessage(message: vscode.DebugProtocolMessage): void {
    switch ((message as any).type) {
      case 'request':
        this.handleRequest(message as any);
        break;
      default:
        break;
    }
  }

  private handleRequest(request: any): void {
    switch (request.command) {
      case 'initialize':
        this.handleInitialize(request);
        break;
      case 'launch':
        this.handleLaunch(request);
        break;
      case 'attach':
        this.handleAttach(request);
        break;
      case 'disconnect':
        this.handleDisconnect(request);
        break;
      case 'terminate':
        this.handleTerminate(request);
        break;
      case 'setBreakpoints':
        this.handleSetBreakpoints(request);
        break;
      case 'threads':
        this.handleThreads(request);
        break;
      case 'stackTrace':
        this.handleStackTrace(request);
        break;
      case 'scopes':
        this.handleScopes(request);
        break;
      case 'variables':
        this.handleVariables(request);
        break;
      case 'continue':
        this.handleContinue(request);
        break;
      case 'next':
        this.handleNext(request);
        break;
      case 'stepIn':
        this.handleStepIn(request);
        break;
      case 'stepOut':
        this.handleStepOut(request);
        break;
      case 'evaluate':
        this.handleEvaluate(request);
        break;
      default:
        this.sendResponse(request, {});
        break;
    }
  }

  private handleInitialize(request: any): void {
    this.sendResponse(request, {
      supportsConfigurationDoneRequest: true,
      supportsEvaluateForHovers: true,
      supportsStepBack: false,
      supportsSetVariable: false,
      supportsRestartRequest: true,
      supportsTerminateRequest: true,
    });
  }

  private handleLaunch(request: any): void {
    const args = request.arguments as {
      url?: string;
      port?: number;
      webRoot?: string;
    };

    vscode.window.showInformationMessage(
      `Lyt.js Debug: Launching ${args.url ?? 'http://localhost:5173'}`
    );

    // 发送 initialized 事件
    this.sendEvent({ type: 'event', event: 'initialized' });

    // 发送启动成功响应
    this.sendResponse(request, {});
  }

  private handleAttach(request: any): void {
    const args = request.arguments as {
      port?: number;
      webRoot?: string;
    };

    vscode.window.showInformationMessage(
      `Lyt.js Debug: Attaching to port ${args.port ?? 9229}`
    );

    this.sendEvent({ type: 'event', event: 'initialized' });
    this.sendResponse(request, {});
  }

  private handleDisconnect(request: any): void {
    this.sendResponse(request, {});
    this.dispose();
  }

  private handleTerminate(request: any): void {
    vscode.window.showInformationMessage('Lyt.js Debug: Terminated');
    this.sendResponse(request, {});
    this.dispose();
  }

  private handleSetBreakpoints(request: any): void {
    const args = request.arguments as {
      source: { path: string };
      breakpoints: Array<{ line: number; column?: number; condition?: string }>;
    };

    const breakpoints = (args.breakpoints ?? []).map((bp) => ({
      verified: true,
      line: bp.line,
      column: bp.column ?? 1,
    }));

    this.sendResponse(request, { breakpoints });
  }

  private handleThreads(request: any): void {
    this.sendResponse(request, {
      threads: [{ id: 1, name: 'Main Thread' }],
    });
  }

  private handleStackTrace(request: any): void {
    this.sendResponse(request, {
      stackFrames: [
        {
          id: 1,
          name: 'anonymous',
          source: { path: '', name: 'module' },
          line: 1,
          column: 1,
        },
      ],
      totalFrames: 1,
    });
  }

  private handleScopes(request: any): void {
    this.sendResponse(request, {
      scopes: [
        {
          name: 'Local',
          variablesReference: 1000,
          expensive: false,
        },
        {
          name: 'Global',
          variablesReference: 1001,
          expensive: false,
        },
      ],
    });
  }

  private handleVariables(request: any): void {
    this.sendResponse(request, {
      variables: [],
    });
  }

  private handleContinue(request: any): void {
    this.sendResponse(request, { allThreadsContinued: true });
  }

  private handleNext(request: any): void {
    this.sendResponse(request, {});
  }

  private handleStepIn(request: any): void {
    this.sendResponse(request, {});
  }

  private handleStepOut(request: any): void {
    this.sendResponse(request, {});
  }

  private handleEvaluate(request: any): void {
    const args = request.arguments as {
      expression: string;
      context?: string;
    };

    this.sendResponse(request, {
      result: String(eval(args.expression)),
      variablesReference: 0,
    });
  }

  private sendResponse(
    request: any,
    body: Record<string, unknown>
  ): void {
    this._onDidSendMessage.fire({
      type: 'response',
      request_seq: request.seq,
      success: true,
      command: request.command,
      body,
    } as any);
  }

  private sendEvent(event: { type: string; event: string; body?: Record<string, unknown> }): void {
    this._onDidSendMessage.fire(event as any);
  }

  dispose(): void {
    if (!this._disposed) {
      this._disposed = true;
      this._onDidSendMessage.dispose();
    }
  }
}
