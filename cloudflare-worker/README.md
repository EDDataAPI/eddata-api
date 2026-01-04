# EDData Collector - Cloudflare Worker

Cloudflare Worker für die globale Edge-Verteilung der EDData API Cache-Dateien.

## 🎯 Zweck

Dieser Worker stellt Cache-Dateien (wie `commodity-ticker.json`, `galnet-news.json`) über das Cloudflare Edge-Netzwerk bereit:

- 🚀 **Globale Verteilung** - Daten vom nächsten Edge-Server
- 📊 **Automatisches Caching** - Intelligent am Edge gecacht
- 🛡️ **DDoS-Schutz** - Durch Cloudflare
- 💰 **Kostenlos** - Optimiert für Free Tier (100k requests/day)

## 📁 Dateien

```
cloudflare-worker/
├── worker.js           # Hauptworker-Code
├── wrangler.toml       # Cloudflare-Konfiguration
├── package.json        # Dependencies
└── README.md           # Diese Datei
```

## 🚀 Schnellstart

### 1. Voraussetzungen

- Node.js ≥18.0.0
- npm oder yarn
- Cloudflare Account (kostenlos)

### 2. Installation

```bash
cd cloudflare-worker
npm install
```

### 3. Cloudflare Login

```bash
npm run login
```

Oder manuell:
```bash
npx wrangler login
```

### 4. Konfiguration

Editiere `wrangler.toml`:

```toml
name = "eddata-collector"
account_id = "YOUR_ACCOUNT_ID"  # Von Cloudflare Dashboard
```

Finde deine Account ID:
```bash
npm run whoami
```

### 5. Deployment

#### Development (lokal testen)
```bash
npm run dev
# Worker läuft auf http://localhost:8787
```

#### Production Deployment
```bash
npm run deploy
```

Nach erfolgreichem Deployment:
- URL: `https://eddata-collector.YOUR_SUBDOMAIN.workers.dev`
- Oder Custom Domain: `https://collector.eddata.dev`

## 🔧 Konfiguration

### Origin-Server

Der Worker holt Daten von:
```javascript
const ORIGIN_URL = 'https://api.eddata.dev'
```

### Cache-TTL

Definiert in `worker.js`:
```javascript
const CACHE_TTL = {
  'commodity-ticker.json': 3600,      // 1 Stunde
  'galnet-news.json': 3600,           // 1 Stunde
  'database-stats.json': 900,         // 15 Minuten
  'commodities.json': 86400,          // 24 Stunden
  default: 3600
}
```

### Custom Domain

In `wrangler.toml` aktivieren:
```toml
route = { pattern = "collector.eddata.dev/*", zone_name = "eddata.dev" }
```

Dann deployen:
```bash
npm run deploy
```

## 📊 Verwendung

### Cache-Dateien abrufen

```javascript
// Commodity Ticker
fetch('https://collector.eddata.dev/cache/commodity-ticker.json')

// Galnet News
fetch('https://collector.eddata.dev/cache/galnet-news.json')

// Database Stats
fetch('https://collector.eddata.dev/cache/database-stats.json')
```

### Health Check

```bash
curl https://collector.eddata.dev/health
```

Response:
```json
{
  "status": "healthy",
  "service": "EDData Collector Worker",
  "version": "1.0.0",
  "timestamp": "2026-01-04T10:00:00.000Z",
  "limits": {
    "freeRequests": "100,000/day",
    "cpuTime": "10ms per request"
  }
}
```

### Cache-Status prüfen

Response Headers:
```
X-Cache: HIT         # Von Edge-Cache
X-Cache: MISS        # Neu vom Origin geladen
X-Cache: BYPASS      # Nicht gecacht (Fehler)
```

## 💰 Kostenloses Kontingent

### Limits (Free Tier)
- ✅ **100,000 Requests/Tag**
- ✅ **10ms CPU-Zeit pro Request**
- ✅ **Unbegrenzte Bandbreite**
- ✅ **Unbegrenztes Caching**

### Optimierungen
- Edge-Caching reduziert Origin-Requests
- Kurze CPU-Zeit durch einfache Logik
- CORS Preflight wird schnell beantwortet

### Monitoring

```bash
# Live-Logs anzeigen
npm run tail

# Oder direkt
npx wrangler tail
```

Im Cloudflare Dashboard:
- Analytics → Workers
- Zeigt Requests, Errors, CPU-Zeit

## 🔒 Sicherheit

### CORS-Header
```javascript
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'
```

### Erlaubte Methoden
- ✅ `GET` - Cache-Dateien abrufen
- ✅ `HEAD` - Metadaten prüfen
- ✅ `OPTIONS` - CORS Preflight
- ❌ `POST`, `PUT`, `DELETE` - Nicht erlaubt

## 🐛 Debugging

### Lokales Testen
```bash
npm run dev

# In einem anderen Terminal
curl http://localhost:8787/cache/commodity-ticker.json
curl http://localhost:8787/health
```

### Logs anzeigen
```bash
npm run tail
```

### Fehlersuche

**Problem: Worker startet nicht**
```bash
# Prüfe Konfiguration
npx wrangler whoami
npx wrangler deploy --dry-run
```

**Problem: Cache nicht aktiv**
- Prüfe Cache-Control Header
- Prüfe TTL-Werte in `worker.js`
- Cloudflare braucht 1-2 Minuten für Edge-Propagation

**Problem: 404 Fehler**
- Origin-Server muss `/cache/` Endpunkt haben
- Prüfe `ORIGIN_URL` in `worker.js`

## 📝 Entwicklung

### Worker-Code ändern

1. Editiere `worker.js`
2. Teste lokal: `npm run dev`
3. Deploye: `npm run deploy`

### Neue Cache-Dateien hinzufügen

In `worker.js` → `CACHE_TTL`:
```javascript
const CACHE_TTL = {
  'neue-datei.json': 1800,  // 30 Minuten
  // ...
}
```

## 🔗 Links

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Dashboard](https://dash.cloudflare.com/)
- [EDData API](https://github.com/EDDataAPI/eddata-api)

## 📜 Lizenz

AGPL-3.0 - Siehe [LICENSE](../LICENSE)

## 🤝 Support

- GitHub Issues: [EDDataAPI/eddata-api](https://github.com/EDDataAPI/eddata-api/issues)
- Discord: [Elite Dangerous Community](https://discord.gg/elite)

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** Januar 2026
