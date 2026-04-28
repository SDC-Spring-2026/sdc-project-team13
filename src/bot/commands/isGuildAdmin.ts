import { BaseInteraction, PermissionFlagsBits } from "discord.js";

/**
 * Returns true if the interaction's author is the guild owner or holds
 * the Administrator permission. Works for any interaction type; returns
 * false in DM contexts where there is no guild.
 */
export function isGuildAdmin(interaction: BaseInteraction): boolean {
  if (!interaction.guild) return false;
  if (interaction.guild.ownerId === interaction.user.id) return true;
  return (
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ??
    false
  );
}
