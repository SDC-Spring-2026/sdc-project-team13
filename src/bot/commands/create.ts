import { ChatInputCommandInteraction} from "discord.js";

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
    await interaction.reply("Group created, " + project + ": " + description);
}
