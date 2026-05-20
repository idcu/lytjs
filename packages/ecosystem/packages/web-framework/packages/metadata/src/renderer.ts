/**
 * 元数据渲染器
 */
import type { Metadata } from '@lytjs/shared-types';
import { escapeHTML } from '@lytjs/common-string';

/**
 * 渲染元数据为 HTML 标签
 * 
 * @param metadata - 元数据对象
 * @returns HTML 标签字符串
 */
export function renderMetadata(metadata: Metadata): string {
  const tags: string[] = [];

  if (metadata.title) {
    tags.push(`<title>${escapeHTML(metadata.title)}</title>`);
  }

  if (metadata.description) {
    tags.push(`<meta name="description" content="${escapeHTML(metadata.description)}">`);
  }

  if (metadata.keywords && metadata.keywords.length > 0) {
    tags.push(`<meta name="keywords" content="${escapeHTML(metadata.keywords.join(', '))}">`);
  }

  if (metadata.openGraph) {
    for (const [key, value] of Object.entries(metadata.openGraph)) {
      if (value) {
        tags.push(`<meta property="og:${key}" content="${escapeHTML(String(value))}">`);
      }
    }
  }

  if (metadata.twitter) {
    for (const [key, value] of Object.entries(metadata.twitter)) {
      if (value) {
        tags.push(`<meta name="twitter:${key}" content="${escapeHTML(String(value))}">`);
      }
    }
  }

  return tags.join('\n');
}
