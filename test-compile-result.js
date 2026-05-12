// 简单测试 script
import { compile } from './packages/compiler/src/index.js';

const testCases = [
  '<div>hello</div>',
  '<div>{{ message }}</div>',
  '<div><span>hello</span></div>',
];

for (const template of testCases) {
  console.log('\n=== Template:', template, '===\n');
  
  const result = compile(template, { rendererMode: 'signal' });
  console.log('Code:', result.code);
}

