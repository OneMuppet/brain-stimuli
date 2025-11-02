import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { OAuth2Client } from "google-auth-library";
import { logger } from "@/shared/utils/logger";
import { env } from "@/shared/config/env";

// Validate environment on module load (server-side only)
if (typeof window === "undefined") {
  try {
    if (env.isDebugMode) {
      logger.debug("NextAuth Environment Variables Check", {
        hasSecret: !!env.NEXTAUTH_SECRET,
        hasClientId: !!env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
        nextAuthUrl: env.NEXTAUTH_URL || "Not set",
      });
    }
  } catch (error) {
    logger.error("Environment validation error", error);
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  trustHost: true, // Required for Amplify
  debug: env.isDebugMode,
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.appdata",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in - store tokens and user info
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600000; // Default 1 hour
        
        // Ensure user info is stored in token
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        
        if (env.isDebugMode) {
          logger.debug("JWT callback - Initial sign in", {
            hasAccessToken: !!account.access_token,
            hasRefreshToken: !!account.refresh_token,
            userId: user.id,
            userEmail: user.email,
          });
        }
      }
      
      // Check if token is expired and refresh if needed
      if (token.expiresAt && Date.now() < (token.expiresAt as number)) {
        // Token is still valid
        return token;
      }
      
      // Token expired, try to refresh
      if (token.refreshToken) {
        try {
          const oauth2Client = new OAuth2Client(
            env.GOOGLE_CLIENT_ID!,
            env.GOOGLE_CLIENT_SECRET!
          );
          
          oauth2Client.setCredentials({
            refresh_token: token.refreshToken as string,
          });
          
          const { credentials } = await oauth2Client.refreshAccessToken();
          
          if (credentials.access_token) {
            token.accessToken = credentials.access_token;
            token.expiresAt = credentials.expiry_date || Date.now() + 3600000;
            
            if (credentials.refresh_token) {
              token.refreshToken = credentials.refresh_token;
            }
          }
        } catch (error) {
          logger.error("Error refreshing token", error);
          // Token refresh failed, clear tokens to force re-login
          token.accessToken = null;
          token.refreshToken = null;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      // Ensure user data is populated from token
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string | null;
        
        // Add accessToken to session
        (session as typeof session & { accessToken?: string }).accessToken = token.accessToken as string;
        
        if (env.isDebugMode) {
          logger.debug("Session callback - Session created", {
            userId: token.id,
            userEmail: token.email,
            hasAccessToken: !!token.accessToken,
          });
        }
      }
      return session;
    },
  },
});

