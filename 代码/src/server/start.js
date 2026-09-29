/**
 * 一键启动：同时拉起后端引擎 API 与前端界面。
 *
 * 用法：npm run dev   （或双击上层目录的「启动.bat」）
 *
 * 路径全部相对本文件定位，因此整个文件夹可以任意移动 / 拷贝到别的电脑。
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('')
console.log('同频 Same Wavelength  —  本地服务')
console.log('--------------------------------')
console.log('')

// Windows 上 npx 是 .cmd 批处理，必须经 shell 启动；
// 若用 shell:false + 'npx.cmd'，Node 会抛 spawn EINVAL（实测）。
const children = []

function launch(label, args) {
  const child = spawn('npx', args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  })
  child.on('error', (err) => {
    console.error(`[启动失败] ${label}：${err.message}`)
  })
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[已退出] ${label} 进程结束，退出码 ${code}`)
    }
  })
  children.push(child)
  return child
}

function shutdown() {
  for (const c of children) {
    try { c.kill() } catch { /* 进程可能已结束 */ }
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// 1) 后端引擎 API（端口 3001）
launch('后端引擎 API', ['tsx', 'server/engine-server.ts'])

// 2) 前端界面（端口 5173，vite.config.ts 已设 open:true，会自动打开浏览器）
setTimeout(() => {
  launch('前端界面', ['vite', '--host', '--port', '5173'])

  console.log('')
  console.log('  前端界面：http://localhost:5173')
  console.log('  后端引擎：http://localhost:3001')
  console.log('')
  console.log('  浏览器将自动打开；若未弹出，请手动访问上面的前端地址。')
  console.log('  按 Ctrl+C 或关闭本窗口即可停止全部服务。')
  console.log('')
}, 2500)

