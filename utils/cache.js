// Simple caching mechanism for performance
class PredictionCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const item = this.cache.get(key);
    if (item) {
      // Refresh item (move to end)
      this.cache.delete(key);
      this.cache.set(key, item);
      return item;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Global cache instance
const predictionCache = new PredictionCache();

const getCachedPrediction = (data, parameters) => {
  const cacheKey = JSON.stringify(parameters) + data.length;
  
  const cached = predictionCache.get(cacheKey);
  if (cached) {
    console.log('📦 Using cached prediction');
    return cached;
  }
  
  return null;
};

const setCachedPrediction = (data, parameters, prediction) => {
  const cacheKey = JSON.stringify(parameters) + data.length;
  predictionCache.set(cacheKey, prediction);
};

module.exports = {
  PredictionCache,
  getCachedPrediction,
  setCachedPrediction,
  predictionCache
};