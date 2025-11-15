const fs = require('fs')
const { EDDATA_GALNET_NEWS_CACHE, EDDATA_MARKET_TICKER_CACHE } = require('../../lib/consts')

module.exports = (router) => {
  // Galnet news endpoints (with and without /api prefix)
  router.get('/api/v2/news/galnet', async (ctx, next) => {
    ctx.body = JSON.parse(fs.readFileSync(EDDATA_GALNET_NEWS_CACHE))
  })
  router.get('/v2/news/galnet', async (ctx, next) => {
    ctx.body = JSON.parse(fs.readFileSync(EDDATA_GALNET_NEWS_CACHE))
  })

  // Commodity ticker endpoints (with and without /api prefix)
  router.get('/api/v2/news/commodities', async (ctx, next) => {
    ctx.body = JSON.parse(fs.readFileSync(EDDATA_MARKET_TICKER_CACHE))
  })
  router.get('/v2/news/commodities', async (ctx, next) => {
    ctx.body = JSON.parse(fs.readFileSync(EDDATA_MARKET_TICKER_CACHE))
  })
}
