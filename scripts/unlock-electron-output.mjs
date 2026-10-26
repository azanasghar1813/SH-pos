/**
 * electron-builder cannot overwrite dist-sh-pos/win-unpacked
 * while SH POS from a previous build is still running.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const unpacked = path.resolve('dist-sh-pos', 'win-unpacked')
const marker = 'dist-sh-pos\\\\win-unpacked'

if (!fs.existsSync(unpacked)) {
  process.exit(0)
}

console.log('[build] Closing SH POS if it is running from', unpacked)

try {
  execSync(
    `powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '*${marker}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
    { stdio: 'inherit' }
  )
} catch {
  // ignore — process may already be gone
}

await new Promise((r) => setTimeout(r, 800))
process.exit(0)
