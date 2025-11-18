const dbAsync = require('../../lib/db/db-async')

module.exports = (router) => {
  // Simple health check endpoint (no DB queries to avoid crashes)
  router.get('/api/health', async (ctx, next) => {
    try {
      ctx.status = 200
      ctx.body = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '1.0.0'
      }
    } catch (error) {
      console.error('❌ Health check failed:', error.message)
      ctx.status = 503
      ctx.body = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    }
  })

  // Status endpoint (alias for health)
  router.get('/api/status', async (ctx, next) => {
    try {
      ctx.status = 200
      ctx.body = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '1.0.0'
      }
    } catch (error) {
      console.error('❌ Status check failed:', error.message)
      ctx.status = 503
      ctx.body = {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    }
  })

  // Alternative health endpoint
  router.get('/v2/health', async (ctx, next) => {
    ctx.status = 200
    ctx.body = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime())
    }
  })

  // Database health check (separate endpoint)
  router.get('/api/health/database', async (ctx, next) => {
    try {
      const systemsCount = await dbAsync.get('SELECT COUNT(*) as count FROM systems.systems LIMIT 1')
      const stationsCount = await dbAsync.get('SELECT COUNT(*) as count FROM stations.stations LIMIT 1')

      ctx.status = 200
      ctx.body = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          systems: systemsCount?.count || 0,
          stations: stationsCount?.count || 0,
          connected: true
        }
      }
    } catch (error) {
      console.error('❌ Database health check failed:', error.message)
      ctx.status = 503
      ctx.body = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        database: {
          connected: false
        }
      }
    }
  })
}
