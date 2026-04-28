import { DatabaseConfManager } from "../defs/conf";

/**
 * Abstraction over the underlying SQL engine.
 * Implementations translate `?` placeholders and connection lifecycle.
 */
export interface Driver extends DatabaseConfManager {
  /** Execute a SQL statement and return all resulting rows. */
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]>;
}

// Lazily import so the unused driver's package isn't required at startup.
async function loadDriver(): Promise<Driver> {
  if (process.env.DATABASE_URL) {
    const { postgresDriver } = await import("./postgres.js");
    return postgresDriver;
  } else {
    const { sqliteDriver } = await import("./sqlite.js");
    return sqliteDriver;
  }
}

let _driver: Driver | undefined;

export async function getDriver(): Promise<Driver> {
  if (!_driver) _driver = await loadDriver();
  return _driver;
}

/** Synchronous accessor — only valid after the first `getDriver()` call. */
export function driver(): Driver {
  if (!_driver)
    throw new Error("Driver not yet initialised. Call getDriver() first.");
  return _driver;
}
