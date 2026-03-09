import { ChatInputCommandInteraction} from "discord.js";

/**
 * /hello — returns a hello message.
 */
export const helloCommand = {
  name: "hello",
  description: "Replies with a hello message"
};

/** Handles /hello interactions. */
export async function handleHello(interaction: ChatInputCommandInteraction) {
    await interaction.reply("Yoooooooooo my name is Cache what up");
}
