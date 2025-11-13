# Ardent API - Docker Deployment

Docker-Image für die Ardent API, gehostet auf GitHub Container Registry (GHCR).

## 🐳 Docker Image

Das Image wird automatisch gebaut und auf GHCR veröffentlicht:

```
ghcr.io/edtoolbox/ardent-api:latest
ghcr.io/edtoolbox/ardent-api:node24
ghcr.io/edtoolbox/ardent-api:v6.2.0
```

## 🚀 Schnellstart

### Mit Docker Run

```bash
docker run -d \
  --name ardent-api \
  -p 3002:3002 \
  -v ardent-data:/app/data \
  -e ARDENT_API_BASE_URL=http://localhost:3002/api \
  ghcr.io/edtoolbox/ardent-api:latest
```

### Mit Docker Compose

```bash
docker-compose up -d
```

## 📦 Volumes

Das Container verwendet folgende Volumes für Datenpersistenz:

- `/app/data` - SQLite Datenbanken (systems.db, locations.db, stations.db, trade.db)
- `/app/data/cache` - Cache-Dateien (Stats, JSON-Daten)
- `/app/backups` - Datenbank-Backups
- `/app/downloads` - Downloads

## 🔧 Umgebungsvariablen

| Variable | Beschreibung | Standard |
|----------|--------------|----------|
| `NODE_ENV` | Node.js Umgebung | `production` |
| `ARDENT_API_BASE_URL` | Basis-URL der API | `http://localhost:3002/api` |
| `ARDENT_API_LOCAL_PORT` | Port auf dem die API läuft | `3002` |
| `ARDENT_DATA_DIR` | Verzeichnis für Daten | `/app/data` |
| `ARDENT_CACHE_DIR` | Cache-Verzeichnis | `/app/data/cache` |
| `ARDENT_BACKUP_DIR` | Backup-Verzeichnis | `/app/backups` |
| `ARDENT_DOWNLOADS_DIR` | Download-Verzeichnis | `/app/downloads` |
| `ARDENT_DOMAIN` | Domain für die API | `ardent-insight.com` |

## 🏗️ Multi-Container Setup

Für ein komplettes Ardent-Setup mit Collector, API und Web:

```yaml
version: '3.8'

services:
  ardent-collector:
    image: ghcr.io/edtoolbox/ardent-collector:latest
    volumes:
      - ardent-data:/app/data
    networks:
      - ardent-network

  ardent-api:
    image: ghcr.io/edtoolbox/ardent-api:latest
    ports:
      - "3002:3002"
    volumes:
      - ardent-data:/app/data
    networks:
      - ardent-network
    depends_on:
      - ardent-collector

  ardent-www:
    image: ghcr.io/edtoolbox/ardent-www:latest
    ports:
      - "3000:3000"
    networks:
      - ardent-network
    depends_on:
      - ardent-api

volumes:
  ardent-data:
    driver: local

networks:
  ardent-network:
    driver: bridge
```

## 🔍 Health Check

Das Image enthält einen Health-Check der `/api` aufruft:

```bash
docker inspect --format='{{json .State.Health}}' ardent-api
```

## 🛠️ Build selbst erstellen

```bash
# Image bauen
docker build -t ardent-api:local .

# Mit spezifischer Platform
docker buildx build --platform linux/amd64,linux/arm64 -t ardent-api:local .
```

## 📊 Logs anzeigen

```bash
# Alle Logs
docker logs ardent-api

# Live-Logs folgen
docker logs -f ardent-api

# Letzte 100 Zeilen
docker logs --tail 100 ardent-api
```

## 🔄 Updates

```bash
# Neuestes Image pullen
docker pull ghcr.io/edtoolbox/ardent-api:latest

# Container neu starten
docker-compose down
docker-compose up -d
```

## 🐛 Debugging

```bash
# Shell im laufenden Container
docker exec -it ardent-api sh

# Container Stats
docker stats ardent-api

# Inspect
docker inspect ardent-api
```

## 📝 Hinweise

- Das Image basiert auf **Node.js 24 Alpine** für minimale Größe
- SQLite Datenbanken müssen persistent gemountet werden
- Der Container läuft als non-root User für bessere Sicherheit
- Multi-Platform Support: `linux/amd64` und `linux/arm64`

## 🏷️ Verfügbare Tags

- `latest` - Neuester Build vom main Branch
- `node24` - Build vom node24 Branch
- `v6.2.0` - Spezifische Version
- `main-{sha}` - Build von spezifischem Commit

## 🔐 Image von GHCR pullen

Öffentliche Images können direkt gepullt werden:

```bash
docker pull ghcr.io/edtoolbox/ardent-api:latest
```

Für private Images Login erforderlich:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

## 📞 Support

Bei Problemen bitte ein Issue im Repository erstellen.
