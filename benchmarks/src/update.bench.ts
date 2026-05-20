/**
 * Update Benchmark - js-framework-benchmark style update tests
 *
 * Tests the performance of updating existing nodes.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, bench } from 'vitest';
import { h, ref, computed, watch, nextTick } from '@lytjs/core';

describe('update benchmark', () => {
  // Helper to generate test data
  const generateData = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      label: `Item ${i}`,
      selected: false,
    }));
  };

  bench('update single node', () => {
    const count = ref(0);
    const node = h('div', {}, () => count.value.toString());

    for (let i = 0; i < 100; i++) {
      count.value = i;
    }
    return count.value;
  });

  bench('update 1000 nodes (text content)', () => {
    const items = generateData(1000).map((item) => ({
      ...item,
      count: ref(0),
    }));

    // Simulate updates
    for (let i = 0; i < 10; i++) {
      items.forEach((item, idx) => {
        item.count.value = idx + i;
      });
    }
    return items.length;
  });

  bench('swap two rows', () => {
    const data = generateData(1000);

    // Swap rows 1 and 998 (js-framework-benchmark style)
    const temp = data[1];
    data[1] = data[998];
    data[998] = temp;

    return data.length;
  });

  bench('select row (highlight)', () => {
    const data = generateData(1000).map((item) => ({
      ...item,
      selected: ref(false),
    }));

    // Select a random row
    const selectedIndex = 500;
    data[selectedIndex].selected.value = true;

    // Deselect
    data[selectedIndex].selected.value = false;

    return data.length;
  });

  bench('remove row from middle', () => {
    const data = generateData(1000);
    data.splice(500, 1);
    return data.length;
  });

  bench('append 1000 rows', () => {
    const data = generateData(1000);
    const newRows = generateData(1000).map((item) => ({
      ...item,
      id: item.id + 1000,
    }));
    data.push(...newRows);
    return data.length;
  });

  bench('prepend 1000 rows', () => {
    const data = generateData(1000);
    const newRows = generateData(1000).map((item) => ({
      ...item,
      id: item.id - 1000,
    }));
    data.unshift(...newRows);
    return data.length;
  });

  bench('reverse list', () => {
    const data = generateData(1000);
    data.reverse();
    return data.length;
  });

  bench('filter list (half)', () => {
    const data = generateData(1000);
    const filtered = data.filter((_, i) => i % 2 === 0);
    return filtered.length;
  });

  bench('sort list', () => {
    const data = generateData(1000).map((item) => ({
      ...item,
      sortKey: Math.random(),
    }));
    data.sort((a, b) => a.sortKey - b.sortKey);
    return data.length;
  });
});
