import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import caseTemplatesRoutes from './routes/caseTemplates.js';
import clientsRoutes from './routes/clients.js';
import { db } from './utils/database.js';
import { isUsingBucketStorage, getFileUrl } from './utils/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Configure CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
// For Railway bucket, files are served via signed URLs or proxy
// For local storage, use express.static
if (!isUsingBucketStorage()) {
  const uploadsDir = db.getUploadsDir();
  app.use('/uploads', express.static(uploadsDir));
} else {
  // Proxy files from Railway bucket
  app.get('/uploads/:filename', async (req, res) => {
    try {
      const fileUrl = `/uploads/${req.params.filename}`;
      const signedUrl = await getFileUrl(fileUrl, 3600); // 1 hour expiry
      
      if (signedUrl && signedUrl.startsWith('http')) {
        // Redirect to signed URL for direct access
        res.redirect(signedUrl);
      } else {
        // Fallback: try to fetch and proxy the file
        const response = await fetch(signedUrl || fileUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          res.setHeader('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
          res.send(Buffer.from(buffer));
        } else {
          res.status(404).json({ error: 'File not found' });
        }
      }
    } catch (error: any) {
      console.error('Error serving file:', error);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  });
}

// API Routes
app.get('/health', async (req, res) => {
  try {
    const dbStatus = {
      type: process.env.DATABASE_URL ? 'PostgreSQL' : 'File-based',
      connected: false,
    };

    if (process.env.DATABASE_URL) {
      try {
        await db.getTemplates(); // Test database connection
        dbStatus.connected = true;
      } catch (error) {
        dbStatus.connected = false;
      }
    } else {
      dbStatus.connected = true; // File-based always works
    }

    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

app.use('/api/case-templates', caseTemplatesRoutes);
app.use('/api/clients', clientsRoutes);

// Serve frontend static files
const frontendDist = join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// Serve index.html for all non-API routes (SPA routing)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(join(frontendDist, 'index.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Server accessible on all network interfaces`);
  console.log(`📦 Serving frontend from: ${frontendDist}`);
  
  if (process.env.DATABASE_URL) {
    console.log(`💾 Database: PostgreSQL (Railway)`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL.substring(0, 20)}...`);
    try {
      // Test database connection
      await db.getTemplates();
      console.log(`✅ Database connection verified`);
    } catch (error: any) {
      console.error(`❌ Database connection failed: ${error.message}`);
      console.log(`⚠️  Using file-based storage as fallback`);
    }
  } else {
    console.log(`💾 Storage: File-based (Local)`);
    console.log(`   No DATABASE_URL found - using local file storage`);
  }
  
  if (isUsingBucketStorage()) {
    console.log(`📁 File Storage: Railway Bucket`);
    console.log(`   Bucket: ${process.env.RAILWAY_BUCKET_NAME || 'Not configured'}`);
  } else {
    const uploadsDir = db.getUploadsDir();
    console.log(`📁 Uploads directory: ${uploadsDir}`);
  }
  
  console.log(`\n🔍 Check /health endpoint for database status`);
});

