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
      ctx.body = JSON.parse(fs.readFileSync(COMMODITIES_REPORT)).commodities
    } catch (e) {
      console.error(e)
      ctx.body = null
    }
  })
  router.get('/v2/commodities', async (ctx, next) => {
    try {
      ctx.body = JSON.parse(fs.readFileSync(COMMODITIES_REPORT)).commodities
    } catch (e) {
      console.error(e)
      ctx.body = null
    }
  })

  // Get specific commodity by name (with and without /api prefix)
  router.get('/api/v2/commodity/name/:commodityName', async (ctx, next) => {
    let { commodityName } = ctx.params
    commodityName = commodityName.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
    const pathToFile = path.join(EDDATA_CACHE_DIR, 'commodities', `${commodityName}`, `${commodityName}.json`)
    if (!fs.existsSync(pathToFile)) return NotFoundResponse(ctx, 'Commodity not found')
    ctx.body = JSON.parse(fs.readFileSync(pathToFile))
  })
  router.get('/v2/commodity/name/:commodityName', async (ctx, next) => {
    let { commodityName } = ctx.params
    commodityName = commodityName.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
    const pathToFile = path.join(EDDATA_CACHE_DIR, 'commodities', `${commodityName}`, `${commodityName}.json`)
    if (!fs.existsSync(pathToFile)) return NotFoundResponse(ctx, 'Commodity not found')
    ctx.body = JSON.parse(fs.readFileSync(pathToFile))
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
    maxDaysAgo = Math.min(parseInt(maxDaysAgo) || DEFAULT_MAX_RESULTS_AGE, MAX_RESULTS_AGE)

    const sqlQueryParams = {
      commodityName: commodityName.toLowerCase()
    }

    const filters = [
      `AND (c.demand >= ${parseInt(minVolume)} OR c.demand = 0)`, // Zero is infinite demand
      `AND c.sellPrice >= ${parseInt(minPrice)}`,
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

    ctx.body = commodities
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
    maxDaysAgo = Math.min(parseInt(maxDaysAgo) || DEFAULT_MAX_RESULTS_AGE, MAX_RESULTS_AGE)

    const sqlQueryParams = {
      commodityName: commodityName.toLowerCase()
    }

    const filters = [
      `AND c.stock >= ${parseInt(minVolume)}`,
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

    if (maxPrice !== null) { filters.push(`AND c.buyPrice <= ${parseInt(maxPrice)}`) }

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

    ctx.body = commodities
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
      console.error('Error fetching top commodities:', error)
      ctx.status = 500
      ctx.body = { error: 'Failed to fetch top commodities' }
    }
  }

  router.get('/api/v2/commodities/top', topCommoditiesHandler)
  router.get('/v2/commodities/top', topCommoditiesHandler)
}
