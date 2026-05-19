const { getRedis } = require("../config/redis.js");

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function ipToKeyPart(ip) {
  return String(ip).replace(/:/g, "_");
}

async function incrementSlot(key, windowMs) {
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    // Chỉ set TTL (expire time) khi bắt đầu có request đầu tiên
    // Nếu mọi request mới đều được gia hạn TTL thì key sẽ không bao giờ hết hạn -> tràn Redis
    // Chọn TTL = 2 * windowMs để đảm bảo không bị sót request nào trong khung
    // Vì surely một window nằm trong khoảng [currentSlot - 1, currentSlot + 1]
    await redis.expire(key, Math.ceil((windowMs * 2) / 1000));
  }
  return count;
}

async function checkSlidingWindow(identifier, policy, windowMs, max) {
  const now = Date.now();
  const currentSlot = Math.floor(now / windowMs);
  const previousSlot = currentSlot - 1;

  const currKey = `rl:${policy}:${identifier}:${currentSlot}`;
  const prevKey = `rl:${policy}:${identifier}:${previousSlot}`;

  const currCount = await incrementSlot(currKey, windowMs);
  const prevRaw = await getRedis().get(prevKey);
  const prevCount = prevRaw ? Number(prevRaw) : 0;
  // currentSlot: là số thứ tự slot từ mốc thời gian 0
  // windowMs: là khoảng thời gian mà một slot chiếm
  // currentSlot * windowMs: là mốc thời gian bắt đầu của mỗi slot trên trục thời gian
  // VD: currentSlot = 1 thì slot 1 bắt đầu tại 60(s)
  // VD: currentSlot = 2 thì slot 2 bắt đầu tại 60 + 60 = 60 * 2 = 120(s)
  // VD: currentSlot = n thì slot n bắt đầu tại n * windowMs = n * 60(s)
  // Luôn đảm bảo elapsed sẽ < windowMs vì nếu >= windowMs sẽ nhảy sang (currentSlot + 1)
  const elapsed = now - currentSlot * windowMs;
  const weight = 1 - elapsed / windowMs;
  const estimated = prevCount * weight + currCount;

  if (estimated > max) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - elapsed) / 1000));
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

function readLimitConfig(envWindowKey, envMaxKey, defaults) {
  const windowMs = Number(process.env[envWindowKey]);
  const max = Number(process.env[envMaxKey]);
  return {
    windowMs:
      Number.isFinite(windowMs) && windowMs > 0 ? windowMs : defaults.windowMs,
    max: Number.isFinite(max) && max > 0 ? max : defaults.max,
  };
}

module.exports = {
  getClientIp,
  ipToKeyPart,
  checkSlidingWindow,
  readLimitConfig,
};
