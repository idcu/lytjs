/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
/**
 * tests/index.test.ts
 * Tests for @lytjs/common-security
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeHTML, DANGEROUS_EVENT_ATTRS, isSafeAttribute } from '../src/index';

// ============================================================
// DANGEROUS_EVENT_ATTRS
// ============================================================

describe('DANGEROUS_EVENT_ATTRS', () => {
  it('should be a Set', () => {
    expect(DANGEROUS_EVENT_ATTRS).toBeInstanceOf(Set);
  });

  it('should contain common event handler attributes', () => {
    expect(DANGEROUS_EVENT_ATTRS.has('onclick')).toBe(true);
    expect(DANGEROUS_EVENT_ATTRS.has('onerror')).toBe(true);
    expect(DANGEROUS_EVENT_ATTRS.has('onload')).toBe(true);
    expect(DANGEROUS_EVENT_ATTRS.has('onmouseover')).toBe(true);
    expect(DANGEROUS_EVENT_ATTRS.has('onfocus')).toBe(true);
  });

  it('should contain touch event attributes', () => {
    expect(DANGEROUS_EVENT_ATTRS.has('ontouchstart')).toBe(true);
    expect(DANGEROUS_EVENT_ATTRS.has('ontouchend')).toBe(true);
  });

  it('should contain pointer event attributes', () => {
    expect(DANGEROUS_EVENT_ATTRS.has('onpointerdown')).toBe(true);
    expect(DANGEROUS_EVENT_ATTRS.has('onpointermove')).toBe(true);
  });

  it('should contain security-related event attributes', () => {
    expect(DANGEROUS_EVENT_ATTRS.has('onsecuritypolicyviolation')).toBe(true);
  });

  it('should not contain non-event attributes', () => {
    expect(DANGEROUS_EVENT_ATTRS.has('class')).toBe(false);
    expect(DANGEROUS_EVENT_ATTRS.has('id')).toBe(false);
    expect(DANGEROUS_EVENT_ATTRS.has('href')).toBe(false);
  });
});

// ============================================================
// isSafeAttribute
// ============================================================

describe('isSafeAttribute', () => {
  it('should return true for safe attributes', () => {
    expect(isSafeAttribute('class', 'foo')).toBe(true);
    expect(isSafeAttribute('id', 'my-id')).toBe(true);
    expect(isSafeAttribute('data-test', 'value')).toBe(true);
  });

  it('should return false for dangerous event attributes', () => {
    expect(isSafeAttribute('onclick', 'alert(1)')).toBe(false);
    expect(isSafeAttribute('onerror', 'alert(1)')).toBe(false);
    expect(isSafeAttribute('ONLOAD', 'alert(1)')).toBe(false); // case-insensitive
  });

  it('should return true for safe URL attributes', () => {
    expect(isSafeAttribute('href', 'https://example.com')).toBe(true);
    expect(isSafeAttribute('src', 'https://example.com/img.png')).toBe(true);
    expect(isSafeAttribute('action', 'https://example.com/submit')).toBe(true);
  });

  it('should return false for javascript: URLs', () => {
    expect(isSafeAttribute('href', 'javascript:alert(1)')).toBe(false);
    expect(isSafeAttribute('src', 'javascript:void(0)')).toBe(false);
  });

  it('should return false for vbscript: URLs', () => {
    expect(isSafeAttribute('href', 'vbscript:msgbox(1)')).toBe(false);
  });

  it('should return false for data: URLs on href', () => {
    expect(isSafeAttribute('href', 'data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('should return true for allowed protocols', () => {
    expect(isSafeAttribute('href', 'mailto:test@example.com')).toBe(true);
    expect(isSafeAttribute('href', 'tel:+1234567890')).toBe(true);
    expect(isSafeAttribute('href', '#section')).toBe(true);
    expect(isSafeAttribute('href', '')).toBe(true);
  });

  it('should be case-insensitive for attribute names', () => {
    expect(isSafeAttribute('OnClick', 'alert(1)')).toBe(false);
    expect(isSafeAttribute('HREF', 'javascript:alert(1)')).toBe(false);
  });
});

// ============================================================
// sanitizeHTML
// ============================================================

describe('sanitizeHTML', () => {
  it('should return safe HTML unchanged', () => {
    const input = '<div class="foo"><p>Hello World</p></div>';
    expect(sanitizeHTML(input)).toBe(input);
  });

  it('should remove <script> tags', () => {
    const input = '<div><script>alert("xss")</script></div>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('script');
    expect(result).not.toContain('<script');
    expect(result).toContain('<div>');
    expect(result).toContain('</div>');
  });

  it('should remove <iframe> tags', () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('iframe');
  });

  it('should remove <object> tags', () => {
    const input = '<object data="evil.swf"></object>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('object');
  });

  it('should remove <embed> tags', () => {
    const input = '<embed src="evil.swf">';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('embed');
  });

  it('should remove <form> tags', () => {
    const input = '<form action="https://evil.com"><input type="text"></form>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('form');
    expect(result).not.toContain('input');
  });

  it('should remove <link> tags', () => {
    const input = '<link rel="stylesheet" href="evil.css">';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('link');
  });

  it('should remove <meta> tags', () => {
    const input = '<meta http-equiv="refresh" content="0;url=evil.com">';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('meta');
  });

  it('should remove <base> tags', () => {
    const input = '<base href="https://evil.com/">';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('base');
  });

  it('should strip onclick event handlers', () => {
    const input = '<div onclick="alert(1)">Click me</div>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('onclick');
    expect(result).toContain('Click me');
  });

  it('should strip onerror event handlers', () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('onerror');
  });

  it('should strip event handlers without values', () => {
    const input = '<div onerror>content</div>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('onerror');
  });

  it('should neutralize javascript: in href', () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('javascript:');
    // URI_ATTR handler replaces the value with empty string
    expect(result).toContain('href=""');
  });

  it('should neutralize javascript: in src', () => {
    const input = '<img src="javascript:alert(1)">';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('javascript:');
  });

  it('should handle double-encoded payloads', () => {
    const input = '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>';
    const result = sanitizeHTML(input);
    // After decoding, the script tags should be removed
    expect(result).not.toContain('script');
  });

  it('should handle case-insensitive dangerous tags', () => {
    const input = '<SCRIPT>alert(1)</SCRIPT>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('script');
    expect(result.toLowerCase()).not.toContain('<script');
  });

  it('should handle case-insensitive event handlers', () => {
    const input = '<div ONCLICK="alert(1)">text</div>';
    const result = sanitizeHTML(input);
    expect(result.toLowerCase()).not.toContain('onclick');
  });

  it('should handle whitespace obfuscation in javascript: URLs', () => {
    const input = '<a href="java\tscript:alert(1)">Click</a>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('javascript:');
  });

  it('should neutralize data:image/svg+xml URIs', () => {
    const input = '<a href="data:image/svg+xml,<svg onload=alert(1)>">Click</a>';
    const result = sanitizeHTML(input);
    expect(result).toContain('href=""');
  });

  it('should remove expression() from style attributes', () => {
    const input = '<div style="width: expression(alert(1))">text</div>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('expression(');
  });

  it('should handle empty string', () => {
    expect(sanitizeHTML('')).toBe('');
  });

  it('should handle plain text', () => {
    expect(sanitizeHTML('Hello World')).toBe('Hello World');
  });

  it('should preserve safe attributes', () => {
    const input = '<div class="container" id="main" data-value="123">text</div>';
    const result = sanitizeHTML(input);
    expect(result).toContain('class="container"');
    expect(result).toContain('id="main"');
    expect(result).toContain('data-value="123"');
  });

  it('should handle self-closing dangerous tags', () => {
    const input = '<br/><script type="text/javascript" />text';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('script');
  });

  it('should handle multiple dangerous tags', () => {
    const input = '<script>a</script><iframe>b</iframe><object>c</object>';
    const result = sanitizeHTML(input);
    expect(result).not.toContain('script');
    expect(result).not.toContain('iframe');
    expect(result).not.toContain('object');
  });
});
