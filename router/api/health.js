const dbAsync = require('../../lib/db/db-async')

module.exports = (router) => {
  // Health check endpoint
  router.get('/api/health', async (ctx, next) => {
    try {
      // Test database connectivity with proper schema references
      const systemsCount = await dbAsync.get('SELECT COUNT(*) as count FROM systems.systems')
      const stationsCount = await dbAsync.get('SELECT COUNT(*) as count FROM stations.stations')

      ctx.status = 200
      ctx.body = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          systems: systemsCount?.count || 0,
          stations: stationsCount?.count || 0,
          connected: true
        },
        uptime: Math.floor(process.uptime()),
        version: '1.0.0'
      }
    } catch (error) {
      console.error('❌ Health check failed:', error.message)
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

  // Alternative health endpoint (simpler, no DB queries)
  router.get('/v2/health', async (ctx, next) => {
    ctx.status = 200
    ctx.body = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime())
    }
  })
}
