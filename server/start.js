/**
 * Starts the local engine API and the Vite development server together.
 *
 * Usage: npm run dev:full
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

console.log('')
console.log('Same Wavelength - Local Services')
console.log('--------------------------------')
console.log('')

const server = spawn('npx', ['tsx', 'server/engine-server.ts'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
})

server.on('error', (err) => {
  console.error('[Start] Engine API failed:', err.message)
})

setTimeout(() => {
  const vite = spawn('npx', ['vite', '--host', '--port', '5173'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  })

  vite.on('error', (err) => {
    console.error('[Start] Vite failed:', err.message)
  })

  console.log('')
  console.log('Web: http://localhost:5173')
  console.log('API: http://localhost:3001')
  console.log('')
}, 2000)

process.on('SIGINT', () => {
  server.kill()
  process.exit()
})
