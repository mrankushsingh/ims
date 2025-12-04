import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import caseTemplatesRoutes from './routes/caseTemplates.js';
import clientsRoutes from './routes/clients.js';
import { db } from './utils/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

// Serve uploaded files
// For Railway, use RAILWAY_VOLUME_MOUNT_PATH if set, otherwise use local data directory
const uploadsDir = db.getUploadsDir();
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Server accessible on all network interfaces`);
  console.log(`📦 Serving frontend from: ${frontendDist}`);
  console.log(`💾 Storage: ${process.env.DATABASE_URL ? 'PostgreSQL (Railway)' : 'File-based (Local)'}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});

