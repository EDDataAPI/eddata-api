// Get ISO timestamp in future or past, by number of days
// e.g. -30 for 30 days ago, or 1 for tomorrow
function getISOTimestamp (numberOfDays) {
  const i = Number.parseInt(numberOfDays, 10) // Use Number.parseInt with radix
  const now = new Date()

  if (i > 0) {
    const futureDate = new Date(now)
    futureDate.setDate(now.getDate() + i)
    return futureDate.toISOString()
  } else {
    const pastDate = new Date(now)
    pastDate.setDate(now.getDate() - Math.abs(i))
    return pastDate.toISOString()
  }
}

function getISODate (numberOfDays) {
  return getISOTimestamp(numberOfDays).split('T')[0]
}

function timeBetweenTimestamps (minTimestamp, maxTimestamp) {
  const d1 = new Date(minTimestamp)
  const d2 = new Date(maxTimestamp)
  const diffInSeconds = (d2 - d1) / 1000
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds`
  } else if (diffInSeconds < 60 * 60) {
    return `${Math.floor(diffInSeconds / 60)} minutes`
  } else if (diffInSeconds < 60 * 60 * 24) {
    return `${Math.floor(diffInSeconds / (60 * 60))} hours`
  } else {
    return `${Math.floor(diffInSeconds / (60 * 60 * 24))} days`
  }
}

module.exports = {
  getISOTimestamp,
  getISODate,
  timeBetweenTimestamps
}
