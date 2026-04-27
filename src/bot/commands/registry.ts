
import { registerCommand, handleRegister } from "./register";
import { createCommand, handleCreate } from "./create";
import { groupCommand, handleGroup } from "./group";
import { joinCommand, handleJoin } from "./join";
import { kickCommand, handleKick } from "./kick";
import { manageCommand, handleManage } from "./manage";
import { githubCommand, handleGithub } from "./github";
import { leaveCommand, handleLeave } from "./leave";

/**
 * Central registry for slash commands:
 * - commandDefinitions: used by registerCommands.ts to sync with Discord
 * - commandHandlers: used at runtime to route interactions by name
 */
export const commandDefinitions = [registerCommand, createCommand, groupCommand, joinCommand, kickCommand, manageCommand, githubCommand, leaveCommand];
export const commandHandlers = new Map([
    [registerCommand.name, handleRegister],
    [createCommand.name, handleCreate],
    [groupCommand.name, handleGroup],
    [joinCommand.name, handleJoin],
    [kickCommand.name, handleKick],
    [manageCommand.name, handleManage],
    [githubCommand.name, handleGithub],
    [leaveCommand.name, handleLeave]
]);
