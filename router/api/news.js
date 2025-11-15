const fs = require('fs')
const { EDDATA_GALNET_NEWS_CACHE, EDDATA_MARKET_TICKER_CACHE } = require('../../lib/consts')

module.exports = (router) => {
  // Galnet news handler with error handling
  const galnetNewsHandler = async (ctx, next) => {
    try {
      if (!fs.existsSync(EDDATA_GALNET_NEWS_CACHE)) {
        console.warn('⚠️  Galnet news cache file not found:', EDDATA_GALNET_NEWS_CACHE)
        ctx.body = []
        return
      }
      ctx.body = JSON.parse(fs.readFileSync(EDDATA_GALNET_NEWS_CACHE, 'utf8'))
    } catch (error) {
      console.error('❌ Error reading Galnet news:', error.message)
      ctx.body = []
    }
  }

  // Commodity ticker handler with error handling
  const commodityTickerHandler = async (ctx, next) => {
    try {
      if (!fs.existsSync(EDDATA_MARKET_TICKER_CACHE)) {
        console.warn('⚠️  Commodity ticker cache file not found:', EDDATA_MARKET_TICKER_CACHE)
        ctx.body = []
        return
      }
      ctx.body = JSON.parse(fs.readFileSync(EDDATA_MARKET_TICKER_CACHE, 'utf8'))
    } catch (error) {
      console.error('❌ Error reading commodity ticker:', error.message)
      ctx.body = []
    }
  }

  // Galnet news endpoints (with and without /api prefix)
  router.get('/api/v2/news/galnet', galnetNewsHandler)
  router.get('/v2/news/galnet', galnetNewsHandler)

  // Commodity ticker endpoints (with and without /api prefix)
  router.get('/api/v2/news/commodities', commodityTickerHandler)
  router.get('/v2/news/commodities', commodityTickerHandler)
}
