import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags
} from "discord.js";
import { db } from "../../database";
import { createNewLogger } from "../../tools/log";

const logger = createNewLogger("cmd:projects");

export const projectsCommand = {
  name: "projects",
  description: "List all active project groups in this server"
};

export async function handleProjects(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "This command can only be used in a server!"
    });
    return;
  }

  await interaction.deferReply();

  try {
    const teams = await db.getAllActiveTeamsWithProjects();

    if (teams.length === 0) {
      await interaction.editReply("No active projects found.");
      return;
    }

    const lines = teams.map((t) => {
      const name = t.project_name ?? "*(unnamed)*";
      return `**${name}** — <#${t.channel_id}> \`${t.slug}\``;
    });

    const embed = new EmbedBuilder()
      .setTitle("📋 Active Projects")
      .setColor(0x00cc66)
      .setDescription(lines.join("\n"))
      .setFooter({
        text: `${teams.length} project${teams.length !== 1 ? "s" : ""} • Brought to you by Cache 🤖`
      });

    logger.info(
      `Projects listed by ${interaction.user.tag} (${teams.length} teams)`
    );
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error(
      `Failed to list projects for ${interaction.user.tag}: ${err instanceof Error ? err.message : String(err)}`
    );
    await interaction.editReply("Failed to retrieve project list.");
  }
}
