/**
 * Centralized logging utility with environment-aware behavior
 * In production, only errors are logged
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

/**
 * Logger configuration
 */
const config = {
  enableDebug: isDevelopment,
  enableInfo: isDevelopment || !isProduction,
  enableWarn: true,
  enableError: true,
};

/**
 * Base log function
 */
function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (level === "debug" && !config.enableDebug) return;
  if (level === "info" && !config.enableInfo) return;
  if (level === "warn" && !config.enableWarn) return;
  if (level === "error" && !config.enableError) return;

  const prefix = isDevelopment ? `[${level.toUpperCase()}]` : "";
  const timestamp = isDevelopment ? new Date().toISOString() : "";

  switch (level) {
    case "debug":
      console.debug(prefix, timestamp, message, ...args);
      break;
    case "info":
      console.info(prefix, timestamp, message, ...args);
      break;
    case "warn":
      console.warn(prefix, timestamp, message, ...args);
      break;
    case "error":
      console.error(prefix, timestamp, message, ...args);
      break;
  }
}

/**
 * Logger API
 */
export const logger = {
  debug: (message: string, ...args: unknown[]) => log("debug", message, ...args),
  info: (message: string, ...args: unknown[]) => log("info", message, ...args),
  warn: (message: string, ...args: unknown[]) => log("warn", message, ...args),
  error: (message: string, ...args: unknown[]) => log("error", message, ...args),
};

