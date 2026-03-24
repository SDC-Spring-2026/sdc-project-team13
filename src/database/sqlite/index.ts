import { DatabaseManager } from "..";
import { TeamAssociations } from "../defs/team_assoc";
import { Teams } from "../defs/teams";
import { db_conf } from "./conf";
import { db_members } from "./members";

// Export the proper tools
export const db: DatabaseManager = {
  ...db_conf,
  ...db_members
};
