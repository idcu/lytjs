/**
 * LytJS 官方插件使用示例
 * 
 * 演示 theme、logger、auth、storage、i18n 插件的基本用法
 */

// 导入插件
import { createThemeManager } from '@lytjs/plugin-theme';
import { createLogger } from '@lytjs/plugin-logger';
import { createAuth } from '@lytjs/plugin-auth';
import { createStorage } from '@lytjs/plugin-storage';
import { createI18n } from '@lytjs/plugin-i18n';

// 初始化插件实例
const themeManager = createThemeManager();
const logger = createLogger();
const auth = createAuth();
const storage = createStorage();
const i18n = createI18n({
  locale: 'zh-CN',
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': {
      greeting: '欢迎',
      personalGreeting: '你好，{name}！',
      changeLang: '切换语言'
    },
    'en-US': {
      greeting: 'Welcome',
      personalGreeting: 'Hello, {name}!',
      changeLang: 'Change Language'
    }
  }
});

// 主题插件演示
document.getElementById('theme-light')?.addEventListener('click', () => {
  themeManager.setTheme('light');
  updateThemeDisplay();
});

document.getElementById('theme-dark')?.addEventListener('click', () => {
  themeManager.setTheme('dark');
  updateThemeDisplay();
});

document.getElementById('theme-toggle')?.addEventListener('click', () => {
  themeManager.toggleTheme();
  updateThemeDisplay();
});

function updateThemeDisplay() {
  const themeSpan = document.getElementById('current-theme');
  if (themeSpan) {
    themeSpan.textContent = themeManager.currentTheme;
  }
}

// 日志插件演示
document.getElementById('log-info')?.addEventListener('click', () => {
  logger.info('这是一条信息日志', { timestamp: new Date().toISOString() }, 'demo');
  logger.logs.forEach(log => console.log(log));
});

document.getElementById('log-warn')?.addEventListener('click', () => {
  logger.warn('这是一条警告日志', { level: 'warning' }, 'demo');
});

document.getElementById('log-error')?.addEventListener('click', () => {
  logger.error('这是一条错误日志', { error: true }, 'demo');
});

document.getElementById('log-clear')?.addEventListener('click', () => {
  logger.clear();
  alert('日志已清空');
});

// 认证插件演示
document.getElementById('auth-login')?.addEventListener('click', () => {
  const user = {
    id: '1',
    username: 'admin',
    roles: ['admin', 'user'],
    permissions: ['read', 'write', 'delete']
  };
  auth.login(user);
  updateAuthDisplay();
});

document.getElementById('auth-logout')?.addEventListener('click', () => {
  auth.logout();
  updateAuthDisplay();
});

document.getElementById('auth-check')?.addEventListener('click', () => {
  const hasAdminRole = auth.hasRole('admin');
  const hasWritePermission = auth.hasPermission('write');
  alert(
    `认证状态: ${auth.isAuthenticated ? '已登录' : '未登录'}\n` +
    `是否有 admin 角色: ${hasAdminRole}\n` +
    `是否有 write 权限: ${hasWritePermission}`
  );
});

function updateAuthDisplay() {
  const statusSpan = document.getElementById('auth-status');
  if (statusSpan) {
    if (auth.isAuthenticated) {
      statusSpan.textContent = `已登录: ${auth.user?.username}`;
    } else {
      statusSpan.textContent = '未登录';
    }
  }
}

// 存储插件演示
document.getElementById('storage-set')?.addEventListener('click', () => {
  const keyInput = document.getElementById('storage-key') as HTMLInputElement;
  const valueInput = document.getElementById('storage-value') as HTMLInputElement;
  
  if (keyInput && valueInput && keyInput.value) {
    storage.set(keyInput.value, valueInput.value);
    alert('保存成功');
    updateStorageDisplay();
  }
});

document.getElementById('storage-get')?.addEventListener('click', () => {
  const keyInput = document.getElementById('storage-key') as HTMLInputElement;
  if (keyInput && keyInput.value) {
    const value = storage.get(keyInput.value);
    const displaySpan = document.getElementById('storage-display');
    if (displaySpan) {
      displaySpan.textContent = value ? `值: ${value}` : '键不存在';
    }
  }
});

document.getElementById('storage-clear')?.addEventListener('click', () => {
  storage.clear();
  updateStorageDisplay();
  alert('存储已清空');
});

function updateStorageDisplay() {
  const keys = storage.keys();
  const displaySpan = document.getElementById('storage-display');
  if (displaySpan) {
    displaySpan.textContent = keys.length > 0 
      ? `键列表: ${keys.join(', ')}` 
      : '空';
  }
}

// 国际化插件演示
function updateI18nDisplay() {
  const greetingEl = document.getElementById('i18n-greeting');
  if (greetingEl) {
    greetingEl.textContent = i18n.t('greeting');
  }
}

document.getElementById('lang-zh')?.addEventListener('click', () => {
  i18n.setLocale('zh-CN');
  updateI18nDisplay();
});

document.getElementById('lang-en')?.addEventListener('click', () => {
  i18n.setLocale('en-US');
  updateI18nDisplay();
});

document.getElementById('i18n-greet')?.addEventListener('click', () => {
  const nameInput = document.getElementById('i18n-name') as HTMLInputElement;
  const resultEl = document.getElementById('i18n-result');
  if (nameInput && resultEl) {
    const name = nameInput.value || 'Guest';
    resultEl.textContent = i18n.t('personalGreeting', { name });
  }
});

// 初始化
updateThemeDisplay();
updateAuthDisplay();
updateStorageDisplay();
updateI18nDisplay();

logger.info('LytJS 插件示例初始化完成');
