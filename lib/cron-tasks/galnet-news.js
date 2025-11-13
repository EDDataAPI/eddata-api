const fsPromises = require('fs/promises')
const { EDDATA_GALNET_NEWS_CACHE } = require('../consts')

// Official Elite Dangerous Galnet News Feeds
// Primary: JSON API from CMS
// Fallback: Could use RSS feed if JSON API fails
const GALNET_NEWS_FEEDS = {
  primary: 'https://cms.zaonce.net/en-GB/jsonapi/node/galnet_article?&sort=-published_at&page[offset]=0&page[limit]=12'
  // Alternative: 'https://community.elitedangerous.com/galnet-rss' (RSS format)
}

async function fetchGalnetNews () {
  const req = await fetch(GALNET_NEWS_FEEDS.primary, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'EDData-API/1.0.0'
    },
    signal: AbortSignal.timeout(10000) // 10 second timeout
  })

  if (!req.ok) {
    throw new Error(`HTTP ${req.status}: ${req.statusText}`)
  }

  return await req.json()
}

module.exports = async () => {
  try {
    const json = await fetchGalnetNews()

    if (!json?.data || !Array.isArray(json.data)) {
      throw new Error('Invalid response format from Galnet API')
    }

    const data = json.data.map(item => ({
      published: new Date(item.attributes.published_at).toISOString(),
      date: item.attributes.field_galnet_date,
      title: item.attributes.title,
      text: item.attributes.body.value.replace(/\r/g, ''),
      slug: item.attributes.field_slug,
      image: `https://hosting.zaonce.net/elite-dangerous/galnet/${item.attributes.field_galnet_image}.png`,
      url: `https://community.elitedangerous.com/galnet/uid/${item.attributes.field_galnet_guid}`
    }))

    await fsPromises.writeFile(EDDATA_GALNET_NEWS_CACHE, JSON.stringify(data, null, 2), 'utf8')
    console.log(`✅ Successfully fetched ${data.length} Galnet news articles`)
  } catch (error) {
    console.error('❌ Failed to fetch Galnet news:', error.message)

    // Log additional details for debugging
    if (error.cause) {
      console.error('   Cause:', error.cause.message)
    }

    // Don't throw - allow the service to continue running
    // The cache file will retain previous data if it exists
  }
}
