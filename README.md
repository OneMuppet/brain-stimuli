# 🧠 Brain Stimuli

**Secure neural interface for capturing, organizing, and syncing your thoughts across devices.**

---

## ✨ What It Does

A **gamified note-taking app** with:
- 📝 Rich text notes with images
- 🎮 XP, levels, and achievements  
- ☁️ **Syncs across devices** via Google Drive
- 🎨 High-tech sci-fi terminal UI

---

## 🏗️ How It Works

### Architecture Flow

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   React UI   │  →   │   Services   │  →   │  Repositories│
│  Components  │      │ (Business)   │      │   (Data)     │
└──────────────┘      └──────────────┘      └──────────────┘
                                                        │
                                                        ▼
                                                ┌──────────────┐
                                                │  IndexedDB   │
                                                │   (Local)    │
                                                └──────────────┘
                                                        │
                                                        ▼
                                                ┌──────────────┐
                                                │  Sync Service│
                                                └──────────────┘
                                                        │
                                                        ▼
                                                ┌──────────────┐
                                                │ Google Drive │
                                                │   (Cloud)    │
                                                └──────────────┘
```

### Data Flow

```
User Action
    │
    ├─→ Component (UI)
    │       │
    │       └─→ Service (Business Logic)
    │               │
    │               └─→ Repository (Data Access)
    │                       │
    │                       └─→ IndexedDB (Local Storage)
    │                               │
    │                               └─→ Pending Changes Queue
    │                                       │
    │                                       └─→ Sync Service
    │                                               │
    │                                               └─→ API Routes
    │                                                       │
    │                                                       └─→ Google Drive API
    │                                                               │
    │                                                               └─→ Cloud Storage
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Google OAuth credentials

### Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with your Google OAuth credentials

# Run
npm run dev
```

### Environment Variables

```env
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-client-id  
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000
```

Generate secret:
```bash
openssl rand -base64 32
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui

# Type check
npm run typecheck
```

---

## 🚢 Deployment

### AWS Amplify

1. **Connect Repository** → AWS Amplify Console
2. **Configure Build** → Auto-detects `amplify.yml`
3. **Add Environment Variables**:
   ```
   NEXTAUTH_SECRET
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
   NEXTAUTH_URL (your Amplify domain)
   ```
4. **Deploy** → Auto-deploys on push to `main`

### Manual Build

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
src/
├── domain/          # Business entities & interfaces
├── application/     # Services (orchestration)
├── infrastructure/  # Repositories (IndexedDB)
├── presentation/    # React components
└── shared/          # Utilities, config, errors
```

---

## 🔄 Sync Mechanism

1. **Local Changes** → Saved to IndexedDB
2. **Pending Queue** → Tracks changes to sync
3. **Sync Service** → Generates delta (changes only)
4. **API Routes** → Upload to Google Drive
5. **Cloud Retrieval** → Download remote changes
6. **Merge Strategy** → Last-write-wins

---

## 🛠️ Development

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Lint code
npm run format       # Format code
npm run typecheck    # Type check
npm run check        # Lint + format + check
```

---

## 📄 License

Private project
