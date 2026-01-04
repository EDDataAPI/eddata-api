/**
 * EDData Collector Worker
 * Cloudflare Worker für Cache-Dateien der EDData API
 * Optimiert für das kostenlose Kontingent (100k requests/day)
 */

/* global caches */

// Origin-Server (wo die Cache-Dateien generiert werden)
const ORIGIN_URL = 'https://api.eddata.dev'

// Cache-TTL Einstellungen (für Cloudflare Edge)
const CACHE_TTL = {
  'commodity-ticker.json': 3600, // 1 Stunde
  'galnet-news.json': 3600, // 1 Stunde
  'database-stats.json': 900, // 15 Minuten
  'commodities.json': 86400, // 24 Stunden
  default: 3600 // 1 Stunde
}

// CORS-Header
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
}

/**
 * Hauptfunktion - verarbeitet eingehende Requests
 */
export default {
  async fetch (request, env, ctx) {
    const url = new URL(request.url)

    // OPTIONS Request für CORS
    if (request.method === 'OPTIONS') {
      return handleCORS()
    }

    // Nur GET Requests erlauben
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: CORS_HEADERS
      })
    }

    try {
      // Cache-Dateien von /cache/* Pfad
      if (url.pathname.startsWith('/cache/')) {
        return await handleCacheRequest(request, url, ctx)
      }

      // Health Check
      if (url.pathname === '/health' || url.pathname === '/') {
        return handleHealthCheck()
      }

      // 404 für andere Pfade
      return new Response('Not Found', {
        status: 404,
        headers: CORS_HEADERS
      })
    } catch (error) {
      console.error('Worker Error:', error)
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Internal Server Error',
        error: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        }
      })
    }
  }
}

/**
 * Behandelt Cache-Requests mit Cloudflare Edge-Caching
 */
async function handleCacheRequest (request, url, ctx) {
  const cacheKey = new Request(url.toString(), request)
  const cache = caches.default

  // Versuche aus Cloudflare Cache zu lesen
  let response = await cache.match(cacheKey)

  if (response) {
    // Cache Hit - von Edge zurückgeben
    console.log('Cache HIT:', url.pathname)
    return addHeaders(response, { 'X-Cache': 'HIT' })
  }

  // Cache Miss - vom Origin-Server abrufen
  console.log('Cache MISS:', url.pathname)

  const originUrl = `${ORIGIN_URL}${url.pathname}`
  response = await fetch(originUrl, {
    headers: {
      'User-Agent': 'Cloudflare-Worker/EDData-Collector',
      Accept: 'application/json'
    }
  })

  // Nur erfolgreiche Responses cachen
  if (response.ok) {
    // Clone für Cache (Response kann nur einmal gelesen werden)
    const responseToCache = response.clone()

    // TTL basierend auf Dateiname
    const filename = url.pathname.split('/').pop()
    const ttl = CACHE_TTL[filename] || CACHE_TTL.default

    // Cache-Header setzen
    const headers = new Headers(responseToCache.headers)
    headers.set('Cache-Control', `public, max-age=${ttl}`)
    headers.set('CDN-Cache-Control', `public, max-age=${ttl}`)
    headers.set('Cloudflare-CDN-Cache-Control', `public, max-age=${ttl}`)

    const cachedResponse = new Response(responseToCache.body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers
    })

    // Im Edge Cache speichern (asynchron, blockiert Response nicht)
    ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()))

    return addHeaders(cachedResponse, { 'X-Cache': 'MISS' })
  }

  // Fehler vom Origin weiterleiten
  return addHeaders(response, { 'X-Cache': 'BYPASS' })
}

/**
 * Fügt CORS und Custom Headers hinzu
 */
function addHeaders (response, customHeaders = {}) {
  const headers = new Headers(response.headers)

  // CORS Headers
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })

  // Custom Headers
  Object.entries(customHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })

  // Worker Info
  headers.set('X-Powered-By', 'Cloudflare Workers')
  headers.set('X-Worker-Version', '1.0.0')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

/**
 * CORS Preflight Response
 */
function handleCORS () {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  })
}

/**
 * Health Check Endpoint
 */
function handleHealthCheck () {
  const health = {
    status: 'healthy',
    service: 'EDData Collector Worker',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    limits: {
      freeRequests: '100,000/day',
      cpuTime: '10ms per request'
    }
  }

  return new Response(JSON.stringify(health, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  })
}
