import { ChatInputCommandInteraction} from "discord.js";

/**
 * /manage — changing of the details of a project.
 */
export const manageCommand = {
  name: "manage",
  description: "Changes the details of a project",
  options: [
          {
              type: 3, // STRING TYPE
              name: "project",
              description: "Name of project",
              required: true
          },
          {
              type: 3, // STRING TYPE
              name: "description",
              description: "change the description",
              required: true
          }
      ]
};

/** Handles /manage interactions. */
export async function handleManage(interaction: ChatInputCommandInteraction) {
    const project = interaction.options.getString("project", true);
    const description = interaction.options.getString("description", true);
    await interaction.reply(project + " changed to: " + description);
}
