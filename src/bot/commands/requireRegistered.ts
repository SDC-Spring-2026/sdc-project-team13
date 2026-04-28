import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { db } from "../../database";

/**
 * Checks that the interaction user is registered in the Members table.
 * If not, replies with an ephemeral prompt to run /register and returns false.
 * Always call this before deferReply so the response can be ephemeral.
 */
export async function requireRegistered(
  interaction: ChatInputCommandInteraction
): Promise<boolean> {
  const member = await db.getMember(interaction.user.id);
  if (!member) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content:
        "You need to register first! Run `/register <github-username>` to link your GitHub account."
    });
    return false;
  }
  return true;
}
