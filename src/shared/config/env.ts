/**
 * Environment variable validation and configuration
 */

const requiredEnvVars = {
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
} as const;

const optionalEnvVars = {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_DEBUG: process.env.NEXTAUTH_DEBUG,
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;

/**
 * Validate that all required environment variables are set
 */
export function validateEnv(): void {
  const missing: string[] = [];
  
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

/**
 * Get environment configuration
 */
export const env = {
  ...requiredEnvVars,
  ...optionalEnvVars,
  isDevelopment: optionalEnvVars.NODE_ENV === "development",
  isProduction: optionalEnvVars.NODE_ENV === "production",
  isDebugMode: optionalEnvVars.NODE_ENV === "development" || optionalEnvVars.NEXTAUTH_DEBUG === "true",
} as const;

/**
 * Validate environment on import (server-side only)
 */
if (typeof window === "undefined") {
  try {
    validateEnv();
  } catch (error) {
    // Only throw in production - in development, show warning
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    console.warn("Environment validation warning:", error instanceof Error ? error.message : String(error));
  }
}

