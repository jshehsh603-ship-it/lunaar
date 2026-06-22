# Lunaar — Premium Random Video Chat Platform

Lunaar is a premium, modern, high-speed, and secure random video chat platform built with **Next.js**, **React**, **TypeScript**, **Tailwind CSS**, **Framer Motion**, **Node.js**, **Express**, **Socket.IO**, and **WebRTC**.

It features a gorgeous, fully-responsive glassmorphic dark-theme UI with crimson/red accents (`#FF3B3B` / `#FF5A5A`), premium micro-interactions, seamless video/audio streaming, dynamic matchmaking, direct messaging, user dashboards, and contacts management.

---

## 🚀 Getting Started

Since Node.js and npm are required to run this application, make sure you have them installed.

### 1. Install Node.js & npm (If not already installed)
- **macOS (Homebrew)**:
  ```bash
  brew install node
  ```
- **Direct Download**: Download and install the pre-built installer from the [Node.js Official Website](https://nodejs.org/).

### 2. Setup and Install Dependencies
Run the install command from the root folder to download all required packages for both the frontend and backend automatically:
```bash
npm run install:all
```
*Alternatively, you can navigate into each folder and run `npm install`:*
```bash
# In root directory
npm install

# In backend directory
cd backend && npm install

# In frontend directory
cd ../frontend && npm install
```

### 3. Start Development Servers
Run the dev runner from the root folder to spin up both the Next.js client and the Express signaling server concurrently:
```bash
npm run dev
```

The services will initialize at:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API & WebSockets**: [http://localhost:3001](http://localhost:3001)

---

## 🛠️ Architecture & Core Features

### 1. Frontend Workspace (`frontend/`)
- **Landing Page (`src/app/page.tsx`)**: High-fidelity landing view with matching parameters (gender selector, target country dropdown, interest search tags), real-time online statistics counter, and animated trust/benefit cards.
- **Random Video Chat (`src/app/chat/page.tsx`)**: Crystal-clear WebRTC video panels, audio synthezier helper, controls (mute microphone, toggle video, flip webcam, full-screen), match features (add friend, next/skip call, report content, send animated gifts, heart likes), and a persistent right chat panel with real-time translations.
- **User Dashboard (`src/app/profile/page.tsx`)**: Complete details panel (avatar change simulator, biographies, matching parameters, stats grids, and premium VIP simulated checkouts).
- **Contacts & Messages (`src/app/friends/page.tsx`)**: Sidebar of added friends, direct chat thread logs, online indicator dots, call invitations, and offline message support.
- **Audio Synthesizer (`src/components/AudioEffects.tsx`)**: Web Audio API oscillator helper that synthesizes sound cues locally without downloading assets.

### 2. Backend Workspace (`backend/`)
- **Express Server (`src/server.ts`)**: CORS-ready API exposing matchmaking stats, health endpoints, and simulated file uploads (R2/S3 simulator).
- **Signaling Handler (`src/socketHandler.ts`)**: Manages WebRTC SDP offer/answer/candidate relays, in-call chat, direct messaging channels, reports, likes, and socket connections.
- **Matchmaker Engine (`src/matchmaker.ts`)**: Groups sockets in real-time, pairing users based on filters (gender, country, interest overlays) and block status.
- **Database Client (`src/db.ts`)**: In-memory database storing profile data, messaging logs, history, reports, and seeds mock contacts for enriched visuals out-of-the-box.

---

## 🧪 Real-time Simulator Fallback

To make this workspace completely standalone and testable immediately, we built in two developer testing fallbacks:
1. **Local Loopback Simulation**: If you click **Start Chatting** and no other tabs are open, the app automatically triggers a high-quality mock caller from Tokyo or San Francisco. You can text them, translate messages, receive gifts, send reports, and skip/next them immediately.
2. **Multi-Tab Matching**: Open a normal browser tab and an Incognito browser tab side-by-side. Connect both to [http://localhost:3000](http://localhost:3000) and click **Start Chatting**. The Express backend will instantly match them, establish a live WebRTC peer connection between your windows, and sync audio/video/text feeds.
