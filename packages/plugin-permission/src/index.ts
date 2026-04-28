/**
 * @lytjs/plugin-permission - Permission Control Plugin
 *
 * Provides role-based access control (RBAC) with:
 * - Permission and role management
 * - Vue-like directive support (vPermission, vRole)
 * - API-based permission refresh
 * - Singleton pattern for global access
 */

// ============================================================
// Types
// ============================================================

export interface PermissionOptions {
  /** Initial list of permission strings */
  permissions?: string[];
  /** Initial list of role strings */
  roles?: string[];
  /** API endpoint to fetch permissions/roles (GET request) */
  apiUrl?: string;
  /** Custom fetch function for permission refresh */
  fetchFn?: () => Promise<{ permissions?: string[]; roles?: string[] }>;
}

/**
 * Represents the permission checking interface.
 */
export interface Permission {
  /** Check if a specific permission is granted */
  hasPermission(permission: string): boolean;
  /** Check if a specific role is assigned */
  hasRole(role: string): boolean;
  /** Check if any of the given permissions are granted */
  hasAnyPermission(permissions: string[]): boolean;
  /** Check if any of the given roles are assigned */
  hasAnyRole(roles: string[]): boolean;
  /** Add a single permission */
  addPermission(permission: string): void;
  /** Remove a single permission */
  removePermission(permission: string): void;
  /** Add a single role */
  addRole(role: string): void;
  /** Remove a single role */
  removeRole(role: string): void;
  /** Replace all permissions with a new set */
  setPermissions(permissions: string[]): void;
  /** Replace all roles with a new set */
  setRoles(roles: string[]): void;
  /** Refresh permissions and roles from the configured API */
  refresh(): Promise<void>;
  /** Get the current list of permissions */
  getPermissions(): string[];
  /** Get the current list of roles */
  getRoles(): string[];
}

/**
 * Minimal directive interface for framework integration.
 */
export interface Directive<T = any> {
  /** Called when the directive is first bound to an element */
  beforeMount?: (el: any, binding: T) => void;
  /** Called when the bound element is inserted into the DOM */
  mounted?: (el: any, binding: T) => void;
  /** Called when the bound element's VNode is updated */
  updated?: (el: any, binding: T) => void;
  /** Called when the directive is unbound from the element */
  unmounted?: (el: any) => void;
}

interface DirectiveBinding {
  value: string | string[];
  instance?: any;
  oldValue?: string | string[];
  arg?: string;
  modifiers?: Record<string, boolean>;
}

// ============================================================
// Permission Class
// ============================================================

/**
 * Internal permission manager implementation.
 */
class PermissionManager implements Permission {
  private _permissions: Set<string>;
  private _roles: Set<string>;
  private _apiUrl?: string;
  private _fetchFn?: () => Promise<{ permissions?: string[]; roles?: string[] }>;

  constructor(options: PermissionOptions = {}) {
    this._permissions = new Set(options.permissions || []);
    this._roles = new Set(options.roles || []);
    this._apiUrl = options.apiUrl;
    this._fetchFn = options.fetchFn;
  }

  // --- Check methods ---

  hasPermission(permission: string): boolean {
    return this._permissions.has(permission);
  }

  hasRole(role: string): boolean {
    return this._roles.has(role);
  }

  hasAnyPermission(permissions: string[]): boolean {
    if (!permissions || permissions.length === 0) return false;
    return permissions.some((p) => this._permissions.has(p));
  }

  hasAnyRole(roles: string[]): boolean {
    if (!roles || roles.length === 0) return false;
    return roles.some((r) => this._roles.has(r));
  }

  // --- Mutation methods ---

  addPermission(permission: string): void {
    this._permissions.add(permission);
  }

  removePermission(permission: string): void {
    this._permissions.delete(permission);
  }

  addRole(role: string): void {
    this._roles.add(role);
  }

  removeRole(role: string): void {
    this._roles.delete(role);
  }

  setPermissions(permissions: string[]): void {
    this._permissions = new Set(permissions);
  }

  setRoles(roles: string[]): void {
    this._roles = new Set(roles);
  }

  // --- Refresh ---

  async refresh(): Promise<void> {
    if (this._fetchFn) {
      const result = await this._fetchFn();
      if (result.permissions) {
        this.setPermissions(result.permissions);
      }
      if (result.roles) {
        this.setRoles(result.roles);
      }
    } else if (this._apiUrl) {
      try {
        const response = await fetch(this._apiUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error(`[plugin-permission] Refresh failed: ${response.status}`);
        }
        const data = await response.json();
        if (data.permissions) {
          this.setPermissions(data.permissions);
        }
        if (data.roles) {
          this.setRoles(data.roles);
        }
      } catch (err) {
        throw new Error(
          `[plugin-permission] Failed to refresh permissions: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    } else {
      throw new Error(
        '[plugin-permission] No apiUrl or fetchFn configured for refresh',
      );
    }
  }

  // --- Getters ---

  getPermissions(): string[] {
    return Array.from(this._permissions);
  }

  getRoles(): string[] {
    return Array.from(this._roles);
  }
}

// ============================================================
// Singleton Instance
// ============================================================

let _instance: Permission | null = null;

// ============================================================
// Public API
// ============================================================

/**
 * Create a new Permission instance.
 *
 * @param options - Permission configuration
 * @returns A new Permission instance
 *
 * @example
 * ```ts
 * const perm = createPermission({
 *   permissions: ['user:read', 'user:write'],
 *   roles: ['admin'],
 *   apiUrl: '/api/permissions',
 * });
 * ```
 */
export function createPermission(options: PermissionOptions = {}): Permission {
  return new PermissionManager(options);
}

/**
 * Get or create the global singleton Permission instance.
 *
 * On first call without arguments, creates an empty Permission instance.
 * Subsequent calls return the same instance.
 *
 * @param options - Permission configuration (only used on first call)
 * @returns The singleton Permission instance
 *
 * @example
 * ```ts
 * // Initialize once
 * usePermission({ permissions: ['dashboard:view'] });
 *
 * // Access anywhere
 * const perm = usePermission();
 * perm.hasPermission('dashboard:view'); // true
 * ```
 */
export function usePermission(options?: PermissionOptions): Permission {
  if (!_instance) {
    _instance = createPermission(options || {});
  }
  return _instance;
}

/**
 * Vue-like directive for permission-based element visibility.
 *
 * When the bound value is a permission string or array of permission strings,
 * the element is only shown if the user has at least one of the specified permissions.
 *
 * @param value - Permission string(s) to check
 * @returns A directive object
 *
 * @example
 * ```ts
 * // In a component setup:
 * const app = createApp({...});
 * app.directive('permission', vPermission);
 *
 * // In template:
 * // <button v-permission="'user:write'">Edit</button>
 * // <button v-permission="['user:write', 'admin']">Edit</button>
 * ```
 */
export function vPermission(value: string | string[]): Directive<DirectiveBinding> {
  const perm = usePermission();

  const check = (el: any, binding: DirectiveBinding): void => {
    const val = binding.value ?? value;
    const permissions = Array.isArray(val) ? val : [val];
    const hasAccess = perm.hasAnyPermission(permissions);

    if (!hasAccess) {
      // Remove the element from the DOM
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
  };

  return {
    beforeMount: check,
    updated: check,
  };
}

/**
 * Vue-like directive for role-based element visibility.
 *
 * When the bound value is a role string or array of role strings,
 * the element is only shown if the user has at least one of the specified roles.
 *
 * @param value - Role string(s) to check
 * @returns A directive object
 *
 * @example
 * ```ts
 * // In a component setup:
 * const app = createApp({...});
 * app.directive('role', vRole);
 *
 * // In template:
 * // <div v-role="'admin'">Admin Panel</div>
 * // <div v-role="['admin', 'editor']">Content</div>
 * ```
 */
export function vRole(value: string | string[]): Directive<DirectiveBinding> {
  const perm = usePermission();

  const check = (el: any, binding: DirectiveBinding): void => {
    const val = binding.value ?? value;
    const roles = Array.isArray(val) ? val : [val];
    const hasAccess = perm.hasAnyRole(roles);

    if (!hasAccess) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }
  };

  return {
    beforeMount: check,
    updated: check,
  };
}
