const Package = require('./package.json')

// Prepend time (HH:MM:SS) to all console output to improve logs and tracing
const _origConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug ? console.debug.bind(console) : console.log.bind(console)
}
const _ts = () => new Date().toTimeString().substr(0, 8)
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  console[level] = (...args) => {
    const prefix = `[${_ts()}]`
    if (args.length > 0 && typeof args[0] === 'string') {
      args[0] = `${prefix} ${args[0]}`
      _origConsole[level](...args)
    } else {
      _origConsole[level](prefix, ...args)
    }
  }
}

console.log(`EDData API v${Package.version} starting`)
console.log(_ts())

// Initalise default value for env vars before other imports
console.log('Configuring environment …')
const {
  EDDATA_API_DEFAULT_CACHE_CONTROL,
  EDDATA_API_BASE_URL,
  EDDATA_API_LOCAL_PORT,
  EDDATA_CACHE_DIR
} = require('./lib/consts')

console.log('Loading dependancies …')
const process = require('process')
const path = require('path')
const fs = require('fs')
const fsPromises = require('fs/promises')
const Koa = require('koa')
const koaBodyParser = require('koa-bodyparser')
const koaCompress = require('koa-compress')
const koaCors = require('@koa/cors')

console.log('Loading libraries …')
const router = require('./router')

;(async () => {
  // Start web service
  console.log('Starting EDData API service')
  const app = new Koa()
  app.use(koaBodyParser())
  app.proxy = true // Proxy headers should be passed through

  // CORS configuration - allow requests from eddata.dev domains
  app.use(koaCors({
    origin: (ctx) => {
      const allowedOrigins = [
        'https://eddata.dev',
        'https://www.eddata.dev',
        'https://auth.eddata.dev',
        'http://localhost:3000',
        'http://localhost:3001'
      ]
      const origin = ctx.request.header.origin
      if (!origin || allowedOrigins.includes(origin)) {
        return origin || '*'
      }
      // Allow any eddata.dev subdomain
      if (origin && origin.match(/^https?:\/\/[a-z0-9-]+\.eddata\.dev$/)) {
        return origin
      }
      return allowedOrigins[0]
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    maxAge: 86400 // 24 hours
  }))

  // Set default headers
  app.use((ctx, next) => {
    ctx.set('EDData-API-Version', `${Package.version}`)

    // Cache headers encourage caching, but with a short period (and use of state-while-revalidate)
    ctx.set('Cache-Control', EDDATA_API_DEFAULT_CACHE_CONTROL)

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
    const newUrl = ctx.request.url.replace(/^\/api\/v1\//, `${EDDATA_API_BASE_URL}/v2/`)
    ctx.redirect(newUrl)
  })

  app.use(router.routes())

  app.listen(EDDATA_API_LOCAL_PORT)
  console.log(await printStats())

  console.log(`EDData API service started on port ${EDDATA_API_LOCAL_PORT}`)
  console.log(`URL: ${EDDATA_API_BASE_URL}`)
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
  const pathToStats = path.join(EDDATA_CACHE_DIR, 'database-stats.json')
  let stats = {}

  try {
    await fsPromises.access(pathToStats, fs.constants.F_OK)
    const data = await fsPromises.readFile(pathToStats, 'utf8')
    stats = JSON.parse(data)
  } catch (error) {
    // File doesn't exist or can't be read, use empty stats
    if (error.code === 'ENOENT') {
      console.warn('⚠️  Database stats not yet generated - waiting for collector')
    }
    stats = {}
  }

  try {
    return `EDData API v${Package.version} Online\n` +
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
        : 'Stats not yet generated\n' +
        'Waiting for eddata-collector to generate database statistics...\n' +
        'This is normal on first startup.')
  } catch (error) {
    console.error('Error generating stats:', error)
    return 'Error: Could not load stats'
  }
}
