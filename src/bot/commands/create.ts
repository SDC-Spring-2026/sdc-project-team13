import { ChatInputCommandInteraction, ChannelType, ColorResolvable } from "discord.js";

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
    const project = interaction.options.getString("project", true); // save project name
    const description = interaction.options.getString("description", true); // save project description

    const guild = interaction.guild; // get where command was used
    if (!guild) { // check if the command was used in a server
        await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
        return;
    }

    try {
        const randomColor = Math.floor(Math.random() * 0xffffff) as ColorResolvable; // generate a random color

        // Create a new role for the project
        const role = await guild.roles.create({
            name: project.toLowerCase().replace(/\s+/g, '-'), // set name of new role to group name
            color: randomColor, // set random color for group
            reason: `Role for project ${project}`
        });

        // Get the member who ran the command and assign the role
        const member = await guild.members.fetch(interaction.user.id);
        await member.roles.add(role);

        // Find the Teams category by name
        const category = guild.channels.cache.find(
            c => c.name === 'Teams' && c.type === ChannelType.GuildCategory
        );

        if (!category) { // if teams category of channels is not present
            await interaction.reply({ content: "Could not find the Teams category!", ephemeral: true });
            return;
        }

        // Create a new text channel with the project name
        const channel = await guild.channels.create({
            name: project.toLowerCase().replace(/\s+/g, '-'), // set name of channel
            type: ChannelType.GuildText, // channel is a text channel
            topic: description, // set description of channel
            parent: category?.id // puts it inside Teams category
        });

        await interaction.reply(`✅ Project **${project}** created!\nChannel: ${channel}\nRole: ${role}\nYou've been assigned as the leader!`);
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: "Failed to create project. Make sure the bot has permission to manage channels and roles!", ephemeral: true });
    }
}
