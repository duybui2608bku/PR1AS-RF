/**
 * Minimal in-memory TTL + LRU cache. No external dependency.
 *
 * Single-instance only — values are not shared across Node processes. Callers
 * that need cluster-wide consistency (e.g. presence) must use Redis instead.
 *
 * Eviction: oldest insertion order when `max` is exceeded; expired entries are
 * dropped lazily on the next `get`. A `delete` is exposed so callers can
 * invalidate entries when authoritative state changes (booking confirmed,
 * user role changed, etc.).
 */
export class TTLCache<K, V> {
  private readonly store = new Map<K, { value: V; expiresAt: number }>();

  constructor(
    private readonly max: number,
    private readonly ttlMs: number
  ) {}

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh LRU position so frequently-used entries survive eviction.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.max) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: K): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
