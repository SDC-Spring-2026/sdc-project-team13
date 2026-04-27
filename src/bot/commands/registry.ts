
import { helloCommand, handleHello } from "./hello";
import { randomCommand, handleRandom } from "./random";
import { registerCommand, handleRegister } from "./register";
import { createCommand, handleCreate } from "./create";
import { groupCommand, handleGroup } from "./group";
import { joinCommand, handleJoin } from "./join";
import { kickCommand, handleKick } from "./kick";
import { manageCommand, handleManage } from "./manage";
import { flipCoinCommand, handleFlipCoin } from "./flipCoin";
import { githubCommand, handleGithub } from "./github";
import { leaveCommand, handleLeave } from "./leave";

/**
 * Central registry for slash commands:
 * - commandDefinitions: used by registerCommands.ts to sync with Discord
 * - commandHandlers: used at runtime to route interactions by name
 */
export const commandDefinitions = [helloCommand, randomCommand, registerCommand, createCommand, groupCommand, joinCommand, kickCommand, manageCommand, flipCoinCommand, githubCommand, leaveCommand];
export const commandHandlers = new Map([
    [helloCommand.name, handleHello],
    [randomCommand.name, handleRandom],
    [registerCommand.name, handleRegister],
    [createCommand.name, handleCreate],
    [groupCommand.name, handleGroup],
    [joinCommand.name, handleJoin],
    [kickCommand.name, handleKick],
    [manageCommand.name, handleManage],
    [flipCoinCommand.name, handleFlipCoin],
    [githubCommand.name, handleGithub],
    [leaveCommand.name, handleLeave]
]);
