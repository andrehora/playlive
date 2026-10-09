function isExpired(expires, today) {
  if (today === undefined) {
    today = new Date();
  }
  // A bug to try: return today >= expires;
  return today > expires;
}

module.exports = { isExpired };
