/**
 * @lytjs/plugin-print - Print Optimization Plugin
 *
 * Provides iframe-based printing with support for:
 * - Printing the entire current page
 * - Printing a specific DOM element by CSS selector
 * - Printing raw HTML content
 * - Hiding specified elements during print
 * - Custom print stylesheets
 * - Lifecycle hooks (before/after print)
 */

// ============================================================
// Types
// ============================================================

export interface PrintOptions {
  /** Title for the print window/tab (default: 'Print') */
  title?: string;
  /** Additional CSS stylesheet URLs to include in the print iframe */
  stylesheet?: string | string[];
  /** CSS selectors of elements to hide during printing */
  hideElements?: string[];
  /** Callback invoked before the print dialog opens */
  onBeforePrint?: () => void | Promise<void>;
  /** Callback invoked after the print dialog closes */
  onAfterPrint?: () => void | Promise<void>;
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Build the hide-elements CSS rule from selectors.
 */
function buildHideCss(selectors: string[]): string {
  if (!selectors || selectors.length === 0) return '';
  return selectors.join(', ') + ' { display: none !important; }';
}

/**
 * Collect all stylesheet URLs from the current document.
 */
function collectCurrentStylesheets(): string[] {
  const links: string[] = [];
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    try {
      if (sheet.href) {
        links.push(sheet.href);
      }
    } catch {
      // Cross-origin stylesheets will throw; skip them
    }
  }
  return links;
}

/**
 * Build the complete HTML content for the print iframe.
 */
function buildPrintHtml(
  content: string,
  options: PrintOptions,
): string {
  const { title = 'Print', stylesheet, hideElements } = options;

  // Resolve stylesheet URLs: explicit ones + current page stylesheets
  const stylesheets: string[] = [];
  if (stylesheet) {
    stylesheets.push(...(Array.isArray(stylesheet) ? stylesheet : [stylesheet]));
  }
  // Also include current page stylesheets for consistent rendering
  const currentSheets = collectCurrentStylesheets();
  stylesheets.push(...currentSheets);

  const stylesheetLinks = stylesheets
    .map(
      (href) =>
        `<link rel="stylesheet" href="${href}" media="all">`,
    )
    .join('\n    ');

  const hideCss = buildHideCss(hideElements || []);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  ${stylesheetLinks}
  <style>
    @page {
      margin: 10mm;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #333;
    }
    ${hideCss}
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

/**
 * Core print implementation: create iframe, write content, print, cleanup.
 */
async function executePrint(content: string, options: PrintOptions = {}): Promise<void> {
  const { onBeforePrint, onAfterPrint } = options;

  // Invoke before-print hook
  if (onBeforePrint) {
    await onBeforePrint();
  }

  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('[plugin-print] Failed to access iframe document');
  }

  // Write content into the iframe
  const html = buildPrintHtml(content, options);
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for resources (stylesheets, images) to load before printing
  await new Promise<void>((resolve) => {
    if (iframeDoc.readyState === 'complete') {
      resolve();
    } else {
      iframe.addEventListener('load', () => resolve(), { once: true });
    }
  });

  // Small delay to ensure rendering is complete
  await new Promise((r) => setTimeout(r, 200));

  try {
    // Trigger the print dialog
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  } catch {
    // Some browsers may throw; ignore
  }

  // Cleanup after print dialog is likely dismissed
  // Use a generous timeout since we can't reliably detect when printing finishes
  setTimeout(() => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }, 1000);

  // Invoke after-print hook
  if (onAfterPrint) {
    await onAfterPrint();
  }
}

// ============================================================
// Public API
// ============================================================

/**
 * Print the entire current page content.
 *
 * @param options - Print options
 *
 * @example
 * ```ts
 * print({
 *   title: 'My Report',
 *   hideElements: ['.no-print', '#sidebar'],
 *   onBeforePrint: () => console.log('Printing...'),
 *   onAfterPrint: () => console.log('Done'),
 * });
 * ```
 */
export function print(options?: PrintOptions): void {
  const content = document.documentElement.outerHTML;
  executePrint(content, options).catch((err) => {
    console.error('[plugin-print] Print failed:', err);
  });
}

/**
 * Print a specific DOM element selected by a CSS selector.
 *
 * The element's outer HTML will be extracted and rendered in a print iframe.
 *
 * @param selector - CSS selector for the element to print
 * @param options - Print options
 *
 * @example
 * ```ts
 * printElement('#report-table', {
 *   title: 'Table Report',
 *   stylesheet: '/print-styles.css',
 * });
 * ```
 */
export function printElement(selector: string, options?: PrintOptions): void {
  const el = document.querySelector(selector);
  if (!el) {
    console.error(`[plugin-print] Element not found: "${selector}"`);
    return;
  }
  const content = el.outerHTML;
  executePrint(content, options).catch((err) => {
    console.error('[plugin-print] Print failed:', err);
  });
}

/**
 * Print raw HTML content.
 *
 * @param html - HTML string to print
 * @param options - Print options
 *
 * @example
 * ```ts
 * printHtml('<h1>Invoice</h1><p>Amount: $100</p>', {
 *   title: 'Invoice Print',
 * });
 * ```
 */
export function printHtml(html: string, options?: PrintOptions): void {
  executePrint(html, options).catch((err) => {
    console.error('[plugin-print] Print failed:', err);
  });
}
