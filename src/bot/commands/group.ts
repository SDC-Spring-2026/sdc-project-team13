import { ChatInputCommandInteraction } from "discord.js";
import { db } from "../../database";
import { resolveTeamSlug } from "./resolveTeam";
import { createNewLogger } from "../../tools/log";

const logger = createNewLogger("cmd:group");

/**
 * /group — lists the members of a group.
 */
export const groupCommand = {
  name: "group",
  description: "Lists the members of a group",
  options: [
          {
              type: 3, // STRING TYPE
              name: "name",
              description: "Name of group",
              required: true
          }
      ]
};

/** Handles /group interactions. */
export async function handleGroup(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("name", true);
    const formattedName = name.toLowerCase().replace(/\s+/g, '-');
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({ content: "This command can only be used in a server!" });
        return;
    }

    await interaction.deferReply();

    try {
        const teamSlug = await resolveTeamSlug(guild, formattedName);
        if (!teamSlug) {
            await interaction.editReply(`No group found named **${name}**.`);
            return;
        }

        const members = await db.getTeamMembers(teamSlug);
        if (members.length === 0) {
            await interaction.editReply(`No members found in **${name}**.`);
            return;
        }

        const memberList = members.map(m => `<@${m.discord}>`).join('\n');
        await interaction.editReply(`**Members of ${name}:**\n${memberList}`);
    } catch (err) {
        logger.error(`Failed to list members of "${name}" for ${interaction.user.tag}: ${err instanceof Error ? err.message : String(err)}`);
        await interaction.editReply("Could not find that group.");
    }
}
