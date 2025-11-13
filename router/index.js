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
  news: require('./api/news'),
  commodities: require('./api/commodities'),
  systems: require('./api/systems'),
  systemsCommodities: require('./api/systems/commodities'),
  systemsCommodity: require('./api/systems/commodity'),
  markets: require('./api/markets'),
  search: require('./api/search')
}
const router = new KoaRouter()
const dbAsync = require('../lib/db/db-async')

router.get('/api/v2', (ctx, next) => ctx.redirect(`${EDDATA_API_BASE_URL}/v2/stats`))

router.get('/api/v2/version', (ctx, next) => {
  ctx.body = { version: Package.version }
})

router.get('/api/v2/stats', async (ctx, next) => {
  try {
    const statsPath = path.join(EDDATA_CACHE_DIR, 'database-stats.json')
    const data = await fsPromises.readFile(statsPath, 'utf8')
    ctx.body = JSON.parse(data)
  } catch (error) {
    console.error('Error reading stats:', error)
    ctx.body = null
  }
})

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
    console.error('Error reading backup data:', error)
    ctx.status = 500
    ctx.body = { error: 'Failed to load backup information' }
  }
})

routes.news(router)
routes.commodities(router)
routes.systems(router)
routes.systemsCommodities(router)
routes.systemsCommodity(router)
routes.markets(router)
routes.search(router)

module.exports = router
