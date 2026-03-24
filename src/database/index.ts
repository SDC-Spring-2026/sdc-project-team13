// Create logger
import { createNewLogger } from "../tools/log";
import { DatabaseConfManager } from "./defs/conf";
import { DatabaseMembersManager } from "./defs/members";
import { DatabaseMessagesManager, Message } from "./defs/messages";
import { DatabaseProjectManager } from "./defs/projects";
import { DatabaseTeamAssocManager } from "./defs/team_assoc";
import { DatabaseTeamsManager } from "./defs/teams";
export const dbLogger = createNewLogger("db");

/**
 * Interface for a connected database, defines all of the methods we might need to access.
 */
export type DatabaseManager = DatabaseConfManager &
  DatabaseMembersManager &
  DatabaseTeamsManager &
  DatabaseTeamAssocManager &
  DatabaseProjectManager &
  DatabaseMessagesManager;

// Export the database tool we want to use.
export * from "./sqlite";
