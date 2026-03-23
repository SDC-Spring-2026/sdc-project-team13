import { ChatInputCommandInteraction,
             ActionRowBuilder,
             ButtonBuilder,
             ButtonStyle,
             ComponentType } from "discord.js";

/**
 * /join — joins a specified group.
 */
export const joinCommand = {
  name: "join",
  description: "Joins a specified group",
  options: [
          {
              type: 3, // STRING TYPE
              name: "name",
              description: "Name of group",
              required: true
          }
      ]
};

/** Handles /join interactions. */
export async function handleJoin(interaction: ChatInputCommandInteraction) {
    const name = interaction.options.getString("name", true);
    const guild = interaction.guild;

    if (!guild) {
        await interaction.reply({ content: "This command can only be used in a server!", ephemeral: true });
        return;
    }

    // Find the channel that matches the group name
    const formattedName = name.toLowerCase().replace(/\s+/g, '-'); // format name with discord's dashes in mind
    const channel = guild.channels.cache.find(c => c.name === formattedName);
    if (!channel || !channel.isTextBased()) { // make sure there is a channel with that specified project name and it is a text channel
        await interaction.reply({ content: `No group called **${name}** found!`, ephemeral: true });
        return;
    }

    // Build accept button
    const accept = new ButtonBuilder()
        .setCustomId('join_accept')
        .setLabel('✅ Accept')
        .setStyle(ButtonStyle.Success);

    // Build decline button
    const decline = new ButtonBuilder()
        .setCustomId('join_decline')
        .setLabel('❌ Decline')
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>() // make a action row with the buttons
        .addComponents(accept, decline);

    // Send the join request to the group channel
    const requestMsg = await channel.send({
        content: `📬 **${interaction.user}** wants to join **${name}**!`,
        components: [row]
    });

    // Tell the requester their request was sent
    await interaction.reply({ content: `✅ Join request sent to **${name}**!`, ephemeral: true });

    // Wait for a button click with a 3 day window before message disappears
    const collector = requestMsg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 259200000 // 3 days in milliseconds
    });

    // specify what to do if each button is clicked
    collector.on('collect', async (buttonInteraction) => {
        if (buttonInteraction.customId === 'join_accept') { // accepted
            // Find the role matching the group and assign it
            const role = guild.roles.cache.find(r => r.name === formattedName);
            if (role) {
                const member = await guild.members.fetch(interaction.user.id);
                await member.roles.add(role);
            }
            await buttonInteraction.update({
                content: `✅ **${interaction.user.username}** has been accepted into **${name}**!`,
                components: []
            });
        } else { // declined
            await buttonInteraction.update({
                content: `❌ **${interaction.user.username}**'s request to join **${name}** was declined.`,
                components: []
            });
        }
    });

    // Remove buttons after 3 days if no response
    collector.on('end', async (collected) => {
        if (collected.size === 0) {
            await requestMsg.edit({
                content: `⏰ Join request from **${interaction.user.username}** expired.`,
                components: []
            });
        }
    });
}
