function paramAsBoolean (param) {
  if (param === true) return true
  if (param === 1) return true
  if (typeof param === 'string') {
    const trimmed = param.trim().toLowerCase()
    return trimmed === 'true' || trimmed === '1'
  }
  return false
}

module.exports = {
  paramAsBoolean
}
