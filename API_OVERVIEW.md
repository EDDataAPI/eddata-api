# EDData API - Endpoint Overview

> **Version:** 1.0.0  
> **Base URL:** `https://api.eddata.dev`  
> **Protocol:** REST (JSON)

## About

The EDData API provides comprehensive access to Elite Dangerous game data collected from EDDN (Elite Dangerous Data Network). The API serves data about over 150 million star systems, millions of trade orders, and hundreds of thousands of stations.

All endpoints support **dual URL patterns**:
- `/api/v2/*` - Full path with API prefix
- `/v2/*` - Shortened path without API prefix

Both patterns return identical data and can be used interchangeably.

## CORS Support

The API supports cross-origin requests from:
- `https://eddata.dev`
- `https://*.eddata.dev` (all subdomains)
- `http://localhost:3000` (development)
- `http://localhost:3001` (development)

## Rate Limiting

Currently no rate limiting is enforced, but please be respectful with request volumes.

---

## Endpoints by Category

### General

#### `GET /v2/version`
Returns the current API version.

**Response:**
```json
{
  "version": "1.0.0"
}
```

#### `GET /v2/stats`
Returns comprehensive database statistics (updated every 15 minutes by collector).

**Response:**
```json
{
  "systems": 102694411,
  "pointsOfInterest": 1500000,
  "stations": {
    "stations": 42695,
    "carriers": 5360,
    "updatedInLast24Hours": 563215
  },
  "trade": {
    "markets": 16419,
    "orders": 10773236,
    "updatedInLast24Hours": 563215,
    "uniqueCommodities": 150
  },
  "timestamp": "2025-11-14T12:00:00Z"
}
```

---

### News

#### `GET /v2/news/galnet`
Returns the latest Galnet news articles from Elite Dangerous.

**Response:**
```json
[
  {
    "published": "2025-11-15T10:00:00Z",
    "date": "15 NOV 3311",
    "title": "Breaking News",
    "text": "Article content...",
    "slug": "breaking-news",
    "image": "https://...",
    "url": "https://..."
  }
]
```

#### `GET /v2/news/commodities`
Returns recent commodity market updates (ticker).

---

### Commodities

#### `GET /v2/commodities`
Returns all known traded commodities with price ranges and supply/demand totals.

**Notes:**
- Excludes Fleet Carriers
- Updated daily
- Includes min/max/avg prices for buy and sell

**Response:**
```json
[
  {
    "commodityName": "gold",
    "maxBuyPrice": 59797,
    "minBuyPrice": 3979,
    "avgBuyPrice": 44441,
    "totalStock": 73016533,
    "maxSellPrice": 70761,
    "minSellPrice": 3978,
    "avgSellPrice": 48259,
    "totalDemand": 1899662825
  }
]
```

#### `GET /v2/commodities/top`
Returns top 30 commodities ranked by trading activity (market count and total stock).

**Query Parameters:**
- None

**Response:** Array of commodity reports with additional `marketCount` field, sorted by trading volume.

---

#### `GET /v2/commodity/name/{commodityName}`
Returns summary report for a specific commodity.

**Path Parameters:**
- `commodityName` - Commodity name (lowercase, no special characters, e.g., "gold")

**Response:** Single commodity report object.

---

#### `GET /v2/commodity/name/{commodityName}/imports`
Returns places importing a commodity (where you can **sell**), ordered by highest price.

**Path Parameters:**
- `commodityName` - Commodity name

**Query Parameters:**
- `minVolume` - Minimum volume/demand (default: 1)
- `minPrice` - Minimum sell price (default: 1)
- `fleetCarriers` - Filter fleet carriers (true/false/null)
- `maxDaysAgo` - Maximum age of data in days (default: 30, max: 90)

**Response:** Array of commodity orders (max 100 results).

---

#### `GET /v2/commodity/name/{commodityName}/exports`
Returns places exporting a commodity (where you can **buy**), ordered by lowest price.

**Path Parameters:**
- `commodityName` - Commodity name

**Query Parameters:**
- `minVolume` - Minimum volume/stock (default: 1)
- `maxPrice` - Maximum buy price
- `fleetCarriers` - Filter fleet carriers (true/false/null)
- `maxDaysAgo` - Maximum age of data in days (default: 30, max: 90)

**Response:** Array of commodity orders (max 100 results).

---

### Systems

#### `GET /v2/system/name/{systemName}`
Returns information about a star system by name.

**Path Parameters:**
- `systemName` - System name (URL encoded for special characters, e.g., "Sol")

**Response:**
```json
{
  "systemName": "Sol",
  "systemAddress": 10477373803,
  "systemX": 0.0,
  "systemY": 0.0,
  "systemZ": 0.0,
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

---

#### `GET /v2/system/address/{systemAddress}`
Returns information about a star system by system address (for disambiguation).

**Path Parameters:**
- `systemAddress` - System address (64-bit integer, e.g., 10477373803)

---

#### `GET /v2/systems/top`
Returns top 30 systems ranked by permanent station count (excludes Fleet Carriers).

**Query Parameters:**
- None

**Response:** Array of systems with additional `permanentStationCount` field, sorted by station count descending.

---

#### `GET /v2/system/name/{systemName}/status`
Returns system status information from EDSM (Elite Dangerous Star Map).

**Path Parameters:**
- `systemName` - System name

**Response:** EDSM system status data (security, population, controlling faction, etc.)

---

#### `GET /v2/system/name/{systemName}/bodies`
Returns system bodies (planets, stars, moons) from EDSM.

**Path Parameters:**
- `systemName` - System name

**Response:** Array of celestial bodies with detailed properties.

---

#### `GET /v2/system/name/{systemName}/markets`
Returns all markets (stations with commodity trading) in the system.

**Path Parameters:**
- `systemName` - System name

**Response:** Array of stations with market data.

---

#### `GET /v2/system/name/{systemName}/stations`
Returns all stations in the system.

**Path Parameters:**
- `systemName` - System name

**Response:** Array of station objects.

---

#### `GET /v2/system/name/{systemName}/nearby`
Returns up to 1000 nearby systems, ordered by distance.

**Path Parameters:**
- `systemName` - System name

**Query Parameters:**
- `maxDistance` - Maximum distance in light years (default: 100, max: 500)

**Response:**
```json
[
  {
    "systemName": "Alpha Centauri",
    "systemAddress": 123456789,
    "systemX": 1.2,
    "systemY": 3.4,
    "systemZ": 5.6,
    "distance": 4.37,
    "updatedAt": "2025-11-15T10:00:00Z"
  }
]
```

---

#### `GET /v2/system/name/{systemName}/nearby/contacts`
Returns nearby points of interest, ordered by distance.

**Path Parameters:**
- `systemName` - System name

**Query Parameters:**
- `maxDistance` - Maximum distance in light years (default: 100, max: 500)

**Response:** Array of systems with points of interest (max 100 results).

---

#### `GET /v2/system/name/{systemName}/nearest/{service}`
Find the nearest station providing a specific service.

**Path Parameters:**
- `systemName` - System name
- `service` - Service type (see below)

**Available Services:**
- `interstellar-factors`
- `material-trader`
- `technology-broker`
- `black-market`
- `universal-cartographics`
- `refuel`
- `repair`
- `shipyard`
- `outfitting`
- `search-and-rescue`

**Query Parameters:**
- `minLandingPadSize` - Minimum pad size (1=Small, 2=Medium, 3=Large, default: 1)

**Response:** Array of 20 nearest stations with the specified service.

---

#### `GET /v2/system/name/{systemName}/commodities`
Returns all known trade orders in the system.

**Path Parameters:**
- `systemName` - System name

**Response:** Array of commodity orders.

---

#### `GET /v2/system/name/{systemName}/commodities/imports`
Returns commodities imported by the system (where you can sell).

**Path Parameters:**
- `systemName` - System name

**Query Parameters:**
- `minVolume` - Minimum volume/demand (default: 1)
- `minPrice` - Minimum sell price (default: 1)
- `fleetCarriers` - Filter fleet carriers (true/false/null)
- `maxDaysAgo` - Maximum age of data in days (default: 30, max: 90)

**Response:** Array of commodity orders.

---

#### `GET /v2/system/name/{systemName}/commodities/exports`
Returns commodities exported by the system (where you can buy).

**Path Parameters:**
- `systemName` - System name

**Query Parameters:**
- `minVolume` - Minimum volume/stock (default: 1)
- `maxPrice` - Maximum buy price
- `fleetCarriers` - Filter fleet carriers (true/false/null)
- `maxDaysAgo` - Maximum age of data in days (default: 30, max: 90)

**Response:** Array of commodity orders.

---

#### `GET /v2/system/name/{systemName}/commodity/name/{commodityName}`
Returns all buy/sell orders for a commodity in a specific system.

**Path Parameters:**
- `systemName` - System name
- `commodityName` - Commodity name

**Query Parameters:**
- `maxDaysAgo` - Maximum age of data in days (default: 30, max: 90)

**Response:** Array of commodity orders in the system.

---

#### `GET /v2/system/name/{systemName}/commodity/name/{commodityName}/nearby/imports`
Returns nearby places importing a commodity, ordered by highest price.

**Path Parameters:**
- `systemName` - System name
- `commodityName` - Commodity name

**Query Parameters:**
- `minVolume` - Minimum volume/demand (default: 1)
- `minPrice` - Minimum sell price (default: 1)
- `fleetCarriers` - Filter fleet carriers (true/false/null)
- `maxDistance` - Maximum distance in light years (default: 100, max: 1000)
- `maxDaysAgo` - Maximum age of data in days (default: 30, max: 90)

**Response:** Array of commodity orders (first 1000 results).

---

#### `GET /v2/system/name/{systemName}/commodity/name/{commodityName}/nearby/exports`
Returns nearby places exporting a commodity, ordered by lowest price.

**Path Parameters:**
- `systemName` - System name
- `commodityName` - Commodity name

**Query Parameters:**
- `minVolume` - Minimum volume/stock (default: 1)
- `maxPrice` - Maximum buy price
- `fleetCarriers` - Filter fleet carriers (true/false/null)
- `maxDistance` - Maximum distance in light years (default: 100, max: 1000)
- `maxDaysAgo` - Maximum age of data in days (default: 30, max: 90)

**Response:** Array of commodity orders (first 1000 results).

---

### Stations

#### `GET /v2/stations/top`
Returns top 30 stations ranked by service count (number of available services).

**Query Parameters:**
- None

**Response:**
```json
[
  {
    "marketId": 128106744,
    "stationName": "Jameson Memorial",
    "stationType": "Orbis",
    "systemAddress": 123456789,
    "systemName": "Shinrarta Dezhra",
    "systemX": 55.71875,
    "systemY": 17.59375,
    "systemZ": 27.15625,
    "distanceToArrival": 325.5,
    "maxLandingPadSize": "L",
    "primaryEconomy": "HighTech",
    "secondaryEconomy": "Industrial",
    "serviceCount": 14,
    "blackMarket": 1,
    "market": 1,
    "refuel": 1,
    "repair": 1,
    "rearm": 1,
    "outfitting": 1,
    "shipyard": 1,
    "crew": 1,
    "engineer": 0,
    "interstellarFactors": 1,
    "universalCartographics": 1,
    "materialTrader": 1,
    "technologyBroker": 1,
    "searchAndRescue": 1
  }
]
```

**Notes:**
- Excludes Fleet Carriers
- Services counted: blackMarket, market, refuel, repair, rearm, outfitting, shipyard, crew, engineer, interstellarFactors, universalCartographics, materialTrader, technologyBroker, searchAndRescue (14 total)
- Sorted by service count descending, then by landing pad size descending

---

### Markets

#### `GET /v2/market/{marketId}/commodities`
Returns all commodity orders for a specific market.

**Path Parameters:**
- `marketId` - Market ID (64-bit integer)

**Response:** Array of commodity orders.

---

#### `GET /v2/market/{marketId}/commodity/name/{commodityName}`
Returns commodity information for a specific market (useful for rare goods).

**Path Parameters:**
- `marketId` - Market ID (64-bit integer)
- `commodityName` - Commodity name

**Response:** Single commodity order object.

---

### Search

#### `GET /v2/search/system/name/{searchTerm}`
Search for star systems by name (partial match supported).

**Path Parameters:**
- `searchTerm` - Search term (URL encoded)

**Response:** Array of matching systems (limited results).

---

#### `GET /v2/search/station/name/{searchTerm}`
Search for stations by name (partial match supported).

**Path Parameters:**
- `searchTerm` - Search term (URL encoded)

**Response:** Array of matching stations (limited results).

---

## Common Data Structures

### Commodity Order
```json
{
  "commodityName": "gold",
  "marketId": 128106744,
  "stationName": "Abraham Lincoln",
  "stationType": "Coriolis",
  "distanceToArrival": 3200.5,
  "maxLandingPadSize": "L",
  "bodyId": 1,
  "bodyName": "Sol 1",
  "systemAddress": 10477373803,
  "systemName": "Sol",
  "systemX": 0.0,
  "systemY": 0.0,
  "systemZ": 0.0,
  "buyPrice": 9000,
  "demand": 5000,
  "demandBracket": 2,
  "meanPrice": 9500,
  "sellPrice": 10000,
  "stock": 3000,
  "stockBracket": 2,
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

### Station
```json
{
  "stationName": "Abraham Lincoln",
  "stationType": "Coriolis",
  "marketId": 128106744,
  "systemName": "Sol",
  "systemAddress": 10477373803,
  "distanceToArrival": 3200.5,
  "maxLandingPadSize": "L",
  "bodyId": 1,
  "bodyName": "Sol 1",
  "blackMarket": 0,
  "market": 1,
  "refuel": 1,
  "repair": 1,
  "rearm": 1,
  "outfitting": 1,
  "shipyard": 1,
  "crew": 1,
  "interstellarFactors": 1,
  "universalCartographics": 1,
  "materialTrader": 0,
  "technologyBroker": 0,
  "searchAndRescue": 1,
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

### System
```json
{
  "systemName": "Sol",
  "systemAddress": 10477373803,
  "systemX": 0.0,
  "systemY": 0.0,
  "systemZ": 0.0,
  "updatedAt": "2025-11-15T10:00:00Z"
}
```

---

## Common Query Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `minVolume` | integer | 1 | - | Minimum volume/stock/demand |
| `minPrice` | integer | 1 | - | Minimum price for imports |
| `maxPrice` | integer | - | - | Maximum price for exports |
| `fleetCarriers` | boolean | null | - | Filter by fleet carriers (true/false/null) |
| `maxDaysAgo` | integer | 30 | 90 | Maximum age of data in days |
| `maxDistance` | integer | 100 | 500-1000 | Maximum distance in light years |
| `minLandingPadSize` | integer | 1 | 3 | Minimum landing pad size (1=S, 2=M, 3=L) |

---

## Error Responses

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "The requested resource was not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An error occurred while processing your request"
}
```

---

## Notes

- **Date Format:** All dates are in ISO 8601 format (e.g., `2025-11-15T10:00:00Z`)
- **Distances:** All distances are in light years or light seconds (as specified)
- **Fleet Carriers:** Can be filtered in most commodity/market queries
- **Data Freshness:** Trade data is continuously updated from EDDN; system data is more static
- **Coordinates:** System coordinates use Elite Dangerous coordinate system (X, Y, Z in light years from galactic center)

---

## Related Projects

- **[EDData Collector](https://github.com/EDDataAPI/eddata-collector)** - Data collection from EDDN
- **[EDData Web](https://github.com/EDDataAPI/eddata-web)** - Web interface for browsing data
- **[EDData Auth](https://github.com/EDDataAPI/eddata-auth)** - Authentication service

---

## License

AGPL-3.0 - See [LICENSE](LICENSE) file for details.
