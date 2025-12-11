import { Router } from 'express';
import { db } from '../utils/database.js';
const memoryDb = db; // For backward compatibility

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, description, requiredDocuments, reminderIntervalDays, administrativeSilenceDays } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
    }
    
    // Validate reminder interval
    if (reminderIntervalDays !== undefined) {
      const interval = Number(reminderIntervalDays);
      if (isNaN(interval) || interval < 1 || interval > 365) {
        return res.status(400).json({ error: 'Reminder interval must be between 1 and 365 days' });
      }
    }
    
    // Validate administrative silence days
    if (administrativeSilenceDays !== undefined) {
      const days = Number(administrativeSilenceDays);
      if (isNaN(days) || days < 1 || days > 3650) {
        return res.status(400).json({ error: 'Administrative silence days must be between 1 and 3650 days' });
      }
    }
    
    // Validate required documents array
    if (requiredDocuments !== undefined && !Array.isArray(requiredDocuments)) {
      return res.status(400).json({ error: 'Required documents must be an array' });
    }

    const template = await memoryDb.insertTemplate({
      name: name.trim(),
      description: description?.trim() || undefined,
      required_documents: Array.isArray(requiredDocuments) ? requiredDocuments : [],
      reminder_interval_days: Number(reminderIntervalDays) || 10,
      administrative_silence_days: Number(administrativeSilenceDays) || 60,
    });

    res.status(201).json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create template' });
  }
});

router.get('/', async (req, res) => {
  try {
    const templates = await memoryDb.getTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch templates' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const template = await memoryDb.getTemplate(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch template' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, requiredDocuments, reminderIntervalDays, administrativeSilenceDays } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (requiredDocuments !== undefined) updateData.required_documents = requiredDocuments;
    if (reminderIntervalDays !== undefined) updateData.reminder_interval_days = reminderIntervalDays;
    if (administrativeSilenceDays !== undefined) updateData.administrative_silence_days = administrativeSilenceDays;
    
    const template = await memoryDb.updateTemplate(req.params.id, updateData);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update template' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await memoryDb.deleteTemplate(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Template not found' });
    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete template' });
  }
});

export default router;

