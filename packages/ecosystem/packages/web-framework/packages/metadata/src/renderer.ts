import type { Metadata } from './types';
import { escapeHTML } from '@lytjs/common-string';

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
