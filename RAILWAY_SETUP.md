# Railway Database Setup Guide

## 🚨 IMPORTANT: Connect PostgreSQL Database

Your app needs a PostgreSQL database to store data permanently. Follow these steps:

## Step 1: Add PostgreSQL Database

1. **Go to your Railway project dashboard**
2. **Click "New"** (top right)
3. **Select "Database"**
4. **Choose "Add PostgreSQL"**
5. Railway will automatically:
   - Create a PostgreSQL database
   - Set the `DATABASE_URL` environment variable
   - Connect it to your service

## Step 2: Verify Database Connection

After adding PostgreSQL:

1. **Check your service logs** - You should see:
   ```
   ✅ PostgreSQL connection successful
   ✅ PostgreSQL database initialized and tables created
   ```

2. **Test the health endpoint**:
   - Visit: `https://your-app.railway.app/health`
   - Should show: `"database": { "type": "PostgreSQL", "connected": true }`

## Step 3: Verify Environment Variables

In your Railway service settings, check that:
- ✅ `DATABASE_URL` is automatically set (Railway does this)
- ✅ `NODE_ENV` = `production` (optional but recommended)

## Troubleshooting

### Database not connecting?

1. **Check Railway logs** for errors
2. **Verify DATABASE_URL exists**:
   - Go to your service → Variables
   - Look for `DATABASE_URL`
   - If missing, add PostgreSQL database again

3. **Check connection string format**:
   - Should start with `postgresql://` or `postgres://`
   - Railway sets this automatically

### Still using file storage?

If you see "File-based (Local)" in logs:
- ❌ `DATABASE_URL` is not set
- ✅ Add PostgreSQL database in Railway
- ✅ Railway will automatically set `DATABASE_URL`

### Data not persisting?

- Make sure PostgreSQL database is added
- Check that `DATABASE_URL` environment variable exists
- Restart your service after adding database

## Quick Check

Run this in your Railway service logs or check `/health` endpoint:

```bash
# Should show:
💾 Database: PostgreSQL (Railway)
✅ Database connection verified
```

If you see "File-based (Local)", the database is not connected yet.

