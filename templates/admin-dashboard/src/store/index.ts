import { defineStore } from '@lytjs/store'

// ==================== User Module ====================
export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null as Record<string, any> | null,
    token: localStorage.getItem('admin_token') || '',
    roles: [] as string[],
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    username: (state) => state.userInfo?.username || '',
    avatar: (state) => state.userInfo?.avatar || '',
  },

  actions: {
    async login(credentials: { username: string; password: string; remember?: boolean }) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        })
        const data = await res.json()
        if (data.code === 0) {
          this.token = data.data.token
          if (credentials.remember) {
            localStorage.setItem('admin_token', data.data.token)
          } else {
            sessionStorage.setItem('admin_token', data.data.token)
          }
          return data
        }
        throw new Error(data.message || '登录失败')
      } catch (error) {
        throw error
      }
    },

    logout() {
      this.token = ''
      this.userInfo = null
      this.roles = []
      localStorage.removeItem('admin_token')
      sessionStorage.removeItem('admin_token')
    },

    async getUserInfo() {
      try {
        const res = await fetch('/api/auth/user', {
          headers: { Authorization: `Bearer ${this.token}` },
        })
        const data = await res.json()
        if (data.code === 0) {
          this.userInfo = data.data.user
          this.roles = data.data.roles
          return data.data
        }
        throw new Error(data.message || '获取用户信息失败')
      } catch (error) {
        this.logout()
        throw error
      }
    },
  },
})

// ==================== App Module ====================
export const useAppStore = defineStore('app', {
  state: () => ({
    sidebarCollapsed: false,
    theme: 'light' as 'light' | 'dark',
    language: 'zh-CN',
    loading: false,
  }),

  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    },

    setTheme(theme: 'light' | 'dark') {
      this.theme = theme
      document.documentElement.setAttribute('data-theme', theme)
    },

    setLanguage(lang: string) {
      this.language = lang
    },

    setLoading(loading: boolean) {
      this.loading = loading
    },
  },
})

// ==================== Permission Module ====================
export const usePermissionStore = defineStore('permission', {
  state: () => ({
    routes: [] as any[],
    permissions: [] as string[],
  }),

  actions: {
    setPermissions(permissions: string[]) {
      this.permissions = permissions
    },

    hasPermission(permission: string): boolean {
      return this.permissions.includes('*') || this.permissions.includes(permission)
    },

    generateRoutes(asyncRoutes: any[]) {
      const accessedRoutes = asyncRoutes.filter((route) => {
        if (route.meta?.permission) {
          return this.hasPermission(route.meta.permission)
        }
        if (route.children) {
          route.children = this.generateRoutes(route.children)
        }
        return true
      })
      this.routes = accessedRoutes
      return accessedRoutes
    },
  },
})

// ==================== Combined Store Export ====================
import { useUserStore, useAppStore, usePermissionStore } from '@lytjs/store'

export const store = {
  install(app: any) {
    app.provide('userStore', useUserStore())
    app.provide('appStore', useAppStore())
    app.provide('permissionStore', usePermissionStore())
  },
}
