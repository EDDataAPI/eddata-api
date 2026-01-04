# EDData Collector - Cloudflare Worker Setup (Web-basiert)

**Vollständige Anleitung für das Deployment über das Cloudflare Dashboard - KEINE CLI benötigt!**

Da die API in einem Container läuft, verwenden wir das Cloudflare Web-Dashboard für das komplette Setup.

---

## 📋 Voraussetzungen

- ✅ Cloudflare Account (kostenlos)
- ✅ Domain bei Cloudflare (oder kostenlose workers.dev Subdomain)
- ✅ Web-Browser
- ❌ **KEINE** Node.js oder CLI benötigt!

---

## 🚀 Schritt-für-Schritt Anleitung

### Schritt 1: Cloudflare Account erstellen

1. Gehe zu [cloudflare.com](https://www.cloudflare.com/)
2. Klicke auf **"Sign Up"** (Registrieren)
3. Erstelle einen kostenlosen Account
4. Bestätige deine E-Mail-Adresse

### Schritt 2: Workers & Pages Dashboard öffnen

1. Logge dich bei [dash.cloudflare.com](https://dash.cloudflare.com/) ein
2. Im linken Menü: Klicke auf **"Workers & Pages"**
3. Klicke auf **"Create Application"** (oder "Create" Button)
4. Wähle **"Create Worker"**

### Schritt 3: Worker erstellen

1. **Worker Name:** Gib einen Namen ein, z.B. `eddata-collector`
   - Dieser Name wird Teil der URL: `eddata-collector.YOUR_SUBDOMAIN.workers.dev`
2. Klicke auf **"Deploy"** (keine Sorge, wir ändern den Code gleich)

### Schritt 4: Worker-Code einfügen

1. Nach dem Deployment: Klicke auf **"Edit Code"** (rechts oben)
2. Du siehst jetzt den Online-Editor
3. **Lösche den kompletten Standard-Code**
4. Kopiere den folgenden Code und füge ihn ein:

```javascript
/**
 * EDData Collector Worker
 * Cloudflare Worker für Cache-Dateien der EDData API
 */

// Origin-Server (deine API-URL anpassen!)
const ORIGIN_URL = 'https://api.eddata.dev'

// Cache-TTL Einstellungen
const CACHE_TTL = {
  'commodity-ticker.json': 3600,      // 1 Stunde
  'galnet-news.json': 3600,           // 1 Stunde  
  'database-stats.json': 900,         // 15 Minuten
  'commodities.json': 86400,          // 24 Stunden
  default: 3600
}

// CORS-Header
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    
    if (request.method === 'OPTIONS') {
      return handleCORS()
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: CORS_HEADERS
      })
    }

    try {
      if (url.pathname.startsWith('/cache/')) {
        return await handleCacheRequest(request, url, ctx)
      }

      if (url.pathname === '/health' || url.pathname === '/') {
        return handleHealthCheck()
      }

      return new Response('Not Found', { 
        status: 404,
        headers: CORS_HEADERS
      })
    } catch (error) {
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

async function handleCacheRequest(request, url, ctx) {
  const cacheKey = new Request(url.toString(), request)
  const cache = caches.default

  let response = await cache.match(cacheKey)
  
  if (response) {
    return addHeaders(response, { 'X-Cache': 'HIT' })
  }

  const originUrl = `${ORIGIN_URL}${url.pathname}`
  response = await fetch(originUrl, {
    headers: {
      'User-Agent': 'Cloudflare-Worker/EDData-Collector',
      'Accept': 'application/json'
    }
  })

  if (response.ok) {
    const responseToCache = response.clone()
    const filename = url.pathname.split('/').pop()
    const ttl = CACHE_TTL[filename] || CACHE_TTL.default
    
    const headers = new Headers(responseToCache.headers)
    headers.set('Cache-Control', `public, max-age=${ttl}`)
    headers.set('CDN-Cache-Control', `public, max-age=${ttl}`)
    
    const cachedResponse = new Response(responseToCache.body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers
    })

    ctx.waitUntil(cache.put(cacheKey, cachedResponse.clone()))
    
    return addHeaders(cachedResponse, { 'X-Cache': 'MISS' })
  }

  return addHeaders(response, { 'X-Cache': 'BYPASS' })
}

function addHeaders(response, customHeaders = {}) {
  const headers = new Headers(response.headers)
  
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })
  
  Object.entries(customHeaders).forEach(([key, value]) => {
    headers.set(key, value)
  })
  
  headers.set('X-Powered-By', 'Cloudflare Workers')
  headers.set('X-Worker-Version', '1.0.0')
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  })
}

function handleHealthCheck() {
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
```

5. **WICHTIG:** Ändere in Zeile 7 die URL:
   ```javascript
   const ORIGIN_URL = 'https://api.eddata.dev'  // ← DEINE API-URL
   ```
   
6. Klicke auf **"Save and Deploy"** (rechts oben)

### Schritt 5: Worker testen

1. In der oberen Leiste siehst du deine Worker-URL: 
   ```
   https://eddata-collector.YOUR_SUBDOMAIN.workers.dev
   ```

2. Klicke auf **"Send"** neben der URL (im Editor)
   - Oder öffne die URL in einem neuen Browser-Tab

3. Du solltest den Health Check sehen:
   ```json
   {
     "status": "healthy",
     "service": "EDData Collector Worker",
     "version": "1.0.0",
     ...
   }
   ```

4. Teste eine Cache-Datei:
   ```
   https://eddata-collector.YOUR_SUBDOMAIN.workers.dev/cache/commodity-ticker.json
   ```

### Schritt 6: Custom Domain einrichten (Optional)

Falls du eine Domain bei Cloudflare hast (z.B. `eddata.dev`):

1. Gehe zurück zum **Workers & Pages Dashboard**
2. Klicke auf deinen Worker (`eddata-collector`)
3. Tab **"Settings"** → **"Triggers"**
4. Unter **"Custom Domains"**: Klicke auf **"Add Custom Domain"**
5. Gib deine gewünschte Subdomain ein: `collector.eddata.dev`
6. Klicke auf **"Add Custom Domain"**
7. Warte 1-2 Minuten für DNS-Propagierung
8. Fertig! Jetzt läuft der Worker auf: `https://collector.eddata.dev`

### Schritt 7: Umgebungsvariablen setzen (Optional)

Falls du die Origin-URL später ändern willst, ohne Code zu editieren:

1. Im Worker-Dashboard: **"Settings"** → **"Variables"**
2. Unter **"Environment Variables"**: Klicke auf **"Add variable"**
3. Name: `ORIGIN_URL`
4. Value: `https://api.eddata.dev` (deine API-URL)
5. Klicke auf **"Deploy"**

6. Ändere im Code (Editor) Zeile 7 zu:
   ```javascript
   const ORIGIN_URL = env.ORIGIN_URL || 'https://api.eddata.dev'
   ```
7. Speichere und deploye neu

---

## ✅ Fertig!

Dein Worker ist jetzt live und bereit! 🎉

### Verwendung in deiner App:

```javascript
// Alte URL (direkt zum Server)
const apiUrl = 'http://YOUR_SERVER:3002'
fetch(`${apiUrl}/cache/commodity-ticker.json`)

// Neue URL (über Worker)
const apiUrl = 'https://eddata-collector.YOUR_SUBDOMAIN.workers.dev'
// Oder mit Custom Domain:
const apiUrl = 'https://collector.eddata.dev'
fetch(`${apiUrl}/cache/commodity-ticker.json`)
```

---

## 📊 Monitoring & Analytics

### Logs anzeigen

1. Im Worker-Dashboard: Klicke auf **"Logs"** (im Tab-Menü)
2. Wähle **"Begin log stream"**
3. Du siehst jetzt Live-Logs aller Requests

### Analytics

1. Im Worker-Dashboard: Klicke auf **"Metrics"**
2. Hier siehst du:
   - 📈 Request-Anzahl
   - ⏱️ CPU-Zeit
   - ❌ Fehlerrate
   - 🌍 Requests nach Land

### Limits prüfen

1. Gehe zu **Account Home** → **Workers & Pages**
2. Rechts oben: **"View usage"**
3. Hier siehst du:
   - Requests heute: X / 100,000
   - CPU-Zeit: Durchschnitt

---

## 🔧 Troubleshooting

### Problem: Worker gibt 404 zurück

**Lösung:**
- Stelle sicher, dass deine Origin-URL korrekt ist
- Die Origin-URL sollte auf `https://api.eddata.dev` oder deinen Server zeigen
- Teste die Origin-URL direkt im Browser

### Problem: CORS-Fehler

**Lösung:**
- Der Code enthält bereits CORS-Header
- Prüfe, ob alle `CORS_HEADERS` korrekt gesetzt sind
- Teste mit: `curl -I https://YOUR_WORKER_URL/health`

### Problem: Cache funktioniert nicht

**Lösung:**
- Prüfe in den Response-Headers: `X-Cache: HIT` oder `MISS`
- Cloudflare braucht 1-2 Requests zum "Aufwärmen"
- Cache-TTL ist in `CACHE_TTL` definiert

### Problem: Zu viele Requests (100k Limit)

**Lösung:**
- Erhöhe die Cache-TTL-Werte
- Die meisten Requests sollten aus dem Cache kommen (HIT)
- Monitoring zeigt tatsächliche Request-Zahlen

---

## 💡 Tipps & Best Practices

### Cache-Optimierung

Je länger die Cache-TTL, desto weniger Requests zum Origin:

```javascript
const CACHE_TTL = {
  'commodity-ticker.json': 3600,    // 1h - oft aktualisiert
  'database-stats.json': 900,       // 15min - sehr oft aktualisiert
  'commodities.json': 86400,        // 24h - selten aktualisiert
}
```

### Multiple Environments

Erstelle separate Worker für:
- `eddata-collector-dev` (Development)
- `eddata-collector-staging` (Staging)
- `eddata-collector` (Production)

Jeder Worker kann auf eine andere Origin-URL zeigen!

### Backup-Origin

Falls dein Haupt-Server ausfällt, füge einen Backup hinzu:

```javascript
const ORIGIN_URL = 'https://api.eddata.dev'
const BACKUP_URL = 'https://backup-api.eddata.dev'

// Im handleCacheRequest:
try {
  response = await fetch(originUrl, { ... })
} catch (error) {
  // Fallback zum Backup
  response = await fetch(originUrl.replace(ORIGIN_URL, BACKUP_URL), { ... })
}
```

---

## 📚 Weitere Ressourcen

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Dashboard Guide](https://developers.cloudflare.com/workers/get-started/dashboard/)
- [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
- [Limits & Pricing](https://developers.cloudflare.com/workers/platform/limits/)

---

## 🎯 Zusammenfassung

✅ **Was du jetzt hast:**
- Globaler Edge-Cache für deine API
- 100,000 kostenlose Requests pro Tag
- Automatisches Caching mit konfigurierbaren TTLs
- CORS-Support out-of-the-box
- Live-Monitoring & Analytics
- Keine Server-Wartung nötig!

✅ **Vorteile:**
- 🚀 Schnellere Ladezeiten für Clients weltweit
- 💰 Entlastet deinen Origin-Server
- 🛡️ DDoS-Schutz durch Cloudflare
- 📊 Built-in Analytics
- 🌍 Globale Verfügbarkeit

**Viel Erfolg mit deinem Worker!** 🎉
