import { spawnSync } from 'node:child_process'
import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tauri = path.join(root, 'node_modules', '@tauri-apps', 'cli', 'tauri.js')
const temp = await mkdtemp(path.join(tmpdir(), 'mrmak-icons-'))

function generate(source, output, sizes = []) {
  const args = [tauri, 'icon', path.join(root, source), '-o', output, ...sizes.flatMap(size => ['-p', String(size)])]
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `Icon generation failed: ${source}`)
}

async function deliver(from, name, to) {
  await copyFile(path.join(from, name), path.join(root, to))
}

try {
  const primary = path.join(temp, 'primary')
  const chats = path.join(temp, 'chats')
  const menu = path.join(temp, 'menu')
  const mobile = path.join(temp, 'mobile')
  generate('desktop/icon.svg', primary)
  generate('desktop/chats-icon.svg', chats)
  generate('desktop/menu-bar-icon.svg', menu, [128])
  generate('desktop/icon.svg', mobile, [192, 512])

  for (const name of ['32x32.png', '128x128.png', 'icon.ico', 'icon.icns']) {
    await deliver(primary, name, `src-tauri/icons/${name}`)
  }
  await deliver(chats, '128x128.png', 'src-tauri/icons/chats-128x128.png')
  await deliver(chats, 'icon.ico', 'src-tauri/icons/chats.ico')
  await deliver(menu, '128x128.png', 'src-tauri/icons/menu-128x128.png')
  await deliver(mobile, '192x192.png', 'public/assets/mak-dagger-mobile-192.png')
  await deliver(mobile, '512x512.png', 'public/assets/mak-dagger-mobile-512.png')
} finally {
  await rm(temp, { recursive: true, force: true })
}
