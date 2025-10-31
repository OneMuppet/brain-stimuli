import { google } from "googleapis";
import { getToken } from "next-auth/jwt";
import { OAuth2Client } from "google-auth-library";

const FILE_NAME = "brain-stimuli-data.json";

export async function getDriveClient(req: Request) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET! });
    
    if (!token?.accessToken) {
      throw new Error("No access token - user not authenticated. Please sign out and sign in again to refresh your authentication.");
    }

    // Use google-auth-library OAuth2Client for better token handling
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    );
    
    oauth2Client.setCredentials({
      access_token: token.accessToken as string,
      refresh_token: token.refreshToken as string | undefined,
    });
    
    // Check if token might be expired and refresh if needed
    const expiresAt = token.expiresAt as number | undefined;
    if (expiresAt && Date.now() >= expiresAt - 60000) { // Refresh 1 minute before expiry
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        if (credentials.access_token) {
          oauth2Client.setCredentials({
            access_token: credentials.access_token,
            refresh_token: credentials.refresh_token || token.refreshToken as string | undefined,
          });
        }
      } catch (refreshError) {
        console.error("Error refreshing token in getDriveClient:", refreshError);
        // Continue with existing token, might still work
      }
    }
    
    return google.drive({ version: "v3", auth: oauth2Client });
  } catch (error) {
    console.error("Error getting Drive client:", error);
    throw error;
  }
}

export async function syncToDrive(req: Request, data: any) {
  const drive = await getDriveClient(req);
  
  // Find existing file
  const list = await drive.files.list({
    q: `name='${FILE_NAME}' and trashed=false`,
    spaces: "appDataFolder",
    fields: "files(id)",
  });

  const fileId = list.data.files?.[0]?.id;
  const content = JSON.stringify(data);

  if (fileId) {
    // Update
    await drive.files.update({
      fileId,
      media: { mimeType: "application/json", body: content },
    });
  } else {
    // Create
    await drive.files.create({
      requestBody: { name: FILE_NAME, parents: ["appDataFolder"] },
      media: { mimeType: "application/json", body: content },
    });
  }
}

export async function syncFromDrive(req: Request) {
  try {
    const drive = await getDriveClient(req);
    
    const list = await drive.files.list({
      q: `name='${FILE_NAME}' and trashed=false`,
      spaces: "appDataFolder",
      fields: "files(id)",
    });

    const fileId = list.data.files?.[0]?.id;
    if (!fileId) return null;

    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" } // Explicitly request arraybuffer
    );
    
    // Parse JSON response from arraybuffer
    try {
      // Convert arraybuffer to string
      const buffer = Buffer.from(response.data as ArrayBuffer);
      const text = buffer.toString('utf-8');
      
      if (!text || text.trim().length === 0) {
        console.log("Drive file is empty");
        return null;
      }
      
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing Drive data:", parseError);
      // Try to see what we got
      if (response.data) {
        try {
          const buffer = Buffer.from(response.data as ArrayBuffer);
          console.error("Raw data preview:", buffer.toString('utf-8').substring(0, 100));
        } catch {
          // Ignore
        }
      }
      return null;
    }
  } catch (error) {
    console.error("Error syncing from Drive:", error);
    // Return null instead of throwing so the API can handle empty state
    return null;
  }
}

