const dbAsync = require('../../lib/db/db-async')
const { getNearbySystemSectors } = require('../../lib/system-sectors')
const NotFoundResponse = require('../../lib/response/not-found')
const { getSystem } = require('../../lib/utils/get-system')
const EDSM = require('../../lib/edsm')
const {
  DEFAULT_NEARBY_SYSTEMS_DISTANCE,
  MAX_NEARBY_SYSTEMS_DISTANCE,
  MAX_NEARBY_SYSTEMS_RESULTS,
  MAX_NEARBY_CONTACTS_RESULTS
} = require('../../lib/consts')

module.exports = (router) => {
  // Helper function to register routes with and without /api prefix
  const registerRoute = (path, handler) => {
    router.get(`/api${path}`, handler)
    router.get(path, handler)
  }

  // Get system information
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')
    ctx.body = system
  })

  // Get system status from EDSM
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/status', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')
    const systemStatus = await EDSM.getSystemStatus(system.systemAddress)
    ctx.body = systemStatus
  })

  // Get system bodies from EDSM
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/bodies', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')
    const systemBodies = await EDSM.getSystemBodies(system.systemAddress)
    ctx.body = systemBodies
  })

  // Get all markets in system
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/markets', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')
    const stations = await dbAsync.all(`
      SELECT
        s.systemAddress,
        s.systemName,
        s.marketId,
        s.stationName,
        s.stationType,
        s.primaryEconomy,
        s.secondaryEconomy,
        s.distanceToArrival,
        s.maxLandingPadSize,
        s.allegiance,
        s.government,
        s.controllingFaction,
        c.updatedAt
      FROM stations.stations s
      LEFT JOIN trade.commodities c ON s.marketId = c.marketId
        WHERE systemAddress = @systemAddress GROUP BY s.marketId ORDER BY s.stationName
      `, { systemAddress: system.systemAddress })
    ctx.body = stations
  })

  // Get all stations in system
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/stations', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')

    // An explicit list of all known dockable station types
    // This is the most liberal interpretation of 'station', but is still
    // explicit to avoid returning stations where the type is unknown/invalid
    const stations = await dbAsync.all(`
      SELECT * FROM stations.stations WHERE systemAddress = @systemAddress
      AND (
          stationType = 'AsteroidBase' OR
          stationType = 'Coriolis' OR 
          stationType = 'CraterPort' OR 
          stationType = 'CraterOutpost' OR 
          stationType = 'FleetCarrier' OR
          stationType = 'MegaShip' OR
          stationType = 'Ocellus' OR 
          stationType = 'OnFootSettlement' OR
          stationType = 'Orbis' OR
          stationType = 'Outpost' OR
          stationType = 'PlanetaryConstructionDepot' OR
          stationType = 'SpaceConstructionDepot' OR
          stationType = 'StrongholdCarrier' OR
          stationType = 'SurfaceStation'
        )
      ORDER BY stationName
    `, { systemAddress: system.systemAddress })

    // Parse prohibited field from JSON string to array
    const parsedStations = stations.map(station => ({
      ...station,
      prohibited: station.prohibited ? JSON.parse(station.prohibited) : null
    }))

    ctx.body = parsedStations
  })

  // Get ports (large stations) in system
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/stations/ports', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')

    const stations = await dbAsync.all(`
      SELECT * FROM stations.stations WHERE systemAddress = @systemAddress
        AND (
            stationType = 'AsteroidBase' OR
            stationType = 'Coriolis' OR 
            stationType = 'CraterPort' OR 
            stationType = 'Ocellus' OR 
            stationType = 'Orbis'
          )
        ORDER BY stationName
      `, { systemAddress: system.systemAddress })

    // Parse prohibited field from JSON string to array
    const parsedStations = stations.map(station => ({
      ...station,
      prohibited: station.prohibited ? JSON.parse(station.prohibited) : null
    }))

    ctx.body = parsedStations
  })

  // Get outposts in system
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/stations/outposts', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')

    const stations = await dbAsync.all(`
      SELECT * FROM stations.stations WHERE systemAddress = @systemAddress
        AND (stationType = 'Outpost' OR stationType = 'CraterOutpost')
        ORDER BY stationName
      `, { systemAddress: system.systemAddress })

    // Parse prohibited field from JSON string to array
    const parsedStations = stations.map(station => ({
      ...station,
      prohibited: station.prohibited ? JSON.parse(station.prohibited) : null
    }))

    ctx.body = parsedStations
  })

  // Get settlements in system
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/stations/settlements', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')

    const stations = await dbAsync.all(`
      SELECT * FROM stations.stations WHERE systemAddress = @systemAddress
        AND (stationType = 'OnFootSettlement')
        ORDER BY stationName
      `, { systemAddress: system.systemAddress })

    // Parse prohibited field from JSON string to array
    const parsedStations = stations.map(station => ({
      ...station,
      prohibited: station.prohibited ? JSON.parse(station.prohibited) : null
    }))

    ctx.body = parsedStations
  })

  // Get megaships in system
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/stations/megaships', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')

    const stations = await dbAsync.all(`
    SELECT * FROM stations.stations WHERE systemAddress = @systemAddress
      AND (stationType = 'MegaShip')
      ORDER BY stationName
    `, { systemAddress: system.systemAddress })

    // Parse prohibited field from JSON string to array
    const parsedStations = stations.map(station => ({
      ...station,
      prohibited: station.prohibited ? JSON.parse(station.prohibited) : null
    }))

    ctx.body = parsedStations
  })

  // Get fleet carriers in system
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/stations/carriers', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')

    const stations = await dbAsync.all(`
      SELECT * FROM stations.stations WHERE systemAddress = @systemAddress
        AND (stationType = 'FleetCarrier' OR stationType = 'StrongholdCarrier')
        ORDER BY stationName
      `, { systemAddress: system.systemAddress })

    // Parse prohibited field from JSON string to array
    const parsedStations = stations.map(station => ({
      ...station,
      prohibited: station.prohibited ? JSON.parse(station.prohibited) : null
    }))

    ctx.body = parsedStations
  })

  // Get commodities for a specific station by name
  // Note: If you know the specific Market ID you don't need to specify the
  // system, you can query the `/market/:marketId/commodities` endpoint
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/market/name/:stationName/commodities', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer, stationName } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')

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
      FROM stations.stations s
        LEFT JOIN trade.commodities c ON s.marketId = c.marketId 
      WHERE s.systemAddress = @systemAddress
        AND s.stationName = @stationName COLLATE NOCASE
      ORDER BY commodityName ASC`,
    { systemAddress: system.systemAddress, stationName }
    )
    if (commodities.length === 0) return NotFoundResponse(ctx, 'Market not found')
    ctx.body = commodities
  })

  // Get nearby systems
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/nearby', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')
    const { systemX, systemY, systemZ } = system

    let { maxDistance = DEFAULT_NEARBY_SYSTEMS_DISTANCE } = ctx.query

    if (maxDistance > MAX_NEARBY_SYSTEMS_DISTANCE) { maxDistance = MAX_NEARBY_SYSTEMS_DISTANCE }
    maxDistance = parseInt(maxDistance)

    const nearbySectors = getNearbySystemSectors(systemX, systemY, systemZ, maxDistance)
    ctx.body = await dbAsync.all(`
      SELECT
        *,
        ROUND(SQRT(POWER(systemX-@systemX,2)+POWER(systemY-@systemY,2)+POWER(systemZ-@systemZ,2))) AS distance
      FROM systems.systems
        WHERE systemSector IN ('${nearbySectors.join("', '")}')
        AND systemAddress != @systemAddress
        AND distance <= @maxDistance
      ORDER BY distance
        LIMIT ${MAX_NEARBY_SYSTEMS_RESULTS}`, {
      systemX,
      systemY,
      systemZ,
      systemAddress: system.systemAddress,
      maxDistance
    })
  })

  // Get nearest system with specific service
  registerRoute('/v2/system/:systemIdentiferType/:systemIdentifer/nearest/:serviceType', async (ctx, next) => {
    const { systemIdentiferType, systemIdentifer, serviceType } = ctx.params
    const system = await getSystem(systemIdentifer, systemIdentiferType)
    if (!system) return NotFoundResponse(ctx, 'System not found')
    const { systemX, systemY, systemZ } = system

    const { minLandingPadSize = 1 } = ctx.query

    const serviceTypes = {
      'interstellar-factors': 'interstellarFactors',
      'material-trader': 'materialTrader',
      'technology-broker': 'technologyBroker',
      'black-market': 'blackMarket',
      'universal-cartographics': 'universalCartographics',
      refuel: 'refuel',
      repair: 'repair',
      shipyard: 'shipyard',
      outfitting: 'outfitting',
      'search-and-rescue': 'searchAndRescue'
    }
    if (!serviceTypes[serviceType]) return NotFoundResponse(ctx, 'Service unknown')

    const serviceColumn = serviceTypes[serviceType]
    const minPadSize = parseInt(minLandingPadSize) || 1

    ctx.body = await dbAsync.all(`
      SELECT
        *,
        ROUND(SQRT(POWER(systemX-@systemX,2)+POWER(systemY-@systemY,2)+POWER(systemZ-@systemZ,2))) AS distance
      FROM stations.stations
        WHERE ${serviceColumn} = 1
          AND maxLandingPadSize >= @minPadSize
          AND systemX IS NOT NULL
          AND systemY IS NOT NULL
          AND systemZ IS NOT NULL
        HAVING distance IS NOT NULL
      ORDER BY distance
        LIMIT ${MAX_NEARBY_CONTACTS_RESULTS}`, {
      systemX,
      systemY,
      systemZ,
      minPadSize
    })
  })

  // Top 30 systems by station count
  const topSystemsHandler = async (ctx, next) => {
    try {
      const topSystems = await dbAsync.all(`
        SELECT 
          sys.systemAddress,
          sys.systemName,
          sys.systemX,
          sys.systemY,
          sys.systemZ,
          sys.primaryStar,
          sys.allegiance,
          sys.government,
          sys.population,
          COUNT(sta.marketId) as stationCount,
          COUNT(CASE WHEN sta.stationType != 'FleetCarrier' THEN 1 END) as permanentStationCount
        FROM systems.systems sys
        LEFT JOIN stations.stations sta ON sys.systemAddress = sta.systemAddress
        WHERE sta.stationType IS NOT NULL
        GROUP BY sys.systemAddress
        ORDER BY permanentStationCount DESC, stationCount DESC
        LIMIT 30
      `)

      ctx.body = topSystems
    } catch (error) {
      console.error('Error fetching top systems:', error)
      ctx.status = 500
      ctx.body = { error: 'Failed to fetch top systems' }
    }
  }

  registerRoute('/v2/systems/top', topSystemsHandler)
}
