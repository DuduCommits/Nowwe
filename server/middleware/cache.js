import NodeCache from "node-cache";

const cache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: false,
});

export const cacheMiddleware = (ttl = 60) => (req, res, next) => {
  if (req.method !== "GET") return next();

  const key = `${req.path}_${JSON.stringify(req.query)}`;
  const cached = cache.get(key);

  if (cached) {
    return res.json(cached);
  }

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    if (res.statusCode === 200) {
      cache.set(key, data, ttl);
    }
    return originalJson(data);
  };

  next();
};

export const invalidateCache = (pattern) => {
  const keys = cache.keys();
  keys.forEach((key) => {
    if (key.includes(pattern)) {
      cache.del(key);
    }
  });
};

export default cache;
