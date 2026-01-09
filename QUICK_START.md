# 🎯 QUICK START: Getting Your Project Running

## 📌 Project Summary

**What you have:** A full-stack learning platform with AI features

- **Frontend:** React + TypeScript (Vite) at `Focuss/`
- **Backend:** Node.js + Express + MongoDB at `backend/`
- **Features:** Real-time chat, AI PDF analysis, flashcards, social features

---

## 🚨 IMMEDIATE ACTIONS (Do these first!)

### 1. Secure Your Credentials (5 minutes)

```bash
# 1. Go to MongoDB Atlas (https://cloud.mongodb.com)
#    - Login and reset your database password
#    - Copy the new connection string

# 2. Go to Gmail (https://myaccount.google.com/apppasswords)
#    - Generate new app password for "Focus Ritual"
#    - Copy the password

# 3. Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Update `backend/.env`:**

```env
PORT=5001
MONGO_URI=mongodb+srv://username:NEW_PASSWORD@cluster.mongodb.net/
JWT_SECRET=YOUR_NEW_64_CHAR_SECRET
JWT_EXPIRES_IN=1d
GCS_PROJECT_ID=focusritual
GCS_KEY_FILE=./keys/service-account-key.json
GCS_BUCKET_NAME=focus-ritual-files
EMAIL_USER=focusritual1@gmail.com
EMAIL_PASS=YOUR_NEW_APP_PASSWORD
```

---

## 🚀 Getting Started

### Backend Setup

```bash
# Navigate to backend
cd "d:\Personal Project\Personal Projects\FR-NEW\backend"

# Install dependencies
npm install

# Start development server
npm run dev

# You should see:
# ✓ Connected to MongoDB successfully
# ✓ Server is running on port: 5001
```

### Frontend Setup

```bash
# Open new terminal
cd "d:\Personal Project\Personal Projects\FR-NEW\Focuss"

# Install dependencies
npm install

# Start development server
npm run dev

# Should open at http://localhost:5173
```

---

## 📁 Project Structure

### Backend (`backend/`)

```
backend/
├── src/
│   ├── server.js              # Main server file ⭐
│   ├── config/
│   │   ├── passport.js        # Authentication
│   │   └── gcs.js             # Google Cloud Storage
│   ├── controllers/           # Business logic
│   │   ├── auth.controller.js
│   │   ├── ai.controller.js
│   │   ├── friends.controller.js
│   │   └── ...
│   ├── models/                # Database schemas
│   │   ├── user.model.js
│   │   ├── flashcard.model.js
│   │   └── ...
│   ├── routes/                # API endpoints
│   └── middleware/            # Custom middleware
├── .env                       # Environment variables ⚠️
└── package.json
```

### Frontend (`Focuss/`)

```
Focuss/
├── src/
│   ├── App.tsx                # Main app component
│   ├── pages/                 # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Library.tsx
│   │   ├── PDFViewer.tsx
│   │   └── ...
│   ├── components/            # Reusable components
│   ├── contexts/              # React contexts
│   │   ├── AuthContext.tsx
│   │   └── AppContext.tsx
│   └── services/              # API services
│       ├── api.ts
│       └── AuthService.ts
└── package.json
```

---

## 🔗 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### AI Features

- `POST /api/ai/analyze-pdf` - Analyze PDF with AI
- `POST /api/ai/generate-flashcards` - Generate flashcards
- `POST /api/gemini/generate` - Generate content with Gemini

### Library

- `GET /api/library` - Get user's library
- `POST /api/library/folder` - Create folder
- `POST /up/upload` - Upload file

### Social

- `GET /api/friends` - Get friends list
- `POST /api/friends/request` - Send friend request
- `GET /api/messages` - Get messages

---

## 🛠️ Common Commands

### Development

```bash
# Backend
npm run dev          # Start with nodemon (auto-reload)
npm start            # Start production server

# Frontend
npm run dev          # Start Vite dev server
npm run build        # Build for production
```

### Database

```bash
# Check MongoDB connection
node -e "require('./src/config/gcs.js')"

# Create test data (if you have seed scripts)
node src/scripts/seed.js
```

---

## ✅ Verification Checklist

### Backend is working if:

- [ ] Server starts without errors
- [ ] MongoDB connection successful
- [ ] Health check works: `curl http://localhost:5001/health`
- [ ] Login endpoint responds: `POST http://localhost:5001/api/auth/login`

### Frontend is working if:

- [ ] Vite server starts
- [ ] Can access http://localhost:5173
- [ ] Login page loads
- [ ] Can register/login (after backend is running)

### Full Stack is working if:

- [ ] Can register new account
- [ ] Can login
- [ ] Dashboard loads with user data
- [ ] Can upload files to library
- [ ] Real-time chat works

---

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check if port is in use
netstat -ano | findstr :5001

# Kill process if needed
taskkill /PID [process_id] /F

# Verify .env file exists
ls .env

# Check MongoDB connection string
cat .env | findstr MONGO_URI
```

### Frontend can't connect to backend

```bash
# Check CORS settings in backend/src/server.js
# Ensure frontend URL is allowed:
origin: ['http://localhost:5173']

# Check API base URL in frontend
# Focuss/src/services/api.ts
baseURL: 'http://localhost:5001/api'
```

### Database connection fails

```bash
# MongoDB Atlas checklist:
1. ✓ IP Address whitelisted (add 0.0.0.0/0 for development)
2. ✓ Database user created with correct password
3. ✓ Connection string format is correct
4. ✓ Network access allows connections
```

### File uploads not working

```bash
# Check Google Cloud Storage setup
1. Service account key file exists at backend/keys/service-account-key.json
2. GCS_BUCKET_NAME in .env matches your bucket
3. Service account has "Storage Object Admin" role
```

---

## 📊 Key Features Overview

### 1. Authentication System

- JWT-based authentication
- Refresh token support
- Password reset via email
- Protected routes

### 2. AI Integration

- PDF text extraction and analysis
- Automated flashcard generation
- Q&A system with documents
- Content summarization with Gemini AI

### 3. Real-time Features

- Socket.IO for instant messaging
- Online status tracking
- Collaboration rooms
- Live notifications

### 4. Storage System

- Google Cloud Storage for files
- MongoDB for metadata
- Organized folder structure
- Signed URLs for secure access

### 5. Social Features

- Friend system with requests
- Private messaging
- Activity feed
- User profiles

---

## 🎯 Next Steps After Setup

1. **Test Basic Flow:**

   - Register account → Login → Upload PDF → Generate flashcards

2. **Explore Features:**

   - Check Dashboard
   - Browse Library
   - Test AI Coach
   - Try Social features

3. **Read Optimization Guide:**

   - See `OPTIMIZATION_GUIDE.md` for improvements
   - Implement security fixes
   - Add error handling

4. **Development:**
   - Set up Git properly
   - Create feature branches
   - Test before committing

---

## 📞 Quick Reference

### URLs

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5001
- **API Docs:** http://localhost:5001/health
- **MongoDB:** https://cloud.mongodb.com

### Important Files

- **Backend .env:** `backend/.env`
- **Main server:** `backend/src/server.js`
- **Auth logic:** `backend/src/controllers/auth.controller.js`
- **Frontend config:** `Focuss/src/services/api.ts`
- **Auth context:** `Focuss/src/contexts/AuthContext.tsx`

### Key Dependencies

- **Backend:** Express, Mongoose, Socket.IO, JWT, Passport
- **Frontend:** React, TypeScript, Vite, Axios, Socket.IO-client
- **AI:** Google Gemini AI, PDF-Parse

---

## 💡 Tips

1. **Always run backend first**, then frontend
2. **Check browser console** for frontend errors
3. **Check terminal** for backend errors
4. **Use Postman** to test API endpoints directly
5. **Keep MongoDB Atlas dashboard open** to monitor database

---

**You're all set! 🎉**

Start with securing your credentials, then follow the setup steps. Good luck!
