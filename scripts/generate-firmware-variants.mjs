import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const sourcePath = join(root, 'firmware', 'starlight_esp32', 'starlight_esp32.ino')
const librariesPath = join(root, 'firmware', 'starlight_esp32', 'libraries.txt')
const source = readFileSync(sourcePath, 'utf8')

const profiles = [
  { folder: 'wokwi', filename: 'starlight_wokwi.ino', value: 1, label: 'Wokwi' },
  { folder: 'physical', filename: 'starlight_physical.ino', value: 0, label: 'ESP32 física' },
]

for (const profile of profiles) {
  const destination = join(root, 'firmware', profile.folder)
  mkdirSync(destination, { recursive: true })
  const configured = source
    .replace('#define WOKWI_PROFILE 1\n#endif', `#define WOKWI_PROFILE ${profile.value}\n#endif`)
    .replace('/*\n  STARLIGHT', `/*\n  Arquivo completo gerado para: ${profile.label}\n\n  STARLIGHT`)
  writeFileSync(join(destination, profile.filename), configured)
  copyFileSync(librariesPath, join(destination, 'libraries.txt'))
}

console.log('Firmwares completos gerados para Wokwi e ESP32 física.')
