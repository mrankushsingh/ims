# Deployment Guide - Free Hosting Options

This guide will help you deploy your Immigration Case Manager application for free.

## 🚀 Quick Deploy Options

### Option 1: Render (Recommended - Easiest)

**Free Tier:** ✅ Yes (with some limitations)

1. **Create Account:**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Deploy Backend:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Settings:
     - **Name:** `immigration-case-manager-backend`
     - **Root Directory:** `backend`
     - **Environment:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npx tsx index.ts`
     - **Plan:** Free
   - Add Environment Variable:
     - `NODE_ENV` = `production`
     - `PORT` = `4000` (or leave blank, Render will assign)
   - Click "Create Web Service"
   - Copy the backend URL (e.g., `https://your-app.onrender.com`)

3. **Deploy Frontend:**
   - Click "New +" → "Static Site"
   - Connect your GitHub repository
   - Settings:
     - **Name:** `immigration-case-manager-frontend`
     - **Root Directory:** `frontend`
     - **Build Command:** `npm install && npm run build`
     - **Publish Directory:** `frontend/dist`
   - Add Environment Variable:
     - `VITE_API_URL` = `https://your-backend-url.onrender.com/api`
     - Replace `your-backend-url` with your actual backend URL
   - Click "Create Static Site"

4. **Done!** Your app will be live at the frontend URL.

---

### Option 2: Railway

**Free Tier:** ✅ Yes ($5 credit/month)

1. **Create Account:**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create Project:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the project

3. **Add PostgreSQL Database:**
   - In your Railway project, click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically create a PostgreSQL database
   - The `DATABASE_URL` environment variable will be automatically set
   - **Important:** All your templates and client data will be stored in PostgreSQL and persist across deployments

4. **Add Railway Volume (for file uploads):**
   - In your Railway project, click "New" → "Volume"
   - Name it `uploads` or `data`
   - Mount path: `/data`
   - This will store all uploaded PDFs and documents permanently

5. **Configure Backend Service:**
   - Railway will auto-detect your backend
   - It will use the `railway.json` config
   - Add Environment Variable:
     - `RAILWAY_VOLUME_MOUNT_PATH` = `/data` (if you created a volume)
     - `NODE_ENV` = `production`
   - The `DATABASE_URL` is automatically set by Railway when you add PostgreSQL

6. **Deploy Frontend Separately:**
   - Create a new service in the same project
   - Set root directory to `frontend`
   - Build command: `npm install && npm run build`
   - Start command: `npx vite preview --host 0.0.0.0 --port $PORT`
   - Add Environment Variable:
     - `VITE_API_URL` = `https://your-backend-url.railway.app/api`
     - Replace `your-backend-url` with your actual Railway backend URL

**✅ Your data will now persist permanently:**
- Templates and client info → Stored in PostgreSQL
- Uploaded PDFs and documents → Stored in Railway Volume

---

### Option 3: Vercel (Frontend) + Render (Backend)

**Free Tier:** ✅ Yes

1. **Deploy Backend on Render** (follow Option 1, step 2)

2. **Deploy Frontend on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project"
   - Import your repository
   - Settings:
     - **Root Directory:** `frontend`
     - **Framework Preset:** Vite
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
   - Add Environment Variable:
     - `VITE_API_URL` = `https://your-backend-url.onrender.com/api`
   - Click "Deploy"

---

### Option 4: Fly.io

**Free Tier:** ✅ Yes (3 shared VMs)

1. **Install Fly CLI:**
   ```bash
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Deploy Backend:**
   ```bash
   cd backend
   fly launch
   ```
   - Follow prompts
   - Set port to 4000

4. **Deploy Frontend:**
   - Create a new Fly app for frontend
   - Use static file serving

---

## 📝 Important Notes

### Environment Variables

Make sure to set these environment variables:

**Backend:**
- `NODE_ENV` = `production`
- `PORT` = (auto-assigned by platform)

**Frontend:**
- `VITE_API_URL` = `https://your-backend-url/api`

### CORS Configuration

The backend already has CORS enabled, so it should work with any frontend URL.

### Database

**✅ The app now supports persistent storage:**

- **For Railway:** Automatically uses PostgreSQL when `DATABASE_URL` is set (Railway provides this automatically)
- **For Local Development:** Uses file-based storage (JSON files in `data/` directory)
- **File Uploads:** 
  - Railway: Uses Railway Volumes (set `RAILWAY_VOLUME_MOUNT_PATH=/data`)
  - Local: Uses `data/uploads/` directory

The app automatically detects the environment and uses the appropriate storage method.

---

## 🔧 Troubleshooting

### Backend not connecting
- Check that the backend URL in `VITE_API_URL` is correct
- Ensure CORS is enabled (already done)
- Check backend logs for errors

### Build fails
- Make sure all dependencies are in `package.json`
- Check that Node.js version is compatible (18+)

### Frontend shows errors
- Verify `VITE_API_URL` environment variable is set
- Check browser console for API errors
- Ensure backend is running and accessible

---

## 🎉 After Deployment

Once deployed, your app will be accessible at:
- **Frontend URL:** Your frontend deployment URL
- **Backend URL:** Your backend deployment URL

Share the frontend URL with your users!

---

## 💡 Recommended: Render

**Why Render?**
- ✅ Free tier available
- ✅ Easy setup
- ✅ Automatic deployments from GitHub
- ✅ Good documentation
- ✅ Supports both static sites and web services

**Limitations:**
- Free tier spins down after 15 minutes of inactivity
- First request after spin-down may be slow (~30 seconds)

For production use, consider upgrading to a paid plan or using a service with always-on free tier.

