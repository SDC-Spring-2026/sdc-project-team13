import { ChatInputCommandInteraction, ChannelType, MessageFlags } from "discord.js";
import { db } from "../../database";
import { createNewLogger } from "../../tools/log";
import { requireRegistered } from "./requireRegistered";

const logger = createNewLogger("cmd:create");

/**
 * /create — creates a new project group, sets the creator as the leader.
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

    let role;
    let channel;
    try {
        role = await guild.roles.create({
            name: project.toLowerCase().replace(/\s+/g, '-'),
            color: Math.floor(Math.random() * 0xffffff),
            reason: `Role for project ${project}`
        });

        const member = await guild.members.fetch(interaction.user.id);
        await member.roles.add(role);

        const category = guild.channels.cache.find(
            c => c.name === 'Teams' && c.type === ChannelType.GuildCategory
        );

        if (!category) {
            logger.warn(`Teams category not found in guild ${guild.id} — rolling back role ${role.id}`);
            await role.delete("Teams category not found, rolling back");
            await interaction.editReply("Could not find the Teams category!");
            return;
        }

        channel = await guild.channels.create({
            name: project.toLowerCase().replace(/\s+/g, '-'),
            type: ChannelType.GuildText,
            topic: description,
            parent: category.id
        });

        const teamSlug = await db.requestNewTeamID();
        await db.finalizeNewTeam(
            teamSlug,
            channel.id,
            role.id,
            interaction.user.id
        );
        await db.createNewProject(project, teamSlug);

        logger.info(`Project "${project}" created by ${interaction.user.tag} (team: ${teamSlug}, channel: ${channel.id}, role: ${role.id})`);
        await interaction.editReply(
            `✅ Project **${project}** created!\nChannel: ${channel}\nRole: ${role}\nYou've been assigned as the leader!`
        );
    } catch (err) {
        logger.error(`Failed to create project "${project}" for ${interaction.user.tag}: ${err instanceof Error ? err.message : String(err)}`);
        if (channel) await channel.delete().catch((e) => logger.error(`Failed to clean up channel during rollback: ${e instanceof Error ? e.message : String(e)}`));
        if (role) await role.delete().catch((e) => logger.error(`Failed to clean up role during rollback: ${e instanceof Error ? e.message : String(e)}`));
        await interaction.editReply("Failed to create project. Check bot permissions and try again.");
    }
}
