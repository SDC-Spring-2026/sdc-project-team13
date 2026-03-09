// Import the required classes from discord.js
import { Client, Events, GatewayIntentBits } from "discord.js";
import { createNewLogger } from "../tools/log";

/** The internal instance of the discord bot. */
let client: Client<boolean>;

// The logger that is related to all bot communications.
export const logger = createNewLogger("bot");

/**
 * Gets the current client instance of the discord bot.
 *
 * @returns An instance of `Client<true>` containing all the tools to talk to the bot.
 */
export async function getBotClient(): Promise<Client<true>> {
  return await new Promise((resolve, reject) => {
    // Check if client was previously created, and make one if not.
    if (client == null) {
      // Instanciate a new client.
      logger.info("No bot client exists at this time, creating a new one...");
      client = new Client({ intents: [GatewayIntentBits.Guilds] });

      // Send login request, and reject if request fails.
      logger.verbose("Attempting to log in to new bot client...");
      client.login(process.env.DISCORD_TOKEN).catch(reject);
    }

    // Check if the client is ready or not.
    if (client.isReady()) {
      // Resolve the client, it's all good.
      resolve(client);
    } else {
      // Client is in an indefinite state at the moment, most likely just created. Set some hooks and wait.
      client.once(Events.ClientReady, (readyClient) => {
        logger.info("Bot client is ready!");
        resolve(readyClient);
      });
    }
  });
}
