
import { registerCommand, handleRegister } from "./register";
import { unregisterCommand, handleUnregister } from "./unregister";
import { createCommand, handleCreate } from "./create";
import { teamCommand, handleTeam } from "./team";
import { projectsCommand, handleProjects } from "./projects";
import { groupCommand, handleGroup } from "./group";
import { joinCommand, handleJoin } from "./join";
import { kickCommand, handleKick } from "./kick";
import { leaveCommand, handleLeave } from "./leave";
import { manageCommand, handleManage } from "./manage";
import { githubCommand, handleGithub } from "./github";
import { whoisCommand, handleWhois } from "./whois";
import { adminCommand, handleAdmin } from "./admin";

/**
 * Central registry for slash commands:
 * - commandDefinitions: used by registerCommands.ts to sync with Discord
 * - commandHandlers: used at runtime to route interactions by name
 */
export const commandDefinitions = [
    registerCommand, unregisterCommand,
    createCommand, teamCommand, projectsCommand,
    groupCommand, joinCommand, kickCommand, leaveCommand,
    manageCommand, githubCommand, whoisCommand,
    adminCommand
];
export const commandHandlers = new Map([
    [registerCommand.name, handleRegister],
    [unregisterCommand.name, handleUnregister],
    [createCommand.name, handleCreate],
    [teamCommand.name, handleTeam],
    [projectsCommand.name, handleProjects],
    [groupCommand.name, handleGroup],
    [joinCommand.name, handleJoin],
    [kickCommand.name, handleKick],
    [leaveCommand.name, handleLeave],
    [manageCommand.name, handleManage],
    [githubCommand.name, handleGithub],
    [whoisCommand.name, handleWhois],
    [adminCommand.name, handleAdmin]
]);
