import { ChatInputCommandInteraction} from "discord.js";

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
    await interaction.reply("group specified: " + name + ", members:");
}
