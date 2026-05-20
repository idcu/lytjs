import { compile } from './src/index.ts';

const result = compile('<ul><li v-for="item in items">{{ item.text }}</li></ul>', {
  rendererMode: 'signal',
});
console.log('Generated code:');
console.log(result.code);
