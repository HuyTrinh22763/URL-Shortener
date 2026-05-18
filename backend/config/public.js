function getPublicBaseUrl() {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

function buildShortUrl(shortCode) {
  return `${getPublicBaseUrl()}/${shortCode}`;
}

module.exports = { getPublicBaseUrl, buildShortUrl };
