const fs = require('fs')
const path = require('path')
const { paramAsBoolean } = require('../../lib/utils/parse-query-params')
const dbAsync = require('../../lib/db/db-async')
const { EDDATA_CACHE_DIR, DEFAULT_MAX_RESULTS_AGE, MAX_RESULTS_AGE } = require('../../lib/consts')
const NotFoundResponse = require('../../lib/response/not-found')
const { getISODate } = require('../../lib/utils/dates')
const { getSystem } = require('../../lib/utils/get-system')

const COMMODITIES_REPORT = path.join(EDDATA_CACHE_DIR, 'commodities.json')
const MAX_COMMODITY_SORTED_RESULTS = 100
const MAX_COMMODITY_SEARCH_DISTANCE = 1000

module.exports = (router) => {
  // Get all commodities (with and without /api prefix)
  router.get('/api/v2/commodities', async (ctx, next) => {
    try {
      if (!fs.existsSync(COMMODITIES_REPORT)) {
        console.warn('⚠️  Commodities report not found')
        ctx.status = 200
        ctx.body = { commodities: [], status: 'unavailable', message: 'Commodities data temporarily unavailable' }
        return
      }
      const data = fs.readFileSync(COMMODITIES_REPORT, 'utf8')
      const parsed = JSON.parse(data)
      ctx.body = parsed.commodities || []
    } catch (e) {
      console.warn('⚠️  Commodities data unavailable:', e.message)
      ctx.status = 200
      ctx.body = { commodities: [], status: 'unavailable', message: 'Commodities data temporarily unavailable' }
    }
  })
  router.get('/v2/commodities', async (ctx, next) => {
    try {
      if (!fs.existsSync(COMMODITIES_REPORT)) {
        console.warn('⚠️  Commodities report not found')
        ctx.status = 200
        ctx.body = { commodities: [], status: 'unavailable', message: 'Commodities data temporarily unavailable' }
        return
      }
      const data = fs.readFileSync(COMMODITIES_REPORT, 'utf8')
      const parsed = JSON.parse(data)
      ctx.body = parsed.commodities || []
    } catch (e) {
      console.warn('⚠️  Commodities data unavailable:', e.message)
      ctx.status = 200
      ctx.body = { commodities: [], status: 'unavailable', message: 'Commodities data temporarily unavailable' }
    }
  })

  // Get specific commodity by name (with and without /api prefix)
  router.get('/api/v2/commodity/name/:commodityName', async (ctx, next) => {
    try {
      let { commodityName } = ctx.params
      // Enhanced input validation and sanitization
      if (!commodityName || typeof commodityName !== 'string') {
        return NotFoundResponse(ctx, 'Invalid commodity name')
      }
      commodityName = commodityName.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
      if (commodityName.length === 0 || commodityName.length > 50) {
        return NotFoundResponse(ctx, 'Commodity name invalid length')
      }
      const pathToFile = path.join(EDDATA_CACHE_DIR, 'commodities', commodityName, `${commodityName}.json`)
      if (!fs.existsSync(pathToFile)) return NotFoundResponse(ctx, 'Commodity not found')
      const data = fs.readFileSync(pathToFile, 'utf8')
      ctx.body = JSON.parse(data)
    } catch (error) {
      console.warn('⚠️  Commodity detail unavailable:', error.message)
      ctx.status = 200
      ctx.body = {
        commodityName: ctx.params.commodityName,
        status: 'unavailable',
        message: 'Commodity details temporarily unavailable'
      }
    }
  })
  router.get('/v2/commodity/name/:commodityName', async (ctx, next) => {
    try {
      let { commodityName } = ctx.params
      commodityName = commodityName.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
      const pathToFile = path.join(EDDATA_CACHE_DIR, 'commodities', `${commodityName}`, `${commodityName}.json`)
      if (!fs.existsSync(pathToFile)) return NotFoundResponse(ctx, 'Commodity not found')
      const data = fs.readFileSync(pathToFile, 'utf8')
      ctx.body = JSON.parse(data)
    } catch (error) {
      console.warn('⚠️  Commodity detail unavailable:', error.message)
      ctx.status = 200
      ctx.body = {
        commodityName: ctx.params.commodityName,
        status: 'unavailable',
        message: 'Commodity details temporarily unavailable'
      }
    }
  })

  // Commodity imports handler (shared logic for both routes)
  const commodityImportsHandler = async (ctx, next) => {
    const { commodityName } = ctx.params
    let {
      minVolume = 1,
      minPrice = 1,
      fleetCarriers = null,
      maxDaysAgo = DEFAULT_MAX_RESULTS_AGE,
      systemAddress = null,
      systemName = null,
      maxDistance = null
    } = ctx.query

    // Enforce maximum age limit (trading data older than 2 weeks is unreliable)
    maxDaysAgo = Math.min(parseInt(maxDaysAgo, 10) || DEFAULT_MAX_RESULTS_AGE, MAX_RESULTS_AGE)
    // Validate and sanitize numeric inputs
    minVolume = Math.max(0, parseInt(minVolume, 10) || 1)
    minPrice = Math.max(0, parseInt(minPrice, 10) || 1)

    const sqlQueryParams = {
      commodityName: commodityName.toLowerCase()
    }

    const filters = [
      `AND (c.demand >= ${Math.max(0, parseInt(minVolume, 10) || 1)} OR c.demand = 0)`, // Zero is infinite demand
      `AND c.sellPrice >= ${Math.max(0, parseInt(minPrice, 10) || 1)}`,
      `AND c.updatedAtDay > '${getISODate(`-${maxDaysAgo}`)}'`
    ]

    const systemSpecified = (systemAddress || systemName)
    if (systemSpecified) {
      const systemIdentifer = systemAddress ?? systemName
      const systemIdentiferType = systemAddress ? 'address' : 'name'
      const system = await getSystem(systemIdentifer, systemIdentiferType)
      if (!system) return NotFoundResponse(ctx, 'System not found')
      sqlQueryParams.systemX = system.systemX
      sqlQueryParams.systemY = system.systemY
      sqlQueryParams.systemZ = system.systemZ
      if (maxDistance) {
        if (maxDistance > MAX_COMMODITY_SEARCH_DISTANCE) { maxDistance = MAX_COMMODITY_SEARCH_DISTANCE }
        maxDistance = parseInt(maxDistance)
        sqlQueryParams.maxDistance = maxDistance
      }
    }

    if (fleetCarriers !== null) {
      if (paramAsBoolean(fleetCarriers) === true) { filters.push('AND s.stationType = \'FleetCarrier\'') }
      if (paramAsBoolean(fleetCarriers) === false) { filters.push('AND s.stationType != \'FleetCarrier\'') }
    }

    const commodities = await dbAsync.all(`
      SELECT
        c.commodityName,
        c.marketId,
        s.stationName,
        s.stationType,
        s.distanceToArrival,
        s.maxLandingPadSize,
        s.bodyId,
        s.bodyName,
        s.systemAddress,
        s.systemName,
        s.systemX,
        s.systemY,
        s.systemZ,
        s.prohibited,
        s.carrierDockingAccess,
        c.buyPrice,
        c.demand,
        c.demandBracket,
        c.meanPrice,
        c.sellPrice,
        c.stock,
        c.stockBracket,
        c.updatedAt
          ${systemSpecified ? ', ROUND(SQRT(POWER(s.systemX-@systemX,2)+POWER(s.systemY-@systemY,2)+POWER(s.systemZ-@systemZ,2))) AS distance' : ''}
        FROM trade.commodities c 
          LEFT JOIN stations.stations s ON c.marketId = s.marketId
        WHERE c.commodityName = @commodityName
          AND s.systemAddress IS NOT NULL
          ${filters.join(' ')}
          ${systemSpecified && maxDistance ? ' AND distance <= @maxDistance' : ''}
        ORDER BY c.sellPrice DESC
          LIMIT ${MAX_COMMODITY_SORTED_RESULTS}`, sqlQueryParams)

    // Parse prohibited field from JSON string to array with error handling
    const parsedCommodities = commodities.map(commodity => ({
      ...commodity,
      prohibited: commodity.prohibited
        ? (() => {
            try {
              return JSON.parse(commodity.prohibited)
            } catch (e) {
              console.warn('⚠️  Invalid JSON in prohibited field:', e.message)
              return null
            }
          })()
        : null
    }))

    ctx.body = parsedCommodities
  }

  // Register commodity imports routes (with and without /api prefix)
  router.get('/api/v2/commodity/name/:commodityName/imports', commodityImportsHandler)
  router.get('/v2/commodity/name/:commodityName/imports', commodityImportsHandler)

  // Commodity exports handler (shared logic for both routes)
  const commodityExportsHandler = async (ctx, next) => {
    const { commodityName } = ctx.params
    let {
      minVolume = 1,
      maxPrice = null,
      fleetCarriers = null,
      maxDaysAgo = DEFAULT_MAX_RESULTS_AGE,
      systemAddress = null,
      systemName = null,
      maxDistance = null
    } = ctx.query

    // Enforce maximum age limit (trading data older than 2 weeks is unreliable)
    maxDaysAgo = Math.min(parseInt(maxDaysAgo, 10) || DEFAULT_MAX_RESULTS_AGE, MAX_RESULTS_AGE)

    const sqlQueryParams = {
      commodityName: commodityName.toLowerCase()
    }

    const filters = [
      `AND c.stock >= ${Math.max(0, parseInt(minVolume, 10) || 1)}`,
      `AND c.updatedAtDay > '${getISODate(`-${maxDaysAgo}`)}'`
    ]

    const systemSpecified = (systemAddress || systemName)
    if (systemSpecified) {
      const systemIdentifer = systemAddress ?? systemName
      const systemIdentiferType = systemAddress ? 'address' : 'name'
      const system = await getSystem(systemIdentifer, systemIdentiferType)
      if (!system) return NotFoundResponse(ctx, 'System not found')
      sqlQueryParams.systemX = system.systemX
      sqlQueryParams.systemY = system.systemY
      sqlQueryParams.systemZ = system.systemZ
      if (maxDistance) {
        if (maxDistance > MAX_COMMODITY_SEARCH_DISTANCE) { maxDistance = MAX_COMMODITY_SEARCH_DISTANCE }
        maxDistance = parseInt(maxDistance)
        sqlQueryParams.maxDistance = maxDistance
      }
    }

    if (maxPrice !== null) { filters.push(`AND c.buyPrice <= ${Math.max(0, parseInt(maxPrice, 10) || 999999)}`) }

    if (fleetCarriers !== null) {
      if (paramAsBoolean(fleetCarriers) === true) { filters.push('AND s.stationType = \'FleetCarrier\'') }
      if (paramAsBoolean(fleetCarriers) === false) { filters.push('AND s.stationType != \'FleetCarrier\'') }
    }

    const commodities = await dbAsync.all(`
      SELECT
        c.commodityName,
        c.marketId,
        s.stationName,
        s.stationType,
        s.distanceToArrival,
        s.maxLandingPadSize,
        s.bodyId,
        s.bodyName,
        s.systemAddress,
        s.systemName,
        s.systemX,
        s.systemY,
        s.systemZ,
        s.prohibited,
        s.carrierDockingAccess,
        c.buyPrice,
        c.demand,
        c.demandBracket,
        c.meanPrice,
        c.sellPrice,
        c.stock,
        c.stockBracket,
        c.updatedAt
          ${systemSpecified ? ', ROUND(SQRT(POWER(s.systemX-@systemX,2)+POWER(s.systemY-@systemY,2)+POWER(s.systemZ-@systemZ,2))) AS distance' : ''}
        FROM trade.commodities c 
          LEFT JOIN stations.stations s ON c.marketId = s.marketId
        WHERE c.commodityName = @commodityName
          AND s.systemAddress IS NOT NULL
          ${filters.join(' ')}
          ${systemSpecified && maxDistance ? ' AND distance <= @maxDistance' : ''}
        ORDER BY c.buyPrice ASC
          LIMIT ${MAX_COMMODITY_SORTED_RESULTS}`, sqlQueryParams)

    // Parse prohibited field from JSON string to array with error handling
    const parsedCommodities = commodities.map(commodity => ({
      ...commodity,
      prohibited: commodity.prohibited
        ? (() => {
            try {
              return JSON.parse(commodity.prohibited)
            } catch (e) {
              console.warn('⚠️  Invalid JSON in prohibited field:', e.message)
              return null
            }
          })()
        : null
    }))

    ctx.body = parsedCommodities
  }

  // Register commodity exports routes (with and without /api prefix)
  router.get('/api/v2/commodity/name/:commodityName/exports', commodityExportsHandler)
  router.get('/v2/commodity/name/:commodityName/exports', commodityExportsHandler)

  // Top 30 commodities by trading volume
  const topCommoditiesHandler = async (ctx, next) => {
    try {
      const { maxDaysAgo = DEFAULT_MAX_RESULTS_AGE } = ctx.query

      const topCommodities = await dbAsync.all(`
        SELECT 
          c.commodityName,
          COUNT(DISTINCT c.marketId) as marketCount,
          AVG(c.buyPrice) as avgBuyPrice,
          AVG(c.sellPrice) as avgSellPrice,
          AVG(c.meanPrice) as avgMeanPrice,
          SUM(c.stock) as totalStock,
          SUM(c.demand) as totalDemand,
          MAX(c.updatedAt) as lastUpdate
        FROM trade.commodities c
        WHERE c.updatedAtDay > '${getISODate(`-${maxDaysAgo}`)}'
        GROUP BY c.commodityName
        ORDER BY marketCount DESC, totalStock DESC
        LIMIT 30
      `)

      ctx.body = topCommodities
    } catch (error) {
      console.warn('⚠️  Top commodities unavailable:', error.message)
      // Always return 200 with fallback data
      ctx.status = 200
      ctx.body = {
        commodities: [],
        status: 'unavailable',
        message: 'Top commodities data temporarily unavailable',
        timestamp: new Date().toISOString()
      }
    }
  }

  router.get('/api/v2/commodities/top', topCommoditiesHandler)
  router.get('/v2/commodities/top', topCommoditiesHandler)
}
