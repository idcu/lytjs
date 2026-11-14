/**
 * C-34 负控：client/server 分割此前把**整份源码**同时内联到两侧。
 *
 * 后果：客户端产物带着服务端函数和 `import fs from 'fs'`（浏览器直接构建失败 /
 * 服务端逻辑外泄）；同时 `export function read` 与随后的 `export { read }`
 * 构成重复导出（非法 ESM）。分割必须真的裁剪。
 */
import { describe, it, expect } from 'vitest';
import { splitClientServer } from '../src/client-server-boundary';

const src = `import fs from 'fs';
export function readSecret() { return fs.readFileSync('secret.txt', 'utf8'); }
export function paint() { document.body.className = 'x'; }
export function shared(x: number) { return x * 2; }
`;

describe('C-34 client/server 分割不得双份内联', () => {
  it('客户端产物不得包含服务端函数与其导入', () => {
    const r = splitClientServer(src);

    expect(r.clientCode).not.toContain('readSecret');
    expect(r.clientCode).not.toContain('readFileSync');
    expect(r.clientCode).not.toContain("from 'fs'");
    expect(r.clientCode).toContain('paint');
  });

  it('服务端产物不得包含客户端函数', () => {
    const r = splitClientServer(src);

    expect(r.serverCode).not.toContain('paint');
    expect(r.serverCode).not.toContain('document.body');
    expect(r.serverCode).toContain('readSecret');
  });

  it('共享函数两侧都保留，且导出只出现一次（不再重复导出）', () => {
    const r = splitClientServer(src);

    for (const code of [r.clientCode, r.serverCode]) {
      expect(code).toContain('function shared');
      expect(code).not.toMatch(/export function/);
      expect(code.match(/export \{/g)).toHaveLength(1);
    }
  });
});
