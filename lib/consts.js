const path = require('path')
const fs = require('fs')

// Valid config file locations
const EDDATA_CONFIG_LOCATIONS = [
  '/etc/eddata.config',
  path.join(__dirname, '../../eddata.config'),
  path.join(__dirname, '../eddata.config')
]

for (const configPath of EDDATA_CONFIG_LOCATIONS.reverse()) {
  if (fs.existsSync(configPath)) require('dotenv').config({ path: configPath })
}

// Detect container environment and adjust paths accordingly
const isContainerEnv =
  process.env.NODE_ENV === 'production' ||
  fs.existsSync('/.dockerenv') ||
  fs.existsSync('/run/.containerenv') ||
  !!process.env.KUBERNETES_SERVICE_HOST

// Container paths: /app/data (Dokploy standard), fallback to eddata-data
const defaultDataDir = isContainerEnv
  ? (fs.existsSync('/app/data') ? '/app/data' : path.join(process.cwd(), 'eddata-data'))
  : path.join(__dirname, '../eddata-data')
const defaultBackupDir = isContainerEnv
  ? (fs.existsSync('/app/backups') ? '/app/backups' : path.join(process.cwd(), 'eddata-backup'))
  : path.join(__dirname, '../eddata-backup')
const defaultDownloadsDir = isContainerEnv
  ? (fs.existsSync('/app/downloads') ? '/app/downloads' : path.join(process.cwd(), 'eddata-downloads'))
  : path.join(__dirname, '../eddata-downloads')

const EDDATA_API_BASE_URL = process.env?.EDDATA_API_BASE_URL ?? 'http://localhost:3001/api'
const EDDATA_API_LOCAL_PORT = process.env?.EDDATA_API_LOCAL_PORT ?? 3001
const EDDATA_API_DEFAULT_CACHE_CONTROL = `public, max-age=${60 * 15}, stale-while-revalidate=${60 * 60}, stale-if-error=${60 * 60}`
const EDDATA_DATA_DIR = process.env?.EDDATA_DATA_DIR ?? defaultDataDir
const EDDATA_CACHE_DIR = process.env?.EDDATA_CACHE_DIR ?? path.join(EDDATA_DATA_DIR, 'cache')
const EDDATA_BACKUP_DIR = process.env?.EDDATA_BACKUP_DIR ?? defaultBackupDir
const EDDATA_DOWNLOADS_DIR = process.env?.EDDATA_DOWNLOADS_DIR ?? defaultDownloadsDir

if (!fs.existsSync(EDDATA_CACHE_DIR)) fs.mkdirSync(EDDATA_CACHE_DIR, { recursive: true })

// Data in the Systems DB assumes these values and needs rebuilding if changes
const SYSTEM_GRID_SIZE = 100 // In light years
const SYSTEM_SECTOR_HASH_LENGTH = 8 // Enough to minimise sector ID collisions

const EDDATA_SYSTEMS_DB = path.join(EDDATA_DATA_DIR, '/systems.db')
const EDDATA_LOCATIONS_DB = path.join(EDDATA_DATA_DIR, '/locations.db')
const EDDATA_STATIONS_DB = path.join(EDDATA_DATA_DIR, '/stations.db')
const EDDATA_TRADE_DB = path.join(EDDATA_DATA_DIR, '/trade.db')

const DEFAULT_MAX_RESULTS_AGE = 7 // Default: 1 week (was 90 - too old for trading)
const MAX_RESULTS_AGE = 14 // Maximum: 2 weeks (hard limit)

const EDDATA_MARKET_TICKER_CACHE = `${EDDATA_CACHE_DIR}/commodity-ticker.json`
const EDDATA_GALNET_NEWS_CACHE = `${EDDATA_CACHE_DIR}/galnet-news.json`

const DEFAULT_NEARBY_SYSTEMS_DISTANCE = 100
const MAX_NEARBY_SYSTEMS_DISTANCE = 500 // Distance in Ly
const MAX_NEARBY_SYSTEMS_RESULTS = 1000
const MAX_NEARBY_CONTACTS_RESULTS = 20
const MAX_NEARBY_COMMODITY_RESULTS = 1000

const COMMODITY_EXPORT_SORT_OPTIONS = {
  price: 'c.buyPrice ASC',
  distance: 'distance ASC'
}
const COMMODITY_IMPORT_SORT_OPTIONS = {
  price: 'c.sellPrice DESC',
  distance: 'distance ASC'
}

module.exports = {
  EDDATA_API_BASE_URL,
  EDDATA_API_LOCAL_PORT,
  EDDATA_API_DEFAULT_CACHE_CONTROL,
  EDDATA_DATA_DIR,
  EDDATA_CACHE_DIR,
  EDDATA_BACKUP_DIR,
  EDDATA_DOWNLOADS_DIR,
  SYSTEM_GRID_SIZE,
  SYSTEM_SECTOR_HASH_LENGTH,
  EDDATA_SYSTEMS_DB,
  EDDATA_LOCATIONS_DB,
  EDDATA_STATIONS_DB,
  EDDATA_TRADE_DB,
  DEFAULT_MAX_RESULTS_AGE,
  MAX_RESULTS_AGE,
  EDDATA_MARKET_TICKER_CACHE,
  EDDATA_GALNET_NEWS_CACHE,
  DEFAULT_NEARBY_SYSTEMS_DISTANCE,
  MAX_NEARBY_SYSTEMS_DISTANCE,
  MAX_NEARBY_SYSTEMS_RESULTS,
  MAX_NEARBY_CONTACTS_RESULTS,
  MAX_NEARBY_COMMODITY_RESULTS,
  COMMODITY_EXPORT_SORT_OPTIONS,
  COMMODITY_IMPORT_SORT_OPTIONS
}
