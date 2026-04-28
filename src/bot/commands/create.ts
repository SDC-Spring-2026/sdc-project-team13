import { ChatInputCommandInteraction, ChannelType, MessageFlags, PermissionFlagsBits } from "discord.js";
import { db } from "../../database";
import { createNewLogger } from "../../tools/log";
import { requireRegistered } from "./requireRegistered";
import { createTeamRepo, addRepoCollaborator } from "../../integrations/githubApp";

const logger = createNewLogger("cmd:create");

/**
 * /create — creates a new project group, sets the creator as the leader.
 * The Discord channel and role are named after the team slug (e.g. sp2026-team1),
 * and a matching private GitHub repo is created under the configured org.
 */
export const createCommand = {
  name: "create",
  description: "Creates a new project group",
  options: [
          {
              type: 3, // STRING TYPE
              name: "project",
              description: "project name",
              required: true
          },
          {
              type: 3, // STRING TYPE
              name: "description",
              description: "project description",
              required: true
          }
        ]
};

/** Handles /create interactions. */
export async function handleCreate(interaction: ChatInputCommandInteraction) {
    const project = interaction.options.getString("project", true);
    const description = interaction.options.getString("description", true);

    const guild = interaction.guild;
    if (!guild) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "This command can only be used in a server!" });
        return;
    }

    if (!await requireRegistered(interaction)) return;

    await interaction.deferReply();

    let teamSlug: string | undefined;
    let role: Awaited<ReturnType<typeof guild.roles.create>> | undefined;
    let channel: Awaited<ReturnType<typeof guild.channels.create>> | undefined;

    try {
        // Reserve the slug first so channel and role can be named after it
        teamSlug = await db.requestNewTeamID();

        role = await guild.roles.create({
            name: teamSlug,
            colors: { primaryColor: Math.floor(Math.random() * 0xffffff) },
            reason: `Role for team ${teamSlug} (project: ${project})`
        });

        const guildMember = await guild.members.fetch(interaction.user.id);
        await guildMember.roles.add(role);

        const category = guild.channels.cache.find(
            c => c.name === 'Teams' && c.type === ChannelType.GuildCategory
        );
        if (!category) {
            logger.warn(`Teams category not found in guild ${guild.id} — rolling back`);
            throw new Error("Teams category not found.");
        }

        channel = await guild.channels.create({
            name: teamSlug,
            type: ChannelType.GuildText,
            topic: description,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.SendMessagesInThreads,
                        PermissionFlagsBits.CreatePublicThreads,
                        PermissionFlagsBits.CreatePrivateThreads,
                    ]
                },
                {
                    id: role,
                    allow: [
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.SendMessagesInThreads,
                        PermissionFlagsBits.CreatePublicThreads,
                        PermissionFlagsBits.CreatePrivateThreads,
                    ]
                }
            ]
        });

        await db.finalizeNewTeam(teamSlug, channel.id, role.id, interaction.user.id);
        await db.createNewProject(project, teamSlug);

        logger.info(`Project "${project}" created by ${interaction.user.tag} (team: ${teamSlug}, channel: ${channel.id}, role: ${role.id})`);
    } catch (err) {
        logger.error(`Failed to create project "${project}" for ${interaction.user.tag}: ${err instanceof Error ? err.message : String(err)}`);
        if (channel) await channel.delete().catch((e) => logger.error(`Channel rollback failed: ${e instanceof Error ? e.message : String(e)}`));
        if (role) await role.delete().catch((e) => logger.error(`Role rollback failed: ${e instanceof Error ? e.message : String(e)}`));
        if (teamSlug) await db.deleteTeam(teamSlug).catch((e) => logger.error(`Team record rollback failed: ${e instanceof Error ? e.message : String(e)}`));
        await interaction.editReply("Failed to create project. Check bot permissions and try again.");
        return;
    }

    // GitHub setup — best-effort: Discord team is already live if this fails
    try {
        const repoUrl = await createTeamRepo(teamSlug, project);
        await db.setTeamRepo(teamSlug, teamSlug);

        const creatorMember = await db.getMember(interaction.user.id);
        if (creatorMember?.github) {
            await addRepoCollaborator(teamSlug, creatorMember.github);
        }

        await interaction.editReply(
            `✅ Project **${project}** created!\nChannel: ${channel}\nRole: ${role}\nRepo: ${repoUrl}\nYou've been assigned as the leader!`
        );
    } catch (err) {
        logger.error(`GitHub setup failed for team "${teamSlug}": ${err instanceof Error ? err.message : String(err)}`);
        await interaction.editReply(
            `✅ Project **${project}** created!\nChannel: ${channel}\nRole: ${role}\nYou've been assigned as the leader!\n⚠️ GitHub repo setup failed — contact an admin.`
        );
    }
}
