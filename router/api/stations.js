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
          (
            CASE WHEN s.blackMarket = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.market = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.refuel = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.repair = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.rearm = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.outfitting = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.shipyard = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.crew = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.engineer = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.interstellarFactors = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.universalCartographics = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.materialTrader = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.technologyBroker = 1 THEN 1 ELSE 0 END +
            CASE WHEN s.searchAndRescue = 1 THEN 1 ELSE 0 END
          ) as serviceCount,
          s.blackMarket,
          s.market,
          s.refuel,
          s.repair,
          s.rearm,
          s.outfitting,
          s.shipyard,
          s.crew,
          s.engineer,
          s.interstellarFactors,
          s.universalCartographics,
          s.materialTrader,
          s.technologyBroker,
          s.searchAndRescue
        FROM stations.stations s
        WHERE s.stationType != 'FleetCarrier'
          AND s.stationType IS NOT NULL
        ORDER BY serviceCount DESC, s.maxLandingPadSize DESC
        LIMIT 30
      `)

      ctx.body = topStations
    } catch (error) {
      console.error('Error fetching top stations:', error)
      ctx.status = 500
      ctx.body = { error: 'Failed to fetch top stations' }
    }
  }

  router.get('/api/v2/stations/top', topStationsHandler)
  router.get('/v2/stations/top', topStationsHandler)
}
