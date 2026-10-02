/**
 * renderer/ssr/ssr-utils 覆盖率电池（Task C）：补齐 isSafeURL 的
 * javascript / data:* / 非法 URL 分支，以及 renderAttributeToString 的
 * class / style（string·object）/ 布尔属性 / 危险 URL 属性 / nullish 分支。
 */
import { describe, it, expect } from 'vitest';
import { isSafeURL, renderAttributeToString, isValidHTMLElementTag } from '../src/ssr/ssr-utils';

describe('ssr-utils battery: isSafeURL', () => {
  it('blocks javascript: and svg data URLs, allows safe data:image', () => {
    expect(isSafeURL('javascript:alert(1)')).toBe(false);
    expect(isSafeURL('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(isSafeURL('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isSafeURL('data:image/webp;base64,AAAA')).toBe(true);
    expect(isSafeURL('https://example.com/a.png')).toBe(true);
    expect(isSafeURL('/relative/path')).toBe(true);
    expect(isSafeURL('http://[invalid')).toBe(false);
  });
});

describe('ssr-utils battery: renderAttributeToString', () => {
  it('skips nullish values and event handlers', () => {
    expect(renderAttributeToString('title', null)).toBe('');
    expect(renderAttributeToString('title', undefined)).toBe('');
    expect(renderAttributeToString('onClick', 'fn')).toBe('');
  });

  it('handles class values', () => {
    expect(renderAttributeToString('class', 'a b')).toBe(' class="a b"');
    expect(renderAttributeToString('class', '')).toBe('');
    expect(renderAttributeToString('class', null)).toBe('');
  });

  it('handles string / object / empty style', () => {
    expect(renderAttributeToString('style', 'color:red')).toBe(' style="color:red"');
    expect(renderAttributeToString('style', '')).toBe('');
    expect(renderAttributeToString('style', { fontSize: '12px', empty: '' })).toBe(
      ' style="font-size:12px"',
    );
    expect(renderAttributeToString('style', { onlyEmpty: '' })).toBe('');
    expect(renderAttributeToString('style', 42)).toBe('');
  });

  it('handles boolean attributes', () => {
    expect(renderAttributeToString('disabled', true)).toBe(' disabled');
    expect(renderAttributeToString('disabled', false)).toBe('');
    expect(renderAttributeToString('disabled', '')).toBe('');
  });

  it('blocks dangerous URL attributes', () => {
    expect(renderAttributeToString('href', 'javascript:alert(1)')).toBe('');
    expect(renderAttributeToString('href', 'https://example.com')).toBe(
      ' href="https://example.com"',
    );
  });

  it('validates HTML tag names', () => {
    expect(isValidHTMLElementTag('div')).toBe(true);
    expect(isValidHTMLElementTag('my-element')).toBe(true);
    expect(isValidHTMLElementTag('1bad')).toBe(false);
    expect(isValidHTMLElementTag('')).toBe(false);
  });
});
