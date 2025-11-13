const { parentPort } = require('worker_threads')
const fs = require('fs')
const {
  EDDATA_SYSTEMS_DB,
  EDDATA_LOCATIONS_DB,
  EDDATA_STATIONS_DB,
  EDDATA_TRADE_DB,
  EDDATA_DATA_DIR
} = require('../consts')

const options = {
  readonly: false
  /* verbose: console.log */
}

// Check if databases exist and provide helpful error messages
const databases = {
  systems: EDDATA_SYSTEMS_DB,
  locations: EDDATA_LOCATIONS_DB,
  stations: EDDATA_STATIONS_DB,
  trade: EDDATA_TRADE_DB
}

const missingDbs = []
for (const [name, dbPath] of Object.entries(databases)) {
  if (!fs.existsSync(dbPath)) {
    missingDbs.push(`${name}: ${dbPath}`)
  }
}

if (missingDbs.length > 0) {
  console.error('❌ SQLite databases not found!')
  console.error('Data directory:', EDDATA_DATA_DIR)
  console.error('Missing databases:')
  missingDbs.forEach(db => console.error(`  - ${db}`))
  console.error('')
  console.error('💡 Solution:')
  console.error('1. Ensure EDDATA_DATA_DIR is correctly set')
  console.error('2. Mount the correct volume in docker-compose.yml')
  console.error('3. Copy database files to the data directory')
  console.error('4. Or run eddata-collector to generate databases')
  process.exit(1)
}

// This connection should replace the three seperate connections above, when
// I have time to do refactoring of all the existing API queries.
const sqlLiteDatabases = require('better-sqlite3')(':memory:', options)
sqlLiteDatabases.pragma('journal_mode = WAL')
sqlLiteDatabases.pragma('wal_autocheckpoint = 0')
sqlLiteDatabases.pragma('query_only = true')

sqlLiteDatabases.exec(`attach '${EDDATA_SYSTEMS_DB}' as systems;`)
sqlLiteDatabases.exec(`attach '${EDDATA_LOCATIONS_DB}' as locations;`)
sqlLiteDatabases.exec(`attach '${EDDATA_STATIONS_DB}' as stations;`)
sqlLiteDatabases.exec(`attach '${EDDATA_TRADE_DB}' as trade;`)

parentPort.on('message', ({ sql, parameters }) => {
  const result = sqlLiteDatabases.prepare(sql).all(parameters)
  parentPort.postMessage(result)
})
