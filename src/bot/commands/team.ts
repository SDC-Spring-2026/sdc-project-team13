import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { db } from "../../database";
import { createNewLogger } from "../../tools/log";

const logger = createNewLogger("cmd:team");

export const teamCommand = {
    name: "team",
    description: "Show an overview of your team"
};

export async function handleTeam(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) {
        await interaction.reply({ flags: MessageFlags.Ephemeral, content: "This command can only be used in a server!" });
        return;
    }

    await interaction.deferReply();

    try {
        // Prefer the team linked to the current channel; fall back to the user's first active team
        let team = await db.getTeamByChannelId(interaction.channelId);
        if (!team) {
            const userTeams = await db.getMemberTeams(interaction.user.id);
            team = userTeams[0] ?? undefined;
        }

        if (!team) {
            await interaction.editReply("You're not on a team yet, and this channel isn't linked to one.");
            return;
        }

        const [project, members, leaderDiscordId] = await Promise.all([
            db.getPrimaryActiveProjectForTeam(team.slug),
            db.getTeamMembers(team.slug),
            db.getTeamLeader(team.slug)
        ]);

        const memberList = members.length > 0
            ? members.map(m => m.discord === leaderDiscordId ? `<@${m.discord}> 👑` : `<@${m.discord}>`).join('\n')
            : '*No members*';

        const org = process.env.GITHUB_ORG;
        const repoLine = team.github_repo && org
            ? `[${team.github_repo}](https://github.com/${org}/${team.github_repo})`
            : '*not linked*';

        const embed = new EmbedBuilder()
            .setTitle(project?.name ?? team.slug)
            .setColor(0x5865f2)
            .addFields(
                { name: '🏷️ Team', value: team.slug, inline: true },
                { name: '📺 Channel', value: `<#${team.channel_id}>`, inline: true },
                { name: '🔗 GitHub', value: repoLine, inline: false },
                { name: `👥 Members (${members.length})`, value: memberList, inline: false }
            )
            .setFooter({ text: 'Brought to you by Cache 🤖' });

        logger.info(`Team overview fetched for ${team.slug} by ${interaction.user.tag}`);
        await interaction.editReply({ embeds: [embed] });
    } catch (err) {
        logger.error(`Failed to get team info for ${interaction.user.tag}: ${err instanceof Error ? err.message : String(err)}`);
        await interaction.editReply("Failed to retrieve team information.");
    }
}
