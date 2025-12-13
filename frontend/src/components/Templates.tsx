import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, FileText } from 'lucide-react';
import { api } from '../utils/api';
import { CaseTemplate } from '../types';
import CreateTemplateModal from './CreateTemplateModal';
import ConfirmDialog from './ConfirmDialog';
import { showToast } from './Toast';

export default function Templates() {
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CaseTemplate | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ templateId: string | null; templateName: string; isOpen: boolean }>({ templateId: null, templateName: '', isOpen: false });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.getCaseTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    const template = templates.find(t => t.id === id);
    setDeleteConfirm({ templateId: id, templateName: template?.name || '', isOpen: true });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.templateId) return;
    
    try {
      await api.deleteCaseTemplate(deleteConfirm.templateId);
      await loadTemplates();
      showToast(`Template "${deleteConfirm.templateName}" deleted successfully`, 'success');
      setDeleteConfirm({ templateId: null, templateName: '', isOpen: false });
    } catch (error) {
      showToast('Failed to delete template', 'error');
      setDeleteConfirm({ templateId: null, templateName: '', isOpen: false });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-amber-200/50 pb-4 sm:pb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 bg-clip-text text-transparent mb-2 tracking-tight">Case Templates</h2>
          <p className="text-amber-700/80 text-base sm:text-lg font-medium">Create and manage case templates</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-amber-900 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 w-full sm:w-auto"
          style={{ boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)' }}
        >
          <Plus className="w-5 h-5" />
          <span>New Template</span>
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="glass-gold rounded-xl sm:rounded-2xl p-8 sm:p-16 text-center animate-scale-in">
          <div className="bg-gradient-to-br from-amber-100 to-amber-200 w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
            <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-amber-800" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-800 to-amber-700 bg-clip-text text-transparent mb-2">No templates yet</h3>
          <p className="text-amber-700/70 mb-6 sm:mb-8 text-base sm:text-lg font-medium">Create your first template to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 text-amber-900 px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold hover:shadow-2xl transition-all shadow-xl"
            style={{ boxShadow: '0 4px 20px rgba(245, 158, 11, 0.4)' }}
          >
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {templates.map((template, index) => (
            <div
              key={template.id}
              className="glass-gold rounded-xl sm:rounded-2xl p-4 sm:p-6 glass-hover animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-amber-900 mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-amber-700/70 line-clamp-2 font-medium">{template.description}</p>
                  )}
                </div>
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                    title="Edit template"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-amber-200/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-amber-700/80">Documents</span>
                  <span className="text-sm font-bold text-amber-900 bg-gradient-to-r from-amber-100 to-amber-200 px-3 py-1 rounded-lg shadow-md">
                    {template.required_documents.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-amber-700/80">Reminder Interval</span>
                  <span className="text-sm font-semibold text-amber-800">
                    {template.reminder_interval_days} days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-amber-700/80">Admin Silence</span>
                  <span className="text-sm font-semibold text-amber-800">
                    {template.administrative_silence_days} days
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadTemplates();
          }}
        />
      )}

      {editingTemplate && (
        <CreateTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSuccess={() => {
            setEditingTemplate(null);
            loadTemplates();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Template"
        message={deleteConfirm.templateName ? `Are you sure you want to delete the template "${deleteConfirm.templateName}"? This action cannot be undone.` : 'Are you sure you want to delete this template?'}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ templateId: null, templateName: '', isOpen: false })}
      />
    </div>
  );
}

