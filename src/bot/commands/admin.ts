import {
  ChannelType,
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
  PermissionFlagsBits
} from "discord.js";
import { db } from "../../database";
import { createNewLogger } from "../../tools/log";
import { TeamPermissionLevel } from "../../database/defs/team_assoc";
import { isPresidentOrAdmin } from "../permissions";
import {
  addRepoCollaborator,
  removeRepoCollaborator
} from "../../integrations/githubApp";
import { driver } from "../../database/driver";
import { tbl } from "../../database/physicalTables";

const logger = createNewLogger("cmd:admin");

const CFG_AUDIT_LOG_CHANNEL = "audit_log_channel_id";

export const adminCommand = {
  name: "admin",
  description: "Server admin tools (president/admin role required)",
  options: [
    {
      type: 1, // SUB_COMMAND
      name: "setup",
      description: "Create/validate the Teams category (required by /create)"
    },
    {
      type: 1, // SUB_COMMAND
      name: "diagnostics",
      description: "Check bot env + access to required services"
    },
    {
      type: 1, // SUB_COMMAND
      name: "repair",
      description: "Repair a team’s Discord role/channel mapping from DB",
      options: [
        {
          type: 3, // STRING
          name: "team",
          description: "Team slug (leave blank to infer from this channel)",
          required: false
        }
      ]
    },
    {
      type: 1, // SUB_COMMAND
      name: "force_add",
      description: "Force-add a user to a team (DB + Discord role + GitHub)",
      options: [
        {
          type: 3,
          name: "team",
          description: "Team slug",
          required: true
        },
        {
          type: 6, // USER
          name: "user",
          description: "User to add",
          required: true
        }
      ]
    },
    {
      type: 1, // SUB_COMMAND
      name: "force_remove",
      description:
        "Force-remove a user from a team (DB + Discord role + GitHub)",
      options: [
        {
          type: 3,
          name: "team",
          description: "Team slug",
          required: true
        },
        {
          type: 6,
          name: "user",
          description: "User to remove",
          required: true
        }
      ]
    },
    {
      type: 1, // SUB_COMMAND
      name: "force_transfer",
      description: "Force-transfer DB leadership to another member",
      options: [
        {
          type: 3,
          name: "team",
          description: "Team slug",
          required: true
        },
        {
          type: 6,
          name: "user",
          description: "New leader",
          required: true
        }
      ]
    },
    {
      type: 2, // SUB_COMMAND_GROUP
      name: "audit_log",
      description: "Configure admin audit log channel",
      options: [
        {
          type: 1,
          name: "status",
          description: "Show the current audit log channel"
        },
        {
          type: 1,
          name: "set",
          description: "Set the audit log channel",
          options: [
            {
              type: 7, // CHANNEL
              name: "channel",
              description: "Channel to post admin audit logs into",
              required: true
            }
          ]
        },
        {
          type: 1,
          name: "test",
          description: "Send a test message to the audit log channel"
        }
      ]
    }
  ]
};

function mustBePrivileged(
  interaction: ChatInputCommandInteraction
): GuildMember | null {
  const member = interaction.member;
  if (!member || typeof member !== "object" || !("roles" in member))
    return null;
  const gm = member as GuildMember;
  return isPresidentOrAdmin(gm) ? gm : null;
}

async function ensureTeamsCategory(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) throw new Error("This command must be run in a server.");

  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === "Teams"
  );
  if (existing && existing.type === ChannelType.GuildCategory) return existing;

  const me = await guild.members.fetchMe();
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error(
      "Missing permission: Manage Channels (cannot create Teams category)."
    );
  }
  return await guild.channels.create({
    name: "Teams",
    type: ChannelType.GuildCategory,
    reason: `Created by /admin setup for ${interaction.user.tag}`
  });
}

async function resolveTeamSlugFromContext(
  interaction: ChatInputCommandInteraction,
  teamOptName: string
): Promise<string | null> {
  const raw = interaction.options.getString(teamOptName);
  if (raw) return raw.trim();
  const byChannel = await db.getTeamByChannelId(interaction.channelId);
  return byChannel?.slug ?? null;
}

async function getTeamOrReply(
  interaction: ChatInputCommandInteraction,
  teamSlug: string
) {
  const team = await db.getTeam(teamSlug);
  if (!team) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `No team found for slug **${teamSlug}**.`
    });
    return null;
  }
  return team;
}

async function maybeAudit(
  interaction: ChatInputCommandInteraction,
  text: string
) {
  try {
    const guild = interaction.guild;
    if (!guild) return;
    const channelId = (await db.getBotConfig(CFG_AUDIT_LOG_CHANNEL)) ?? "";
    if (!channelId) return;
    const ch = await guild.channels.fetch(channelId).catch(() => null);
    if (!ch || !ch.isTextBased()) return;
    await ch.send({ content: text }).catch(() => {});
  } catch {
    // best effort
  }
}

export async function handleAdmin(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "This command can only be used in a server."
    });
    return;
  }

  const privileged = mustBePrivileged(interaction);
  if (!privileged) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content:
        "You don’t have permission to use `/admin`. (Requires president/admin Discord role.)"
    });
    return;
  }

  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  if (group === "audit_log") {
    if (sub === "status") {
      const channelId = await db.getBotConfig(CFG_AUDIT_LOG_CHANNEL);
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: channelId
          ? `Audit log channel: <#${channelId}> (\`${channelId}\`)`
          : "Audit log channel is not set."
      });
      return;
    }

    if (sub === "set") {
      const ch = interaction.options.getChannel("channel", true);
      if (
        ch.type !== ChannelType.GuildText &&
        ch.type !== ChannelType.GuildAnnouncement
      ) {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: "Please choose a text channel."
        });
        return;
      }
      await db.setBotConfig(CFG_AUDIT_LOG_CHANNEL, ch.id);
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `Audit log channel set to ${ch}.`
      });
      await maybeAudit(
        interaction,
        `🔧 ${interaction.user.tag} set audit log channel to ${ch}.`
      );
      return;
    }

    if (sub === "test") {
      const channelId = await db.getBotConfig(CFG_AUDIT_LOG_CHANNEL);
      if (!channelId) {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: "Audit log channel is not set. Use `/admin audit_log set`."
        });
        return;
      }
      const ch = await interaction.guild.channels
        .fetch(channelId)
        .catch(() => null);
      if (!ch || !ch.isTextBased()) {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: "Audit log channel is invalid or no longer exists."
        });
        return;
      }
      await ch.send({
        content: `✅ Audit log test from ${interaction.user.tag}`
      });
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `Sent a test message to <#${channelId}>.`
      });
      return;
    }
  }

  if (sub === "setup") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const category = await ensureTeamsCategory(interaction);
    await interaction.editReply(
      `✅ Teams category is ready: **${category.name}** (${category.id})`
    );
    await maybeAudit(
      interaction,
      `🧰 ${interaction.user.tag} ran /admin setup (Teams category: ${category.id}).`
    );
    return;
  }

  if (sub === "diagnostics") {
    const required = [
      "DISCORD_TOKEN",
      "GITHUB_ORG",
      "GITHUB_APP_ID",
      "GITHUB_APP_PRIVATE_KEY",
      "GEMINI_API_KEY"
    ];
    const missing = required.filter((k) => !process.env[k]);
    const roleCfgOk =
      Boolean(process.env.DISCORD_ADMIN_ROLE_IDS) ||
      Boolean(process.env.DISCORD_PRESIDENT_ROLE_IDS);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: [
        "**Diagnostics**",
        missing.length
          ? `Missing env: ${missing.map((m) => `\`${m}\``).join(", ")}`
          : "Env: OK",
        roleCfgOk
          ? "Admin roles: configured"
          : "Admin roles: missing (`DISCORD_ADMIN_ROLE_IDS` and/or `DISCORD_PRESIDENT_ROLE_IDS`)",
        "Tip: Use `/admin setup` to validate the `Teams` category."
      ].join("\n")
    });
    return;
  }

  if (sub === "repair") {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const teamSlug = await resolveTeamSlugFromContext(interaction, "team");
    if (!teamSlug) {
      await interaction.editReply(
        "Provide `team`, or run this inside a team channel."
      );
      return;
    }
    const team = await getTeamOrReply(interaction, teamSlug);
    if (!team) return;

    const guild = interaction.guild;
    const category = await ensureTeamsCategory(interaction);

    // Role
    let role = team.role_id ? guild.roles.cache.get(team.role_id) : null;
    if (!role)
      role = guild.roles.cache.find((r) => r.name === teamSlug) ?? null;
    if (!role) {
      role = await guild.roles.create({
        name: teamSlug,
        reason: `Repaired missing role for ${teamSlug} via /admin repair`
      });
      // Update DB row directly (db has no dedicated setter).
      const T = tbl("teams");
      driver()
        .query(`UPDATE ${T} SET role_id = ? WHERE slug = ?`, [
          role.id,
          teamSlug
        ])
        .catch(() => {});
    } else if (role.name !== teamSlug) {
      await role
        .setName(
          teamSlug,
          `Repaired role name for ${teamSlug} via /admin repair`
        )
        .catch(() => {});
    }

    // Channel
    let channel = team.channel_id
      ? guild.channels.cache.get(team.channel_id)
      : undefined;
    if (!channel || channel.type !== ChannelType.GuildText) {
      channel = await guild.channels.create({
        name: teamSlug,
        type: ChannelType.GuildText,
        parent: category.id,
        reason: `Repaired missing channel for ${teamSlug} via /admin repair`,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionFlagsBits.SendMessages]
          },
          { id: role.id, allow: [PermissionFlagsBits.SendMessages] }
        ]
      });
      const T = tbl("teams");
      driver()
        .query(`UPDATE ${T} SET channel_id = ? WHERE slug = ?`, [
          channel.id,
          teamSlug
        ])
        .catch(() => {});
    } else {
      if (channel.parentId !== category.id) {
        await channel.setParent(category.id).catch(() => {});
      }
      if (channel.name !== teamSlug) {
        await channel.setName(teamSlug).catch(() => {});
      }
    }

    // Ensure all DB members have the role.
    const members = await db.getTeamMembers(teamSlug);
    let fixed = 0;
    for (const m of members) {
      try {
        const gm = await guild.members.fetch(m.discord);
        if (!gm.roles.cache.has(role.id)) {
          await gm.roles.add(
            role,
            `Repaired team role membership for ${teamSlug}`
          );
          fixed++;
        }
      } catch {
        // ignore missing users
      }
    }

    await interaction.editReply(
      `✅ Repair complete for **${teamSlug}**.\nRole: ${role} • Channel: <#${channel.id}>\nSynced role to ${fixed} member(s).`
    );
    await maybeAudit(
      interaction,
      `🛠️ ${interaction.user.tag} repaired team ${teamSlug} (synced ${fixed}).`
    );
    return;
  }

  if (sub === "force_add") {
    const teamSlug = interaction.options.getString("team", true).trim();
    const user = interaction.options.getUser("user", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const team = await getTeamOrReply(interaction, teamSlug);
    if (!team) return;
    const guild = interaction.guild;

    const existing = await db.getMemberTeamPermission(teamSlug, user.id);
    if (existing !== null) {
      await interaction.editReply(
        `User is already on **${teamSlug}** in the DB.`
      );
      return;
    }
    await db.addMemberToTeam(teamSlug, user.id, TeamPermissionLevel.MEMBER);

    const role =
      (team.role_id ? guild.roles.cache.get(team.role_id) : null) ??
      guild.roles.cache.find((r) => r.name === teamSlug) ??
      null;
    if (role) {
      const gm = await guild.members.fetch(user.id).catch(() => null);
      if (gm)
        await gm.roles
          .add(role, `Force-added to ${teamSlug} by ${interaction.user.tag}`)
          .catch(() => {});
    }

    const [memberRow] = await Promise.all([db.getMember(user.id)]);
    if (memberRow?.github && team.github_repo) {
      await addRepoCollaborator(team.github_repo, memberRow.github).catch((e) =>
        logger.error(
          `GitHub add collaborator failed: ${e instanceof Error ? e.message : String(e)}`
        )
      );
    }

    await interaction.editReply(`✅ Added ${user} to **${teamSlug}**.`);
    await maybeAudit(
      interaction,
      `➕ ${interaction.user.tag} force-added ${user.tag} to ${teamSlug}.`
    );
    return;
  }

  if (sub === "force_remove") {
    const teamSlug = interaction.options.getString("team", true).trim();
    const user = interaction.options.getUser("user", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const team = await getTeamOrReply(interaction, teamSlug);
    if (!team) return;
    const guild = interaction.guild;

    const perm = await db.getMemberTeamPermission(teamSlug, user.id);
    if (perm === null) {
      await interaction.editReply(`User is not on **${teamSlug}** in the DB.`);
      return;
    }
    if (perm === TeamPermissionLevel.LEADER) {
      await interaction.editReply(
        "That user is the current leader in the DB. Use `/admin force_transfer` first."
      );
      return;
    }
    await db.removeMemberFromTeam(teamSlug, user.id);

    const role =
      (team.role_id ? guild.roles.cache.get(team.role_id) : null) ??
      guild.roles.cache.find((r) => r.name === teamSlug) ??
      null;
    if (role) {
      const gm = await guild.members.fetch(user.id).catch(() => null);
      if (gm && gm.roles.cache.has(role.id)) {
        await gm.roles
          .remove(
            role,
            `Force-removed from ${teamSlug} by ${interaction.user.tag}`
          )
          .catch(() => {});
      }
    }

    const memberRow = await db.getMember(user.id);
    if (memberRow?.github && team.github_repo) {
      await removeRepoCollaborator(team.github_repo, memberRow.github).catch(
        (e) =>
          logger.error(
            `GitHub remove collaborator failed: ${e instanceof Error ? e.message : String(e)}`
          )
      );
    }

    await interaction.editReply(`✅ Removed ${user} from **${teamSlug}**.`);
    await maybeAudit(
      interaction,
      `➖ ${interaction.user.tag} force-removed ${user.tag} from ${teamSlug}.`
    );
    return;
  }

  if (sub === "force_transfer") {
    const teamSlug = interaction.options.getString("team", true).trim();
    const user = interaction.options.getUser("user", true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const team = await getTeamOrReply(interaction, teamSlug);
    if (!team) return;

    const currentLeader = await db.getTeamLeader(teamSlug);
    if (currentLeader && currentLeader !== user.id) {
      await db
        .updateTeamMember(teamSlug, currentLeader, TeamPermissionLevel.MEMBER)
        .catch(() => {});
    }

    const existing = await db.getMemberTeamPermission(teamSlug, user.id);
    if (existing === null) {
      await db.addMemberToTeam(teamSlug, user.id, TeamPermissionLevel.LEADER);
    } else {
      await db.updateTeamMember(teamSlug, user.id, TeamPermissionLevel.LEADER);
    }

    await interaction.editReply(
      `✅ Leadership of **${teamSlug}** transferred to ${user}.`
    );
    await maybeAudit(
      interaction,
      `👑 ${interaction.user.tag} force-transferred ${teamSlug} leadership to ${user.tag}.`
    );
    return;
  }

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: "Unknown admin subcommand."
  });
}
