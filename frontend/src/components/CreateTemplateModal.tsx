import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import { RequiredDocument, CaseTemplate } from '../types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  template?: CaseTemplate;
}

export default function CreateTemplateModal({ onClose, onSuccess, template }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reminderIntervalDays: '10',
    administrativeSilenceDays: '60',
  });
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        reminderIntervalDays: template.reminder_interval_days.toString(),
        administrativeSilenceDays: template.administrative_silence_days.toString(),
      });
      setRequiredDocuments(template.required_documents || []);
    }
  }, [template]);

  const addDocument = () => {
    setRequiredDocuments([
      ...requiredDocuments,
      {
        code: `DOC_${requiredDocuments.length + 1}`,
        name: '',
        description: '',
      },
    ]);
  };

  const removeDocument = (index: number) => {
    setRequiredDocuments(requiredDocuments.filter((_, i) => i !== index));
  };

  const updateDocument = (index: number, field: keyof RequiredDocument, value: string) => {
    const updated = [...requiredDocuments];
    updated[index] = { ...updated[index], [field]: value };
    setRequiredDocuments(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    const validDocuments = requiredDocuments.filter((doc) => doc.name.trim() !== '');

    setLoading(true);
    try {
      if (template) {
        // Edit mode
        await api.updateCaseTemplate(template.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          requiredDocuments: validDocuments,
          reminderIntervalDays: parseInt(formData.reminderIntervalDays) || 10,
          administrativeSilenceDays: parseInt(formData.administrativeSilenceDays) || 60,
        });
      } else {
        // Create mode
        await api.createCaseTemplate({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          requiredDocuments: validDocuments,
          reminderIntervalDays: parseInt(formData.reminderIntervalDays) || 10,
          administrativeSilenceDays: parseInt(formData.administrativeSilenceDays) || 60,
        });
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || (template ? 'Failed to update template' : 'Failed to create template'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{template ? 'Edit Template' : 'New Template'}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm animate-slide-down">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="e.g., Student Visa, Work Permit"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Optional description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Interval (days)
              </label>
              <input
                type="number"
                min="1"
                value={formData.reminderIntervalDays}
                onChange={(e) => setFormData({ ...formData, reminderIntervalDays: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Administrative Silence (days)
              </label>
              <input
                type="number"
                min="1"
                value={formData.administrativeSilenceDays}
                onChange={(e) =>
                  setFormData({ ...formData, administrativeSilenceDays: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">Required Documents</label>
              <button
                type="button"
                onClick={addDocument}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Document</span>
              </button>
            </div>

            {requiredDocuments.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                No documents added. Click "Add Document" to add required documents.
              </div>
            ) : (
              <div className="space-y-3">
                {requiredDocuments.map((doc, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Document Code
                          </label>
                          <input
                            type="text"
                            value={doc.code}
                            onChange={(e) => updateDocument(index, 'code', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g., PASSPORT"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Document Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={doc.name}
                            onChange={(e) => updateDocument(index, 'name', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g., Valid Passport"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Description (optional)
                      </label>
                      <input
                        type="text"
                        value={doc.description || ''}
                        onChange={(e) => updateDocument(index, 'description', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Optional description"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? (template ? 'Updating...' : 'Creating...') : (template ? 'Update Template' : 'Create Template')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

