import type { RouteConfig } from '@lytjs/router'
import AdminLayout from '../layouts/AdminLayout.lyt'

export const routes: RouteConfig[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/Login.lyt'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../pages/Dashboard.lyt'),
        meta: { title: '仪表盘', icon: 'dashboard' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../pages/Users.lyt'),
        meta: { title: '用户管理', icon: 'users', permission: 'user:list' },
      },
      {
        path: 'roles',
        name: 'Roles',
        component: () => import('../pages/Roles.lyt'),
        meta: { title: '角色管理', icon: 'roles', permission: 'role:list' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../pages/Settings.lyt'),
        meta: { title: '系统设置', icon: 'settings', permission: 'system:settings' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../pages/Profile.lyt'),
        meta: { title: '个人中心', icon: 'profile', hidden: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../pages/NotFound.lyt'),
    meta: { title: '404' },
  },
]
