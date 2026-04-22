import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { db } from "../../database";
import { resolveTeamSlug } from "./resolveTeam";
import { createNewLogger } from "../../tools/log";
import { requireRegistered } from "./requireRegistered";

const logger = createNewLogger("cmd:manage");

/**
 * /manage — changing of the details of a project.
 */
export const manageCommand = {
  name: "manage",
  description: "Changes the details of a project",
  options: [
          {
              type: 3, // STRING TYPE
              name: "project",
              description: "Name of project",
              required: true
          },
          {
              type: 3, // STRING TYPE
              name: "description",
              description: "change the description",
              required: true
          }
      ]
};

/** Handles /manage interactions. */
export async function handleManage(interaction: ChatInputCommandInteraction) {
    const project = interaction.options.getString("project", true);
    const description = interaction.options.getString("description", true);
    const formattedProject = project.toLowerCase().replace(/\s+/g, '-');
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "This command can only be used in a server!" });
        return;
    }

    if (!await requireRegistered(interaction)) return;

    const teamSlug = await resolveTeamSlug(guild, formattedProject);
    if (!teamSlug) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: `No group found named **${project}**.` });
        return;
    }

    if (!await db.isTeamLeader(teamSlug, interaction.user.id)) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Only the team leader can modify this project." });
        return;
    }

    await interaction.deferReply();

    try {
        const existing = await db.getProjectByName(formattedProject);
        if (!existing) {
            await interaction.editReply(`No project found named **${project}**.`);
            return;
        }

        await db.changeProjectDisplayName(existing.slug, description);

        const channel = guild.channels.cache.find(c => c.name === formattedProject);
        if (channel && channel.isTextBased() && 'setTopic' in channel) {
            await channel.setTopic(description);
        }

        logger.info(`Project "${project}" description updated by ${interaction.user.tag}`);
        await interaction.editReply(`✅ **${project}** updated!`);
    } catch (err) {
        logger.error(`Failed to update project "${project}" for ${interaction.user.tag}: ${err instanceof Error ? err.message : String(err)}`);
        await interaction.editReply("Failed to update project.");
    }
}
