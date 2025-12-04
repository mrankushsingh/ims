import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { unlinkSync, existsSync } from 'fs';
import { db } from '../utils/database.js';
const memoryDb = db; // For backward compatibility

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, memoryDb.getUploadsDir());
  },
  filename: (req, file, cb) => {
    // Generate unique filename: clientId_documentCode_timestamp.ext
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
    const ext = extname(file.originalname);
    const name = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Accept all file types
    cb(null, true);
  }
});

router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, caseTemplateId, totalFee } = req.body;
    
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    let requiredDocs: any[] = [];
    let caseType = '';
    let reminderInterval = 10;
    let adminSilenceDays = 60;

    if (caseTemplateId) {
      const template = await memoryDb.getTemplate(caseTemplateId);
      if (template) {
        caseType = template.name;
        reminderInterval = template.reminder_interval_days;
        adminSilenceDays = template.administrative_silence_days;
        if (Array.isArray(template.required_documents)) {
          requiredDocs = template.required_documents.map((doc: any) => ({
            code: doc.code,
            name: doc.name,
            description: doc.description || '',
            submitted: false,
            fileUrl: null,
            uploadedAt: null,
          }));
        }
      }
    }

    const client = await memoryDb.insertClient({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      case_template_id: caseTemplateId || null,
      case_type: caseType,
      required_documents: requiredDocs,
      reminder_interval_days: reminderInterval,
      administrative_silence_days: adminSilenceDays,
      payment: {
        totalFee: totalFee || 0,
        paidAmount: 0,
        payments: [],
      },
      submitted_to_immigration: false,
      notifications: [],
      additional_docs_required: false,
      notes: '',
      additional_documents: [],
    });

    res.status(201).json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create client' });
  }
});

router.get('/', async (req, res) => {
  try {
    const clients = await memoryDb.getClients();
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch clients' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const client = await memoryDb.getClient(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch client' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const client = await memoryDb.updateClient(req.params.id, req.body);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update client' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await memoryDb.deleteClient(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete client' });
  }
});

// Upload required document
router.post('/:id/documents/:documentCode', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file; // Store in const for TypeScript narrowing
    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const fileUrl = `/uploads/${file.filename}`;
    const updatedDocuments = client.required_documents.map((doc: any) => {
      if (doc.code === req.params.documentCode) {
        // Delete old file if exists
        if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
          const dataDir = join(__dirname, '../../data');
          const oldFilePath = join(dataDir, doc.fileUrl);
          try {
            if (existsSync(oldFilePath)) {
              unlinkSync(oldFilePath);
            }
          } catch (err) {
            console.error('Error deleting old file:', err);
          }
        }
        return {
          ...doc,
          submitted: true,
          fileUrl: fileUrl,
          uploadedAt: new Date().toISOString(),
          fileName: file.originalname,
          fileSize: file.size,
        };
      }
      return doc;
    });

    const updated = await memoryDb.updateClient(req.params.id, {
      required_documents: updatedDocuments,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
});

// Upload additional document
router.post('/:id/additional-documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file; // Store in const for TypeScript narrowing
    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const fileUrl = `/uploads/${file.filename}`;
    const newDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: req.body.name || file.originalname,
      description: req.body.description || undefined,
      fileUrl: fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
    };

    const updatedAdditionalDocs = [...(client.additional_documents || []), newDocument];
    const updated = await memoryDb.updateClient(req.params.id, {
      additional_documents: updatedAdditionalDocs,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to upload additional document' });
  }
});

// Remove required document
router.delete('/:id/documents/:documentCode', async (req, res) => {
  try {
    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const updatedDocuments = client.required_documents.map((doc: any) => {
      if (doc.code === req.params.documentCode) {
        // Delete file if exists
        if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
          const dataDir = join(__dirname, '../../data');
          const filePath = join(dataDir, doc.fileUrl);
          try {
            if (existsSync(filePath)) {
              unlinkSync(filePath);
            }
          } catch (err) {
            console.error('Error deleting file:', err);
          }
        }
        return {
          ...doc,
          submitted: false,
          fileUrl: null,
          uploadedAt: null,
          fileName: null,
          fileSize: null,
        };
      }
      return doc;
    });

    const updated = await memoryDb.updateClient(req.params.id, {
      required_documents: updatedDocuments,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to remove document' });
  }
});

// Remove additional document
router.delete('/:id/additional-documents/:documentId', async (req, res) => {
  try {
    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const docToRemove = client.additional_documents?.find((doc: any) => doc.id === req.params.documentId);
    if (docToRemove && docToRemove.fileUrl && docToRemove.fileUrl.startsWith('/uploads/')) {
      // Delete file
      const dataDir = join(__dirname, '../../data');
      const filePath = join(dataDir, docToRemove.fileUrl);
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }

    const updatedAdditionalDocs = (client.additional_documents || []).filter(
      (doc: any) => doc.id !== req.params.documentId
    );

    const updated = await memoryDb.updateClient(req.params.id, {
      additional_documents: updatedAdditionalDocs,
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to remove additional document' });
  }
});

export default router;

