import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags
} from "discord.js";
import { db } from "../../database";
import { createNewLogger } from "../../tools/log";

const logger = createNewLogger("cmd:whois");

export const whoisCommand = {
  name: "whois",
  description: "Look up a member's linked GitHub and team info",
  options: [
    {
      type: 6, // USER
      name: "person",
      description: "The member to look up",
      required: true
    }
  ]
};

export async function handleWhois(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("person", true);
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
    const [member, teams] = await Promise.all([
      db.getMember(target.id),
      db.getMemberTeams(target.id)
    ]);

    const teamLines = await Promise.all(
      teams.map(async (t) => {
        const [project, isLeader] = await Promise.all([
          db.getPrimaryActiveProjectForTeam(t.slug),
          db.isTeamLeader(t.slug, target.id)
        ]);
        const label = project?.name ?? t.slug;
        return isLeader ? `${label} 👑` : label;
      })
    );

    const embed = new EmbedBuilder()
      .setTitle(target.username)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x5865f2)
      .addFields(
        { name: "🎮 Discord", value: `<@${target.id}>`, inline: true },
        {
          name: "🐙 GitHub",
          value: member?.github
            ? `[${member.github}](https://github.com/${member.github})`
            : "*not linked*",
          inline: true
        },
        {
          name: "👥 Teams",
          value:
            teamLines.length > 0 ? teamLines.join("\n") : "*not on any team*",
          inline: false
        }
      )
      .setFooter({ text: "Brought to you by Cache 🤖" });

    logger.info(`${interaction.user.tag} looked up ${target.tag}`);
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    logger.error(
      `Failed to look up ${target.tag} for ${interaction.user.tag}: ${err instanceof Error ? err.message : String(err)}`
    );
    await interaction.editReply("Failed to retrieve member information.");
  }
}
