interface Entry<T> {
  value: Promise<T>;
  expires: number;
}

export class TtlCache {
  private entries = new Map<string, Entry<unknown>>();

  constructor(private maxEntries = 1000) {}

  /**
   * Returns the cached value for `key`, or runs `load` and caches the result.
   * Concurrent callers share the same in-flight promise; failures are not cached.
   */
  async getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.entries.get(key) as Entry<T> | undefined;
    if (hit && hit.expires > now) {
      this.entries.delete(key);
      this.entries.set(key, hit);
      return hit.value;
    }

    const value = load();
    this.entries.set(key, { value, expires: now + ttlMs });
    this.evict();
    try {
      return await value;
    } catch (err) {
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
      throw err;
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }

  private evict(): void {
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

export const cache = new TtlCache();

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
