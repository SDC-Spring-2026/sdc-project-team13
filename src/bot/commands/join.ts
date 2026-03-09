import { ChatInputCommandInteraction} from "discord.js";

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
    await interaction.reply("group joined: " + name);
}
