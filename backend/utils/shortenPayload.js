const { buildShortUrl } = require("../config/public.js");

function toShortenData({ id, shortCode, longURL, createdAt }) {
  const data = {
    id,
    shortCode,
    shortUrl: buildShortUrl(shortCode),
    createdAt,
  };
  if (longURL !== undefined) {
    data.longURL = longURL;
  }
  return data;
}

module.exports = { toShortenData };
