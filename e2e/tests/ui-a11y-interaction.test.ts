/**
 * B05 · Golden 20 真实浏览器交互验证（Playwright + Chromium）
 *
 * 补 B04 遗留：此前遮罩点击 / ESC / 焦点陷阱**只有 jsdom 单测**，没有真实浏览器点击。
 * jsdom 不跑布局、不跑原生 Tab 顺序、不跑 `:focus-visible`，因此这三项必须在浏览器里验。
 *
 * 宿主页：`playground/ui-a11y.html`（永久页面，alias 到 ui 源码）。
 * 证据：`evaluation/evidence/B05-browser/*.png`。
 */
import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const EVIDENCE = join(__dirname, '../../../evaluation/evidence/B05-browser');
mkdirSync(EVIDENCE, { recursive: true });

/** 打开宿主页并等待挂载完成。 */
async function boot(page: Page): Promise<void> {
  await page.goto('/ui-a11y.html');
  await expect(page.locator('#harness')).toBeVisible();
}

/** 当前焦点是否在某个容器内。 */
async function focusInside(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return Boolean(el && document.activeElement && el.contains(document.activeElement));
  }, selector);
}

/** 容器内按真实可见性列出的可聚焦元素（与 focusTrap 的过滤口径一致）。 */
async function focusables(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return [];
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
      ),
    )
      .filter((el) => !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0)
      .map((el, i) => {
        el.setAttribute('data-focus-index', String(i));
        return el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + `.${i}`;
      });
  }, selector);
}

/** 读取当前 data-focus-index（用于断言首尾环绕）。 */
async function activeFocusIndex(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return el?.getAttribute('data-focus-index') ?? null;
  });
}

async function waitFocusInside(page: Page, selector: string): Promise<void> {
  await page.waitForFunction(
    (sel) => {
      const root = document.querySelector(sel);
      return Boolean(root && document.activeElement && root.contains(document.activeElement));
    },
    selector,
    { timeout: 5000 },
  );
}

// ── Dialog ───────────────────────────────────────────────────────────
test('Dialog：遮罩点击关闭，焦点归还触发按钮', async ({ page }) => {
  await boot(page);
  await page.click('#open-dialog');
  await expect(page.locator('.lyt-dialog__wrapper')).toBeVisible();
  await waitFocusInside(page, '.lyt-dialog');
  await page.screenshot({ path: join(EVIDENCE, 'dialog-open.png') });

  // 点左上角（遮罩区域，避开居中内容盒）
  await page.locator('.lyt-dialog__overlay').click({ position: { x: 12, y: 12 } });
  await expect(page.locator('.lyt-dialog__wrapper')).toHaveCount(0);
  await expect(page.locator('#open-dialog')).toBeFocused();
});

test('Dialog：ESC 关闭，焦点归还触发按钮', async ({ page }) => {
  await boot(page);
  await page.click('#open-dialog');
  await expect(page.locator('.lyt-dialog__wrapper')).toBeVisible();
  await waitFocusInside(page, '.lyt-dialog');

  await page.keyboard.press('Escape');
  await expect(page.locator('.lyt-dialog__wrapper')).toHaveCount(0);
  await expect(page.locator('#open-dialog')).toBeFocused();
});

test('Dialog：Tab 焦点陷阱在首尾环绕，不会走到背后的页面', async ({ page }) => {
  await boot(page);
  await page.click('#open-dialog');
  await waitFocusInside(page, '.lyt-dialog');
  const list = await focusables(page, '.lyt-dialog');
  expect(list.length).toBeGreaterThanOrEqual(3);

  // 焦点在第一个：Shift+Tab 应环绕到最后一个
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.lyt-dialog [data-focus-index="0"]')!.focus();
  });
  await page.keyboard.press('Shift+Tab');
  expect(await activeFocusIndex(page)).toBe(String(list.length - 1));
  expect(await focusInside(page, '.lyt-dialog')).toBe(true);

  // 焦点在最后一个：Tab 应环绕回第一个
  await page.keyboard.press('Tab');
  expect(await activeFocusIndex(page)).toBe('0');
  expect(await focusInside(page, '.lyt-dialog')).toBe(true);

  // 连按 6 次 Tab 仍在弹层内（不会逃到 trigger / 页面）
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  expect(await focusInside(page, '.lyt-dialog')).toBe(true);

  await page.keyboard.press('Escape');
  await expect(page.locator('.lyt-dialog__wrapper')).toHaveCount(0);
});

// ── Modal ────────────────────────────────────────────────────────────
test('Modal：遮罩点击与 ESC 都能关闭，焦点归还', async ({ page }) => {
  await boot(page);
  await page.click('#open-modal');
  await expect(page.locator('.lyt-modal__overlay')).toBeVisible();
  await waitFocusInside(page, '.lyt-modal');
  await page.screenshot({ path: join(EVIDENCE, 'modal-open.png') });

  await page.locator('.lyt-modal__overlay').click({ position: { x: 12, y: 12 } });
  await expect(page.locator('.lyt-modal__overlay')).toHaveCount(0);
  await expect(page.locator('#open-modal')).toBeFocused();

  await page.click('#open-modal');
  await waitFocusInside(page, '.lyt-modal');
  await page.keyboard.press('Escape');
  await expect(page.locator('.lyt-modal__overlay')).toHaveCount(0);
  await expect(page.locator('#open-modal')).toBeFocused();
});

test('Modal：Tab 首尾环绕', async ({ page }) => {
  await boot(page);
  await page.click('#open-modal');
  await waitFocusInside(page, '.lyt-modal');
  const list = await focusables(page, '.lyt-modal');
  expect(list.length).toBeGreaterThanOrEqual(3);

  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.lyt-modal [data-focus-index="0"]')!.focus();
  });
  await page.keyboard.press('Shift+Tab');
  expect(await activeFocusIndex(page)).toBe(String(list.length - 1));

  await page.keyboard.press('Tab');
  expect(await activeFocusIndex(page)).toBe('0');
  await page.keyboard.press('Escape');
});

// ── Drawer ───────────────────────────────────────────────────────────
test('Drawer：遮罩点击与 ESC 都能关闭，焦点归还', async ({ page }) => {
  await boot(page);
  await page.click('#open-drawer');
  await expect(page.locator('.lyt-drawer__overlay')).toBeVisible();
  await waitFocusInside(page, '.lyt-drawer__container');
  await page.screenshot({ path: join(EVIDENCE, 'drawer-open.png') });

  await page.locator('.lyt-drawer__overlay').click({ position: { x: 12, y: 12 } });
  await expect(page.locator('.lyt-drawer__overlay')).toHaveCount(0);
  await expect(page.locator('#open-drawer')).toBeFocused();

  await page.click('#open-drawer');
  await waitFocusInside(page, '.lyt-drawer__container');
  await page.keyboard.press('Escape');
  await expect(page.locator('.lyt-drawer__overlay')).toHaveCount(0);
  await expect(page.locator('#open-drawer')).toBeFocused();
});

test('Drawer：Tab 首尾环绕', async ({ page }) => {
  await boot(page);
  await page.click('#open-drawer');
  await waitFocusInside(page, '.lyt-drawer__container');
  const list = await focusables(page, '.lyt-drawer__container');
  expect(list.length).toBeGreaterThanOrEqual(2);

  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.lyt-drawer__container [data-focus-index="0"]')!.focus();
  });
  await page.keyboard.press('Shift+Tab');
  expect(await activeFocusIndex(page)).toBe(String(list.length - 1));

  await page.keyboard.press('Tab');
  expect(await activeFocusIndex(page)).toBe('0');
  await page.keyboard.press('Escape');
});

// ── 键盘路径（Golden 20）─────────────────────────────────────────────
test('InputNumber：Enter / Space 激活加减按钮', async ({ page }) => {
  await boot(page);
  const value = page.locator('#ha-input-number .lyt-input-number__input');
  await expect(value).toHaveValue('5');

  await page.locator('#ha-input-number .lyt-input-number__increase').focus();
  await page.keyboard.press('Enter');
  await expect(value).toHaveValue('6');

  await page.locator('#ha-input-number .lyt-input-number__decrease').focus();
  await page.keyboard.press('Space');
  await expect(value).toHaveValue('5');
});

test('Pagination：键盘可切页（原生 button）', async ({ page }) => {
  await boot(page);
  const next = page.locator('#ha-pagination .lyt-pagination__next');
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#ha-pagination .lyt-pagination__btn--active')).toHaveText('2');
});
