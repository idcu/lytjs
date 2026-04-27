/**
 * Lyt.js Plugin SDK — 类型系统
 *
 * 定义插件系统的完整类型体系，包括：
 * - 插件清单（LytPlugin / LytPluginManifest）
 * - 插件 API（LytPluginAPI）
 * - 插件生命周期钩子（LytPluginHook）
 * - 插件权限（LytPluginPermission）
 * - 插件分类（LytPluginCategory）
 * - 插件配置（LytPluginConfig）
 * - 操作结果（LytPluginResult）
 * - 验证结果（ValidationResult）
 * - 插件安装器（PluginInstaller）
 *
 * 纯原生零依赖实现。
 */
// ============================================================
// 插件安装器
// ============================================================
/**
 * 插件安装器
 *
 * 提供插件的安装、卸载、启用、禁用、验证和依赖解析功能。
 */
export class PluginInstaller {
    constructor(initialPlugins) {
        this.plugins = new Map();
        if (initialPlugins) {
            for (const plugin of initialPlugins) {
                this.plugins.set(plugin.name, plugin);
            }
        }
    }
    /**
     * 安装插件
     *
     * @param plugin - 插件对象
     * @param api - 插件 API
     * @returns 安装结果
     */
    async install(plugin, api) {
        if (this.plugins.has(plugin.name)) {
            return { success: false, error: `插件 "${plugin.name}" 已安装` };
        }
        const manifest = {
            ...plugin,
            installed: true,
            enabled: false,
            config: plugin.config?.defaults ? { ...plugin.config.defaults } : {},
            permissions: plugin.permissions ? [...plugin.permissions] : [],
            installedAt: Date.now(),
            updatedAt: Date.now(),
        };
        // 执行安装钩子
        if (plugin.hooks?.beforeInstall) {
            try {
                await plugin.hooks.beforeInstall(api, {});
            }
            catch (err) {
                return { success: false, error: `beforeInstall 钩子执行失败: ${err.message}` };
            }
        }
        if (plugin.install && api) {
            try {
                await plugin.install(api);
            }
            catch (err) {
                return { success: false, error: `install 执行失败: ${err.message}` };
            }
        }
        if (plugin.hooks?.afterInstall) {
            try {
                await plugin.hooks.afterInstall(api, {});
            }
            catch (err) {
                return { success: false, error: `afterInstall 钩子执行失败: ${err.message}` };
            }
        }
        this.plugins.set(plugin.name, manifest);
        return { success: true, data: manifest };
    }
    /**
     * 卸载插件
     *
     * @param name - 插件名称
     * @param api - 插件 API
     * @returns 卸载结果
     */
    async uninstall(name, api) {
        const manifest = this.plugins.get(name);
        if (!manifest) {
            return { success: false, error: `插件 "${name}" 未安装` };
        }
        const plugin = manifest;
        if (plugin.hooks?.beforeUninstall) {
            try {
                await plugin.hooks.beforeUninstall(api, {});
            }
            catch (err) {
                return { success: false, error: `beforeUninstall 钩子执行失败: ${err.message}` };
            }
        }
        if (plugin.uninstall && api) {
            try {
                await plugin.uninstall(api);
            }
            catch (err) {
                return { success: false, error: `uninstall 执行失败: ${err.message}` };
            }
        }
        if (plugin.hooks?.afterUninstall) {
            try {
                await plugin.hooks.afterUninstall(api, {});
            }
            catch (err) {
                return { success: false, error: `afterUninstall 钩子执行失败: ${err.message}` };
            }
        }
        this.plugins.delete(name);
        return { success: true };
    }
    /**
     * 启用插件
     *
     * @param name - 插件名称
     * @param api - 插件 API
     * @returns 启用结果
     */
    async enable(name, api) {
        const manifest = this.plugins.get(name);
        if (!manifest) {
            return { success: false, error: `插件 "${name}" 未安装` };
        }
        if (manifest.enabled) {
            return { success: false, error: `插件 "${name}" 已启用` };
        }
        const plugin = manifest;
        if (plugin.hooks?.onEnable) {
            try {
                await plugin.hooks.onEnable(api, {});
            }
            catch (err) {
                return { success: false, error: `onEnable 钩子执行失败: ${err.message}` };
            }
        }
        manifest.enabled = true;
        manifest.updatedAt = Date.now();
        return { success: true, data: manifest };
    }
    /**
     * 禁用插件
     *
     * @param name - 插件名称
     * @param api - 插件 API
     * @returns 禁用结果
     */
    async disable(name, api) {
        const manifest = this.plugins.get(name);
        if (!manifest) {
            return { success: false, error: `插件 "${name}" 未安装` };
        }
        if (!manifest.enabled) {
            return { success: false, error: `插件 "${name}" 已禁用` };
        }
        const plugin = manifest;
        if (plugin.hooks?.onDisable) {
            try {
                await plugin.hooks.onDisable(api, {});
            }
            catch (err) {
                return { success: false, error: `onDisable 钩子执行失败: ${err.message}` };
            }
        }
        manifest.enabled = false;
        manifest.updatedAt = Date.now();
        return { success: true, data: manifest };
    }
    /**
     * 验证插件
     *
     * @param plugin - 插件对象
     * @returns 验证结果
     */
    validate(plugin) {
        const errors = [];
        const warnings = [];
        if (!plugin.name) {
            errors.push('缺少必填字段: name');
        }
        if (!plugin.version) {
            errors.push('缺少必填字段: version');
        }
        if (!plugin.description) {
            errors.push('缺少必填字段: description');
        }
        if (!plugin.author) {
            errors.push('缺少必填字段: author');
        }
        if (!plugin.main) {
            errors.push('缺少必填字段: main');
        }
        if (!plugin.category) {
            errors.push('缺少必填字段: category');
        }
        if (plugin.name && !/^(@[a-z0-9-~][a-z0-9-._~]*\/)?lyt-plugin-[a-z0-9-~]+$/.test(plugin.name)) {
            errors.push(`插件名称 "${plugin.name}" 不符合命名规范（应为 lyt-plugin-xxx 或 @scope/lyt-plugin-xxx）`);
        }
        if (plugin.version && !/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(plugin.version)) {
            errors.push(`版本号 "${plugin.version}" 不符合语义化版本规范`);
        }
        if (!plugin.keywords || plugin.keywords.length === 0) {
            warnings.push('建议提供 keywords 以提高插件可发现性');
        }
        if (!plugin.license) {
            warnings.push('建议提供 license 字段');
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /**
     * 解析插件依赖
     *
     * @param plugin - 插件对象
     * @param availablePlugins - 可用插件列表
     * @returns 依赖解析结果（缺失依赖列表）
     */
    resolveDependencies(plugin, availablePlugins) {
        const missing = [];
        const satisfied = [];
        if (!plugin.peerDependencies) {
            return { missing, satisfied };
        }
        const availableNames = new Set(availablePlugins.map((p) => p.name));
        for (const dep of Object.keys(plugin.peerDependencies)) {
            if (availableNames.has(dep)) {
                satisfied.push(dep);
            }
            else {
                missing.push(dep);
            }
        }
        return { missing, satisfied };
    }
}
//# sourceMappingURL=types.js.map