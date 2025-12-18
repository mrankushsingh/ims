import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { db } from '../utils/database.js';
import { uploadFile, deleteFile, isUsingBucketStorage } from '../utils/storage.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';

const memoryDb = db; // For backward compatibility

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Helper function to get user name from request (optional authentication)
async function getUserName(req: any): Promise<string> {
  try {
    // Try to get user from authenticated request
    if (req.user?.uid) {
      const user = await memoryDb.getUserByFirebaseUid(req.user.uid);
      return user?.name || user?.email || req.user.email || req.user.name || 'Unknown User';
    }
  } catch (error) {
    console.error('Error getting user name:', error);
  }
  return 'Unknown User';
}

// Configure multer for file uploads
// Use memory storage if Railway bucket is configured, otherwise use disk storage
const storage = isUsingBucketStorage()
  ? multer.memoryStorage()
  : multer.diskStorage({
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

// Allowed file types for uploads
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Validate file type
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: PDF, images, Word, Excel`));
    }
  }
});

router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, parentName, email, phone, caseTemplateId, totalFee, details } = req.body;
    
    // Validation
    if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
      return res.status(400).json({ error: 'First name is required and must be a non-empty string' });
    }
    
    if (!lastName || typeof lastName !== 'string' || !lastName.trim()) {
      return res.status(400).json({ error: 'Last name is required and must be a non-empty string' });
    }
    
    // Validate email format if provided
    if (email && typeof email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }
    
    // Validate totalFee if provided
    if (totalFee !== undefined && (isNaN(Number(totalFee)) || Number(totalFee) < 0)) {
      return res.status(400).json({ error: 'Total fee must be a non-negative number' });
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
            isOptional: false, // Default to required, can be changed per client
          }));
        }
      }
    }

    const client = await memoryDb.insertClient({
      first_name: firstName,
      last_name: lastName,
      parent_name: parentName || null,
      email: email || null,
      phone: phone || null,
      case_template_id: caseTemplateId || null,
      case_type: caseType,
      details: details || null,
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
      justificante_presentacion: [],
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
router.post('/:id/documents/:documentCode', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or file upload failed' });
    }

    // Get user name (optional - will use 'Unknown User' if not authenticated)
    const userName = await getUserName(req);

    const file = req.file; // Store in const for TypeScript narrowing
    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Generate unique filename or use multer-generated filename
    let fileName: string;
    let fileUrl: string;
    
    if (isUsingBucketStorage() && file.buffer) {
      // Railway bucket: generate filename and upload from buffer
      const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
      const ext = extname(file.originalname);
      const name = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
      fileName = `${name}_${uniqueSuffix}${ext}`;
      
      // Upload to Railway bucket
      fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);
    } else {
      // Local filesystem: multer already saved the file, just use the filename
      fileName = file.filename || file.originalname;
      fileUrl = `/uploads/${fileName}`;
    }

    // Delete old file if exists
    const updatedDocuments = client.required_documents.map((doc: any) => {
      if (doc.code === req.params.documentCode) {
        if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
          deleteFile(doc.fileUrl).catch(err => {
            console.error('Error deleting old file:', err);
          });
        }
        return {
          ...doc,
          submitted: true,
          fileUrl: fileUrl,
          uploadedAt: new Date().toISOString(),
          fileName: file.originalname,
          fileSize: file.size,
          uploadedBy: userName,
        };
      }
      return doc;
    });

    const updated = await memoryDb.updateClient(req.params.id, {
      required_documents: updatedDocuments,
    });

    res.json(updated);
  } catch (error: any) {
    // Handle multer errors (file size, file type, etc.)
    if (error.message && error.message.includes('File type')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message && error.message.includes('File too large')) {
      return res.status(400).json({ error: 'File size exceeds 50MB limit' });
    }
    res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
});

// Upload additional document
router.post('/:id/additional-documents', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or file upload failed' });
    }

    // Get user name (optional - will use 'Unknown User' if not authenticated)
    const userName = await getUserName(req);

    const file = req.file; // Store in const for TypeScript narrowing
    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Generate unique filename or use multer-generated filename
    let fileName: string;
    let fileUrl: string;
    
    if (isUsingBucketStorage() && file.buffer) {
      // Railway bucket: generate filename and upload from buffer
      const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
      const ext = extname(file.originalname);
      const name = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
      fileName = `${name}_${uniqueSuffix}${ext}`;
      
      // Upload to Railway bucket
      fileUrl = await uploadFile(file.buffer, fileName, file.mimetype);
    } else {
      // Local filesystem: multer already saved the file, just use the filename
      fileName = file.filename || file.originalname;
      fileUrl = `/uploads/${fileName}`;
    }

    const newDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: req.body.name || file.originalname,
      description: req.body.description || undefined,
      fileUrl: fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userName,
    };

    const updatedAdditionalDocs = [...(client.additional_documents || []), newDocument];
    const updated = await memoryDb.updateClient(req.params.id, {
      additional_documents: updatedAdditionalDocs,
    });

    res.json(updated);
  } catch (error: any) {
    // Handle multer errors (file size, file type, etc.)
    if (error.message && error.message.includes('File type')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message && error.message.includes('File too large')) {
      return res.status(400).json({ error: 'File size exceeds 50MB limit' });
    }
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
        // Delete file if exists (Railway bucket or local filesystem)
        if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
          deleteFile(doc.fileUrl).catch(err => {
            console.error('Error deleting file:', err);
          });
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
      // Delete file (Railway bucket or local filesystem)
      deleteFile(docToRemove.fileUrl).catch(err => {
        console.error('Error deleting file:', err);
      });
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

// Add requested document (only for submitted clients)
router.post('/:id/requested-documents', async (req, res) => {
  try {
    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (!client.submitted_to_immigration) {
      return res.status(400).json({ error: 'Client must be submitted to immigration before adding requested documents' });
    }

    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Document name is required' });
    }

    const requestedDocs = client.requested_documents || [];
    const code = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newDoc = {
      code,
      name: name.trim(),
      description: description?.trim() || undefined,
      submitted: false,
      requestedAt: new Date().toISOString(),
    };

    requestedDocs.push(newDoc);

    const updated = await memoryDb.updateClient(req.params.id, {
      requested_documents: requestedDocs,
    } as any);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to add requested document' });
  }
});

// Upload file for requested document
router.post('/:id/requested-documents/:code/upload', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get user name (optional - will use 'Unknown User' if not authenticated)
    const userName = await getUserName(req);

    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (!client.submitted_to_immigration) {
      return res.status(400).json({ error: 'Client must be submitted to immigration' });
    }

    const requestedDocs = client.requested_documents || [];
    const docIndex = requestedDocs.findIndex((d: any) => d.code === req.params.code);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Requested document not found' });
    }

    const file = req.file;
    let fileUrl: string;
    let fileName: string;

    if (isUsingBucketStorage()) {
      // Railway bucket: use file buffer
      const ext = extname(file.originalname);
      const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
      const name = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
      fileName = `${name}_${uniqueSuffix}${ext}`;
      
      // Upload to Railway bucket
      fileUrl = await uploadFile(file.buffer, `clients/${req.params.id}/requested/${fileName}`, file.mimetype);
    } else {
      // Local filesystem: multer already saved the file, just use the filename
      fileName = file.filename || file.originalname;
      fileUrl = `/uploads/${fileName}`;
    }

    // Delete old file if exists
    const oldDoc = requestedDocs[docIndex];
    if (oldDoc.fileUrl && oldDoc.fileUrl.startsWith('/uploads/')) {
      deleteFile(oldDoc.fileUrl).catch(err => {
        console.error('Error deleting old file:', err);
      });
    }

    requestedDocs[docIndex] = {
      ...requestedDocs[docIndex],
      submitted: true,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userName,
    };

    const updated = await memoryDb.updateClient(req.params.id, {
      requested_documents: requestedDocs,
    } as any);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to upload requested document' });
  }
});

// Remove requested document
router.delete('/:id/requested-documents/:code', async (req, res) => {
  try {
    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const requestedDocs = (client.requested_documents || []).filter(
      (d: any) => d.code !== req.params.code
    );

    const docToRemove = client.requested_documents?.find((d: any) => d.code === req.params.code);
    if (docToRemove && docToRemove.fileUrl && docToRemove.fileUrl.startsWith('/uploads/')) {
      deleteFile(docToRemove.fileUrl).catch(err => {
        console.error('Error deleting file:', err);
      });
    }

    const updated = await memoryDb.updateClient(req.params.id, {
      requested_documents: requestedDocs,
    } as any);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to remove requested document' });
  }
});

// Set requested documents reminder duration
router.put('/:id/requested-documents-reminder-duration', async (req, res) => {
  try {
    const { durationDays } = req.body;
    if (!durationDays || typeof durationDays !== 'number' || durationDays < 1 || durationDays > 365) {
      return res.status(400).json({ error: 'Duration must be between 1 and 365 days' });
    }

    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (!client.submitted_to_immigration) {
      return res.status(400).json({ error: 'Client must be submitted to immigration' });
    }

    const updated = await memoryDb.updateClient(req.params.id, {
      requested_documents_reminder_duration_days: durationDays,
    } as any);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update reminder duration' });
  }
});

// Update last reminder date for requested documents
router.put('/:id/requested-documents-last-reminder', async (req, res) => {
  try {
    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const updated = await memoryDb.updateClient(req.params.id, {
      requested_documents_last_reminder_date: new Date().toISOString(),
    } as any);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update last reminder date' });
  }
});

// Helper function to handle document upload for different types
async function handleDocumentUpload(
  req: any,
  res: any,
  documentType: 'aportar_documentacion' | 'requerimiento' | 'resolucion' | 'justificante_presentacion'
) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Document name is required' });
    }

    // Get user name (optional - will use 'Unknown User' if not authenticated)
    const userName = await getUserName(req);

    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const documents = (client as any)[documentType] || [];
    const file = req.file;
    let fileUrl: string;
    let fileName: string;

    if (isUsingBucketStorage()) {
      const ext = extname(file.originalname);
      const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1E9)}`;
      const name = file.originalname.replace(ext, '').replace(/[^a-zA-Z0-9]/g, '_');
      fileName = `${name}_${uniqueSuffix}${ext}`;
      fileUrl = await uploadFile(file.buffer, `clients/${req.params.id}/${documentType}/${fileName}`, file.mimetype);
    } else {
      fileName = file.filename || file.originalname;
      fileUrl = `/uploads/${fileName}`;
    }

    const newDoc: any = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description ? description.trim() : undefined,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userName,
    };

    documents.push(newDoc);

    const updated = await memoryDb.updateClient(req.params.id, {
      [documentType]: documents,
    } as any);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || `Failed to upload ${documentType} document` });
  }
}

// Helper function to handle document removal for different types
async function handleDocumentRemove(
  req: any,
  res: any,
  documentType: 'aportar_documentacion' | 'requerimiento' | 'resolucion' | 'justificante_presentacion'
) {
  try {
    const client = await memoryDb.getClient(req.params.id);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const documents = ((client as any)[documentType] || []).filter(
      (d: any) => d.id !== req.params.docId
    );

    const docToRemove = ((client as any)[documentType] || []).find(
      (d: any) => d.id === req.params.docId
    );
    if (docToRemove && docToRemove.fileUrl) {
      if (docToRemove.fileUrl.startsWith('/uploads/')) {
        deleteFile(docToRemove.fileUrl).catch(err => {
          console.error('Error deleting file:', err);
        });
      } else if (isUsingBucketStorage()) {
        // Delete from bucket storage
        const key = docToRemove.fileUrl.split('/').slice(-3).join('/'); // Get the key from URL
        deleteFile(key).catch(err => {
          console.error('Error deleting file from bucket:', err);
        });
      }
    }

    const updated = await memoryDb.updateClient(req.params.id, {
      [documentType]: documents,
    } as any);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || `Failed to remove ${documentType} document` });
  }
}

// APORTAR DOCUMENTACIÓN routes
router.post('/:id/aportar-documentacion', upload.single('file'), (req: any, res) => 
  handleDocumentUpload(req, res, 'aportar_documentacion')
);
router.delete('/:id/aportar-documentacion/:docId', (req, res) => 
  handleDocumentRemove(req, res, 'aportar_documentacion')
);

// REQUERIMIENTO routes
router.post('/:id/requerimiento', upload.single('file'), (req: any, res) => 
  handleDocumentUpload(req, res, 'requerimiento')
);
router.delete('/:id/requerimiento/:docId', (req, res) => 
  handleDocumentRemove(req, res, 'requerimiento')
);

// RESOLUCIÓN routes
router.post('/:id/resolucion', upload.single('file'), (req: any, res) => 
  handleDocumentUpload(req, res, 'resolucion')
);
router.delete('/:id/resolucion/:docId', (req, res) => 
  handleDocumentRemove(req, res, 'resolucion')
);

// JUSTIFICANTE DE PRESENTACION routes
router.post('/:id/justificante-presentacion', upload.single('file'), (req: any, res) => 
  handleDocumentUpload(req, res, 'justificante_presentacion')
);
router.delete('/:id/justificante-presentacion/:docId', (req, res) => 
  handleDocumentRemove(req, res, 'justificante_presentacion')
);

export default router;

