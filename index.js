const Package = require('./package.json')
console.log(`Ardent API v${Package.version} starting`)

// Initalise default value for env vars before other imports
console.log('Configuring environment …')
const {
  ARDENT_CACHE_DIR,
  ARDENT_API_DEFAULT_CACHE_CONTROL,
  ARDENT_API_BASE_URL,
  ARDENT_API_LOCAL_PORT
} = require('./lib/consts')

console.log('Loading dependancies …')
const process = require('process')
const path = require('path')
const fs = require('fs')
const fsPromises = require('fs/promises')
const cron = require('node-cron')
const Koa = require('koa')
const koaBodyParser = require('koa-bodyparser')
const koaCompress = require('koa-compress')

console.log('Loading libraries …')
const router = require('./router')
const updateCommodityTicker = require('./lib/cron-tasks/commodity-ticker')
const updateGalnetNews = require('./lib/cron-tasks/galnet-news')

;(async () => {
  // Start web service
  console.log('Starting Ardent API service')
  const app = new Koa()
  app.use(koaBodyParser())
  app.proxy = true // Proxy headers should be passed through

  // Set default headers
  app.use((ctx, next) => {
    ctx.set('Ardent-API-Version', `${Package.version}`)

    // Cache headers encourage caching, but with a short period (and use of state-while-revalidate)
    ctx.set('Cache-Control', ARDENT_API_DEFAULT_CACHE_CONTROL)

    // Headers required to support requests with credentials (i.e. auth tokens)
    // while still supporting API requests from any domain
    ctx.set('Access-Control-Allow-Origin', ctx.request.header.origin)
    ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    ctx.set('Vary', 'Origin')
    return next()
  })

  app.use(koaCompress())

  // Removing the robots.txt Disallow all config now the trade db and website
  // have both been optimised. Will restore this if bot traffic seems to be
  // impacting legitimate traffic again.
  /*
  router.get('/api/robots.txt', async (ctx) => {
    ctx.type = 'text/plain'
    ctx.body = 'User-agent: *\nDisallow: /*'
  })
  */

  router.get('/', async (ctx) => { ctx.body = await printStats() })
  router.get('/api', async (ctx) => { ctx.body = await printStats() })

  // Redirect all /v1 API routes to the new /v2 routes
  router.get('/api/v1/:path(.*)', async (ctx, next) => {
    const newUrl = ctx.request.url.replace(/^\/api\/v1\//, `${ARDENT_API_BASE_URL}/v2/`)
    ctx.redirect(newUrl)
  })

  app.use(router.routes())

  updateCommodityTicker()
  cron.schedule('0 */5 * * * *', async () => updateCommodityTicker())

  updateGalnetNews()
  cron.schedule('0 */20 * * * *', async () => updateGalnetNews())

  app.listen(ARDENT_API_LOCAL_PORT)
  console.log(await printStats())

  console.log(`Ardent API service started on port ${ARDENT_API_LOCAL_PORT}`)
  console.log(`URL: ${ARDENT_API_BASE_URL}`)
})()

process.on('exit', () => console.log('Shutting down'))

process.on('uncaughtException', (e) => {
  console.error('Uncaught exception:', e)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Graceful shutdown...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM. Graceful shutdown...')
  process.exit(0)
})

async function printStats () {
  const pathToStats = path.join(ARDENT_CACHE_DIR, 'database-stats.json')
  let stats = {}

  try {
    await fsPromises.access(pathToStats, fs.constants.F_OK)
    const data = await fsPromises.readFile(pathToStats, 'utf8')
    stats = JSON.parse(data)
  } catch (error) {
    // File doesn't exist or can't be read, use empty stats
    stats = {}
  }

  try {
    return `Ardent API v${Package.version} Online\n` +
      '--------------------------\n' +
      ((Object.keys(stats).length > 0)
        ? 'Locations:\n' +
        `* Star systems: ${stats?.systems?.toLocaleString() ?? 'N/A'}\n` +
        `* Points of interest: ${stats?.pointsOfInterest?.toLocaleString() ?? 'N/A'}\n` +
        'Stations:\n' +
        `* Stations: ${stats?.stations?.stations?.toLocaleString() ?? 'N/A'}\n` +
        `* Fleet Carriers: ${stats?.stations?.carriers?.toLocaleString() ?? 'N/A'}\n` +
        `* Updated in last 24 hours: ${stats?.stations?.updatedInLast24Hours?.toLocaleString() ?? 'N/A'}\n` +
        'Trade:\n' +
        `* Markets: ${stats?.trade?.markets?.toLocaleString() ?? 'N/A'}\n` +
        `* Orders: ${stats?.trade?.orders?.toLocaleString() ?? 'N/A'}\n` +
        `* Updated in last 24 hours: ${stats?.trade?.updatedInLast24Hours?.toLocaleString() ?? 'N/A'}\n` +
        `* Unique commodities: ${stats?.trade?.uniqueCommodities?.toLocaleString() ?? 'N/A'}\n` +
        `Stats last updated: ${stats?.timestamp ?? 'N/A'}`
        : 'Stats not generated yet')
  } catch (error) {
    console.error('Error generating stats:', error)
    return 'Error: Could not load stats'
  }
}
