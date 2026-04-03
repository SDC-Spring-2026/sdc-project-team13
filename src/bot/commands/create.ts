import { ChatInputCommandInteraction, ChannelType, MessageFlags } from "discord.js";
import { db } from "../../database";

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

        await interaction.editReply(
            `✅ Project **${project}** created!\nChannel: ${channel}\nRole: ${role}\nYou've been assigned as the leader!`
        );
    } catch (err) {
        console.error(err);
        if (channel) await channel.delete().catch(console.error);
        if (role) await role.delete().catch(console.error);
        await interaction.editReply("Failed to create project. Check bot permissions and try again.");
    }
}
