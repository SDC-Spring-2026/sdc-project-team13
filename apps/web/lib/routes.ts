/** Same path as roster links on team pages: `/users/[discordId]` */
export function userProfilePath(discordUserId: string): string {
  return `/users/${encodeURIComponent(discordUserId)}`;
}
