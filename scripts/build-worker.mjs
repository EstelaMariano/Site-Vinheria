import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const clientDir = join(root, '.sites-build', 'client')
const outputDir = join(root, 'dist')

rmSync(join(root, '.sites-build'), { recursive: true, force: true })
rmSync(outputDir, { recursive: true, force: true })
mkdirSync(clientDir, { recursive: true })

execFileSync(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', clientDir, '--emptyOutDir'], {
  cwd: root,
  stdio: 'inherit',
})

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function filesIn(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? filesIn(path) : [path]
  })
}

const assets = Object.fromEntries(filesIn(clientDir).map((file) => {
  const route = `/${relative(clientDir, file).replaceAll('\\', '/')}`
  return [route, {
    type: mimeTypes[extname(file).toLowerCase()] || 'application/octet-stream',
    body: readFileSync(file).toString('base64'),
  }]
}))

mkdirSync(join(outputDir, 'server'), { recursive: true })
mkdirSync(join(outputDir, '.openai'), { recursive: true })
const workerSource = readFileSync(join(root, 'worker', 'index.js'), 'utf8')
writeFileSync(join(outputDir, 'server', 'index.js'), `const STATIC_ASSETS = ${JSON.stringify(assets)};\n${workerSource}`)
copyFileSync(join(root, '.openai', 'hosting.json'), join(outputDir, '.openai', 'hosting.json'))
