/**
 * @lytjs/plugin-theme
 *
 * LytJS official theme plugin for CSS variable management, dark/light mode, and custom theme support.
 *
 * @packageDocumentation
 */

import { definePlugin } from '@lytjs/core';
import { signal } from '@lytjs/reactivity';
import type { Theme, ThemeOptions, ThemeInstance } from './types';

const defaultThemes: Theme[] = [
  {
    name: 'light',
    isDark: false,
    variables: {
      '--lyt-bg-primary': '#ffffff',
      '--lyt-bg-secondary': '#f5f5f5',
      '--lyt-text-primary': '#333333',
      '--lyt-text-secondary': '#666666',
      '--lyt-primary': '#1890ff',
      '--lyt-success': '#52c41a',
      '--lyt-warning': '#faad14',
      '--lyt-error': '#ff4d4f',
      '--lyt-border': '#d9d9d9',
    },
  },
  {
    name: 'dark',
    isDark: true,
    variables: {
      '--lyt-bg-primary': '#141414',
      '--lyt-bg-secondary': '#1f1f1f',
      '--lyt-text-primary': '#ffffff',
      '--lyt-text-secondary': '#a6a6a6',
      '--lyt-primary': '#177ddc',
      '--lyt-success': '#49aa19',
      '--lyt-warning': '#d89614',
      '--lyt-error': '#d32029',
      '--lyt-border': '#434343',
    },
  },
];

function getSystemTheme(): string {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function createThemeManager(options: ThemeOptions = {}): ThemeInstance {
  const {
    defaultTheme = 'light',
    themes = defaultThemes,
    enableSystemTheme = true,
    storageKey = 'lyt-theme',
  } = options;

  const themeMap = new Map<string, Theme>(themes.map((t) => [t.name, t]));
  const currentThemeSignal = signal<string>(defaultTheme);
  const availableThemesSignal = signal<string[]>(themes.map((t) => t.name));

  let styleElement: HTMLStyleElement | null = null;
  let systemThemeMediaQuery: MediaQueryList | null = null;

  function applyThemeVariables(variables: Record<string, string>) {
    if (typeof document === 'undefined') return;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.setAttribute('data-lyt-theme', 'true');
      document.head.appendChild(styleElement);
    }

    const cssVars = Object.entries(variables)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n');

    styleElement.textContent = `:root {\n${cssVars}\n}`;
  }

  function getStoredTheme(): string | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  function setStoredTheme(name: string) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(storageKey, name);
    } catch {
    }
  }

  function setTheme(name: string) {
    if (!themeMap.has(name)) {
      console.warn(`[Theme] Theme "${name}" not found, falling back to default`);
      name = defaultTheme;
    }

    const theme = themeMap.get(name)!;
    currentThemeSignal.set(name);
    setStoredTheme(name);
    applyThemeVariables(theme.variables);

    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-lyt-theme', name);
      document.documentElement.classList.toggle('lyt-theme-dark', !!theme.isDark);
    }
  }

  function toggleTheme() {
    const available = availableThemesSignal();
    const currentIndex = available.indexOf(currentThemeSignal());
    const nextIndex = (currentIndex + 1) % available.length;
    const nextTheme = available[nextIndex];
    if (nextTheme) {
      setTheme(nextTheme);
    }
  }

  function registerTheme(theme: Theme) {
    themeMap.set(theme.name, theme);
    availableThemesSignal.set([...availableThemesSignal(), theme.name]);
  }

  function getThemeVariables(name?: string): Record<string, string> {
    const themeName = name || currentThemeSignal();
    const theme = themeMap.get(themeName);
    return theme ? theme.variables : {};
  }

  function init() {
    let initialTheme = defaultTheme;

    const storedTheme = getStoredTheme();
    if (storedTheme && themeMap.has(storedTheme)) {
      initialTheme = storedTheme;
    } else if (enableSystemTheme) {
      initialTheme = getSystemTheme();
    }

    setTheme(initialTheme);

    if (enableSystemTheme && typeof window !== 'undefined' && window.matchMedia) {
      systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      systemThemeMediaQuery.addEventListener('change', (e) => {
        const storedTheme = getStoredTheme();
        if (!storedTheme) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  init();

  return {
    get currentTheme() {
      return currentThemeSignal();
    },
    get availableThemes() {
      return availableThemesSignal();
    },
    setTheme,
    toggleTheme,
    registerTheme,
    getThemeVariables,
  };
}

const pluginTheme = definePlugin({
  name: 'theme',
  version: '6.0.0',
  description: 'LytJS official theme plugin for CSS variable management, dark/light mode, and custom theme support',
  author: 'LytJS Team',
  keywords: ['lytjs', 'theme', 'dark-mode', 'css-variables'],
  schema: {
    type: 'object',
    object: {
      properties: {
        defaultTheme: { type: 'string', default: 'light' },
        themes: { type: 'array', default: defaultThemes },
        enableSystemTheme: { type: 'boolean', default: true },
        storageKey: { type: 'string', default: 'lyt-theme' },
      },
    },
  },
  install(app, options) {
    const themeManager = createThemeManager(options as ThemeOptions);

    app.config.globalProperties.$theme = themeManager;

    app.provide('lyt-theme', themeManager);
  },
});

export default pluginTheme;
export type { Theme, ThemeOptions, ThemeInstance };
export { createThemeManager };
