const CACHE_VERSION = 'pokechu-v1'
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const API_CACHE = `${CACHE_VERSION}-pokeapi`
const SPRITES_CACHE = `${CACHE_VERSION}-sprites`

const SCOPE = self.registration.scope
function withScope(path) {
  return new URL(path, SCOPE).toString()
}

const INDEX_URL = withScope('index.html')

const APP_SHELL_URLS = [
  withScope(''),
  INDEX_URL,
  withScope('manifest.json'),
  withScope('icons/pokeball.svg'),
  withScope('icons/pokeball-maskable.svg'),
]

function extractAssetUrlsFromHtml(htmlText) {
  const matches = htmlText.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)
  const assets = new Set()
  for (const match of matches) {
    const url = match?.[1]
    if (typeof url !== 'string') continue
    if (!url.includes('/assets/')) continue
    try {
      const absolute = new URL(url, SCOPE)
      if (absolute.origin === self.location.origin) assets.add(absolute.toString())
    } catch {
      // ignore invalid URLs
    }
  }
  return Array.from(assets)
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE)

      await Promise.allSettled(APP_SHELL_URLS.map((url) => cache.add(url)))

      try {
        const indexResponse = await fetch(INDEX_URL, { cache: 'no-store' })
        if (indexResponse.ok) {
          const html = await indexResponse.text()
          const assetUrls = extractAssetUrlsFromHtml(html)
          await Promise.allSettled(assetUrls.map((url) => cache.add(url)))
        }
      } catch {
        // Best-effort only: offline install should still succeed with minimal shell.
      }

      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith('pokechu-') && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

function isNavigationRequest(request) {
  return request.mode === 'navigate'
}

function isSameOrigin(url) {
  return url.origin === self.location.origin
}

function isPokeApiPokemon(url) {
  return url.origin === 'https://pokeapi.co' && url.pathname.startsWith('/api/v2/pokemon/')
}

function isSprite(url) {
  return url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('/PokeAPI/sprites/')
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timeout)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch {
    clearTimeout(timeout)
    const cached = await cache.match(request)
    if (cached) return cached
    throw new Error('NetworkFirst failed')
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => null)
  return cached ?? (await fetchPromise) ?? (await cache.match(request))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return

  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          return await networkFirst(new Request(INDEX_URL), APP_SHELL_CACHE, 1500)
        } catch {
          const cache = await caches.open(APP_SHELL_CACHE)
          const fallback = await cache.match(INDEX_URL)
          return fallback ?? Response.error()
        }
      })(),
    )
    return
  }

  if (isPokeApiPokemon(url)) {
    event.respondWith(networkFirst(request, API_CACHE, 2500))
    return
  }

  if (isSprite(url)) {
    event.respondWith(cacheFirst(request, SPRITES_CACHE))
    return
  }

  if (isSameOrigin(url)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE))
  }
})
