function setTimingHeaders(res, resolveMs, cacheStatus) {
  if (resolveMs != null && Number.isFinite(resolveMs)) {
    res.setHeader("X-Resolve-Time-Ms", String(Math.round(resolveMs)));
  }
  if (cacheStatus) {
    res.setHeader("X-Cache-Status", cacheStatus);
  }
}

module.exports = { setTimingHeaders };
