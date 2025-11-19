const path = require('path')
const fsPromises = require('fs/promises')
const KoaRouter = require('@koa/router')
const Package = require('../package.json')

const {
  EDDATA_API_BASE_URL,
  EDDATA_CACHE_DIR,
  EDDATA_BACKUP_DIR,
  EDDATA_DOWNLOADS_DIR
} = require('../lib/consts')

const routes = {
  health: require('./api/health'),
  news: require('./api/news'),
  commodities: require('./api/commodities'),
  systems: require('./api/systems'),
  systemsCommodities: require('./api/systems/commodities'),
  systemsCommodity: require('./api/systems/commodity'),
  markets: require('./api/markets'),
  stations: require('./api/stations'),
  search: require('./api/search')
}
const router = new KoaRouter()
const dbAsync = require('../lib/db/db-async')

router.get('/api/v2', (ctx, next) => ctx.redirect(`${EDDATA_API_BASE_URL}/v2/stats`))
router.get('/v2', (ctx, next) => ctx.redirect(`${EDDATA_API_BASE_URL}/v2/stats`))

router.get('/api/v2/version', (ctx, next) => {
  ctx.body = { version: Package.version }
})

router.get('/v2/version', (ctx, next) => {
  ctx.body = { version: Package.version }
})

// Endpoints listing (with and without /api prefix)
const endpointsHandler = (ctx, next) => {
  const endpoints = {
    general: [
      { method: 'GET', path: '/v2/version', description: 'Get API version' },
      { method: 'GET', path: '/v2/health', description: 'Basic health check' },
      { method: 'GET', path: '/api/health', description: 'Standard health check' },
      { method: 'GET', path: '/api/health/database', description: 'Database health check' },
      { method: 'GET', path: '/api/status', description: 'Server status check' },
      { method: 'GET', path: '/v2/stats', description: 'Database statistics' },
      { method: 'GET', path: '/v2/stats/database/size', description: 'Database size information' },
      { method: 'GET', path: '/v2/stats/database/tables', description: 'Table-level statistics' },
      { method: 'GET', path: '/v2/endpoints', description: 'List all available endpoints' },
      { method: 'GET', path: '/api/endpoints', description: 'List all available endpoints (legacy)' }
    ],
    news: [
      { method: 'GET', path: '/v2/news/galnet', description: 'Latest Galnet news articles' },
      { method: 'GET', path: '/v2/news/commodities', description: 'Recent commodity market updates (ticker)' }
    ],
    commodities: [
      { method: 'GET', path: '/v2/commodities', description: 'All traded commodities with price ranges' },
      { method: 'GET', path: '/v2/commodities/top', description: 'Top 30 commodities by trading activity' },
      { method: 'GET', path: '/v2/commodity/name/{commodityName}', description: 'Summary for specific commodity' },
      { method: 'GET', path: '/v2/commodity/name/{commodityName}/imports', description: 'Places importing commodity (sell locations)' },
      { method: 'GET', path: '/v2/commodity/name/{commodityName}/exports', description: 'Places exporting commodity (buy locations)' }
    ],
    systems: [
      { method: 'GET', path: '/v2/system/name/{systemName}', description: 'System information by name' },
      { method: 'GET', path: '/v2/system/address/{systemAddress}', description: 'System information by address' },
      { method: 'GET', path: '/v2/systems/top', description: 'Top 30 systems by station count' },
      { method: 'GET', path: '/v2/system/name/{systemName}/status', description: 'System status from EDSM' },
      { method: 'GET', path: '/v2/system/name/{systemName}/bodies', description: 'System bodies from EDSM' },
      { method: 'GET', path: '/v2/system/name/{systemName}/markets', description: 'All markets in system' },
      { method: 'GET', path: '/v2/system/name/{systemName}/stations', description: 'All stations in system' },
      { method: 'GET', path: '/v2/system/name/{systemName}/nearby', description: 'Nearby systems' },
      { method: 'GET', path: '/v2/system/name/{systemName}/nearby/contacts', description: 'Nearby points of interest' },
      { method: 'GET', path: '/v2/system/name/{systemName}/nearest/{service}', description: 'Nearest station with service' },
      { method: 'GET', path: '/v2/system/name/{systemName}/commodities', description: 'All trade orders in system' },
      { method: 'GET', path: '/v2/system/name/{systemName}/commodities/imports', description: 'System imports (sell locations)' },
      { method: 'GET', path: '/v2/system/name/{systemName}/commodities/exports', description: 'System exports (buy locations)' },
      { method: 'GET', path: '/v2/system/name/{systemName}/commodity/name/{commodityName}', description: 'Commodity orders in specific system' },
      { method: 'GET', path: '/v2/system/name/{systemName}/commodity/name/{commodityName}/nearby/imports', description: 'Nearby imports for commodity' },
      { method: 'GET', path: '/v2/system/name/{systemName}/commodity/name/{commodityName}/nearby/exports', description: 'Nearby exports for commodity' }
    ],
    stations: [
      { method: 'GET', path: '/v2/stations/top', description: 'Top 30 stations by service count' }
    ],
    markets: [
      { method: 'GET', path: '/v2/market/{marketId}/commodities', description: 'All commodity orders for market' },
      { method: 'GET', path: '/v2/market/{marketId}/commodity/name/{commodityName}', description: 'Commodity info for specific market' }
    ],
    search: [
      { method: 'GET', path: '/v2/search/system/name/{searchTerm}', description: 'Search systems by name' },
      { method: 'GET', path: '/v2/search/station/name/{searchTerm}', description: 'Search stations by name' }
    ]
  }

  const totalEndpoints = Object.values(endpoints).reduce((sum, category) => sum + category.length, 0)

  ctx.body = {
    version: Package.version,
    baseUrl: 'https://api.eddata.dev',
    totalEndpoints,
    note: 'All endpoints support multiple patterns: /api/v2/*, /v2/*, and some legacy /api/* paths',
    categories: endpoints,
    timestamp: new Date().toISOString()
  }
}

router.get('/api/v2/endpoints', endpointsHandler)
router.get('/v2/endpoints', endpointsHandler)
router.get('/api/endpoints', endpointsHandler)

// Stats endpoint (with and without /api prefix)
const statsHandler = async (ctx, next) => {
  try {
    const statsPath = path.join(EDDATA_CACHE_DIR, 'database-stats.json')
    const data = await fsPromises.readFile(statsPath, 'utf8')
    ctx.body = JSON.parse(data)
  } catch (error) {
    console.warn('⚠️  Stats unavailable:', error.message)
    // Always return 200 with fallback data to avoid 503 errors
    ctx.status = 200
    ctx.body = {
      systems: 0,
      pointsOfInterest: 0,
      stations: {
        stations: 0,
        carriers: 0,
        updatedInLast24Hours: 0
      },
      trade: {
        markets: 0,
        orders: 0,
        updatedInLast24Hours: 0,
        uniqueCommodities: 0
      },
      timestamp: new Date().toISOString(),
      status: 'unavailable',
      message: 'Database statistics temporarily unavailable'
    }
  }
}

router.get('/api/v2/stats', statsHandler)
router.get('/v2/stats', statsHandler)

// Database size endpoints (with and without /api prefix)
const databaseSizeHandler = async (ctx, next) => {
  try {
    const [systemsInfo, stationsInfo, tradeInfo] = await Promise.all([
      dbAsync.get(`
        SELECT 
          COUNT(*) as totalSystems,
          (COUNT(*) * 8 + LENGTH(GROUP_CONCAT(systemName)) / COUNT(*)) as estimatedSizeBytes
        FROM systems.systems
      `),
      dbAsync.get(`
        SELECT 
          COUNT(*) as totalStations,
          (COUNT(*) * 12 + LENGTH(GROUP_CONCAT(stationName)) / COUNT(*)) as estimatedSizeBytes
        FROM stations.stations
      `),
      dbAsync.get(`
        SELECT 
          COUNT(*) as totalOrders,
          (COUNT(*) * 16) as estimatedSizeBytes
        FROM trade.commodities
      `)
    ])

    const totalSizeBytes = (systemsInfo?.estimatedSizeBytes || 0) +
                          (stationsInfo?.estimatedSizeBytes || 0) +
                          (tradeInfo?.estimatedSizeBytes || 0)

    ctx.body = {
      databases: {
        systems: {
          records: systemsInfo?.totalSystems || 0,
          estimatedSizeBytes: Math.round(systemsInfo?.estimatedSizeBytes || 0),
          estimatedSizeMB: Math.round((systemsInfo?.estimatedSizeBytes || 0) / 1024 / 1024 * 100) / 100
        },
        stations: {
          records: stationsInfo?.totalStations || 0,
          estimatedSizeBytes: Math.round(stationsInfo?.estimatedSizeBytes || 0),
          estimatedSizeMB: Math.round((stationsInfo?.estimatedSizeBytes || 0) / 1024 / 1024 * 100) / 100
        },
        trade: {
          records: tradeInfo?.totalOrders || 0,
          estimatedSizeBytes: Math.round(tradeInfo?.estimatedSizeBytes || 0),
          estimatedSizeMB: Math.round((tradeInfo?.estimatedSizeBytes || 0) / 1024 / 1024 * 100) / 100
        }
      },
      summary: {
        totalRecords: (systemsInfo?.totalSystems || 0) + (stationsInfo?.totalStations || 0) + (tradeInfo?.totalOrders || 0),
        totalEstimatedSizeBytes: Math.round(totalSizeBytes),
        totalEstimatedSizeMB: Math.round(totalSizeBytes / 1024 / 1024 * 100) / 100,
        totalEstimatedSizeGB: Math.round(totalSizeBytes / 1024 / 1024 / 1024 * 100) / 100
      },
      timestamp: new Date().toISOString(),
      note: 'Size estimates are approximate and based on record counts and average field lengths'
    }
  } catch (error) {
    console.warn('⚠️  Database size unavailable:', error.message)
    // Always return 200 with fallback data to avoid 503 errors
    ctx.status = 200
    ctx.body = {
      databases: {
        systems: { records: 0, estimatedSizeBytes: 0, estimatedSizeMB: 0 },
        stations: { records: 0, estimatedSizeBytes: 0, estimatedSizeMB: 0 },
        trade: { records: 0, estimatedSizeBytes: 0, estimatedSizeMB: 0 }
      },
      summary: {
        totalRecords: 0,
        totalEstimatedSizeBytes: 0,
        totalEstimatedSizeMB: 0,
        totalEstimatedSizeGB: 0
      },
      timestamp: new Date().toISOString(),
      status: 'unavailable',
      note: 'Database size information temporarily unavailable'
    }
  }
}

router.get('/api/v2/stats/database/size', databaseSizeHandler)
router.get('/v2/stats/database/size', databaseSizeHandler)

// Detailed table statistics
const tableStatsHandler = async (ctx, next) => {
  try {
    const [systemsTables, stationsTables, tradeTables] = await Promise.all([
      dbAsync.all(`
        SELECT name as tableName, 
               'systems' as database
        FROM systems.sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `),
      dbAsync.all(`
        SELECT name as tableName,
               'stations' as database 
        FROM stations.sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `),
      dbAsync.all(`
        SELECT name as tableName,
               'trade' as database
        FROM trade.sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `)
    ])

    const allTables = [...systemsTables, ...stationsTables, ...tradeTables]
    const tableDetails = []

    for (const table of allTables) {
      try {
        const countResult = await dbAsync.get(`SELECT COUNT(*) as count FROM ${table.database}.${table.tableName}`)
        tableDetails.push({
          database: table.database,
          tableName: table.tableName,
          recordCount: countResult?.count || 0
        })
      } catch (err) {
        console.warn(`Could not get count for ${table.database}.${table.tableName}:`, err.message)
        tableDetails.push({
          database: table.database,
          tableName: table.tableName,
          recordCount: 0,
          error: err.message
        })
      }
    }

    ctx.body = {
      tables: tableDetails,
      summary: {
        totalTables: tableDetails.length,
        totalRecords: tableDetails.reduce((sum, table) => sum + (table.recordCount || 0), 0)
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.warn('⚠️  Table stats unavailable:', error.message)
    // Always return 200 with fallback data to avoid 503 errors
    ctx.status = 200
    ctx.body = {
      tables: [],
      summary: {
        totalTables: 0,
        totalRecords: 0
      },
      timestamp: new Date().toISOString(),
      status: 'unavailable',
      message: 'Table statistics temporarily unavailable'
    }
  }
}

router.get('/api/v2/stats/database/tables', tableStatsHandler)
router.get('/v2/stats/database/tables', tableStatsHandler)

router.get('/api/v2/stats/stations/types', async (ctx, next) => {
  const stationTypes = await dbAsync.all(`
      SELECT stationType, COUNT(*) as count FROM stations
      GROUP By stationType
      ORDER BY stationType
    `)
  const response = {
    stationTypes: {},
    total: 0,
    timestamp: new Date().toISOString()
  }
  stationTypes.forEach(obj => {
    response.stationTypes[obj.stationType] = obj.count
    response.total += obj.count
  })
  ctx.body = response
})

router.get('/api/v2/stats/stations/economies', async (ctx, next) => {
  const primaryEconomies = await dbAsync.all(`
      SELECT primaryEconomy, COUNT(*) as count FROM stations
        WHERE stationType != 'FleetCarrier'
        GROUP By primaryEconomy
        ORDER BY primaryEconomy
    `)
  const secondaryEconomies = await dbAsync.all(`
    SELECT secondaryEconomy, COUNT(*) as count FROM stations
      WHERE stationType != 'FleetCarrier'
      GROUP By secondaryEconomy
      ORDER BY secondaryEconomy
    `)
  const fleetCarriers = await dbAsync.get(`
    SELECT COUNT(*) as count FROM stations WHERE stationType = 'FleetCarrier'
  `)

  const response = {
    primary: {},
    secondary: {},
    fleetCarriers: fleetCarriers.count,
    timestamp: new Date().toISOString()
  }

  primaryEconomies.forEach(result => {
    response.primary[result.primaryEconomy] = result.count
  })
  secondaryEconomies.forEach(result => {
    response.secondary[result.secondaryEconomy] = result.count
  })

  ctx.body = response
})

router.get('/api/v2/backup', async (ctx, next) => {
  try {
    const backupsPath = path.join(EDDATA_BACKUP_DIR, 'backup.json')
    const downloadsPath = path.join(EDDATA_DOWNLOADS_DIR, 'downloads.json')

    const [backupsData, downloadsData] = await Promise.all([
      fsPromises.readFile(backupsPath, 'utf8'),
      fsPromises.readFile(downloadsPath, 'utf8')
    ])

    const backups = JSON.parse(backupsData)
    const downloads = JSON.parse(downloadsData)

    for (const database of backups.databases) {
      database.download = {
        url: downloads[database.name].url,
        updated: downloads[database.name].created,
        size: downloads[database.name].size,
        sha256: downloads[database.name].sha256
      }
    }

    ctx.body = {
      started: backups.started,
      completed: backups.completed,
      databases: backups.databases
    }
  } catch (error) {
    console.warn('⚠️  Backup data unavailable:', error.message)
    // Always return 200 with fallback data to avoid 503 errors
    ctx.status = 200
    ctx.body = {
      started: null,
      completed: null,
      databases: [],
      status: 'unavailable',
      message: 'Backup information temporarily unavailable'
    }
  }
})

routes.health(router)
routes.news(router)
routes.commodities(router)
routes.systems(router)
routes.systemsCommodities(router)
routes.systemsCommodity(router)
routes.markets(router)
routes.stations(router)
routes.search(router)

module.exports = router
