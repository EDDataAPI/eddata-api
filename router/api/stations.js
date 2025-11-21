const dbAsync = require('../../lib/db/db-async')

module.exports = (router) => {
  // Top 30 stations by service count
  const topStationsHandler = async (ctx, next) => {
    try {
      const topStations = await dbAsync.all(`
        SELECT 
          s.marketId,
          s.stationName,
          s.stationType,
          s.systemAddress,
          s.systemName,
          s.systemX,
          s.systemY,
          s.systemZ,
          s.distanceToArrival,
          s.maxLandingPadSize,
          s.primaryEconomy,
          s.secondaryEconomy,
          s.allegiance,
          s.government,
          s.controllingFaction,
          s.bodyId,
          s.bodyName,
          s.latitude,
          s.longitude,
          s.prohibited,
          s.carrierDockingAccess,
          (
            CASE WHEN s.blackMarket = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.shipyard = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.outfitting = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.refuel = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.repair = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.restock = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.contacts = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.crewLounge = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.interstellarFactors = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.universalCartographics = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.materialTrader = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.technologyBroker = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.searchAndRescue = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.tuning = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.missions = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.engineer = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.frontlineSolutions = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.apexInterstellar = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.vistaGenomics = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.pioneerSupplies = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.bartender = 1 THEN 1 ELSE 0 END
          ) as serviceCount,
          s.blackMarket,
          s.shipyard,
          s.outfitting,
          s.refuel,
          s.repair,
          s.restock,
          s.contacts,
          s.crewLounge,
          s.interstellarFactors,
          s.universalCartographics,
          s.materialTrader,
          s.technologyBroker,
          s.searchAndRescue,
          s.tuning,
          s.missions,
          s.engineer,
          s.frontlineSolutions,
          s.apexInterstellar,
          s.vistaGenomics,
          s.pioneerSupplies,
          s.bartender,
          s.updatedAt
        FROM stations.stations s
        WHERE s.stationType != 'FleetCarrier'
          AND s.stationType IS NOT NULL
        ORDER BY serviceCount DESC, s.maxLandingPadSize DESC
        LIMIT 30
      `)

      // Parse prohibited field from JSON string to array with error handling
      const parsedStations = topStations.map(station => ({
        ...station,
        prohibited: station.prohibited
          ? (() => {
              try {
                return JSON.parse(station.prohibited)
              } catch (e) {
                console.warn('⚠️  Invalid JSON in prohibited field:', e.message)
                return null
              }
            })()
          : null
      }))

      ctx.body = parsedStations
    } catch (error) {
      console.warn('⚠️  Top stations unavailable:', error.message)
      // Always return 200 with fallback data
      ctx.status = 200
      ctx.body = {
        stations: [],
        status: 'unavailable',
        message: 'Top stations data temporarily unavailable',
        timestamp: new Date().toISOString()
      }
    }
  }

  router.get('/api/v2/stations/top', topStationsHandler)
  router.get('/v2/stations/top', topStationsHandler)
}
