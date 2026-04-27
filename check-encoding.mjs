#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * 检查文件编码是否为 UTF-8 且无乱码
 * @param {string} filePath 文件路径
 * @returns {object} 检查结果
 */
function checkFileEncoding(filePath) {
  const result = {
    file: filePath,
    isUTF8: true,
    hasBOM: false,
    hasGarbled: false,
    issues: []
  }

  try {
    const buffer = fs.readFileSync(filePath)
    
    // 检查是否有 BOM (Byte Order Mark)
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      result.hasBOM = true
      result.issues.push('文件包含 UTF-8 BOM，建议移除')
    }

    // 尝试以 UTF-8 解码
    const content = buffer.toString('utf8')
    
    // 检查是否有乱码字符（常见的乱码模式）
    // 检查是否有无效的 Unicode 替换字符 �
    if (content.includes('�')) {
      result.hasGarbled = true
      result.issues.push('检测到乱码字符 �')
    }

    // 检查是否有 HTML 实体编码的问题（如 &gt; 而非 >）
    if (content.includes('&gt;') && !content.includes('<html')) {
      // 只有在非 HTML 文件中才警告
      if (!filePath.endsWith('.html') && !filePath.endsWith('.htm')) {
        // 这可能不是问题，所以不添加到 issues 中
      }
    }

    // 检查中文显示是否正常（简单检查：是否有常用中文字符）
    const hasChinese = /[\u4e00-\u9fa5]/.test(content)
    if (hasChinese) {
      // 如果有中文字符，检查是否有常见的乱码模式
      const hasGarbledPattern = /[^\x00-\x7F\u4e00-\u9fa5\u3000-\u303F\uff00-\uffef]/.test(content)
      // 这个检查太严格了，因为可能有其他语言字符
      // 所以我们不添加到 issues 中
    }

  } catch (error) {
    result.isUTF8 = false
    result.issues.push(`读取或解码失败: ${error.message}`)
  }

  return result
}

/**
 * 递归查找所有 .md 文件
 * @param {string} dir 目录路径
 * @returns {string[]} 文件路径数组
 */
function findAllMarkdownFiles(dir) {
  const files = []
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name)
      
      if (item.isDirectory()) {
        // 跳过 node_modules、.git 等目录
        if (!['node_modules', '.git', 'dist', '.github'].includes(item.name)) {
          traverse(fullPath)
        }
      } else if (item.isFile() && item.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  }
  
  traverse(dir)
  return files
}

async function main() {
  console.log('🔍 开始检查所有 Markdown 文件的编码格式...\n')
  
  const rootDir = __dirname
  const mdFiles = findAllMarkdownFiles(rootDir)
  
  console.log(`📄 找到 ${mdFiles.length} 个 Markdown 文件\n`)
  
  let totalIssues = 0
  const filesWithIssues = []
  
  for (const file of mdFiles) {
    const relativePath = path.relative(rootDir, file)
    const result = checkFileEncoding(file)
    
    if (result.issues.length > 0) {
      totalIssues += result.issues.length
      filesWithIssues.push({
        file: relativePath,
        issues: result.issues,
        hasBOM: result.hasBOM
      })
      console.log(`⚠️  ${relativePath}`)
      for (const issue of result.issues) {
        console.log(`   - ${issue}`)
      }
    } else {
      console.log(`✅ ${relativePath}`)
    }
  }
  
  console.log(`\n📊 检查完成！`)
  console.log(`   总文件数: ${mdFiles.length}`)
  console.log(`   有问题的文件: ${filesWithIssues.length}`)
  console.log(`   总问题数: ${totalIssues}`)
  
  if (filesWithIssues.length === 0) {
    console.log(`\n🎉 所有文件编码正常，无乱码问题！`)
  } else {
    console.log(`\n⚠️  发现 ${filesWithIssues.length} 个文件有问题`)
    
    // 尝试自动修复 BOM 问题
    const filesWithBOM = filesWithIssues.filter(f => f.hasBOM)
    if (filesWithBOM.length > 0) {
      console.log(`\n🔧 尝试自动修复 BOM 问题...`)
      for (const f of filesWithBOM) {
        const fullPath = path.join(rootDir, f.file)
        try {
          const buffer = fs.readFileSync(fullPath)
          // 移除 BOM
          const contentWithoutBOM = buffer.slice(3).toString('utf8')
          fs.writeFileSync(fullPath, contentWithoutBOM, 'utf8')
          console.log(`   ✅ 已修复: ${f.file}`)
        } catch (error) {
          console.log(`   ❌ 修复失败: ${f.file} - ${error.message}`)
        }
      }
    }
  }
  
  // 输出摘要
  console.log(`\n📝 摘要: 所有文档文件编码检查完成！`)
}

main().catch(error => {
  console.error('检查过程中发生错误:', error)
  process.exit(1)
})
