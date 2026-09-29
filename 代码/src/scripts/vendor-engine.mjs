/**
 * 把六大 Agent 引擎源码同步到 server/engine/,使本仓库自包含。
 *
 * 用途:引擎的开发位置与交付仓库曾分开,server/engine-server.ts 原本
 * import 仓库外的路径,导致仓库无法独立运行。此脚本把引擎源码复制进来。
 *
 * 现状:server/engine/ 已内联并成为本仓库的正式源码位置,日常运行无需再执行本脚本。
 * 仅当引擎在上游有更新、需要重新同步时才运行:
 *
 *   node scripts/vendor-engine.mjs <引擎源码目录>
 *
 * 例:node scripts/vendor-engine.mjs ../源代码/src
 */
import { cp, mkdir, readdir, stat, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const srcArg = process.argv[2]
if (!srcArg) {
  console.error('用法: node scripts/vendor-engine.mjs <引擎源码目录>')
  console.error('  例: node scripts/vendor-engine.mjs ../源代码/src')
  process.exit(1)
}

const SRC = path.resolve(repoRoot, srcArg)
const DEST = path.join(repoRoot, 'server', 'engine')

async function countTs(dir) {
  let n = 0
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += await countTs(path.join(dir, e.name))
    else if (e.name.endsWith('.ts')) n++
  }
  return n
}

const s = await stat(SRC).catch(() => null)
if (!s?.isDirectory()) {
  console.error('[vendor] 找不到引擎源码目录:', SRC)
  process.exit(1)
}

// 先清掉旧副本,避免残留已删除的文件
await rm(DEST, { recursive: true, force: true })
await mkdir(DEST, { recursive: true })

// 保留目录结构复制 —— 引擎内部用的是相对 import('./types/...' / '../core/...'),
// 结构一致才能解析。tests/ 一并带上,便于日后产出测试结果。
await cp(SRC, DEST, {
  recursive: true,
  filter: (src) => !src.includes('node_modules'),
})

console.log('[vendor] 引擎已内联 ->', path.relative(repoRoot, DEST))
console.log('[vendor] .ts 文件数:', await countTs(DEST))
