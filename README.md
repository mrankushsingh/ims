# Immigration Case Manager

A modern, beautiful web application for managing immigration cases with templates, clients, and document tracking.

## Features

- ✨ Modern UI with smooth animations
- 📋 Case template management
- 👥 Client management
- 📊 Dashboard with statistics
- 💾 In-memory database (no setup required)
- 🎨 Beautiful gradient design
- ⚡ Fast and responsive

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the application locally:**
   ```bash
   npm run dev:all
   ```

3. **Open your browser:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:4000

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS with custom animations
- **Backend:** Express.js
- **Database:** In-memory (no setup needed)
- **Icons:** Lucide React

## Project Structure

```
immigration-case-manager/
├── frontend/          # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── utils/         # API utilities
│   │   ├── types.ts       # TypeScript types
│   │   └── App.tsx        # Main app component
│   ├── index.html
│   └── vite.config.ts     # Vite configuration
├── backend/           # Backend Express server
│   ├── routes/        # API routes
│   ├── utils/         # Database utilities
│   └── index.ts       # Server entry point
└── package.json
```

## Available Scripts

- `npm run dev` - Start frontend only
- `npm run dev:server` - Start backend only
- `npm run dev:all` - Start both frontend and backend
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run start` - Start backend in production mode

## 🚀 Deployment

This app can be deployed for **FREE** on multiple platforms!

### Quick Deploy Options:

1. **Render** (Recommended) - Free tier available
   - Deploy backend as Web Service
   - Deploy frontend as Static Site
   - See [DEPLOY.md](./DEPLOY.md) for detailed instructions

2. **Railway** - $5 free credit/month
   - Auto-detects and deploys
   - See [DEPLOY.md](./DEPLOY.md) for instructions

3. **Vercel + Render** - Free tier
   - Frontend on Vercel
   - Backend on Render
   - See [DEPLOY.md](./DEPLOY.md) for instructions

📖 **Full deployment guide:** See [DEPLOY.md](./DEPLOY.md) for step-by-step instructions for all platforms.

Enjoy! 🚀

