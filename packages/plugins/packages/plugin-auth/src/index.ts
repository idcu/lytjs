/**
 * @lytjs/plugin-auth
 *
 * LytJS official auth plugin for route authorization, permission checking, and role management.
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import type { User, AuthOptions, AuthInstance } from './types';

function createAuth(options: AuthOptions = {}): AuthInstance {
  const {
    initialUser = null,
    storageKey = 'lyt-user',
    enablePersistence = false,
    superAdminRole = 'super-admin',
  } = options;

  const userSignal = signal<User | null>(initialUser);
  const isAuthenticatedSignal = signal<boolean>(!!initialUser);

  function getStoredUser(): User | null {
    if (!enablePersistence || typeof localStorage === 'undefined') return null;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  function saveUser(user: User | null) {
    if (!enablePersistence || typeof localStorage === 'undefined') return;
    try {
      if (user) {
        localStorage.setItem(storageKey, JSON.stringify(user));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
    }
  }

  function login(user: User) {
    userSignal.set(user);
    isAuthenticatedSignal.set(true);
    saveUser(user);
  }

  function logout() {
    userSignal.set(null);
    isAuthenticatedSignal.set(false);
    saveUser(null);
  }

  function hasRole(role: string | string[]): boolean {
    const user = userSignal();
    if (!user) return false;

    if (user.roles.includes(superAdminRole)) return true;

    const roles = Array.isArray(role) ? role : [role];
    return roles.some((r) => user.roles.includes(r));
  }

  function hasAllRoles(roles: string[]): boolean {
    const user = userSignal();
    if (!user) return false;

    if (user.roles.includes(superAdminRole)) return true;

    return roles.every((r) => user.roles.includes(r));
  }

  function hasPermission(permission: string | string[]): boolean {
    const user = userSignal();
    if (!user) return false;

    if (user.roles.includes(superAdminRole)) return true;

    const permissions = Array.isArray(permission) ? permission : [permission];
    return permissions.some((p) => user.permissions.includes(p));
  }

  function hasAllPermissions(permissions: string[]): boolean {
    const user = userSignal();
    if (!user) return false;

    if (user.roles.includes(superAdminRole)) return true;

    return permissions.every((p) => user.permissions.includes(p));
  }

  function updateUser(partialUser: Partial<User>) {
    const currentUser = userSignal();
    if (!currentUser) return;

    const newUser = { ...currentUser, ...partialUser };
    userSignal.set(newUser);
    saveUser(newUser);
  }

  function init() {
    const storedUser = getStoredUser();
    if (storedUser) {
      userSignal.set(storedUser);
      isAuthenticatedSignal.set(true);
    }
  }

  init();

  return {
    get user() {
      return userSignal();
    },
    get isAuthenticated() {
      return isAuthenticatedSignal();
    },
    login,
    logout,
    hasRole,
    hasPermission,
    hasAllRoles,
    hasAllPermissions,
    updateUser,
  };
}

const pluginAuth = definePlugin({
  name: 'auth',
  version: '6.0.0',
  description: 'LytJS official auth plugin for route authorization, permission checking, and role management',
  author: 'LytJS Team',
  keywords: ['lytjs', 'auth', 'authorization', 'permission', 'role'],
  schema: {
    type: 'object',
    object: {
      properties: {
        initialUser: { type: 'object', default: null },
        storageKey: { type: 'string', default: 'lyt-user' },
        enablePersistence: { type: 'boolean', default: false },
        superAdminRole: { type: 'string', default: 'super-admin' },
      },
    },
  },
  install(app, options) {
    const auth = createAuth(options as AuthOptions);

    app.config.globalProperties.$auth = auth;

    app.provide('lyt-auth', auth);
  },
});

export default pluginAuth;
export type { User, AuthOptions, AuthInstance };
export { createAuth };
