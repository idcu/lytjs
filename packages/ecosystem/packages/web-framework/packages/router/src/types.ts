/**
 * @lytjs/router - Core type definitions
 */

import type { Signal } from '@lytjs/reactivity';

type App = { provide?: unknown; config?: { globalProperties?: Record<string, unknown> } };

type Component = unknown;

export type RouteRecordName = string | symbol;

export type RouteParams = Record<string, string | string[]>;

export type LocationQuery = Record<string, string | string[] | null>;

export function locationQueryToSearchParams(query: LocationQuery): URLSearchParams {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== null) {
          searchParams.append(key, v);
        }
      }
    } else {
      searchParams.append(key, value);
    }
  }
  return searchParams;
}

export type RouteMeta = Record<string | number | symbol, unknown>;

export interface RouteRecordRaw {
  path: string;
  name?: RouteRecordName;
  component?: Component | (() => Promise<Component>);
  children?: RouteRecordRaw[];
  redirect?: string | RouteLocationRaw | ((to: RouteLocationNormalized) => RouteLocationRaw);
  alias?: string | string[];
  meta?: RouteMeta;
  beforeEnter?: NavigationGuard;
  props?: boolean | Record<string, unknown> | ((to: RouteLocationNormalized) => Record<string, unknown>);
}

export interface RouteRecordNormalized {
  path: string;
  name: RouteRecordName | null;
  meta: RouteMeta;
  children: RouteRecordNormalized[];
  aliasOf?: RouteRecordNormalized;
  beforeEnter?: NavigationGuard | undefined;
  props: boolean | Record<string, unknown> | ((to: RouteLocationNormalized) => Record<string, unknown>);
  component?: Component | (() => Promise<Component>);
  components?: Record<string, Component | (() => Promise<Component>)>;
}

// ===== Route Location =====

export interface RouteLocationNormalized {
  name: RouteRecordName | null;
  path: string;
  fullPath: string;
  query: LocationQuery;
  hash: string;
  params: RouteParams;
  matched: RouteRecordNormalized[];
  meta: RouteMeta;
  redirectedFrom?: RouteLocationNormalized;
}

export type RouteLocationRaw =
  | string
  | {
      path?: string;
      name?: RouteRecordName | null;
      params?: RouteParams;
      query?: LocationQuery;
      hash?: string;
    };

// ===== Navigation Guards =====

export interface NavigationGuardNext {
  (): void;
  (error: Error): void;
  (location: RouteLocationRaw): void;
  (valid: boolean): void;
}

export type NavigationGuardReturn = void | Error | RouteLocationRaw | boolean | undefined;

export type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext,
) => NavigationGuardReturn;

export interface NavigationFailure {
  type: NavigationFailureType;
  from: RouteLocationNormalized;
  to: RouteLocationNormalized;
}

export enum NavigationFailureType {
  aborted = 1,
  cancelled = 2,
  duplicated = 4,
}

// ===== Router =====

export type RouterScrollBehavior = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: { left: number; top: number } | null,
) => { left: number; top: number } | void | false;

export interface RouterOptions {
  history: RouterHistory;
  routes: RouteRecordRaw[];
  scrollBehavior?: RouterScrollBehavior;
  strict?: boolean;
}

export interface Router {
  readonly currentRoute: Signal<RouteLocationNormalized>;
  readonly options: RouterOptions;
  push(to: RouteLocationRaw): Promise<NavigationFailure | void>;
  replace(to: RouteLocationRaw): Promise<NavigationFailure | void>;
  go(delta: number): void;
  back(): void;
  forward(): void;
  beforeEach(guard: NavigationGuard): () => void;
  afterEach(hook: (to: RouteLocationNormalized, from: RouteLocationNormalized, failure?: NavigationFailure) => void): () => void;
  beforeResolve(guard: NavigationGuard): () => void;
  install(app: App): void;
  isReady(): Promise<void>;
  resolveName(name: string | symbol, params?: RouteParams): { path: string } | null;
}

export type HistoryState = Record<string, unknown>;

export interface NavigationInfo {
  type: 'push' | 'replace' | 'pop';
  direction: 'back' | 'forward' | 'unknown';
  delta: number;
}

export interface RouterHistory {
  readonly location: RouteLocationNormalized;
  readonly state: HistoryState | null;
  base: string;
  push(to: RouteLocationRaw): Promise<NavigationFailure | void>;
  replace(to: RouteLocationRaw): Promise<NavigationFailure | void>;
  go(delta: number): void;
  listen(callback: (to: RouteLocationNormalized, from: RouteLocationNormalized, info: NavigationInfo) => void): () => void;
  destroy(): void;
}
