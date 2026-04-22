import { REST, Routes } from "discord.js";
import { commandDefinitions } from "./commands/registry";

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId || !guildId) {
    console.error("Missing required discord bot environment variables :(");
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commandDefinitions }
  );

  console.log("Successfully registered guild commands for dev environment :)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
