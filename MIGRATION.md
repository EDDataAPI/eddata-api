# Migration Summary: Ardent API → EDData API

## ✅ Durchgeführte Änderungen

### 1. **Projekt-Rebranding** 
- **Von:** Ardent API → **Nach:** EDData API
- Alle Referenzen zu "ARDENT" wurden durch "EDDATA" ersetzt
- Repository URLs aktualisiert auf EDDataAPI Organisation

### 2. **package.json Modernisierung**
- Name: `eddata-api`
- Version: `1.0.0` (Neustart)
- Dependencies aktualisiert:
  - `@koa/router` statt `koa-router`
  - Node.js Engine: `>=24.11.0`
- Neue Scripts hinzugefügt:
  - `npm run stats` - Datenbank-Statistiken
  - `npm run docker:build` - Docker Build
  - `npm run docker:logs` - Docker Logs

### 3. **Docker-Konfiguration**
- **Dockerfile:**
  - Multi-stage Build wie im Collector
  - Security: Non-root User (eddata)
  - Health Check verbessert
  - Node.js 24.11.0-alpine
  - Optimierte Layer-Struktur
  
- **docker-compose.yml:**
  - Service-Name: `eddata-api`
  - Port: 3001 (statt 3002)
  - Volume-Namen aktualisiert
  - Netzwerk: `eddata-network`
  - Umgebungsvariablen angepasst

### 4. **Code-Modernisierung**

#### **lib/consts.js:**
- Container-Erkennung wie im Collector
- Pfad-Management verbessert
- Alle Konstanten von ARDENT → EDDATA umbenannt
- Exports vollständig aktualisiert

#### **index.js:**
- Timestamp-Logging hinzugefügt (wie im Collector)
- Console-Output formatiert
- Header: `EDData-API-Version`
- Cache-Control optimiert (15 Minuten)

#### **router/index.js:**
- Imports aktualisiert
- Alle Routen-Pfade angepasst
- Stats-Endpunkt korrigiert

### 5. **Neue Dateien erstellt**

#### **Scripts:**
- `scripts/build-docker.sh` - Docker Build Script
- `scripts/deploy.js` - Deployment Manager
- `scripts/stats/database-stats.js` - Statistik-Generator

#### **Dokumentation:**
- `AUTHORS.md` - Credits und Lizenzen
- `.dockerignore` - Docker Build Optimierung

#### **README.md:**
- Komplett neu strukturiert
- Badges hinzugefügt
- Quick Start Guide
- Docker Deployment Anleitung

### 6. **GitHub Actions**
- Workflow aktualisiert: `docker-publish.yml`
- Multi-Platform Builds (amd64, arm64)
- Artifact Attestation
- Automatisches Tagging

### 7. **Verzeichnisstruktur**
```
eddata-api/
├── .github/
│   └── workflows/
│       └── docker-publish.yml
├── lib/
│   ├── consts.js (✅ modernisiert)
│   ├── db/
│   ├── cron-tasks/
│   ├── response/
│   └── utils/
├── router/
│   ├── index.js (✅ aktualisiert)
│   └── api/
├── scripts/
│   ├── build-docker.sh (🆕)
│   ├── deploy.js (🆕)
│   └── stats/
│       └── database-stats.js (🆕)
├── index.js (✅ modernisiert)
├── package.json (✅ modernisiert)
├── Dockerfile (✅ modernisiert)
├── docker-compose.yml (✅ modernisiert)
├── AUTHORS.md (🆕)
├── .dockerignore (🆕)
└── README.md (✅ neu strukturiert)
```

## 🔄 Breaking Changes

### Umgebungsvariablen
| Alt (Ardent) | Neu (EDData) |
|--------------|--------------|
| `ARDENT_API_BASE_URL` | `EDDATA_API_BASE_URL` |
| `ARDENT_API_LOCAL_PORT` | `EDDATA_API_LOCAL_PORT` |
| `ARDENT_DATA_DIR` | `EDDATA_DATA_DIR` |
| `ARDENT_CACHE_DIR` | `EDDATA_CACHE_DIR` |
| `ARDENT_BACKUP_DIR` | `EDDATA_BACKUP_DIR` |
| `ARDENT_DOWNLOADS_DIR` | `EDDATA_DOWNLOADS_DIR` |

### Docker
- Image: `ghcr.io/eddataapi/eddata-api:latest`
- Container: `eddata-api`
- Port: `3001` (vorher 3002)
- Volumes: `eddata-*` (vorher `ardent-*`)

### API Headers
- `EDData-API-Version` (vorher `Ardent-API-Version`)

## ✨ Neue Features

1. **Strukturiertes Logging** mit Timestamps
2. **Container-Detection** für optimale Pfade
3. **Health Checks** verbessert
4. **Security**: Non-root Docker User
5. **Multi-Platform** Docker Images
6. **Deployment Scripts** für verschiedene Umgebungen
7. **Automatische Statistik-Generierung**

## 📦 Deployment

### Development:
```bash
docker-compose up -d
```

### Production:
```bash
node scripts/deploy.js deploy --env=production
```

### Build Docker Image:
```bash
bash scripts/build-docker.sh
```

## 🔍 Testing

Nach der Migration sollten folgende Endpunkte funktionieren:

- `http://localhost:3001/` - Status
- `http://localhost:3001/api` - API Info
- `http://localhost:3001/api/v2` - Stats (redirect)
- `http://localhost:3001/api/v2/stats` - Database Stats
- `http://localhost:3001/api/v2/version` - API Version

## ⚠️ Wichtige Hinweise

1. **Datenbank-Migration:** Die Datenbanken müssen vom Collector bereitgestellt werden
2. **Volumes:** Bestehende Daten müssen ggf. manuell migriert werden
3. **Umgebungsvariablen:** Alle Config-Dateien aktualisieren
4. **Reverse Proxy:** Port-Änderungen beachten (3001 statt 3002)

## 🎯 Nächste Schritte

1. ✅ npm install ausführen
2. ✅ Docker Image bauen und testen
3. ⏳ Integration mit eddata-collector testen
4. ⏳ CI/CD Pipeline verifizieren
5. ⏳ Production Deployment planen

## 📚 Referenzen

- **Collector:** https://github.com/EDDataAPI/eddata-collector
- **Original Ardent API:** https://github.com/iaincollins/ardent-api
- **EDDN:** https://github.com/EDCD/EDDN
