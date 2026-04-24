/**
 * Lyt.js js-framework-benchmark - 工具函数
 *
 * 提供数据生成和通用工具函数。
 */

// ============================================================
// 数据生成
// ============================================================

const adjectives = [
  'pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome',
  'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful',
  'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap',
  'expensive', 'fancy',
]

const colours = [
  'red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown',
  'white', 'black', 'orange',
]

const nouns = [
  'table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie',
  'sandwich', 'burger', 'pizza', 'mouse', 'keyboard',
]

/**
 * 生成随机整数 [0, max)
 */
function _random(max) {
  return Math.round(Math.random() * 1000) % max
}

/**
 * 构建指定数量的测试数据
 * @param {number} count - 数据条数
 * @returns {Array<{id: number, label: string}>}
 */
export function buildData(count = 1000) {
  const data = []
  for (let i = 0; i < count; i++) {
    data.push({
      id: i + 1,
      label:
        adjectives[_random(adjectives.length)] +
        ' ' +
        colours[_random(colours.length)] +
        ' ' +
        nouns[_random(nouns.length)],
    })
  }
  return data
}

/**
 * 生成下一个可用 ID
 * @param {Array<{id: number}>} data
 * @returns {number}
 */
export function getNextId(data) {
  let max = 0
  for (let i = 0; i < data.length; i++) {
    if (data[i].id > max) max = data[i].id
  }
  return max + 1
}
