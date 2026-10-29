import { accessSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const workerPath = resolve(root, 'dist', 'server', 'index.js')
const manifestPath = resolve(root, 'dist', '.openai', 'hosting.json')

accessSync(workerPath)
accessSync(manifestPath)
const workerSource = readFileSync(workerPath, 'utf8')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

if (!workerSource.includes('export default')) throw new Error('Worker sem export default.')
if (!workerSource.includes('/api/orion')) throw new Error('Proxy do Orion ausente.')
if (!workerSource.includes('/api/iot')) throw new Error('Proxy do IoT Agent ausente.')
if (!workerSource.includes('/api/sth')) throw new Error('Proxy do STH-Comet ausente.')
if (!manifest.project_id) throw new Error('project_id ausente no manifesto.')
if ('static' in manifest) throw new Error('Manifesto ainda configurado como Site estático.')

console.log('Worker e manifesto validados.')
