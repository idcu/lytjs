/**
 * Node.js custom module resolver (ESM loader)
 *
 * Used as --import parameter to resolve @lytjs/* workspace packages
 * to their dist/index.mjs files.
 *
 * Usage: node --import ./e2e/loader.mjs e2e/run-e2e.mts
 */

import { register } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

const projectRoot = new URL('../', import.meta.url).pathname

const packageMap = {
  '@lytjs/common': 'packages/common/dist/index.mjs',
  '@lytjs/reactivity': 'packages/reactivity/dist/index.mjs',
  '@lytjs/vdom': 'packages/vdom/dist/index.mjs',
  '@lytjs/compiler': 'packages/compiler/dist/index.mjs',
  '@lytjs/renderer': 'packages/renderer/dist/index.mjs',
  '@lytjs/component': 'packages/component/dist/index.mjs',
  '@lytjs/core': 'packages/core/dist/index.mjs',
  '@lytjs/compat': 'packages/compat/dist/index.mjs',
  '@lytjs/router': 'packages/router/dist/index.mjs',
  '@lytjs/store': 'packages/store/dist/index.mjs',
}

function resolveFile(filePath) {
  // Try exact path first
  if (fs.existsSync(filePath)) return filePath
  // Try with .mjs extension
  if (fs.existsSync(filePath + '.mjs')) return filePath + '.mjs'
  // Try with .js extension
  if (fs.existsSync(filePath + '.js')) return filePath + '.js'
  // Try with /index.mjs
  if (fs.existsSync(path.join(filePath, 'index.mjs'))) return path.join(filePath, 'index.mjs')
  // Try mapping builtins/xxx to builtins-entry.mjs
  const builtinsMatch = filePath.match(/(.*)\/builtins\/(.+)$/)
  if (builtinsMatch) {
    const entryPath = builtinsMatch[1] + '/builtins-entry.mjs'
    if (fs.existsSync(entryPath)) return entryPath
  }
  return null
}

function resolve(specifier, context, nextResolve) {
  if (packageMap[specifier]) {
    const fullPath = path.resolve(projectRoot, packageMap[specifier])
    return { url: `file://${fullPath}`, shortCircuit: true }
  }
  const subpathMatch = specifier.match(/^(@lytjs\/[\w-]+)\/(.+)$/)
  if (subpathMatch) {
    const pkgName = subpathMatch[1]
    const subPath = subpathMatch[2]
    if (packageMap[pkgName]) {
      const baseDir = path.dirname(path.resolve(projectRoot, packageMap[pkgName]))
      const resolvedPath = path.resolve(baseDir, subPath)
      const file = resolveFile(resolvedPath)
      if (file) {
        return { url: `file://${file}`, shortCircuit: true }
      }
    }
  }
  return nextResolve(specifier, context)
}

export { resolve, load }

async function load(url, context, nextLoad) {
  return nextLoad(url, context)
}

register(import.meta.url)
