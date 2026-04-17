#!/usr/bin/env node
/**
 * Lyt.js 包体积报告工具
 * 分析各包的构建产物大小，对比 Phase 1 目标
 */

import { readdirSync, statSync, readFileSync } from 'fs'
import { join, extname } from 'path'
import { gzipSync } from 'zlib'

const PACKAGES_DIR = join(import.meta.dirname, '..', 'packages')
const CORE_PACKAGES = [
  'reactivity', 'compiler', 'vdom', 'renderer',
  'component', 'core', 'router', 'store'
]

const PHASE1_TARGETS = {
  reactivity: 2.0,    // KB gzip
  compiler: 3.5,
  vdom: 2.5,
  renderer: 6.0,
  component: 3.5,
  core: 2.5,
  router: 1.8,
  store: 0.8,
}

function getPackageSize(pkgName) {
  const distDir = join(PACKAGES_DIR, pkgName, 'dist')
  try {
    const files = readdirSync(distDir)
    const mjsFile = files.find(f => f.endsWith('.mjs'))
    if (!mjsFile) return null

    const filePath = join(distDir, mjsFile)
    const content = readFileSync(filePath)
    const rawSize = content.length
    const gzippedSize = gzipSync(content, { level: 9 }).length

    return {
      raw: rawSize,
      gzip: gzippedSize,
      rawKB: (rawSize / 1024).toFixed(2),
      gzipKB: (gzippedSize / 1024).toFixed(2),
    }
  } catch {
    return null
  }
}

console.log('\n📦 Lyt.js 包体积报告\n')
console.log('─'.repeat(80))
console.log(
  '包名'.padEnd(20) +
  '原始大小'.padEnd(12) +
  'Gzip 大小'.padEnd(12) +
  'P1 目标'.padEnd(12) +
  '状态'.padEnd(10)
)
console.log('─'.repeat(80))

let totalGzip = 0
let totalTarget = 0

for (const pkg of CORE_PACKAGES) {
  const size = getPackageSize(pkg)
  const target = PHASE1_TARGETS[pkg]

  if (size) {
    const gzipKB = parseFloat(size.gzipKB)
    totalGzip += gzipKB
    totalTarget += target

    const status = gzipKB <= target ? '✅ 达标' : '⚠️ 待优化'
    console.log(
      `@lytjs/${pkg}`.padEnd(20) +
      `${size.rawKB} KB`.padEnd(12) +
      `${size.gzipKB} KB`.padEnd(12) +
      `${target} KB`.padEnd(12) +
      status.padEnd(10)
    )
  } else {
    console.log(
      `@lytjs/${pkg}`.padEnd(20) +
      '未构建'.padEnd(12) +
      '-'.padEnd(12) +
      `${target} KB`.padEnd(12) +
      '❌'.padEnd(10)
    )
  }
}

console.log('─'.repeat(80))
console.log(
  '总计'.padEnd(20) +
  ''.padEnd(12) +
  `${totalGzip.toFixed(2)} KB`.padEnd(12) +
  `${totalTarget} KB`.padEnd(12) +
  (totalGzip <= totalTarget ? '✅ 达标' : '⚠️ 待优化').padEnd(10)
)
console.log('─'.repeat(80))

const diff = totalGzip - totalTarget
if (diff > 0) {
  console.log(`\n📊 距离 Phase 1 目标还需优化 ${diff.toFixed(2)} KB gzip`)
} else {
  console.log(`\n🎉 已达成 Phase 1 目标！`)
}
