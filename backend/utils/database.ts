import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool } = pg;

interface CaseTemplate {
  id: string;
  name: string;
  description?: string;
  required_documents: any[];
  reminder_interval_days: number;
  administrative_silence_days: number;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  parent_name?: string;
  email?: string;
  phone?: string;
  case_template_id?: string;
  case_type?: string;
  details?: string;
  required_documents: any[];
  reminder_interval_days: number;
  administrative_silence_days: number;
  payment: any;
  submitted_to_immigration: boolean;
  application_date?: string;
  notifications: any[];
  additional_docs_required: boolean;
  notes?: string;
  additional_documents?: any[];
  created_at: string;
  updated_at: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseAdapter {
  private pool: pg.Pool | null = null;
  private usePostgres: boolean = false;
  private dataDir: string;
  private templatesFile: string;
  private clientsFile: string;
  private uploadsDir: string;
  private templates: Map<string, CaseTemplate>;
  private clients: Map<string, Client>;
  private templateCounter: number = 0;
  private clientCounter: number = 0;

  constructor() {
    this.dataDir = join(__dirname, '../../data');
    this.templatesFile = join(this.dataDir, 'templates.json');
    this.clientsFile = join(this.dataDir, 'clients.json');
    this.uploadsDir = join(this.dataDir, 'uploads');
    
    this.templates = new Map();
    this.clients = new Map();

    // Check if DATABASE_URL is set (Railway provides this automatically)
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      this.usePostgres = true;
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
      this.initPostgres();
    } else {
      // Use file-based storage for local development
      this.initFileStorage();
    }
  }

  private async initPostgres() {
    if (!this.pool) return;

    try {
      // Create tables if they don't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS case_templates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          required_documents JSONB,
          reminder_interval_days INTEGER DEFAULT 10,
          administrative_silence_days INTEGER DEFAULT 60,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id VARCHAR(255) PRIMARY KEY,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          parent_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(255),
          case_template_id VARCHAR(255),
          case_type VARCHAR(255),
          details TEXT,
          required_documents JSONB,
          reminder_interval_days INTEGER DEFAULT 10,
          administrative_silence_days INTEGER DEFAULT 60,
          payment JSONB,
          submitted_to_immigration BOOLEAN DEFAULT FALSE,
          application_date TIMESTAMP,
          notifications JSONB,
          additional_docs_required BOOLEAN DEFAULT FALSE,
          notes TEXT,
          additional_documents JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ PostgreSQL database initialized');
    } catch (error) {
      console.error('❌ Error initializing PostgreSQL:', error);
      throw error;
    }
  }

  private initFileStorage() {
    // Ensure directories exist
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    if (!existsSync(this.uploadsDir)) {
      mkdirSync(this.uploadsDir, { recursive: true });
    }

    // Load existing data
    this.loadData();
    console.log('✅ File-based storage initialized');
  }

  private loadData() {
    try {
      // Load templates
      if (existsSync(this.templatesFile)) {
        const templatesData = JSON.parse(readFileSync(this.templatesFile, 'utf-8'));
        if (Array.isArray(templatesData)) {
          templatesData.forEach((template: CaseTemplate) => {
            this.templates.set(template.id, template);
            const match = template.id.match(/template_(\d+)_/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > this.templateCounter) this.templateCounter = num;
            }
          });
        }
      }

      // Load clients
      if (existsSync(this.clientsFile)) {
        const clientsData = JSON.parse(readFileSync(this.clientsFile, 'utf-8'));
        if (Array.isArray(clientsData)) {
          clientsData.forEach((client: Client) => {
            this.clients.set(client.id, client);
            const match = client.id.match(/client_(\d+)_/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > this.clientCounter) this.clientCounter = num;
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private saveTemplates() {
    if (this.usePostgres) return; // PostgreSQL handles persistence automatically
    try {
      const templatesArray = Array.from(this.templates.values());
      writeFileSync(this.templatesFile, JSON.stringify(templatesArray, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }

  private saveClients() {
    if (this.usePostgres) return; // PostgreSQL handles persistence automatically
    try {
      const clientsArray = Array.from(this.clients.values());
      writeFileSync(this.clientsFile, JSON.stringify(clientsArray, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving clients:', error);
    }
  }

  getUploadsDir(): string {
    // For Railway, use /data/uploads (Railway Volume mount point)
    // For local, use relative path
    let uploadsPath: string;
    if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
      uploadsPath = join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'uploads');
    } else {
      uploadsPath = this.uploadsDir;
    }
    
    // Ensure directory exists
    if (!existsSync(uploadsPath)) {
      mkdirSync(uploadsPath, { recursive: true });
    }
    
    return uploadsPath;
  }

  // Templates
  async insertTemplate(data: Omit<CaseTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<CaseTemplate> {
    const id = `template_${++this.templateCounter}_${Date.now()}`;
    const now = new Date().toISOString();
    const template: CaseTemplate = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };

    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO case_templates (id, name, description, required_documents, reminder_interval_days, administrative_silence_days, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          template.id,
          template.name,
          template.description || null,
          JSON.stringify(template.required_documents),
          template.reminder_interval_days,
          template.administrative_silence_days,
          template.created_at,
          template.updated_at,
        ]
      );
    } else {
      this.templates.set(id, template);
      this.saveTemplates();
    }

    return template;
  }

  async getTemplates(): Promise<CaseTemplate[]> {
    if (this.usePostgres && this.pool) {
      const result = await this.pool.query('SELECT * FROM case_templates ORDER BY created_at DESC');
      return result.rows.map((row: any) => ({
        ...row,
        required_documents: typeof row.required_documents === 'string' 
          ? JSON.parse(row.required_documents) 
          : row.required_documents,
      }));
    }
    return Array.from(this.templates.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getTemplate(id: string): Promise<CaseTemplate | null> {
    if (this.usePostgres && this.pool) {
      const result = await this.pool.query('SELECT * FROM case_templates WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        ...row,
        required_documents: typeof row.required_documents === 'string' 
          ? JSON.parse(row.required_documents) 
          : row.required_documents,
      };
    }
    return this.templates.get(id) || null;
  }

  async updateTemplate(id: string, data: Partial<CaseTemplate>): Promise<CaseTemplate | null> {
    if (this.usePostgres && this.pool) {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      if (data.required_documents !== undefined) {
        updates.push(`required_documents = $${paramCount++}`);
        values.push(JSON.stringify(data.required_documents));
      }
      if (data.reminder_interval_days !== undefined) {
        updates.push(`reminder_interval_days = $${paramCount++}`);
        values.push(data.reminder_interval_days);
      }
      if (data.administrative_silence_days !== undefined) {
        updates.push(`administrative_silence_days = $${paramCount++}`);
        values.push(data.administrative_silence_days);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      await this.pool.query(
        `UPDATE case_templates SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );

      return this.getTemplate(id);
    }

    const template = this.templates.get(id);
    if (!template) return null;
    const updated = { ...template, ...data, updated_at: new Date().toISOString() };
    this.templates.set(id, updated);
    this.saveTemplates();
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    if (this.usePostgres && this.pool) {
      const result = await this.pool.query('DELETE FROM case_templates WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    }

    const deleted = this.templates.delete(id);
    if (deleted) {
      this.saveTemplates();
    }
    return deleted;
  }

  // Clients
  async insertClient(data: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    const id = `client_${++this.clientCounter}_${Date.now()}`;
    const now = new Date().toISOString();
    const client: Client = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };

    if (this.usePostgres && this.pool) {
      await this.pool.query(
        `INSERT INTO clients (id, first_name, last_name, parent_name, email, phone, case_template_id, case_type, details,
         required_documents, reminder_interval_days, administrative_silence_days, payment, 
         submitted_to_immigration, application_date, notifications, additional_docs_required, 
         notes, additional_documents, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [
          client.id,
          client.first_name,
          client.last_name,
          client.parent_name || null,
          client.email || null,
          client.phone || null,
          client.case_template_id || null,
          client.case_type || null,
          client.details || null,
          JSON.stringify(client.required_documents),
          client.reminder_interval_days,
          client.administrative_silence_days,
          JSON.stringify(client.payment),
          client.submitted_to_immigration,
          client.application_date || null,
          JSON.stringify(client.notifications),
          client.additional_docs_required,
          client.notes || null,
          JSON.stringify(client.additional_documents || []),
          client.created_at,
          client.updated_at,
        ]
      );
    } else {
      this.clients.set(id, client);
      this.saveClients();
    }

    return client;
  }

  async getClients(): Promise<Client[]> {
    if (this.usePostgres && this.pool) {
      const result = await this.pool.query('SELECT * FROM clients ORDER BY created_at DESC');
      return result.rows.map((row: any) => this.parseClientRow(row));
    }
    return Array.from(this.clients.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getClient(id: string): Promise<Client | null> {
    if (this.usePostgres && this.pool) {
      const result = await this.pool.query('SELECT * FROM clients WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.parseClientRow(result.rows[0]);
    }
    return this.clients.get(id) || null;
  }

  private parseClientRow(row: any): Client {
    return {
      ...row,
      required_documents: typeof row.required_documents === 'string' 
        ? JSON.parse(row.required_documents) 
        : row.required_documents,
      payment: typeof row.payment === 'string' 
        ? JSON.parse(row.payment) 
        : row.payment,
      notifications: typeof row.notifications === 'string' 
        ? JSON.parse(row.notifications) 
        : row.notifications,
      additional_documents: typeof row.additional_documents === 'string' 
        ? JSON.parse(row.additional_documents) 
        : row.additional_documents,
      application_date: row.application_date ? row.application_date.toISOString() : undefined,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client | null> {
    if (this.usePostgres && this.pool) {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      const fields: { [key: string]: any } = {
        first_name: data.first_name,
        last_name: data.last_name,
        parent_name: data.parent_name,
        email: data.email,
        phone: data.phone,
        case_template_id: data.case_template_id,
        case_type: data.case_type,
        details: data.details,
        required_documents: data.required_documents,
        reminder_interval_days: data.reminder_interval_days,
        administrative_silence_days: data.administrative_silence_days,
        payment: data.payment,
        submitted_to_immigration: data.submitted_to_immigration,
        application_date: data.application_date,
        notifications: data.notifications,
        additional_docs_required: data.additional_docs_required,
        notes: data.notes,
        additional_documents: data.additional_documents,
      };

      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          updates.push(`${key} = $${paramCount++}`);
          if (['required_documents', 'payment', 'notifications', 'additional_documents'].includes(key)) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
        }
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      await this.pool.query(
        `UPDATE clients SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );

      return this.getClient(id);
    }

    const client = this.clients.get(id);
    if (!client) return null;
    const updated = { ...client, ...data, updated_at: new Date().toISOString() };
    this.clients.set(id, updated);
    this.saveClients();
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    const client = await this.getClient(id);
    if (client) {
      // Delete associated files
      try {
        const { unlinkSync, existsSync } = await import('fs');
        const { join } = await import('path');
        const uploadsDir = this.getUploadsDir();

        // Delete required document files
        if (client.required_documents) {
          for (const doc of client.required_documents) {
            if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
              const filePath = join(uploadsDir, doc.fileUrl.replace('/uploads/', ''));
              if (existsSync(filePath)) {
                unlinkSync(filePath);
              }
            }
          }
        }
        // Delete additional document files
        if (client.additional_documents) {
          for (const doc of client.additional_documents) {
            if (doc.fileUrl && doc.fileUrl.startsWith('/uploads/')) {
              const filePath = join(uploadsDir, doc.fileUrl.replace('/uploads/', ''));
              if (existsSync(filePath)) {
                unlinkSync(filePath);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error deleting client files:', error);
      }
    }

    if (this.usePostgres && this.pool) {
      const result = await this.pool.query('DELETE FROM clients WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    }

    const deleted = this.clients.delete(id);
    if (deleted) {
      this.saveClients();
    }
    return deleted;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

export const db = new DatabaseAdapter();

