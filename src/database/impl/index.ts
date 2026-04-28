import { db_members } from "./members";
import { db_messages } from "./messages";
import { db_projects } from "./projects";
import { db_team_assoc } from "./team_assoc";
import { db_teams } from "./teams";
import { db_bot_config } from "./bot_config";

export const db_impl = {
  ...db_members,
  ...db_teams,
  ...db_team_assoc,
  ...db_projects,
  ...db_messages,
  ...db_bot_config
};
