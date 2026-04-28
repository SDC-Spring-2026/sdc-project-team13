import { Message } from "discord.js";
import { db } from "../database";
import type { Teams } from "../database/defs/teams";
import { resolveTeamSlug } from "./commands/resolveTeam";

export type TeamResolutionMatch =
  | "channel_id"
  | "channel_name"
  | "project_name"
  | "project_compact";

export type TeamResolution =
  | { team: Teams; match: TeamResolutionMatch }
  | { team: null; match: null };

/** Channel id stored on Teams.channel_id (threads use parent text channel). */
export function channelIdForTeamLookup(message: Message): string {
  const ch = message.channel;
  if (ch.isThread()) return ch.parentId ?? message.channelId;
  return message.channelId;
}

/**
 * Resolve which SDC team row applies to this Discord message: by linked channel id,
 * or by matching the channel name to a project display name (fallback).
 */
export async function resolveTeamForMessage(
  message: Message
): Promise<TeamResolution> {
  if (!message.guild) return { team: null, match: null };

  const lookupId = channelIdForTeamLookup(message);
  const byChannel = await db.getTeamByChannelId(lookupId);
  if (byChannel) return { team: byChannel, match: "channel_id" };

  const ch = message.channel;
  const chName = ch.isDMBased()
    ? null
    : "name" in ch
      ? (ch.name ?? null)
      : null;
  if (!chName) return { team: null, match: null };

  const slugFromName = await resolveTeamSlug(
    message.guild,
    chName.trim().toLowerCase().replace(/\s+/g, "-")
  );
  if (slugFromName) {
    const t = await db.getTeamBySlug(slugFromName);
    if (t) return { team: t, match: "channel_name" };
  }

  const nameCandidates = [
    ...new Set(
      [
        chName,
        chName.trim(),
        chName.trim().toLowerCase(),
        chName.trim().toLowerCase().replace(/\s+/g, "-"),
        chName.trim().toLowerCase().replace(/-/g, " "),
        chName.replace(/\s+/g, "").toLowerCase()
      ].filter((s) => s.length > 0)
    )
  ];

  let project;
  for (const cand of nameCandidates) {
    project = await db.getProjectByName(cand);
    if (project) break;
  }
  if (project) {
    const team = await db.getTeamBySlug(project.team_slug);
    if (team) return { team, match: "project_name" };
  }

  const compact = chName
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.]+/g, "");
  if (compact.length > 0) {
    const t2 = await db.findActiveTeamByProjectNameCompact(compact);
    if (t2) return { team: t2, match: "project_compact" };
  }

  return { team: null, match: null };
}
