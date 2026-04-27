import { createApp } from '@lytjs/core'
import { createRouter } from '@lytjs/router'
import { createStore } from '@lytjs/store'
import { createI18n } from '@lytjs/plugin-i18n'
import { createAuth } from '@lytjs/plugin-auth'
import { createLogger } from '@lytjs/plugin-logger'
import { createTheme } from '@lytjs/plugin-theme'
import App from './App.lyt'
import { routes } from './router'
import { store } from './store'

const app = createApp(App)

// 路由
const router = createRouter({ routes })
app.use(router)

// 状态管理
app.use(store)

// 国际化
const i18n = createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'en',
  messages: {
    'zh-CN': {
      common: {
        confirm: '确认',
        cancel: '取消',
        save: '保存',
        delete: '删除',
        edit: '编辑',
        search: '搜索',
        add: '新增',
        reset: '重置',
        submit: '提交',
        back: '返回',
        loading: '加载中...',
        noData: '暂无数据',
        operation: '操作',
        status: '状态',
        enabled: '启用',
        disabled: '禁用',
      },
      nav: {
        dashboard: '仪表盘',
        users: '用户管理',
        roles: '角色管理',
        settings: '系统设置',
        profile: '个人中心',
        logout: '退出登录',
      },
      login: {
        title: '后台管理系统',
        username: '用户名',
        password: '密码',
        rememberMe: '记住我',
        submit: '登 录',
        forgotPassword: '忘记密码？',
      },
      dashboard: {
        title: '仪表盘',
        totalUsers: '用户总数',
        totalOrders: '订单总数',
        totalRevenue: '收入总额',
        totalVisits: '访问量',
        recentActivity: '最近活动',
        quickActions: '快捷操作',
        addUser: '新增用户',
        viewReports: '查看报表',
        systemConfig: '系统配置',
        exportData: '导出数据',
      },
      users: {
        title: '用户管理',
        username: '用户名',
        email: '邮箱',
        role: '角色',
        status: '状态',
        createdAt: '创建时间',
        actions: '操作',
        addUser: '新增用户',
      },
      roles: {
        title: '角色管理',
        roleName: '角色名称',
        roleKey: '角色标识',
        description: '描述',
        permissions: '权限',
        assignPermissions: '分配权限',
      },
      settings: {
        title: '系统设置',
        basic: '基本设置',
        security: '安全设置',
        notification: '通知设置',
        siteName: '站点名称',
        siteDescription: '站点描述',
        language: '语言',
        timezone: '时区',
        twoFactor: '两步验证',
        sessionTimeout: '会话超时（分钟）',
        emailNotification: '邮件通知',
        smsNotification: '短信通知',
        systemNotification: '系统通知',
      },
      profile: {
        title: '个人中心',
        avatar: '头像',
        basicInfo: '基本信息',
        changePassword: '修改密码',
        nickname: '昵称',
        phone: '手机号',
        email: '邮箱',
        oldPassword: '旧密码',
        newPassword: '新密码',
        confirmPassword: '确认密码',
      },
      notFound: {
        title: '404',
        description: '抱歉，您访问的页面不存在',
        backHome: '返回首页',
      },
    },
    en: {
      common: {
        confirm: 'Confirm',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        search: 'Search',
        add: 'Add',
        reset: 'Reset',
        submit: 'Submit',
        back: 'Back',
        loading: 'Loading...',
        noData: 'No Data',
        operation: 'Operation',
        status: 'Status',
        enabled: 'Enabled',
        disabled: 'Disabled',
      },
      nav: {
        dashboard: 'Dashboard',
        users: 'Users',
        roles: 'Roles',
        settings: 'Settings',
        profile: 'Profile',
        logout: 'Logout',
      },
      login: {
        title: 'Admin Dashboard',
        username: 'Username',
        password: 'Password',
        rememberMe: 'Remember Me',
        submit: 'Login',
        forgotPassword: 'Forgot Password?',
      },
      dashboard: {
        title: 'Dashboard',
        totalUsers: 'Total Users',
        totalOrders: 'Total Orders',
        totalRevenue: 'Total Revenue',
        totalVisits: 'Total Visits',
        recentActivity: 'Recent Activity',
        quickActions: 'Quick Actions',
        addUser: 'Add User',
        viewReports: 'View Reports',
        systemConfig: 'System Config',
        exportData: 'Export Data',
      },
      users: {
        title: 'User Management',
        username: 'Username',
        email: 'Email',
        role: 'Role',
        status: 'Status',
        createdAt: 'Created At',
        actions: 'Actions',
        addUser: 'Add User',
      },
      roles: {
        title: 'Role Management',
        roleName: 'Role Name',
        roleKey: 'Role Key',
        description: 'Description',
        permissions: 'Permissions',
        assignPermissions: 'Assign Permissions',
      },
      settings: {
        title: 'System Settings',
        basic: 'Basic',
        security: 'Security',
        notification: 'Notification',
        siteName: 'Site Name',
        siteDescription: 'Site Description',
        language: 'Language',
        timezone: 'Timezone',
        twoFactor: 'Two-Factor Auth',
        sessionTimeout: 'Session Timeout (min)',
        emailNotification: 'Email Notification',
        smsNotification: 'SMS Notification',
        systemNotification: 'System Notification',
      },
      profile: {
        title: 'Profile',
        avatar: 'Avatar',
        basicInfo: 'Basic Info',
        changePassword: 'Change Password',
        nickname: 'Nickname',
        phone: 'Phone',
        email: 'Email',
        oldPassword: 'Old Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
      },
      notFound: {
        title: '404',
        description: 'Sorry, the page you visited does not exist.',
        backHome: 'Back to Home',
      },
    },
  },
})
app.use(i18n)

// 认证
const auth = createAuth({
  loginUrl: '/api/auth/login',
  userUrl: '/api/auth/user',
  tokenKey: 'admin_token',
  autoRedirect: true,
})
app.use(auth)

// 日志
const logger = createLogger({ level: 'info', prefix: '[Admin]' })
app.use(logger)

// 主题
const theme = createTheme({ default: 'light' })
app.use(theme)

app.mount('#app')
