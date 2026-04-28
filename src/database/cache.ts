const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface Entry<T> {
  value: T;
  expiresAt: number;
}

class DbCache {
  private store = new Map<string, Entry<unknown>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + TTL_MS });
  }

  del(...keys: string[]): void {
    for (const key of keys) this.store.delete(key);
  }

  /** Delete all entries whose key starts with prefix. */
  delPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

export const dbCache = new DbCache();
