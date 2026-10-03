// services/cache.js — TTL-based query-result cache for read-heavy
// dashboard endpoints. In-memory (single-instance); swap the Map for
// Redis when scaling horizontally.
//
// Invalidation: `invalidate(pattern)` on data writes. The submission
// pipeline calls `cache.invalidate('analytics')` + `invalidate('intelligence')`
// + `invalidate('command')` after every filing, so dashboards see fresh
// data within one request while repeat loads within the TTL are free.

const store = new Map(); // key → { value, expiresAt }
const MAX_ENTRIES = 500;
const stats = { hits: 0, misses: 0, invalidations: 0 };

function get(key) {
    const entry = store.get(key);
    if (!entry) { stats.misses++; return null; }
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        stats.misses++;
        return null;
    }
    stats.hits++;
    return entry.value;
}

function set(key, value, ttlMs = 5 * 60 * 1000) {
    // Evict oldest when full (simple LRU approximation).
    if (store.size >= MAX_ENTRIES) {
        const oldest = store.keys().next().value;
        store.delete(oldest);
    }
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Invalidate all keys matching a prefix (e.g., 'analytics', 'intelligence'). */
function invalidate(pattern) {
    let count = 0;
    for (const key of store.keys()) {
        if (key.startsWith(pattern)) { store.delete(key); count++; }
    }
    stats.invalidations += count;
    return count;
}

/** Clear everything (used by tests and admin endpoints). */
function clear() {
    store.clear();
    stats.hits = 0; stats.misses = 0; stats.invalidations = 0;
}

function health() {
    return { entries: store.size, maxEntries: MAX_ENTRIES,
             hitRate: stats.hits + stats.misses > 0 ? Math.round(stats.hits / (stats.hits + stats.misses) * 100) : 0,
             ...stats };
}

/**
 * Express middleware wrapper: caches GET responses by URL path + query.
 * Usage: router.get('/kpis', cache.middleware(60_000), handler)
 * Skip auth-varying responses by including role in the key path.
 */
function middleware(ttlMs = 5 * 60 * 1000) {
    return (req, res, next) => {
        if (req.method !== 'GET') return next();
        const key = `${req.baseUrl}${req.path}?${JSON.stringify(req.query)}|role:${req.user ? req.user.role : 'public'}`;
        const cached = get(key);
        if (cached !== null) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cached);
        }
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode === 200) {
                set(key, body, ttlMs);
                res.setHeader('X-Cache', 'MISS');
            }
            return originalJson(body);
        };
        next();
    };
}

/** Convenience: wrap an async function with caching. */
async function cached(key, ttlMs, fn) {
    const hit = get(key);
    if (hit !== null) return hit;
    const value = await fn();
    set(key, value, ttlMs);
    return value;
}

module.exports = { get, set, invalidate, clear, health, middleware, cached };
