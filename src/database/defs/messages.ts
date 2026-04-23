/** A saved message in the database. */
export interface Message {
  team_slug: string;
  user_id: string;
  timestamp: string;
  scope: string;
  content: string;
}

/** Database Manager parts for Messages table. */
export interface DatabaseMessagesManager {
  // Messages

  /**
   * Get number of messages associated with a team.
   * @param team_slug The team slug id.
   * @returns The number of saved messages.
   */
  getMessageCount(team_slug: string): Promise<number>;
  /**
   * Get all messages from a team.
   * @param team_slug A team slug id.
   * @returns A list of all messages from that team.
   */
  getAllTeamMessages(team_slug: string): Promise<Message[]>;
  /**
   * Latest messages for a team (by row id), newest first in the returned array.
   */
  getRecentTeamMessages(team_slug: string, limit: number): Promise<Message[]>;
  /**
   * Get all messages from a user.
   * @param user_id The discord user id.
   * @returns A list of all messages from that user.
   */
  getAllUserMessages(user_id: string): Promise<Message[]>;
  /**
   * Store a new message in the database.
   * @param team_slug A team slug id to associate with this message.
   * @param user_id The user who sent the message.
   * @param timestamp The time the message was sent.
   * @param scope The scope of the message.
   * @param content The content of the message.
   * @returns If the message was stored.
   */
  storeMessage(
    team_slug: string,
    user_id: string,
    timestamp: string,
    scope: string,
    content: string
  ): Promise<boolean>;
  /**
   * Purge all messages from a team. Useful if condensing.
   * @param team_slug A team slug id.
   * @returns If the messages are successfully purged.
   */
  purgeTeamMessages(team_slug: string): Promise<void>;
}
