import { createNewLogger } from "../tools/log";
import { DatabaseConfManager } from "./defs/conf";
import { DatabaseMembersManager } from "./defs/members";
import { DatabaseMessagesManager } from "./defs/messages";
import { DatabaseProjectManager } from "./defs/projects";
import { DatabaseTeamAssocManager } from "./defs/team_assoc";
import { DatabaseTeamsManager } from "./defs/teams";
import { DatabaseBotConfigManager } from "./defs/bot_config";
import { getDriver, driver } from "./driver";
import { db_impl } from "./impl";
export { getDriver };

export const dbLogger = createNewLogger("db");

/**
 * Interface for a connected database, defines all of the methods we might need to access.
 */
export type DatabaseManager = DatabaseConfManager &
  DatabaseMembersManager &
  DatabaseTeamsManager &
  DatabaseTeamAssocManager &
  DatabaseProjectManager &
  DatabaseMessagesManager &
  DatabaseBotConfigManager;

/**
 * The database object. Call `db.initiate()` before use.
 * `db.setup()` creates/migrates tables and is run separately by `yarn setup`
 * (see `src/setup.ts`); the bot itself does not issue DDL on startup.
 * The underlying driver (SQLite or PostgreSQL) is chosen automatically based
 * on whether `DATABASE_URL` is present in the environment.
 */
export const db: DatabaseManager = {
  // Conf — delegated to the driver.
  isReady: () => driver().isReady(),
  initiate: async () => { const d = await getDriver(); return d.initiate(); },
  setup: () => driver().setup(),
  close: () => driver().close(),
  getRawDBInstance: () => driver().getRawDBInstance(),

  // All query implementations.
  ...db_impl
};
