import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { db } from "../../database";
import { createNewLogger } from "../../tools/log";

const logger = createNewLogger("cmd:unregister");

export const unregisterCommand = {
    name: "unregister",
    description: "Unlink your GitHub account from your Discord"
};

export async function handleUnregister(interaction: ChatInputCommandInteraction) {
    const existing = await db.getMember(interaction.user.id);
    if (!existing) {
        await interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: "You're not registered — nothing to unregister."
        });
        return;
    }

    await db.unregisterMember(interaction.user.id);
    logger.info(`${interaction.user.tag} (${interaction.user.id}) unregistered (was GitHub: ${existing.github ?? 'none'})`);

    await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `✅ Unregistered. Your GitHub account${existing.github ? ` **${existing.github}**` : ""} has been unlinked from your Discord. Run \`/register\` to link a new one.`
    });
}
