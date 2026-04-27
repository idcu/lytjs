/**
 * Lyt.js Plugin SDK — 插件注册中心
 *
 * 提供与远程插件注册中心通信的客户端：
 * - publish: 发布插件
 * - search: 搜索插件
 * - getPlugin: 获取插件详情
 * - getVersions: 获取版本列表
 * - getPopular: 获取热门插件
 * - getRecent: 获取最近更新
 * - download: 下载插件包
 * - getCategories: 获取分类列表
 *
 * 内部使用 fetch API 与注册中心通信。
 * 纯原生零依赖实现。
 */
// ============================================================
// PluginRegistry
// ============================================================
/**
 * 插件注册中心客户端
 *
 * 通过 HTTP API 与远程注册中心通信，提供插件的发布、搜索、下载等功能。
 */
export class PluginRegistry {
    constructor(registryUrl) {
        this.registryUrl = registryUrl.replace(/\/+$/, '');
    }
    // --------------------------------------------------------
    // 发布
    // --------------------------------------------------------
    /**
     * 发布插件到注册中心
     *
     * @param plugin - 插件对象
     * @param authToken - 认证令牌
     * @returns 发布结果
     */
    async publish(plugin, authToken) {
        try {
            const response = await fetch(`${this.registryUrl}/api/plugins`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify(plugin),
            });
            const data = await response.json();
            if (!response.ok) {
                return {
                    success: false,
                    error: data.message || `发布失败 (HTTP ${response.status})`,
                };
            }
            return { success: true, data };
        }
        catch (err) {
            return {
                success: false,
                error: `发布请求失败: ${err.message}`,
            };
        }
    }
    // --------------------------------------------------------
    // 搜索
    // --------------------------------------------------------
    /**
     * 搜索插件
     *
     * @param query - 搜索关键词
     * @param options - 搜索选项（分类、分页、排序）
     * @returns 搜索结果
     */
    async search(query, options) {
        try {
            const params = new URLSearchParams();
            params.set('q', query);
            if (options?.category)
                params.set('category', options.category);
            if (options?.page)
                params.set('page', String(options.page));
            if (options?.pageSize)
                params.set('pageSize', String(options.pageSize));
            if (options?.sort)
                params.set('sort', options.sort);
            const response = await fetch(`${this.registryUrl}/api/plugins/search?${params.toString()}`);
            if (!response.ok) {
                return { plugins: [], total: 0 };
            }
            const data = await response.json();
            return {
                plugins: data.plugins || [],
                total: data.total || 0,
            };
        }
        catch {
            return { plugins: [], total: 0 };
        }
    }
    // --------------------------------------------------------
    // 获取详情
    // --------------------------------------------------------
    /**
     * 获取插件详情
     *
     * @param name - 插件名称
     * @returns 插件对象，未找到时返回 null
     */
    async getPlugin(name) {
        try {
            const response = await fetch(`${this.registryUrl}/api/plugins/${encodeURIComponent(name)}`);
            if (!response.ok) {
                return null;
            }
            return await response.json();
        }
        catch {
            return null;
        }
    }
    // --------------------------------------------------------
    // 版本列表
    // --------------------------------------------------------
    /**
     * 获取插件版本列表
     *
     * @param name - 插件名称
     * @returns 版本号列表
     */
    async getVersions(name) {
        try {
            const response = await fetch(`${this.registryUrl}/api/plugins/${encodeURIComponent(name)}/versions`);
            if (!response.ok) {
                return [];
            }
            const data = await response.json();
            return data.versions || [];
        }
        catch {
            return [];
        }
    }
    // --------------------------------------------------------
    // 热门 / 最近
    // --------------------------------------------------------
    /**
     * 获取热门插件
     *
     * @returns 热门插件列表
     */
    async getPopular() {
        try {
            const response = await fetch(`${this.registryUrl}/api/plugins/popular`);
            if (!response.ok) {
                return [];
            }
            const data = await response.json();
            return data.plugins || [];
        }
        catch {
            return [];
        }
    }
    /**
     * 获取最近更新的插件
     *
     * @returns 最近更新的插件列表
     */
    async getRecent() {
        try {
            const response = await fetch(`${this.registryUrl}/api/plugins/recent`);
            if (!response.ok) {
                return [];
            }
            const data = await response.json();
            return data.plugins || [];
        }
        catch {
            return [];
        }
    }
    // --------------------------------------------------------
    // 下载
    // --------------------------------------------------------
    /**
     * 下载插件包
     *
     * @param name - 插件名称
     * @param version - 版本号
     * @returns 插件包 Buffer
     */
    async download(name, version) {
        try {
            const response = await fetch(`${this.registryUrl}/api/plugins/${encodeURIComponent(name)}/versions/${encodeURIComponent(version)}/download`);
            if (!response.ok) {
                throw new Error(`下载插件 "${name}@${version}" 失败 (HTTP ${response.status})`);
            }
            const arrayBuffer = await response.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        catch (err) {
            throw new Error(`下载插件失败: ${err.message}`);
        }
    }
    // --------------------------------------------------------
    // 分类
    // --------------------------------------------------------
    /**
     * 获取分类列表
     *
     * @returns 分类信息列表
     */
    async getCategories() {
        try {
            const response = await fetch(`${this.registryUrl}/api/categories`);
            if (!response.ok) {
                return [];
            }
            const data = await response.json();
            return data.categories || [];
        }
        catch {
            return [];
        }
    }
}
//# sourceMappingURL=plugin-registry.js.map