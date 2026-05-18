const { getRedis } = require("../config/redis.js");

// 4 basic Redis operations: get, set, del, exists
// hash get/set: hget, hset, hdel
// pop/push: lpop, lpush, rpop, rpush
// list: lrange
function cacheKey(shortCode) {
  return `url:${shortCode}`;
}

function cacheTtlSeconds() {
  const ttl = Number(process.env.CACHE_TTL_SECONDS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 3600;
}

async function getCachedUrl(shortCode) {
  const raw = await getRedis().get(cacheKey(shortCode));
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
}

async function setCachedUrl(shortCode, record) {
  await getRedis().set(cacheKey(shortCode), JSON.stringify(record), {
    EX: cacheTtlSeconds(),
  });
}

async function invalidateCachedUrl(shortCode) {
  await getRedis().del(cacheKey(shortCode));
}

module.exports = { getCachedUrl, setCachedUrl, invalidateCachedUrl };
