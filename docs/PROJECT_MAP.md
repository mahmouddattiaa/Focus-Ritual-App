# 🗺️ Focus Ritual - Complete Project Architecture Map

## 📊 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│                    http://localhost:5173                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐     │
│  │Dashboard │  │ Library  │  │ AI Coach  │  │  Social  │     │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘     │
│       │             │               │             │            │
│       └─────────────┴───────────────┴─────────────┘            │
│                           │                                     │
│                    ┌──────▼──────┐                             │
│                    │ API Service │ ◄─── AuthContext            │
│                    │   (Axios)   │                             │
│                    └──────┬──────┘                             │
└───────────────────────────┼─────────────────────────────────────┘
                            │ HTTP/REST
                            │ WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│                      BACKEND (Node.js)                          │
│                    http://localhost:5001                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────┐    ┌──────────────┐    ┌─────────────┐        │
│  │   Routes   │───►│ Controllers  │───►│  Services   │        │
│  └────────────┘    └──────────────┘    └─────────────┘        │
│       │                   │                    │                │
│  ┌────▼─────┐        ┌───▼────┐          ┌───▼────┐           │
│  │Middleware│        │ Models │          │   AI   │           │
│  └──────────┘        └───┬────┘          └────────┘           │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌──────────────┐  ┌────────────────┐
│   MongoDB     │  │ Google Cloud │  │ Google Gemini  │
│   Database    │  │   Storage    │  │      AI        │
└───────────────┘  └──────────────┘  └────────────────┘
```

---

## 🔄 Complete Request Flow

### Example: User Uploads PDF and Generates Flashcards

```
1. USER ACTION
   ↓
   User clicks "Upload PDF" in Library page

2. FRONTEND (Focuss/src/)
   ↓
   pages/Library.tsx
   ├─► Handles file selection
   └─► Calls uploadFile() from services/api.ts
       ↓
       POST /api/library/upload
       Content-Type: multipart/form-data
       Authorization: Bearer [JWT_TOKEN]

3. BACKEND (backend/src/)
   ↓
   routes/library.routes.js
   ├─► Validates JWT token (passport middleware)
   ├─► Checks file size/type (multer middleware)
   └─► Routes to controller
       ↓
       controllers/library.controller.js
       ├─► Validates request
       ├─► Calls upload service
       └─► Returns response
           ↓
           services/gcs.js
           ├─► Uploads to Google Cloud Storage
           ├─► Generates signed URL
           └─► Returns file info
               ↓
               models/file.model.js
               ├─► Saves metadata to MongoDB
               └─► Links to user

4. RESPONSE FLOW
   ↓
   Success response with file data
   ↓
   Frontend updates UI
   ↓
   User sees uploaded PDF in library

5. USER CLICKS "Generate Flashcards"
   ↓
   POST /api/ai/generate-flashcards
   ↓
   controllers/ai.controller.js
   ├─► Creates background job
   └─► Returns job ID immediately
       ↓
       services/ai.service.js (Background)
       ├─► Downloads PDF from GCS
       ├─► Extracts text with pdf-parse
       ├─► Sends to Gemini AI
       ├─► Processes AI response
       ├─► Creates flashcard models
       └─► Saves to MongoDB
           ↓
           Socket.IO notification
           ├─► "Flashcards ready!"
           └─► Frontend updates UI
```

---

## 📂 Detailed File Structure

### Backend Structure (backend/src/)

```
backend/src/
│
├── server.js                    # 🏠 Main entry point
│   ├─► Initializes Express app
│   ├─► Connects to MongoDB
│   ├─► Sets up Socket.IO
│   ├─► Configures middleware
│   └─► Mounts routes
│
├── config/                      # ⚙️ Configuration
│   ├── passport.js             # JWT & Local strategy
│   ├── gcs.js                  # Google Cloud Storage
│   └── config.ts               # Environment config
│
├── controllers/                 # 🎮 Request handlers
│   ├── auth.controller.js      # Register, Login, Logout
│   ├── ai.controller.js        # AI operations
│   ├── library.controller.js   # File management
│   ├── friends.controller.js   # Social features
│   ├── flashcard.controller.js # Flashcard CRUD
│   ├── note.controller.js      # Note taking
│   └── stats.controller.js     # User statistics
│
├── models/                      # 📊 Database schemas
│   ├── user.model.js           # User data
│   │   ├─► email, name, password
│   │   ├─► friends[]
│   │   ├─► settings{}
│   │   └─► online status
│   │
│   ├── flashcard.model.js      # Flashcard data
│   │   ├─► question, answer
│   │   ├─► difficulty (spaced repetition)
│   │   └─► nextReviewDate
│   │
│   ├── file.model.js           # File metadata
│   ├── messages.model.js       # Chat messages
│   ├── post.model.js           # Social feed posts
│   └── stats.model.js          # User activity stats
│
├── routes/                      # 🛣️ API endpoints
│   ├── auth.routes.js          # /api/auth/*
│   ├── ai.routes.js            # /api/ai/*
│   ├── library.routes.js       # /api/library/*
│   ├── friends.routes.js       # /api/friends/*
│   ├── flashcard.routes.js     # /api/flashcards/*
│   └── ...
│
├── middleware/                  # 🛡️ Custom middleware
│   ├── errorHandler.js         # Error handling
│   ├── validator.js            # Input validation
│   ├── rateLimiter.js          # Rate limiting
│   └── upload.js               # File upload (Multer)
│
├── services/                    # 🔧 Business logic
│   ├── ai.service.js           # AI processing
│   ├── gemini.service.js       # Gemini AI integration
│   ├── achievement.service.js  # Gamification
│   └── websocket.service.js    # Real-time features
│
└── utils/                       # 🧰 Utilities
    └── logger.js               # Logging system
```

### Frontend Structure (Focuss/src/)

```
Focuss/src/
│
├── main.tsx                     # 🚀 App entry point
│   └─► Renders <App />
│
├── App.tsx                      # 🏠 Main app component
│   ├─► Sets up routing
│   ├─► Provides contexts
│   └─► Handles authentication
│
├── pages/                       # 📄 Page components
│   ├── Dashboard.tsx           # Main dashboard
│   │   ├─► Stats overview
│   │   ├─► Recent activity
│   │   └─► Quick actions
│   │
│   ├── Library.tsx             # File library
│   │   ├─► Folder tree
│   │   ├─► File list
│   │   └─► Upload interface
│   │
│   ├── PDFViewer.tsx           # PDF reader
│   │   ├─► PDF rendering
│   │   ├─► Annotations
│   │   └─► AI features
│   │
│   ├── AICoach.tsx             # AI interaction
│   ├── Social.tsx              # Social feed
│   ├── Tasks.tsx               # Task management
│   └── Auth.tsx                # Login/Register
│
├── components/                  # 🧩 Reusable components
│   ├── layout/
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── Header.tsx          # Top header bar
│   │
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   └── social/
│       ├── FriendsList.tsx
│       ├── ChatWindow.tsx
│       └── FriendChatManager.tsx
│
├── contexts/                    # 🔄 React contexts
│   ├── AuthContext.tsx         # Authentication state
│   │   ├─► user data
│   │   ├─► login/logout
│   │   └─► token management
│   │
│   ├── AppContext.tsx          # Global app state
│   └── AudioContext.tsx        # Audio management
│
├── services/                    # 🔌 API services
│   ├── api.ts                  # Axios configuration
│   │   ├─► Base URL
│   │   ├─► Interceptors
│   │   └─► Error handling
│   │
│   ├── AuthService.ts          # Auth API calls
│   ├── aiService.ts            # AI API calls
│   └── FriendsService.ts       # Social API calls
│
├── hooks/                       # 🪝 Custom hooks
│   ├── useAuth.ts
│   ├── useSocket.ts
│   └── useDebounce.ts
│
└── types/                       # 📝 TypeScript types
    ├── user.ts
    ├── file.ts
    └── flashcard.ts
```

---

## 🔐 Authentication Flow

```
1. USER REGISTRATION
   ↓
   Frontend: Auth.tsx
   ├─► User fills form
   └─► POST /api/auth/register
       ↓
       Backend: auth.controller.js
       ├─► Validate input (validator middleware)
       ├─► Check if user exists
       ├─► Hash password (bcrypt)
       ├─► Create user in MongoDB
       ├─► Create stats document
       ├─► Generate JWT token
       └─► Return token + user data
           ↓
           Frontend: AuthContext
           ├─► Store token in localStorage
           ├─► Set user state
           └─► Redirect to dashboard

2. USER LOGIN
   ↓
   POST /api/auth/login
   ├─► Passport local strategy
   ├─► Compare password
   ├─► Generate JWT token
   ├─► Generate refresh token
   └─► Return tokens + user data

3. PROTECTED REQUESTS
   ↓
   Frontend: api.ts interceptor
   ├─► Add: Authorization: Bearer [token]
   └─► Send request
       ↓
       Backend: passport middleware
       ├─► Extract token
       ├─► Verify JWT
       ├─► Attach user to req.user
       └─► Continue to route handler

4. TOKEN REFRESH
   ↓
   If token expired (401)
   ├─► POST /api/auth/refresh
   ├─► Send refresh token
   ├─► Generate new JWT
   ├─► Update localStorage
   └─► Retry original request
```

---

## 🔄 Real-time Communication (Socket.IO)

```
CONNECTION FLOW
───────────────

Frontend connects:
socket = io('http://localhost:5001', {
    auth: { token: JWT_TOKEN }
})

Backend authenticates:
io.use((socket, next) => {
    verify JWT token
    attach user to socket.user
    next()
})

User joins personal room:
socket.join(userId)

MESSAGING FLOW
──────────────

User sends message:
├─► socket.emit('private_message', {
│       recipientId,
│       content
│   })
│
└─► Backend receives
    ├─► Save to MongoDB
    ├─► Send to recipient: io.to(recipientId).emit('new_private_message')
    ├─► Send to sender: io.to(senderId).emit('new_private_message')
    └─► If recipient not viewing, send notification

COLLABORATION ROOMS
───────────────────

User joins room:
├─► socket.emit('joinRoom', { roomCode, user })
├─► Backend adds to room
└─► Broadcast to room: socket.to(roomCode).emit('userJoined')

User sends message:
├─► socket.emit('sendMessage', message)
└─► Broadcast: io.to(roomCode).emit('newMessage', message)

ONLINE STATUS
─────────────

Connect: Update user.online = true
Disconnect: Update user.online = false
```

---

## 🤖 AI Processing Flow

```
PDF ANALYSIS PIPELINE
─────────────────────

1. File Upload
   ├─► User uploads PDF
   ├─► Multer processes file
   └─► Upload to Google Cloud Storage
       ↓
2. Create Processing Job
   ├─► Generate unique job ID
   ├─► Return job ID immediately
   └─► Start background processing
       ↓
3. Background Processing (ai.service.js)
   ├─► Download PDF from GCS
   ├─► Extract text with pdf-parse
   ├─► Split into manageable chunks
   └─► Send to Gemini AI
       ↓
4. AI Processing
   ├─► Analyze document structure
   ├─► Extract key concepts
   ├─► Generate summaries
   └─► Create Q&A pairs
       ↓
5. Save Results
   ├─► Save lecture content
   ├─► Create flashcards
   ├─► Update job status
   └─► Send Socket.IO notification
       ↓
6. Frontend Update
   ├─► Receive notification
   ├─► Fetch new data
   └─► Update UI

FLASHCARD GENERATION
────────────────────

Input: PDF text or manual content
   ↓
Gemini AI Prompt:
"Generate flashcards from this content.
Format: Question | Answer"
   ↓
AI Response:
[
    { question: "...", answer: "..." },
    { question: "...", answer: "..." }
]
   ↓
Create Flashcard Models:
├─► Set initial difficulty
├─► Calculate nextReviewDate
├─► Link to user and subject
└─► Save to MongoDB
```

---

## 📊 Database Schema Relationships

```
┌──────────────┐
│     USER     │
└──┬───────┬───┘
   │       │
   │       ├──────────┐
   │       │          │
   ▼       ▼          ▼
┌─────┐ ┌──────┐ ┌────────┐
│STATS│ │FRIENDS│ │MESSAGES│
└─────┘ └───────┘ └────────┘
   │       │          │
   │       │          └─► Messages between users
   │       │
   │       └─► Friend relationships
   │
   ├──► Tasks, Habits, Productivity data
   │
   ▼
┌─────────┐
│SUBJECTS │
└────┬────┘
     │
     ├─────────┬──────────┬──────────┐
     │         │          │          │
     ▼         ▼          ▼          ▼
  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────────────┐
  │NOTES │ │FILES │ │FLASHC│ │LEARNING PATHS │
  └──────┘ └──────┘ │ARDS  │ └───────────────┘
                     └──────┘

Key Relationships:
─────────────────
• User hasMany Friends (User refs)
• User hasMany Messages (sent/received)
• User hasMany Subjects
• Subject hasMany Files, Notes, Flashcards
• Flashcards have spaced repetition data
• Messages have read/unread status
```

---

## 🎯 Key Features Implementation

### 1. Spaced Repetition (Flashcards)

```javascript
// Algorithm: SM-2 (SuperMemo 2)
calculateNextReview(difficulty, lastReview) {
    const intervals = {
        1: 1,      // day
        2: 3,      // days
        3: 7,      // days
        4: 14,     // days
        5: 30      // days
    };

    return new Date(lastReview.getTime() +
                    intervals[difficulty] * 24 * 60 * 60 * 1000);
}
```

### 2. Achievement System

```javascript
// Monitors user actions
// Triggers based on milestones
achievements = [
  { name: "First Upload", condition: "files.count === 1" },
  { name: "Study Streak", condition: "consecutive_days === 7" },
  { name: "Flashcard Master", condition: "flashcards_reviewed === 100" },
];

// Emits Socket.IO event when unlocked
socket.emit("achievement:unlocked", achievement);
```

### 3. Real-time Collaboration

```javascript
// Room-based architecture
rooms = {
    'room123': {
        participants: [user1, user2],
        messages: [...],
        whiteboard: {...}
    }
}

// Synchronized state
socket.on('stateChange', (state) => {
    io.to(roomCode).emit('stateUpdate', state);
});
```

---

## 🚦 Request/Response Examples

### Register User

**Request:**

```http
POST /api/auth/register HTTP/1.1
Content-Type: application/json

{
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "password": "securepass123"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profilePicture": null,
    "friends": []
  }
}
```

### Upload File

**Request:**

```http
POST /api/library/upload HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: multipart/form-data

file: [binary data]
folderId: "507f191e810c19729de860ea"
```

**Response:**

```json
{
  "success": true,
  "file": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "lecture1.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "gcsUrl": "https://storage.googleapis.com/...",
    "uploadedAt": "2025-11-04T10:30:00.000Z"
  }
}
```

---

## 💡 Performance Optimizations Applied

### 1. Database Indexing

```javascript
// Improves query performance
UserSchema.index({ email: 1 });
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
FlashcardSchema.index({ userId: 1, nextReviewDate: 1 });
```

### 2. Response Caching

```javascript
// Cache frequently accessed data
const cache = new NodeCache({ stdTTL: 600 });
```

### 3. Rate Limiting

```javascript
// Prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

### 4. Pagination

```javascript
// Limit data transfer
GET /api/flashcards?page=1&limit=20
```

---

## 🎓 Understanding the Tech Stack

### Why Each Technology?

**Express.js**

- Fast, minimalist web framework
- Large ecosystem of middleware
- Perfect for REST APIs

**MongoDB**

- Flexible schema (NoSQL)
- Good for rapid development
- Scales horizontally

**Socket.IO**

- Real-time bidirectional communication
- Automatic reconnection
- Room-based architecture

**React + TypeScript**

- Component-based UI
- Type safety
- Great developer experience

**Google Cloud Storage**

- Scalable file storage
- CDN integration
- Secure signed URLs

**Gemini AI**

- Advanced language understanding
- Content generation
- Free tier available

---

**This map should help you navigate your entire project! 🗺️**

Use this as a reference when working on features or debugging issues.
