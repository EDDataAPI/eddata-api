const fs = require('fs')
const { EDDATA_CACHE_DIR } = require('../../lib/consts')
const { getISOTimestamp } = require('../../lib/utils/dates')
const dbAsync = require('../../lib/db/db-async')

// Generate database statistics
;(async () => {
  console.log('Updating database stats…')
  console.time('Update database stats')

  try {
    const commodityStats = await dbAsync.get(`
      SELECT
        COUNT(*) AS marketOrders,
        (SELECT COUNT(DISTINCT(commodityName)) as count FROM commodities) AS uniqueCommodities,
        (SELECT COUNT(DISTINCT(marketId)) as count FROM commodities) AS tradeMarkets,
        (SELECT COUNT(*) FROM commodities WHERE updatedAt > @last24HoursTimestamp) as updatedInLast24Hours
      FROM commodities
    `, {
      last24HoursTimestamp: getISOTimestamp(-1)
    })

    const stationStats = await dbAsync.get(`
      SELECT
        COUNT(*) as count,
        (SELECT COUNT(*) FROM stations WHERE stationType = 'FleetCarrier') as carriers,
        (SELECT COUNT(*) FROM stations WHERE stationType != 'FleetCarrier') as stations,
        (SELECT COUNT(*) FROM stations WHERE updatedAt > @last24HoursTimestamp) as updatedInLast24Hours
      FROM stations
    `, {
      last24HoursTimestamp: getISOTimestamp(-1)
    })

    const systemStats = await dbAsync.get(`
      SELECT COUNT(*) as count FROM systems
    `)

    const locationStats = await dbAsync.get(`
      SELECT COUNT(*) as count FROM locations
    `)

    const stats = {
      systems: systemStats?.count ?? 0,
      pointsOfInterest: locationStats?.count ?? 0,
      stations: {
        stations: stationStats?.stations ?? 0,
        carriers: stationStats?.carriers ?? 0,
        total: stationStats?.count ?? 0
      },
      commodities: {
        marketOrders: commodityStats?.marketOrders ?? 0,
        tradeMarkets: commodityStats?.tradeMarkets ?? 0,
        uniqueCommodities: commodityStats?.uniqueCommodities ?? 0
      },
      updatedInLast24Hours: (commodityStats?.updatedInLast24Hours ?? 0) + (stationStats?.updatedInLast24Hours ?? 0),
      timestamp: new Date().toISOString()
    }

    if (!fs.existsSync(EDDATA_CACHE_DIR)) {
      fs.mkdirSync(EDDATA_CACHE_DIR, { recursive: true })
    }

    fs.writeFileSync(`${EDDATA_CACHE_DIR}/database-stats.json`, JSON.stringify(stats, null, 2))
    console.timeEnd('Update database stats')
    console.log('Database stats updated successfully')
    process.exit()
  } catch (error) {
    console.error('Error updating database stats:', error)
    process.exit(1)
  }
})()
