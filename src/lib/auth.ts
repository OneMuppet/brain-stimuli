import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { OAuth2Client } from "google-auth-library";

// Get environment variables - required for production
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Validate environment variables at runtime
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !NEXTAUTH_SECRET) {
  console.error("Missing required environment variables:");
  console.error("GOOGLE_CLIENT_ID:", GOOGLE_CLIENT_ID ? "✅" : "❌");
  console.error("GOOGLE_CLIENT_SECRET:", GOOGLE_CLIENT_SECRET ? "✅" : "❌");
  console.error("NEXTAUTH_SECRET:", NEXTAUTH_SECRET ? "✅" : "❌");
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: NEXTAUTH_SECRET,
  trustHost: true, // Required for Amplify
  debug: process.env.NODE_ENV === "development",
  providers: [
    Google({
      clientId: GOOGLE_CLIENT_ID!,
      clientSecret: GOOGLE_CLIENT_SECRET!,
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
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET
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

