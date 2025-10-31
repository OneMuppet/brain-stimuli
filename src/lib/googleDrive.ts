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
  
  // Log what we're saving
  const sessionsCount = (data?.sessions?.created?.length || 0) + (data?.sessions?.updated?.length || 0);
  const notesCount = (data?.notes?.created?.length || 0) + (data?.notes?.updated?.length || 0);
  const imagesCount = data?.images?.created?.length || 0;
  console.log("💾 Saving to Google Drive:", {
    fileId: fileId || "NEW FILE",
    sessionsCount,
    notesCount,
    imagesCount,
    contentSize: content.length,
    preview: content.substring(0, 200) + "...",
  });

  if (fileId) {
    // Update
    const result = await drive.files.update({
      fileId,
      media: { mimeType: "application/json", body: content },
    });
    console.log("✅ Updated Google Drive file:", fileId);
    return result;
  } else {
    // Create
    const result = await drive.files.create({
      requestBody: { name: FILE_NAME, parents: ["appDataFolder"] },
      media: { mimeType: "application/json", body: content },
    });
    console.log("✅ Created Google Drive file:", result.data.id);
    return result;
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
    console.log("📥 Checking Google Drive:", {
      fileId: fileId || "NO FILE FOUND",
      filesListed: list.data.files?.length || 0,
    });
    
    if (!fileId) {
      console.log("⚠️ No file found in Google Drive appDataFolder");
      return null;
    }

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
        console.log("⚠️ Drive file is empty");
        return null;
      }
      
      const parsed = JSON.parse(text);
      
      // Log what we retrieved
      const sessionsCount = (parsed?.sessions?.created?.length || 0) + (parsed?.sessions?.updated?.length || 0);
      const notesCount = (parsed?.notes?.created?.length || 0) + (parsed?.notes?.updated?.length || 0);
      const imagesCount = parsed?.images?.created?.length || 0;
      console.log("📦 Retrieved from Google Drive:", {
        fileId,
        contentSize: text.length,
        sessionsCount,
        notesCount,
        imagesCount,
        preview: text.substring(0, 200) + "...",
      });
      
      return parsed;
    } catch (parseError) {
      console.error("❌ Error parsing Drive data:", parseError);
      // Try to see what we got
      if (response.data) {
        try {
          const buffer = Buffer.from(response.data as ArrayBuffer);
          const preview = buffer.toString('utf-8').substring(0, 200);
          console.error("Raw data preview:", preview);
        } catch {
          // Ignore
        }
      }
      return null;
    }
  } catch (error) {
    console.error("❌ Error syncing from Drive:", error);
    // Return null instead of throwing so the API can handle empty state
    return null;
  }
}
