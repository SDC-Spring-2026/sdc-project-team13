// Import modules for logger.
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

/**
 * Create a rotating file transport for the loggers.
 *
 * @param name The name of the log file (should be a word that describes what this log file has).
 * @param level The min level to write.
 * @returns An instance of a transport for winston loggers.
 */
function createRotatingFileTransport(name: string, level: string) {
  // Log Location: ./logs/YYYY-MM-DD-HH_<name>.log
  return new transports.DailyRotateFile({
    dirname: `./logs`,
    filename: `%DATE%_${name}.log`,
    datePattern: "YYYY-MM-DD-HH",
    maxSize: "20m",
    level
  });
}

// The full log file and issue log file.
const fullLogFile = createRotatingFileTransport("full", "verbose");
const issueLogFile = createRotatingFileTransport("issues", "warning");

/**
 * Creates a new named logger.
 *
 * @param name The name to attach to this logger.
 * @returns A winston logger ready for use.
 */
export function createNewLogger(name: string) {
  return createLogger({
    level: "info",
    format: format.combine(
      format.label({ label: name }),
      format.timestamp(),
      format.printf(({ timestamp, label, level, message }) => {
        return `${timestamp} [${label}] ${level}: ${message}`;
      })
    ),
    transports: [fullLogFile, issueLogFile, new transports.Console()]
  });
}

/** The main, non-specfic logger. */
export const logger = createNewLogger("main");
