import { describe, bench, beforeEach } from 'vitest';
import { parse, compile, resetCacheStats, clearCompileCache } from '@lytjs/compiler';

describe('compiler benchmark', () => {
  bench('parse simple template', () => {
    const template = '<div class="container"><span>Hello World</span></div>';
    for (let i = 0; i < 100; i++) {
      parse(template);
    }
  });

  bench('parse template with interpolation', () => {
    const template =
      '<div class="container"><span>{{ message }}</span><p>{{ count + 1 }}</p></div>';
    for (let i = 0; i < 100; i++) {
      parse(template);
    }
  });

  bench('parse template with directives', () => {
    const template = `
      <div v-if="show" class="app">
        <ul>
          <li v-for="item in items" :key="item.id" @click="select(item)">
            {{ item.name }}
          </li>
        </ul>
        <input v-model="text" />
        <div v-show="visible">Conditional content</div>
      </div>
    `;
    for (let i = 0; i < 100; i++) {
      parse(template);
    }
  });

  bench('compile simple template', () => {
    const template = '<div class="container"><span>Hello World</span></div>';
    for (let i = 0; i < 100; i++) {
      compile(template);
    }
  });

  bench('compile template with interpolation', () => {
    const template =
      '<div class="container"><span>{{ message }}</span><p>{{ count + 1 }}</p></div>';
    for (let i = 0; i < 100; i++) {
      compile(template);
    }
  });

  bench('compile template with directives', () => {
    const template = `
      <div v-if="show" class="app">
        <ul>
          <li v-for="item in items" :key="item.id" @click="select(item)">
            {{ item.name }}
          </li>
        </ul>
        <input v-model="text" />
        <div v-show="visible">Conditional content</div>
      </div>
    `;
    for (let i = 0; i < 100; i++) {
      compile(template);
    }
  });
});

describe('compiler cache benchmark', () => {
  beforeEach(() => {
    clearCompileCache();
    resetCacheStats();
  });

  bench('compile with cold cache', () => {
    const template = '<div v-for="item in items">{{ item.name }}</div>';
    for (let i = 0; i < 100; i++) {
      // Clear cache on every iteration
      clearCompileCache();
      compile(template);
    }
  });

  bench('compile with warm cache', () => {
    const template = '<div v-for="item in items">{{ item.name }}</div>';
    // First compile to warm the cache
    compile(template);
    // Then compile again (should hit cache)
    for (let i = 0; i < 100; i++) {
      compile(template);
    }
  });

  bench('compile multiple templates with cache', () => {
    const templates = [
      '<div>{{ message }}</div>',
      '<ul><li v-for="item in items">{{ item }}</li></ul>',
      '<input v-model="text" />',
      '<div v-if="show">Hello</div>',
    ];
    for (let i = 0; i < 100; i++) {
      for (const template of templates) {
        compile(template);
      }
    }
  });
});
