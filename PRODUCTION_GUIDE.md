# 🚀 Focus Ritual - Production Deployment Guide

This guide details the exact steps to deploy the Focus Ritual Monorepo to production using **Render (Backend)** and **Vercel (Frontend)**.

---

## 📦 1. Pre-Deployment Check
Ensure your latest code is pushed to GitHub.
```bash
git add .
git commit -m "chore: ready for production"
git push origin main
```

---

## 🛠️ 2. Deploy Backend (Render)
**Cost:** Free | **Features:** Node.js + WebSockets

### A. Automatic Method (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your repository.
4. Render will detect `render.yaml` automatically.
5. Fill in the requested Environment Variables:
   - `MONGO_URI`: Your production MongoDB connection string.
   - `JWT_SECRET`: A strong secret key.
   - `FRONTEND_URL`: (Leave empty for now, or enter `https://focus-ritual.vercel.app` if you know your Vercel URL).
6. Click **Apply**.

### B. Manual Method (If Blueprint fails)
1. Click **New +** -> **Web Service**.
2. Connect your repo.
3. **Settings:**
   - **Name:** `focus-ritual-backend` (No spaces!)
   - **Root Directory:** `apps/backend` (CRITICAL)
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Plan:** Free
4. **Environment Variables:** Add `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`.

**✅ Success Criteria:** Render will give you a URL like: `https://focus-ritual-backend.onrender.com`. Copy this!

---

## 🎨 3. Deploy Frontend (Vercel)
**Cost:** Free | **Features:** Global CDN

1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Import `Focus-Ritual-App` repository.
3. **Project Configuration:**
   - **Framework Preset:** Vite (Auto-detected).
   - **Root Directory:** Click "Edit" and select `apps/web`.
4. **Environment Variables:**
   - Key: `VITE_API_URL`
   - Value: `https://focus-ritual-backend.onrender.com` (Your Render URL, **no trailing slash**).
5. Click **Deploy**.

**✅ Success Criteria:** Vercel will give you a URL like: `https://focus-ritual.vercel.app`.

---

## 🔗 4. Final Wiring (CORS)
Now that you have the Frontend URL, you must tell the Backend to allow it.

1. Go back to **Render Dashboard** -> **Environment**.
2. Edit/Add `FRONTEND_URL`.
3. Value: `https://focus-ritual.vercel.app` (Your Vercel URL).
4. Save Changes. Render will automatically redeploy.

---

## 💡 Pro Tips

### 💤 Preventing "Spin Down" (Render Free Tier)
The free backend sleeps after 15 minutes of inactivity. To keep it awake during demo periods:
1. Create a free account on [UptimeRobot](https://uptimerobot.com/).
2. Add a new Monitor:
   - **Type:** HTTP(s)
   - **URL:** `https://focus-ritual-backend.onrender.com/api/stats/get` (or any valid endpoint).
   - **Interval:** 5 minutes.

### 🐛 Troubleshooting
- **Backend Crashes?** Check Render "Logs" tab. Usually incorrect `MONGO_URI` (IP whitelist) or missing env vars.
- **Frontend 404s?** Check Vercel "Build Logs". Ensure `vercel.json` exists in `apps/web` for routing.
