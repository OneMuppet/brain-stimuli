# Brain Stimuli Console

A high-focus note-taking application with gamification, cloud sync, and a futuristic UI aesthetic.

## Features

- 🎮 Gamified note-taking with XP, levels, and combo streaks
- ☁️ Secure Google Drive sync across devices
- 🎨 High-tech Web3 AI console aesthetic
- 📝 Rich text editing with Tiptap (tables, formatting, etc.)
- 📸 Screenshot capture and management
- 🔒 Server-side authentication with NextAuth.js
- 💾 Offline-first with IndexedDB

## Quick Start

### Prerequisites

- Node.js 18+
- A Google Cloud project with OAuth credentials

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the following APIs:
   - Google Drive API
   - Google People API
4. Create OAuth 2.0 credentials:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Required scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/drive.appdata`

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Copy from .env.example
cp .env.example .env.local
```

Then edit `.env.local` with your values:

```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to AWS Amplify

### Prerequisites

- GitHub/GitLab/Bitbucket repository
- AWS account

### Steps

1. **Push to Git Repository**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

2. **Connect to AWS Amplify**
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Connect your Git repository

3. **Configure Build Settings**
   - Amplify will auto-detect `amplify.yml`
   - Confirm the build settings

4. **Add Environment Variables**
   In Amplify Console → Environment variables, add:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your Amplify domain, e.g., `https://main.d123.amplifyapp.com`)

5. **Update Google OAuth Redirect URIs**
   - Go back to Google Cloud Console
   - Add your Amplify domain to authorized redirect URIs:
     - `https://your-amplify-domain.com/api/auth/callback/google`

6. **Deploy**
   - Amplify will automatically build and deploy
   - Subsequent pushes to `main` will auto-deploy

## Architecture

### Frontend
- **Next.js 16** - React framework with SSR/SSG
- **Framer Motion** - Animations
- **Tiptap** - Rich text editor
- **IndexedDB** - Local storage (via idb)
- **Tailwind CSS** - Styling

### Authentication
- **NextAuth.js v5** - Secure OAuth flow
- **HTTP-only cookies** - Token storage (server-side)
- **Google OAuth 2.0** - Identity provider

### Cloud Sync
- **Google Drive API** - Cloud storage (appDataFolder)
- **Next.js API Routes** - Server-side sync logic
- **Periodic sync** - Auto-sync every 60 seconds when authenticated

### Data Flow

```
Client (IndexedDB) → API Routes → Google Drive
                   ↓
              NextAuth.js
                   ↓
           Google OAuth 2.0
```

## Security

- All authentication tokens are stored server-side in HTTP-only cookies
- Google Client Secret is never exposed to the browser
- API routes validate authentication before Google Drive access
- Sync data is stored in Google Drive's `appDataFolder` (app-specific, user-isolated)
- Next.js API routes run as AWS Lambda functions (isolated, stateless)

## Development

### Project Structure

```
brain-stimuli/
├── src/
│   ├── app/              # Next.js pages & API routes
│   ├── components/       # React components
│   ├── lib/             # Core logic (db, auth, scoring)
│   └── hooks/           # Custom React hooks
├── public/              # Static assets
├── amplify.yml          # AWS Amplify config
├── next.config.ts       # Next.js config
└── tsconfig.json        # TypeScript config
```

### Key Files

- `src/lib/auth.ts` - NextAuth.js configuration
- `src/lib/googleDrive.ts` - Google Drive API helpers (server-side)
- `src/lib/db.ts` - IndexedDB operations
- `src/hooks/useSync.ts` - Cloud sync hook
- `src/app/api/sync/route.ts` - Sync API endpoint

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run Biome linter
npm run lint:fix     # Fix linting issues
npm run format       # Format code
npm run typecheck    # TypeScript type checking
```

## Troubleshooting

### "No access token" error
- Ensure you're signed in with Google
- Check that `GOOGLE_CLIENT_SECRET` is set correctly
- Verify OAuth scopes include `drive.appdata`

### Sync not working
- Open browser console and check for errors
- Verify Google Drive API is enabled in Google Cloud
- Check that NextAuth.js session is active (look for cookies)

### Build fails on Amplify
- Ensure all environment variables are set in Amplify Console
- Check build logs for specific errors
- Verify `amplify.yml` is in the repository root

## License

MIT

## Contributing

This is a personal project, but feel free to fork and adapt for your own use!
