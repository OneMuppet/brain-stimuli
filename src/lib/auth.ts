import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { OAuth2Client } from "google-auth-library";

// Get environment variables - required for production
// Log for debugging (only in development or when explicitly enabled)
const isDebugMode = process.env.NODE_ENV === "development" || process.env.NEXTAUTH_DEBUG === "true";

if (isDebugMode) {
  console.log("NextAuth Environment Variables Check:");
  console.log("NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "✅ Set" : "❌ Missing");
  console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? `✅ Set (${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...)` : "❌ Missing");
  console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Missing");
  console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL || "Not set");
}

// NextAuth requires secret - fail early if missing
if (!process.env.NEXTAUTH_SECRET) {
  const error = new Error(
    "NEXTAUTH_SECRET is required but was not found. " +
    "Please set NEXTAUTH_SECRET in your environment variables. " +
    "Available env vars: " + Object.keys(process.env).filter(k => k.includes("AUTH") || k.includes("GOOGLE")).join(", ")
  );
  console.error(error);
  throw error;
}

// Validate Google OAuth credentials
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  const error = new Error(
    "Google OAuth credentials are required. " +
    `GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? "Set" : "Missing"}, ` +
    `GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Missing"}`
  );
  console.error(error);
  throw error;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // Required for Amplify
  debug: isDebugMode,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
      // Initial sign in - store tokens
      if (account && user) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : Date.now() + 3600000; // Default 1 hour
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
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!
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
          console.error("Error refreshing token:", error);
          // Token refresh failed, clear tokens to force re-login
          token.accessToken = null;
          token.refreshToken = null;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
});

