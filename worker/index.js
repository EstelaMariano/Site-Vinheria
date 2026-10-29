/* global STATIC_ASSETS */

const FIWARE_SERVICE = 'smart'
const FIWARE_SERVICE_PATH = '/'
const REQUEST_TIMEOUT_MS = 12000

const PROXY_TARGETS = [
  { prefix: '/api/orion', origin: 'http://13.221.253.95:1026' },
  { prefix: '/api/iot', origin: 'http://13.221.253.95:4041' },
  { prefix: '/api/sth', origin: 'http://13.221.253.95:8666' },
]

function decodeBase64(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

async function proxyFiware(request, url, target) {
  const upstreamPath = `${url.pathname.slice(target.prefix.length) || '/'}${url.search}`
  const upstreamUrl = `${target.origin}${upstreamPath}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const headers = new Headers()
  headers.set('Accept', request.headers.get('Accept') || 'application/json')
  headers.set('fiware-service', FIWARE_SERVICE)
  headers.set('fiware-servicepath', FIWARE_SERVICE_PATH)
  const contentType = request.headers.get('Content-Type')
  if (contentType) headers.set('Content-Type', contentType)

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      signal: controller.signal,
    })
    const responseHeaders = new Headers()
    responseHeaders.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json; charset=utf-8')
    responseHeaders.set('Cache-Control', 'no-store')
    const correlator = upstream.headers.get('Fiware-Correlator')
    if (correlator) responseHeaders.set('Fiware-Correlator', correlator)
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders })
  } catch (error) {
    const timeoutError = error?.name === 'AbortError'
    return jsonResponse({
      error: timeoutError ? 'fiware_timeout' : 'fiware_unavailable',
      message: timeoutError ? 'A infraestrutura FIWARE demorou para responder.' : 'Não foi possível acessar a infraestrutura FIWARE.',
      service: target.prefix.replace('/api/', ''),
    }, 502)
  } finally {
    clearTimeout(timeout)
  }
}

async function healthCheck() {
  const checks = [
    ['orion', 'http://13.221.253.95:1026/version'],
    ['iotAgent', 'http://13.221.253.95:4041/iot/about'],
    ['sthComet', 'http://13.221.253.95:8666/version'],
  ]
  const results = await Promise.all(checks.map(async ([name, endpoint]) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    try {
      const response = await fetch(endpoint, { signal: controller.signal })
      return [name, { online: response.ok, status: response.status }]
    } catch {
      return [name, { online: false, status: null }]
    } finally {
      clearTimeout(timeout)
    }
  }))
  const services = Object.fromEntries(results)
  return jsonResponse({ online: Object.values(services).every((item) => item.online), services })
}

function serveAsset(pathname) {
  const route = pathname === '/' ? '/index.html' : pathname
  const asset = STATIC_ASSETS[route] || (!pathname.startsWith('/api/') ? STATIC_ASSETS['/index.html'] : null)
  if (!asset) return null
  return new Response(decodeBase64(asset.body), {
    headers: {
      'Content-Type': asset.type,
      'Cache-Control': route === '/index.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    },
  })
}

export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/api/health' && request.method === 'GET') return healthCheck()

    const target = PROXY_TARGETS.find((item) => url.pathname === item.prefix || url.pathname.startsWith(`${item.prefix}/`))
    if (target) {
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].includes(request.method)) {
        return jsonResponse({ error: 'method_not_allowed' }, 405)
      }
      return proxyFiware(request, url, target)
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') return jsonResponse({ error: 'not_found' }, 404)
    return serveAsset(url.pathname) || jsonResponse({ error: 'not_found' }, 404)
  },
}
