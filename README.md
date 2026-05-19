# Chat App (Expo + Node.js + MongoDB Atlas)

1:1 real-time chat with OTP login.

## Stack

- **mobile/** — Expo (React Native, TypeScript)
- **server/** — Express, Socket.io, Mongoose, JWT

## Prerequisites

- Node.js 20+
- MongoDB Atlas cluster ([create free cluster](https://www.mongodb.com/cloud/atlas))
- For physical devices: your machine's LAN IP (not `localhost`)

## Setup

### 1. MongoDB Atlas

1. Create a cluster and database user.
2. Network Access: allow your IP (or `0.0.0.0/0` for local dev only).
3. Copy the connection string.

### 2. Server

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

| Variable | Example |
|----------|---------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/chat-app` |
| `JWT_SECRET` | long random string |
| `PORT` | `3000` |

```bash
npm install
npm run dev
```

In development, OTP codes are printed to the server console:

```
[OTP] +1234567890: 123456
```

### 3. Mobile

```bash
cd mobile
cp .env.example .env
```

Edit `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000
```

Use `http://localhost:3000` for iOS Simulator. Use your computer's LAN IP for a physical device.

```bash
npm install
npx expo start
```

## Manual test flow

1. Start the server.
2. Open the app on two simulators/devices (or one app + change phone numbers).
3. Log in with phone A → check server logs for OTP → verify.
4. Log in with phone B on second client.
5. On A: **New chat** → search B's phone → start chat.
6. Send messages; they should appear on both clients in real time.

## API overview

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/send-otp` | No |
| POST | `/auth/verify-otp` | No |
| GET | `/auth/me` | Yes |
| GET | `/users/search?q=` | Yes |
| GET | `/chats` | Yes |
| POST | `/chats` | Yes |
| GET | `/chats/:id/messages` | Yes |
| POST | `/chats/:id/messages` | Yes |

### Socket.io events

- `join_chat` `{ chatId }`
- `send_message` `{ chatId, content, clientMessageId }`
- `message_new` `{ message }`
- `typing` `{ chatId, userId, isTyping }`

Auth: pass JWT in `handshake.auth.token`.

## Deploy (post-MVP)

| Component | Suggestion |
|-----------|------------|
| API | Railway, Render, or Fly.io with HTTPS |
| Atlas | Restrict network to server IP |
| OTP | Twilio Verify, MSG91, or similar (replace console log) |
| Mobile | EAS Build; set `EXPO_PUBLIC_API_URL` to production API |

## Project structure

```
chat-app/
├── mobile/src/     screens, navigation, services
├── server/src/     routes, models, sockets
└── README.md
```
