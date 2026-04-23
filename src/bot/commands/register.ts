import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { db } from "../../database";
import { createNewLogger } from "../../tools/log";

const logger = createNewLogger("cmd:register");

export const registerCommand = {
    name: "register",
    description: "Link your GitHub account to your Discord for SDC",
    options: [
        {
            type: 3, // STRING
            name: "github",
            description: "Your GitHub username",
            required: true
        }
    ]
};

export async function handleRegister(interaction: ChatInputCommandInteraction) {
    const github = interaction.options.getString("github", true).trim();

    const existing = await db.getMember(interaction.user.id);
    if (existing) {
        await interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: `You're already registered${existing.github ? ` as **${existing.github}** on GitHub` : ""}.`
        });
        return;
    }

    try {
        await db.validateMemberRegistration(interaction.user.id, github);
    } catch {
        await interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: `That GitHub username is already linked to another account.`
        });
        return;
    }

    await db.registerMember(interaction.user.id, github);
    logger.info(`${interaction.user.tag} (${interaction.user.id}) registered with GitHub: ${github}`);

    await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `✅ Registered! Your GitHub account **${github}** is now linked to your Discord.`
    });
}
