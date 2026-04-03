import { DatabaseTeamsManager } from "../defs/teams";
import { sql } from "./conf";
import { generateTermSlug, generateTeamSlug } from "../../tools/slug";
import { Project } from "../defs/projects";
import { TeamPermissionLevel } from "../defs/team_assoc";

export const db_teams: DatabaseTeamsManager = {
  getNumberOfTeams(term) {
    return new Promise((resolve, reject) => {
      try {
        // Build query to count teams, optionally filtering by term
        let query = "SELECT COUNT(*) as count FROM Teams";
        const params: (string | number)[] = [];
        if (term) {
          // Filter teams by slug pattern like "term-team%"
          query += " WHERE slug LIKE ?";
          params.push(`${term}-team%`);
        }
        // Execute query and return the count
        const result = <{ count: number }>sql.prepare(query).get(...params);
        resolve(result.count);
      } catch (error) {
        reject(error);
      }
    });
  },
  getTeamProjects(team_slug) {
    return new Promise((resolve, reject) => {
      try {
        // Query all projects associated with the given team slug
        const stmt = sql.prepare("SELECT * FROM Projects WHERE team_slug = ?");
        const results = stmt.all(team_slug) as Project[];
        resolve(results);
      } catch (error) {
        reject(error);
      }
    });
  },
  requestNewTeamID() {
    return new Promise((resolve, reject) => {
      try {
        // Get the current term (e.g., "sp2026")
        const term = generateTermSlug();
        // Pattern to match existing team slugs for this term
        const pattern = `${term}-team%`;
        // Find the highest team number for this term by extracting the number from slugs
        const stmt = sql.prepare(
          "SELECT MAX(CAST(SUBSTR(slug, LENGTH(?)+6) AS INTEGER)) as max_num FROM Teams WHERE slug LIKE ?"
        );
        const result = <{ max_num: number }>stmt.get(term, pattern);
        // Increment to get the next team number
        const nextNum = (result.max_num || 0) + 1;
        // Generate the new team slug
        const slug = generateTeamSlug(nextNum);
        // Insert a new inactive team record
        sql
          .prepare("INSERT INTO Teams (slug, is_active) VALUES (?, 0)")
          .run(slug);
        resolve(slug);
      } catch (error) {
        reject(error);
      }
    });
  },
  finalizeNewTeam(team_slug, channel_id, role_id, leader_id) {
    return new Promise((resolve, reject) => {
      try {
        // Update the team with channel and role IDs, and activate it
        sql
          .prepare(
            "UPDATE Teams SET role_id = ?, channel_id = ?, is_active = 1 WHERE slug = ?"
          )
          .run(role_id, channel_id, team_slug);
        // Add the leader to the team associations with leader permission
        sql
          .prepare(
            "INSERT INTO TeamAssociations (user_id, team_slug, perm_level) VALUES (?, ?, ?)"
          )
          .run(leader_id, team_slug, TeamPermissionLevel.LEADER);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },
  updateTeamActive(team_slug, is_active) {
    return new Promise((resolve, reject) => {
      try {
        // Update the active status of the team (convert boolean to integer for SQLite)
        sql
          .prepare("UPDATE Teams SET is_active = ? WHERE slug = ?")
          .run(is_active ? 1 : 0, team_slug);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },
  deleteTeam(team_slug) {
    return new Promise((resolve, reject) => {
      try {
        // Remove the team record from the database
        sql.prepare("DELETE FROM Teams WHERE slug = ?").run(team_slug);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
};
