import { ChatInputCommandInteraction } from "discord.js";
import { requireRegistered } from "./requireRegistered";

/**
 * /kick — kicks a specified member from a group, if caller is group leader.
 */
export const kickCommand = {
  name: "kick",
  description: "Kicks a specified member",
  options: [
    {
      type: 3, // STRING TYPE
      name: "group",
      description: "Name of group",
      required: true
    },
    {
      type: 3, // STRING TYPE
      name: "person",
      description: "Name of person",
      required: true
    }
  ]
};

/** Handles /kick interactions. */
export async function handleKick(interaction: ChatInputCommandInteraction) {
  if (!await requireRegistered(interaction)) return;

  const group = interaction.options.getString("group", true);
  const person = interaction.options.getString("person", true);
  await interaction.reply("Kicked " + person + " from group " + group);
}
