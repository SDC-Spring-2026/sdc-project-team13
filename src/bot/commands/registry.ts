
import { helloCommand, handleHello } from "./hello";
import { randomCommand, handleRandom } from "./random";
import { createCommand, handleCreate } from "./create";
import { groupCommand, handleGroup } from "./group";
import { joinCommand, handleJoin } from "./join";
import { kickCommand, handleKick } from "./kick";
import { manageCommand, handleManage } from "./manage";
import { flipCoinCommand, handleFlipCoin } from "./flipCoin";
import { githubCommand, handleGithub } from "./github";

/**
 * Central registry for slash commands:
 * - commandDefinitions: used by registerCommands.ts to sync with Discord
 * - commandHandlers: used at runtime to route interactions by name
 */
export const commandDefinitions = [helloCommand, randomCommand, createCommand, groupCommand, joinCommand, kickCommand, manageCommand, flipCoinCommand];
export const commandHandlers = new Map([
    [helloCommand.name, handleHello],
    [randomCommand.name, handleRandom],
    [createCommand.name, handleCreate],
    [groupCommand.name, handleGroup],
    [joinCommand.name, handleJoin],
    [kickCommand.name, handleKick],
    [manageCommand.name, handleManage],
    [flipCoinCommand.name, handleFlipCoin]
]);
