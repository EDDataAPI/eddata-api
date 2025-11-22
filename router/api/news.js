const fs = require('fs')
const { EDDATA_GALNET_NEWS_CACHE, EDDATA_MARKET_TICKER_CACHE } = require('../../lib/consts')

module.exports = (router) => {
  // Galnet news handler with error handling
  const galnetNewsHandler = async (ctx, next) => {
    try {
      console.log('[GALNET] Checking cache file:', EDDATA_GALNET_NEWS_CACHE)
      if (!fs.existsSync(EDDATA_GALNET_NEWS_CACHE)) {
        console.warn('⚠️  [GALNET] Cache file not found:', EDDATA_GALNET_NEWS_CACHE)
        ctx.status = 200
        ctx.body = []
        return
      }

      const fileContent = fs.readFileSync(EDDATA_GALNET_NEWS_CACHE, 'utf8')
      console.log('[GALNET] File size:', fileContent.length, 'bytes')
      if (!fileContent || fileContent.trim() === '') {
        console.warn('⚠️  [GALNET] Cache file is empty')
        ctx.status = 200
        ctx.body = []
        return
      }

      const parsedData = JSON.parse(fileContent)
      console.log('[GALNET] Parsed data type:', Array.isArray(parsedData) ? 'array' : typeof parsedData, 'items:', parsedData.length || Object.keys(parsedData).length)
      ctx.status = 200
      ctx.body = Array.isArray(parsedData) ? parsedData : []
    } catch (error) {
      console.error('❌ [GALNET] Error reading news:', error.message, error.stack)
      ctx.status = 200 // Return 200 with empty array instead of 500
      ctx.body = []
    }
  }

  // Commodity ticker handler with error handling
  const commodityTickerHandler = async (ctx, next) => {
    try {
      if (!fs.existsSync(EDDATA_MARKET_TICKER_CACHE)) {
        console.warn('⚠️  Commodity ticker cache file not found:', EDDATA_MARKET_TICKER_CACHE)
        ctx.status = 200
        ctx.body = {
          hotTrades: [],
          highValue: [],
          mostActive: [],
          timestamp: new Date().toISOString(),
          status: 'unavailable',
          message: 'Commodity ticker data not available'
        }
        return
      }

      const fileContent = fs.readFileSync(EDDATA_MARKET_TICKER_CACHE, 'utf8')
      if (!fileContent || fileContent.trim() === '') {
        console.warn('⚠️  Commodity ticker cache file is empty')
        ctx.status = 200
        ctx.body = {
          hotTrades: [],
          highValue: [],
          mostActive: [],
          timestamp: new Date().toISOString(),
          status: 'unavailable',
          message: 'Commodity ticker data not available'
        }
        return
      }

      const parsedData = JSON.parse(fileContent)
      ctx.status = 200
      ctx.body = {
        hotTrades: parsedData.hotTrades || [],
        highValue: parsedData.highValue || [],
        mostActive: parsedData.mostActive || [],
        timestamp: parsedData.timestamp || new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ Error reading commodity ticker:', error.message, error.stack)
      ctx.status = 200
      ctx.body = {
        hotTrades: [],
        highValue: [],
        mostActive: [],
        timestamp: new Date().toISOString(),
        status: 'error',
        message: 'Failed to read commodity ticker data'
      }
    }
  }

  // Galnet news endpoints (with and without /api prefix)
  router.get('/api/v2/news/galnet', galnetNewsHandler)
  router.get('/v2/news/galnet', galnetNewsHandler)

  // Commodity ticker endpoints (with and without /api prefix)
  router.get('/api/v2/news/commodities', commodityTickerHandler)
  router.get('/v2/news/commodities', commodityTickerHandler)
}
