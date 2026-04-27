/**
 * Lyt.js Plugin SDK — 插件管理器
 *
 * 提供插件生命周期管理的核心类 PluginManager：
 * - 注册 / 注销插件
 * - 安装 / 卸载 / 启用 / 禁用插件
 * - 按分类获取、搜索插件
 * - 检查更新、更新插件
 * - 内置事件发射器（Emitter 模式）
 *
 * 纯原生零依赖实现。
 */
// ============================================================
// 内部事件发射器
// ============================================================
/**
 * 轻量级事件发射器
 *
 * 内部实现，用于插件管理器的事件系统。
 */
class Emitter {
    constructor() {
        this.events = new Map();
    }
    /** 注册事件监听器，返回取消监听函数 */
    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(handler);
        return () => this.off(event, handler);
    }
    /** 移除事件监听器 */
    off(event, handler) {
        if (!handler) {
            this.events.delete(event);
        }
        else {
            this.events.get(event)?.delete(handler);
        }
    }
    /** 触发事件 */
    emit(event, ...args) {
        const handlers = this.events.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(...args);
                }
                catch (err) {
                    console.error(`[PluginManager] 事件 "${event}" 处理器执行出错:`, err);
                }
            });
        }
    }
    /** 检查事件是否有监听器 */
    hasListeners(event) {
        const handlers = this.events.get(event);
        return handlers ? handlers.size > 0 : false;
    }
    /** 移除所有监听器 */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        }
        else {
            this.events.clear();
        }
    }
}
// ============================================================
// PluginManager
// ============================================================
/**
 * 插件管理器
 *
 * 管理插件的完整生命周期：注册、安装、启用、禁用、卸载、注销。
 * 内部使用 Map 存储插件清单，使用 Emitter 实现事件系统。
 */
export class PluginManager {
    constructor(config) {
        /** 插件清单存储 */
        this.plugins = new Map();
        /** 事件发射器 */
        this.emitter = new Emitter();
        this.config = config;
    }
    // --------------------------------------------------------
    // 注册 / 注销
    // --------------------------------------------------------
    /**
     * 注册插件（添加到管理器，不执行安装）
     *
     * @param plugin - 插件对象
     * @returns 注册结果
     */
    register(plugin) {
        if (this.plugins.has(plugin.name)) {
            return { success: false, error: `插件 "${plugin.name}" 已注册` };
        }
        const manifest = {
            ...plugin,
            installed: false,
            enabled: false,
            config: plugin.config?.defaults ? { ...plugin.config.defaults } : {},
            permissions: plugin.permissions ? [...plugin.permissions] : [],
        };
        this.plugins.set(plugin.name, manifest);
        this.emitter.emit('register', manifest);
        return { success: true, data: manifest };
    }
    /**
     * 注销插件（从管理器移除）
     *
     * @param name - 插件名称
     * @returns 注销结果
     */
    unregister(name) {
        const manifest = this.plugins.get(name);
        if (!manifest) {
            return { success: false, error: `插件 "${name}" 未注册` };
        }
        if (manifest.installed) {
            return { success: false, error: `插件 "${name}" 已安装，请先卸载` };
        }
        this.plugins.delete(name);
        this.emitter.emit('unregister', { name });
        return { success: true };
    }
    // --------------------------------------------------------
    // 安装 / 卸载
    // --------------------------------------------------------
    /**
     * 安装插件
     *
     * @param name - 插件名称
     * @returns 安装结果
     */
    async install(name) {
        const manifest = this.plugins.get(name);
        if (!manifest) {
            return { success: false, error: `插件 "${name}" 未注册` };
        }
        if (manifest.installed) {
            return { success: false, error: `插件 "${name}" 已安装` };
        }
        const plugin = manifest;
        const api = this.createPluginAPI(plugin);
        // 执行 beforeInstall 钩子
        if (plugin.hooks?.beforeInstall) {
            try {
                await plugin.hooks.beforeInstall(api, {});
            }
            catch (err) {
                return { success: false, error: `beforeInstall 钩子执行失败: ${err.message}` };
            }
        }
        // 执行 install 方法
        if (plugin.install) {
            try {
                await plugin.install(api);
            }
            catch (err) {
                return { success: false, error: `install 执行失败: ${err.message}` };
            }
        }
        // 执行 afterInstall 钩子
        if (plugin.hooks?.afterInstall) {
            try {
                await plugin.hooks.afterInstall(api, {});
            }
            catch (err) {
                return { success: false, error: `afterInstall 钩子执行失败: ${err.message}` };
            }
        }
        manifest.installed = true;
        manifest.installedAt = Date.now();
        manifest.updatedAt = Date.now();
        this.emitter.emit('install', manifest);
        return { success: true, data: manifest };
    }
    /**
     * 卸载插件
     *
     * @param name - 插件名称
     * @returns 卸载结果
     */
    async uninstall(name) {
        const manifest = this.plugins.get(name);
        if (!manifest) {
            return { success: false, error: `插件 "${name}" 未注册` };
        }
        if (!manifest.installed) {
            return { success: false, error: `插件 "${name}" 未安装` };
        }
        const plugin = manifest;
        const api = this.createPluginAPI(plugin);
        // 如果插件已启用，先禁用
        if (manifest.enabled) {
            const disableResult = await this.disable(name);
            if (!disableResult.success) {
                return disableResult;
            }
        }
        // 执行 beforeUninstall 钩子
        if (plugin.hooks?.beforeUninstall) {
            try {
                await plugin.hooks.beforeUninstall(api, {});
            }
            catch (err) {
                return { success: false, error: `beforeUninstall 钩子执行失败: ${err.message}` };
            }
        }
        // 执行 uninstall 方法
        if (plugin.uninstall) {
            try {
                await plugin.uninstall(api);
            }
            catch (err) {
                return { success: false, error: `uninstall 执行失败: ${err.message}` };
            }
        }
        // 执行 afterUninstall 钩子
        if (plugin.hooks?.afterUninstall) {
            try {
                await plugin.hooks.afterUninstall(api, {});
            }
            catch (err) {
                return { success: false, error: `afterUninstall 钩子执行失败: ${err.message}` };
            }
        }
        manifest.installed = false;
        manifest.enabled = false;
        manifest.installedAt = undefined;
        manifest.updatedAt = Date.now();
        this.emitter.emit('uninstall', { name });
        return { success: true };
    }
    // --------------------------------------------------------
    // 启用 / 禁用
    // --------------------------------------------------------
    /**
     * 启用插件
     *
     * @param name - 插件名称
     * @returns 启用结果
     */
    enable(name) {
        const manifest = this.plugins.get(name);
        if (!manifest) {
            return { success: false, error: `插件 "${name}" 未注册` };
        }
        if (!manifest.installed) {
            return { success: false, error: `插件 "${name}" 未安装` };
        }
        if (manifest.enabled) {
            return { success: false, error: `插件 "${name}" 已启用` };
        }
        const plugin = manifest;
        const api = this.createPluginAPI(plugin);
        if (plugin.hooks?.onEnable) {
            try {
                plugin.hooks.onEnable(api, {});
            }
            catch (err) {
                return { success: false, error: `onEnable 钩子执行失败: ${err.message}` };
            }
        }
        manifest.enabled = true;
        manifest.updatedAt = Date.now();
        this.emitter.emit('enable', manifest);
        return { success: true, data: manifest };
    }
    /**
     * 禁用插件
     *
     * @param name - 插件名称
     * @returns 禁用结果
     */
    disable(name) {
        const manifest = this.plugins.get(name);
        if (!manifest) {
            return { success: false, error: `插件 "${name}" 未注册` };
        }
        if (!manifest.enabled) {
            return { success: false, error: `插件 "${name}" 已禁用` };
        }
        const plugin = manifest;
        const api = this.createPluginAPI(plugin);
        if (plugin.hooks?.onDisable) {
            try {
                plugin.hooks.onDisable(api, {});
            }
            catch (err) {
                return { success: false, error: `onDisable 钩子执行失败: ${err.message}` };
            }
        }
        manifest.enabled = false;
        manifest.updatedAt = Date.now();
        this.emitter.emit('disable', manifest);
        return { success: true, data: manifest };
    }
    // --------------------------------------------------------
    // 查询
    // --------------------------------------------------------
    /**
     * 获取插件信息
     *
     * @param name - 插件名称
     * @returns 插件清单，未找到时返回 undefined
     */
    getPlugin(name) {
        return this.plugins.get(name);
    }
    /**
     * 获取所有插件
     *
     * @returns 插件清单列表
     */
    getAllPlugins() {
        return [...this.plugins.values()];
    }
    /**
     * 按分类获取插件
     *
     * @param category - 插件分类
     * @returns 匹配分类的插件清单列表
     */
    getPluginsByCategory(category) {
        return [...this.plugins.values()].filter((p) => p.category === category);
    }
    /**
     * 搜索插件
     *
     * 按名称、描述、关键词、作者进行模糊匹配。
     *
     * @param query - 搜索关键词
     * @returns 匹配的插件清单列表
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return [...this.plugins.values()].filter((plugin) => {
            return (plugin.name.toLowerCase().includes(lowerQuery) ||
                plugin.description.toLowerCase().includes(lowerQuery) ||
                plugin.author.toLowerCase().includes(lowerQuery) ||
                plugin.keywords.some((k) => k.toLowerCase().includes(lowerQuery)));
        });
    }
    // --------------------------------------------------------
    // 更新
    // --------------------------------------------------------
    /**
     * 检查插件更新
     *
     * @param name - 插件名称
     * @returns 更新信息（当前版本和最新版本），无更新时返回 null
     */
    async checkUpdate(name) {
        const manifest = this.plugins.get(name);
        if (!manifest) {
            return null;
        }
        const registryUrl = this.config.registryUrl;
        if (!registryUrl) {
            console.warn('[PluginManager] 未配置 registryUrl，无法检查更新');
            return null;
        }
        try {
            const response = await fetch(`${registryUrl}/api/plugins/${name}/versions`);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            const versions = data.versions || [];
            if (versions.length === 0) {
                return null;
            }
            const latest = versions[0];
            if (latest !== manifest.version) {
                return { current: manifest.version, latest };
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * 更新插件
     *
     * @param name - 插件名称
     * @returns 更新结果
     */
    async update(name) {
        const updateInfo = await this.checkUpdate(name);
        if (!updateInfo) {
            return { success: false, error: `插件 "${name}" 没有可用更新` };
        }
        const manifest = this.plugins.get(name);
        if (!manifest) {
            return { success: false, error: `插件 "${name}" 未注册` };
        }
        const registryUrl = this.config.registryUrl;
        if (!registryUrl) {
            return { success: false, error: '未配置 registryUrl' };
        }
        try {
            const response = await fetch(`${registryUrl}/api/plugins/${name}/versions/${updateInfo.latest}`);
            if (!response.ok) {
                return { success: false, error: `获取插件 "${name}" v${updateInfo.latest} 失败` };
            }
            const updatedPlugin = await response.json();
            // 如果插件已安装，先卸载
            if (manifest.installed) {
                await this.uninstall(name);
            }
            // 更新插件信息
            const newManifest = {
                ...updatedPlugin,
                installed: false,
                enabled: false,
                config: updatedPlugin.config?.defaults ? { ...updatedPlugin.config.defaults } : {},
                permissions: updatedPlugin.permissions ? [...updatedPlugin.permissions] : [],
            };
            this.plugins.set(name, newManifest);
            this.emitter.emit('update', { name, from: updateInfo.current, to: updateInfo.latest });
            return { success: true, data: newManifest };
        }
        catch (err) {
            return { success: false, error: `更新插件 "${name}" 失败: ${err.message}` };
        }
    }
    // --------------------------------------------------------
    // 事件系统
    // --------------------------------------------------------
    /**
     * 注册事件监听器
     *
     * @param event - 事件名称
     * @param handler - 事件处理函数
     * @returns 取消监听函数
     */
    on(event, handler) {
        return this.emitter.on(event, handler);
    }
    /**
     * 触发事件
     *
     * @param event - 事件名称
     * @param data - 事件数据
     */
    emit(event, data) {
        this.emitter.emit(event, data);
    }
    // --------------------------------------------------------
    // 内部方法
    // --------------------------------------------------------
    /**
     * 为插件创建 API 对象
     *
     * @param _plugin - 插件对象
     * @returns 插件 API
     */
    createPluginAPI(_plugin) {
        const self = this;
        return {
            app: self.config.app,
            config: {
                get(key, defaultValue) {
                    const manifest = self.plugins.get(_plugin.name);
                    if (!manifest || !manifest.config)
                        return defaultValue;
                    return (manifest.config[key] !== undefined ? manifest.config[key] : defaultValue);
                },
                set(key, value) {
                    const manifest = self.plugins.get(_plugin.name);
                    if (manifest) {
                        if (!manifest.config)
                            manifest.config = {};
                        manifest.config[key] = value;
                        manifest.updatedAt = Date.now();
                    }
                },
                getAll() {
                    const manifest = self.plugins.get(_plugin.name);
                    return manifest?.config || {};
                },
                reset() {
                    const manifest = self.plugins.get(_plugin.name);
                    if (manifest) {
                        manifest.config = _plugin.config?.defaults ? { ..._plugin.config.defaults } : {};
                        manifest.updatedAt = Date.now();
                    }
                },
            },
            store: {
                get(key, defaultValue) {
                    // 默认使用内存存储，实际使用时可替换为持久化方案
                    const storageKey = `lyt-plugin:${_plugin.name}:${key}`;
                    try {
                        const raw = localStorage.getItem(storageKey);
                        if (raw === null)
                            return defaultValue;
                        return JSON.parse(raw);
                    }
                    catch {
                        return defaultValue;
                    }
                },
                set(key, value) {
                    const storageKey = `lyt-plugin:${_plugin.name}:${key}`;
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(value));
                    }
                    catch {
                        // 存储失败时静默处理
                    }
                },
                remove(key) {
                    const storageKey = `lyt-plugin:${_plugin.name}:${key}`;
                    try {
                        localStorage.removeItem(storageKey);
                    }
                    catch {
                        // 静默处理
                    }
                },
                clear() {
                    const prefix = `lyt-plugin:${_plugin.name}:`;
                    try {
                        const keysToRemove = [];
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && key.startsWith(prefix)) {
                                keysToRemove.push(key);
                            }
                        }
                        keysToRemove.forEach((key) => localStorage.removeItem(key));
                    }
                    catch {
                        // 静默处理
                    }
                },
                keys() {
                    const prefix = `lyt-plugin:${_plugin.name}:`;
                    const result = [];
                    try {
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            if (key && key.startsWith(prefix)) {
                                result.push(key.slice(prefix.length));
                            }
                        }
                    }
                    catch {
                        // 静默处理
                    }
                    return result;
                },
            },
            router: {
                addRoute(_route) {
                    // 占位实现，实际使用时由宿主应用注入
                },
                removeRoute(_name) {
                    // 占位实现
                },
                push(_path) {
                    // 占位实现
                },
                replace(_path) {
                    // 占位实现
                },
                back() {
                    // 占位实现
                },
                currentRoute() {
                    return null;
                },
            },
            i18n: {
                t(key, params) {
                    let result = key;
                    if (params) {
                        Object.keys(params).forEach((k) => {
                            result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k]));
                        });
                    }
                    return result;
                },
                setLocale(_locale) {
                    // 占位实现
                },
                getLocale() {
                    return 'zh-CN';
                },
                addMessages(_locale, _messages) {
                    // 占位实现
                },
            },
            theme: {
                setTheme(_theme) {
                    // 占位实现
                },
                getTheme() {
                    return 'default';
                },
                registerTheme(_name, _variables) {
                    // 占位实现
                },
            },
            logger: {
                info(message, ...args) {
                    console.info(`[${_plugin.name}]`, message, ...args);
                },
                warn(message, ...args) {
                    console.warn(`[${_plugin.name}]`, message, ...args);
                },
                error(message, ...args) {
                    console.error(`[${_plugin.name}]`, message, ...args);
                },
                debug(message, ...args) {
                    console.debug(`[${_plugin.name}]`, message, ...args);
                },
            },
            on(event, handler) {
                return self.emitter.on(event, handler);
            },
            off(event, handler) {
                self.emitter.off(event, handler);
            },
            emit(event, data) {
                self.emitter.emit(event, data);
            },
        };
    }
}
//# sourceMappingURL=plugin-manager.js.map