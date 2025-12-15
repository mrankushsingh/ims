import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, FileText, Download, Trash2, Plus, DollarSign, StickyNote, Archive, XCircle, AlertCircle, Send, Clock, Eye, ToggleLeft, ToggleRight, Calendar } from 'lucide-react';
import JSZip from 'jszip';
import { api } from '../utils/api';
import { Client, RequiredDocument, AdditionalDocument, RequestedDocument } from '../types';
import ConfirmDialog from './ConfirmDialog';
import { showToast } from './Toast';

interface Props {
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClientDetailsModal({ client, onClose, onSuccess }: Props) {
  const [clientData, setClientData] = useState<Client>(client);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAdditionalDocForm, setShowAdditionalDocForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash', note: '' });
  const [additionalDocForm, setAdditionalDocForm] = useState({ name: '', description: '', file: null as File | null });
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [notes, setNotes] = useState(client.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [details, setDetails] = useState(client.details || '');
  const [savingDetails, setSavingDetails] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ url: string; fileName: string } | null>(null);
  const [customReminderDate, setCustomReminderDate] = useState(client.custom_reminder_date || '');
  const [savingReminder, setSavingReminder] = useState(false);
  const [showReminderCalendar, setShowReminderCalendar] = useState(false);
  const [tempReminderDate, setTempReminderDate] = useState('');
  const [showRequestedDocForm, setShowRequestedDocForm] = useState(false);
  const [requestedDocForm, setRequestedDocForm] = useState({ name: '', description: '' });
  const [uploadingRequestedDoc, setUploadingRequestedDoc] = useState<string | null>(null);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [durationDays, setDurationDays] = useState(client.requested_documents_reminder_duration_days || 10);
  const [showAportarDocForm, setShowAportarDocForm] = useState(false);
  const [aportarDocForm, setAportarDocForm] = useState({ name: '', description: '', file: null as File | null });
  const [showRequerimientoForm, setShowRequerimientoForm] = useState(false);
  const [requerimientoForm, setRequerimientoForm] = useState({ name: '', description: '', file: null as File | null });
  const [showResolucionForm, setShowResolucionForm] = useState(false);
  const [resolucionForm, setResolucionForm] = useState({ name: '', description: '', file: null as File | null });
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {},
  });

  useEffect(() => {
    loadClient();
    loadCurrentUser();
  }, [client.id]);

  const loadCurrentUser = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUserName(user.name || user.email || '');
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  useEffect(() => {
    setNotes(clientData.notes || '');
    setDetails(clientData.details || '');
    setCustomReminderDate(clientData.custom_reminder_date || '');
  }, [clientData.notes, clientData.details, clientData.custom_reminder_date]);

  const loadClient = async () => {
    try {
      const data = await api.getClient(client.id);
      setClientData(data);
    } catch (error) {
      console.error('Failed to load client:', error);
    }
  };

  const handleFileUpload = async (documentCode: string, file: File) => {
    setError('');
    if (!currentUserName.trim()) {
      setError('User account information not available');
      showToast('Unable to identify user account. Please refresh the page.', 'error');
      return;
    }
    setUploading(documentCode);

    try {
      await api.uploadDocument(client.id, documentCode, file, currentUserName);
      await loadClient();
      onSuccess();
      showToast('Document uploaded successfully', 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload document';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveDocument = async (documentCode: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Document',
      message: 'Are you sure you want to remove this document?',
      type: 'warning',
      onConfirm: async () => {
        setError('');
        try {
          await api.removeDocument(client.id, documentCode);
          await loadClient();
          onSuccess();
          showToast('Document removed successfully', 'success');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: any) {
          setError(error.message || 'Failed to remove document');
          showToast(error.message || 'Failed to remove document', 'error');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
    });
  };

  const handleToggleOptional = async (documentCode: string, currentOptional: boolean) => {
    setError('');
    try {
      const updatedDocuments = clientData.required_documents.map((doc: any) => {
        if (doc.code === documentCode) {
          return {
            ...doc,
            isOptional: !currentOptional,
          };
        }
        return doc;
      });

      await api.updateClient(client.id, {
        required_documents: updatedDocuments,
      });
      await loadClient();
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to update document');
    }
  };

  const handleAddRequestedDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!requestedDocForm.name.trim()) {
      setError('Document name is required');
      return;
    }
    try {
      await api.addRequestedDocument(client.id, {
        name: requestedDocForm.name.trim(),
        description: requestedDocForm.description.trim() || undefined,
      });
      setRequestedDocForm({ name: '', description: '' });
      setShowRequestedDocForm(false);
      await loadClient();
      onSuccess();
      showToast('Requested document added successfully', 'success');
    } catch (error: any) {
      setError(error.message || 'Failed to add requested document');
      showToast(error.message || 'Failed to add requested document', 'error');
    }
  };

  const handleUploadRequestedDocument = async (documentCode: string, file: File) => {
    setError('');
    if (!currentUserName.trim()) {
      setError('User account information not available');
      showToast('Unable to identify user account. Please refresh the page.', 'error');
      return;
    }
    setUploadingRequestedDoc(documentCode);
    try {
      await api.uploadRequestedDocument(client.id, documentCode, file, currentUserName);
      await loadClient();
      onSuccess();
      showToast('Requested document uploaded successfully', 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload requested document';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setUploadingRequestedDoc(null);
    }
  };

  const handleRemoveRequestedDocument = async (documentCode: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Requested Document',
      message: 'Are you sure you want to remove this requested document?',
      type: 'warning',
      onConfirm: async () => {
        setError('');
        try {
          await api.removeRequestedDocument(client.id, documentCode);
          await loadClient();
          onSuccess();
          showToast('Requested document removed successfully', 'success');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: any) {
          setError(error.message || 'Failed to remove requested document');
          showToast(error.message || 'Failed to remove requested document', 'error');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
    });
  };

  const handleUploadAportarDocumentacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!aportarDocForm.name.trim()) {
      setError('Document name is required');
      return;
    }

    if (!aportarDocForm.file) {
      setError('Please select a file');
      return;
    }

    if (!currentUserName.trim()) {
      setError('User account information not available');
      showToast('Unable to identify user account. Please refresh the page.', 'error');
      return;
    }

    setUploading('aportar');
    try {
      await api.uploadAportarDocumentacion(
        client.id,
        aportarDocForm.name,
        aportarDocForm.description,
        aportarDocForm.file,
        currentUserName
      );
      setAportarDocForm({ name: '', description: '', file: null });
      setShowAportarDocForm(false);
      await loadClient();
      onSuccess();
      showToast('Document uploaded successfully', 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload document';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveAportarDocumentacion = async (documentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Document',
      message: 'Are you sure you want to remove this document?',
      type: 'warning',
      onConfirm: async () => {
        setError('');
        try {
          await api.removeAportarDocumentacion(client.id, documentId);
          await loadClient();
          onSuccess();
          showToast('Document removed successfully', 'success');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: any) {
          setError(error.message || 'Failed to remove document');
          showToast(error.message || 'Failed to remove document', 'error');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
    });
  };


  const handleUploadRequerimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!requerimientoForm.name.trim()) {
      setError('Document name is required');
      return;
    }

    if (!requerimientoForm.file) {
      setError('Please select a file');
      return;
    }

    if (!currentUserName.trim()) {
      setError('User account information not available');
      showToast('Unable to identify user account. Please refresh the page.', 'error');
      return;
    }

    setUploading('requerimiento');
    try {
      await api.uploadRequerimiento(
        client.id,
        requerimientoForm.name,
        requerimientoForm.description,
        requerimientoForm.file,
        currentUserName
      );
      setRequerimientoForm({ name: '', description: '', file: null });
      setShowRequerimientoForm(false);
      await loadClient();
      onSuccess();
      showToast('Document uploaded successfully', 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload document';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveRequerimiento = async (documentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Document',
      message: 'Are you sure you want to remove this document?',
      type: 'warning',
      onConfirm: async () => {
        setError('');
        try {
          await api.removeRequerimiento(client.id, documentId);
          await loadClient();
          onSuccess();
          showToast('Document removed successfully', 'success');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: any) {
          setError(error.message || 'Failed to remove document');
          showToast(error.message || 'Failed to remove document', 'error');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
    });
  };

  const handleUploadResolucion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!resolucionForm.name.trim()) {
      setError('Document name is required');
      return;
    }

    if (!resolucionForm.file) {
      setError('Please select a file');
      return;
    }

    if (!currentUserName.trim()) {
      setError('User account information not available');
      showToast('Unable to identify user account. Please refresh the page.', 'error');
      return;
    }

    setUploading('resolucion');
    try {
      await api.uploadResolucion(
        client.id,
        resolucionForm.name,
        resolucionForm.description,
        resolucionForm.file,
        currentUserName
      );
      setResolucionForm({ name: '', description: '', file: null });
      setShowResolucionForm(false);
      await loadClient();
      onSuccess();
      showToast('Document uploaded successfully', 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload document';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveResolucion = async (documentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Document',
      message: 'Are you sure you want to remove this document?',
      type: 'warning',
      onConfirm: async () => {
        setError('');
        try {
          await api.removeResolucion(client.id, documentId);
          await loadClient();
          onSuccess();
          showToast('Document removed successfully', 'success');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: any) {
          setError(error.message || 'Failed to remove document');
          showToast(error.message || 'Failed to remove document', 'error');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
    });
  };

  const handleSetReminderDuration = async () => {
    setError('');
    if (!durationDays || durationDays < 1 || durationDays > 365) {
      setError('Duration must be between 1 and 365 days');
      return;
    }
    try {
      await api.setRequestedDocumentsReminderDuration(client.id, durationDays);
      setShowDurationModal(false);
      await loadClient();
      onSuccess();
      showToast('Reminder duration updated successfully', 'success');
    } catch (error: any) {
      setError(error.message || 'Failed to update reminder duration');
      showToast(error.message || 'Failed to update reminder duration', 'error');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      await api.addPayment(client.id, amount, paymentForm.method, paymentForm.note);
      setPaymentForm({ amount: '', method: 'Cash', note: '' });
      setShowPaymentForm(false);
      await loadClient();
      
      // Check if payment is complete and clear reminder if so
      const updatedClient = await api.getClient(client.id);
      const remainingAmount = (updatedClient.payment?.totalFee || 0) - (updatedClient.payment?.paidAmount || 0);
      if (remainingAmount <= 0 && updatedClient.custom_reminder_date) {
        // Clear the reminder date since payment is complete
        await api.updateClient(client.id, { custom_reminder_date: null });
        setCustomReminderDate('');
      }
      
      await loadClient();
      onSuccess();
      showToast(`Payment of €${amount} added successfully`, 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to add payment';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setError('');
    try {
      await api.updateNotes(client.id, notes);
      await loadClient();
      onSuccess();
      showToast('Notes saved successfully', 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save notes';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    setError('');
    try {
      await api.updateClient(client.id, { details });
      await loadClient();
      onSuccess();
      showToast('Details saved successfully', 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save details';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSavingDetails(false);
    }
  };


  const handleOpenReminderCalendar = () => {
    setTempReminderDate(customReminderDate || '');
    setShowReminderCalendar(true);
  };

  const handleSaveReminderFromCalendar = async () => {
    if (!tempReminderDate) {
      setError('Please select a date');
      return;
    }
    setSavingReminder(true);
    setError('');
    try {
      await api.updateClient(client.id, { custom_reminder_date: tempReminderDate });
      setCustomReminderDate(tempReminderDate);
      setShowReminderCalendar(false);
      await loadClient();
      onSuccess();
      showToast('Payment reminder saved successfully', 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save reminder date';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleUploadAdditionalDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!additionalDocForm.name.trim()) {
      setError('Document name is required');
      return;
    }

    if (!additionalDocForm.file) {
      setError('Please select a file');
      return;
    }

    if (!currentUserName.trim()) {
      setError('User account information not available');
      showToast('Unable to identify user account. Please refresh the page.', 'error');
      return;
    }

    setUploading('additional');
    try {
      await api.uploadAdditionalDocument(
        client.id,
        additionalDocForm.name,
        additionalDocForm.description,
        additionalDocForm.file,
        currentUserName
      );
      setAdditionalDocForm({ name: '', description: '', file: null });
      setShowAdditionalDocForm(false);
      await loadClient();
      onSuccess();
      showToast('Additional document uploaded successfully', 'success');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload document';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveAdditionalDocument = async (documentId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Document',
      message: 'Are you sure you want to remove this document?',
      type: 'warning',
      onConfirm: async () => {
        setError('');
        try {
          await api.removeAdditionalDocument(client.id, documentId);
          await loadClient();
          onSuccess();
          showToast('Document removed successfully', 'success');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: any) {
          setError(error.message || 'Failed to remove document');
          showToast(error.message || 'Failed to remove document', 'error');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
    });
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const handleViewDocument = (fileUrl: string, fileName: string) => {
    // Handle relative URLs (if fileUrl starts with /uploads, it's relative to the server)
    let url = fileUrl;
    if (fileUrl.startsWith('/uploads/')) {
      // For relative paths, use the current origin
      url = window.location.origin + fileUrl;
    }
    // Show document in modal
    setViewingDocument({ url, fileName });
  };

  const handleDownloadAllAsZip = async () => {
    setDownloadingZip(true);
    setError('');

    try {
      const zip = new JSZip();
      const clientName = `${clientData.first_name}_${clientData.last_name}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      // Collect all submitted required documents
      const submittedRequiredDocs = clientData.required_documents?.filter(
        (doc: RequiredDocument) => doc.submitted && doc.fileUrl
      ) || [];

      // Collect all additional documents
      const additionalDocs = clientData.additional_documents || [];

      if (submittedRequiredDocs.length === 0 && additionalDocs.length === 0) {
        setError('No documents available to download');
        setDownloadingZip(false);
        return;
      }

      // Fetch and add required documents
      for (const doc of submittedRequiredDocs) {
        try {
          const response = await fetch(doc.fileUrl!);
          const blob = await response.blob();
          const fileName = doc.fileName || `${doc.code || doc.name}.pdf`;
          zip.file(`Required_Documents/${fileName}`, blob);
        } catch (err) {
          console.error(`Failed to fetch ${doc.name}:`, err);
        }
      }

      // Fetch and add additional documents
      for (const doc of additionalDocs) {
        try {
          const response = await fetch(doc.fileUrl);
          const blob = await response.blob();
          zip.file(`Additional_Documents/${doc.fileName}`, blob);
        } catch (err) {
          console.error(`Failed to fetch ${doc.name}:`, err);
        }
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download the ZIP file
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${clientName}_documents_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (error: any) {
      setError(error.message || 'Failed to create ZIP file');
      console.error('Error creating ZIP:', error);
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleSubmitToAdministrative = async () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Submit to Administrative Authority',
      message: 'Are you sure you want to submit this case to the administrative authority? This will start the administrative silence timer.',
      type: 'info',
      onConfirm: async () => {
        setError('');
        try {
          await api.submitToAdministrative(client.id);
          await loadClient();
          onSuccess();
          showToast('Case submitted to administrative authority successfully', 'success');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: any) {
          setError(error.message || 'Failed to submit to administrative');
          showToast(error.message || 'Failed to submit to administrative', 'error');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
    });
  };

  const handleDeleteClient = async () => {
    const confirmMessage = `Are you sure you want to delete ${clientData.first_name} ${clientData.last_name}? This action cannot be undone and will permanently remove all client data, documents, and records.`;
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Client',
      message: confirmMessage,
      type: 'danger',
      onConfirm: async () => {
        setDeleting(true);
        setError('');
        try {
          await api.deleteClient(client.id);
          showToast(`Client ${clientData.first_name} ${clientData.last_name} deleted successfully`, 'success');
          onSuccess();
          onClose();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (error: any) {
          setError(error.message || 'Failed to delete client');
          showToast(error.message || 'Failed to delete client', 'error');
          setConfirmDialog({ ...confirmDialog, isOpen: false });
          setDeleting(false);
        }
      },
    });
  };
  
  // Count total submitted documents (including optional)
  const totalSubmittedDocs = (clientData.required_documents?.filter((d: any) => d.submitted).length || 0) + 
                              (clientData.additional_documents?.length || 0);

  // Calculate administrative silence countdown
  const calculateSilenceCountdown = () => {
    if (!clientData.submitted_to_immigration || !clientData.application_date) {
      return null;
    }

    const applicationDate = new Date(clientData.application_date);
    const silenceDays = clientData.administrative_silence_days || 60;
    const endDate = new Date(applicationDate);
    endDate.setDate(endDate.getDate() + silenceDays);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      daysRemaining,
      endDate,
      isExpired: daysRemaining < 0,
      isExpiringSoon: daysRemaining <= 7 && daysRemaining > 0,
    };
  };

  const silenceInfo = calculateSilenceCountdown();

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto"
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.85) 50%, rgba(15, 23, 42, 0.8) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[98vh] flex flex-col animate-scale-in my-2 sm:my-4 border border-gray-200/50 ring-1 ring-gray-200/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {clientData.first_name} {clientData.last_name}
            </h2>
            <p className="text-gray-600 mt-1.5 text-sm sm:text-base font-medium">{clientData.case_type || 'No template assigned'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 self-start sm:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar smooth-scroll">
          <div className="p-6 space-y-6">

            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-sm animate-slide-down shadow-sm">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

        {/* Administrative Submission Status */}
        {!clientData.submitted_to_immigration ? (
          <div className="mb-6 p-4 sm:p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 border-2 border-amber-300 rounded-xl shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 text-base sm:text-lg">Not Submitted to Administrative Authority</h3>
                  <p className="text-xs sm:text-sm text-amber-700 mt-1">Submit the case to start the administrative silence timer</p>
                </div>
              </div>
              <button
                onClick={handleSubmitToAdministrative}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors shadow-md hover:shadow-lg flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">Submit to Administrative</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={`mb-6 p-5 rounded-xl border-2 shadow-md ${
            silenceInfo?.isExpired
              ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-300'
              : silenceInfo?.isExpiringSoon
              ? 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-300'
              : 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-300'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-lg ${
                  silenceInfo?.isExpired
                    ? 'bg-red-100'
                    : silenceInfo?.isExpiringSoon
                    ? 'bg-orange-100'
                    : 'bg-emerald-100'
                }`}>
                  <Clock className={`w-6 h-6 ${
                    silenceInfo?.isExpired
                      ? 'text-red-600'
                      : silenceInfo?.isExpiringSoon
                      ? 'text-orange-600'
                      : 'text-emerald-600'
                  }`} />
                </div>
                <div>
                  <h3 className={`font-semibold text-lg ${
                    silenceInfo?.isExpired
                      ? 'text-red-900'
                      : silenceInfo?.isExpiringSoon
                      ? 'text-orange-900'
                      : 'text-emerald-900'
                  }`}>
                    Administrative Silence Timer Active
                  </h3>
                  <div className="mt-2 space-y-1">
                    <p className={`text-sm font-medium ${
                      silenceInfo?.isExpired
                        ? 'text-red-700'
                        : silenceInfo?.isExpiringSoon
                        ? 'text-orange-700'
                        : 'text-emerald-700'
                    }`}>
                      Submitted: {clientData.application_date ? new Date(clientData.application_date).toLocaleDateString() : 'N/A'}
                    </p>
                    {silenceInfo && (
                      <>
                        <p className={`text-sm font-medium ${
                          silenceInfo.isExpired
                            ? 'text-red-700'
                            : silenceInfo.isExpiringSoon
                            ? 'text-orange-700'
                            : 'text-emerald-700'
                        }`}>
                          {silenceInfo.isExpired
                            ? `Expired ${Math.abs(silenceInfo.daysRemaining)} days ago`
                            : silenceInfo.isExpiringSoon
                            ? `⚠️ Only ${silenceInfo.daysRemaining} days remaining`
                            : `${silenceInfo.daysRemaining} days remaining`}
                        </p>
                        <p className="text-xs text-slate-600">
                          Silence period ends: {silenceInfo.endDate.toLocaleDateString()}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-lg font-bold text-2xl ${
                silenceInfo?.isExpired
                  ? 'bg-red-100 text-red-700'
                  : silenceInfo?.isExpiringSoon
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {silenceInfo ? Math.abs(silenceInfo.daysRemaining) : '--'}
              </div>
            </div>
          </div>
        )}

        {/* Requested Documents Section - Only for submitted clients */}
        {clientData.submitted_to_immigration && (
          <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-purple-900">Requested Documents</h3>
                  <p className="text-sm text-purple-700">Documents requested by administration</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowDurationModal(true)}
                  className="px-3 py-1.5 bg-purple-100 text-purple-700 font-semibold rounded-lg hover:bg-purple-200 transition-colors text-sm flex items-center space-x-1"
                  title="Set reminder duration"
                >
                  <Clock className="w-4 h-4" />
                  <span>{clientData.requested_documents_reminder_duration_days || 10} days</span>
                </button>
                <button
                  onClick={() => setShowRequestedDocForm(true)}
                  className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Requested</span>
                </button>
              </div>
            </div>

            {/* Requested Documents Reminder Status */}
            {(() => {
              const requestedDocs = clientData.requested_documents || [];
              const pendingDocs = requestedDocs.filter((d: RequestedDocument) => !d.submitted);
              
              if (pendingDocs.length > 0) {
                const reminderInterval = clientData.requested_documents_reminder_interval_days || 3;
                const lastReminder = clientData.requested_documents_last_reminder_date 
                  ? new Date(clientData.requested_documents_last_reminder_date)
                  : null;
                const now = new Date();
                const daysSinceLastReminder = lastReminder 
                  ? Math.floor((now.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24))
                  : Infinity;
                
                const needsReminder = !lastReminder || daysSinceLastReminder >= reminderInterval;
                
                return (
                  <div className={`mb-4 p-3 rounded-lg ${
                    needsReminder 
                      ? 'bg-orange-100 border border-orange-300' 
                      : 'bg-blue-100 border border-blue-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className={`w-5 h-5 ${needsReminder ? 'text-orange-600' : 'text-blue-600'}`} />
                        <span className={`text-sm font-medium ${needsReminder ? 'text-orange-800' : 'text-blue-800'}`}>
                          {needsReminder 
                            ? `Reminder due - ${pendingDocs.length} document(s) pending`
                            : `Next reminder in ${reminderInterval - daysSinceLastReminder} day(s)`}
                        </span>
                      </div>
                      {needsReminder && (
                        <button
                          onClick={async () => {
                            try {
                              await api.updateRequestedDocumentsLastReminder(clientData.id);
                              await loadClient();
                              showToast('Reminder date updated', 'success');
                            } catch (error: any) {
                              showToast(error.message || 'Failed to update reminder', 'error');
                            }
                          }}
                          className="px-3 py-1 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700 transition-colors"
                        >
                          Mark Reminded
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Requested Documents List */}
            {clientData.requested_documents && clientData.requested_documents.length > 0 ? (
              <div className="space-y-3">
                {clientData.requested_documents.map((doc: RequestedDocument) => (
                  <div key={doc.code} className="p-4 bg-white rounded-lg border border-purple-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="w-5 h-5 text-purple-600" />
                          <h4 className="font-semibold text-purple-900">{doc.name}</h4>
                          {doc.submitted ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              ✓ Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                              ⚠ Pending
                            </span>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-purple-700 mb-2">{doc.description}</p>
                        )}
                        {doc.requestedAt && (
                          <p className="text-xs text-purple-600">
                            Requested: {new Date(doc.requestedAt).toLocaleDateString()}
                          </p>
                        )}
                        {doc.submitted && doc.uploadedAt && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                            {doc.uploadedBy && (
                              <span className="ml-2">by <span className="font-medium">{doc.uploadedBy}</span></span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {doc.submitted && doc.fileUrl ? (
                          <>
                            <button
                              onClick={() => window.open(doc.fileUrl, '_blank')}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="View document"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <a
                              href={doc.fileUrl}
                              download={doc.fileName}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Download document"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </>
                        ) : (
                          <label className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadRequestedDocument(doc.code, file);
                                }
                              }}
                              disabled={uploadingRequestedDoc === doc.code}
                            />
                          </label>
                        )}
                        <button
                          onClick={() => handleRemoveRequestedDocument(doc.code)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-purple-600">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No requested documents yet</p>
                <p className="text-xs mt-1">Add documents requested by administration</p>
              </div>
            )}
          </div>
        )}

        {/* Client Information */}
        <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
            <span>Client Information</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-gray-600">Email:</span>
              <span className="ml-2 text-gray-900">{clientData.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Phone:</span>
              <span className="ml-2 text-gray-900">{clientData.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Parent Name:</span>
              <span className="ml-2 text-gray-900">{clientData.parent_name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Payment:</span>
              <span className="ml-2 text-gray-900">
                €{clientData.payment?.paidAmount || 0} / €{clientData.payment?.totalFee || 0}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Documents Status:</span>
              <div className="ml-2 inline-flex items-center space-x-2">
                <span className="text-gray-900 font-semibold">
                  {clientData.required_documents?.filter((d: any) => d.submitted).length || 0} / {clientData.required_documents?.length || 0}
                </span>
                {clientData.required_documents && clientData.required_documents.length > 0 && (
                  <>
                    <span className="text-emerald-600 text-xs font-medium flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{clientData.required_documents.filter((d: any) => d.submitted).length} submitted</span>
                    </span>
                    {clientData.required_documents.filter((d: any) => !d.submitted).length > 0 && (
                      <span className="text-red-600 text-xs font-medium flex items-center space-x-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{clientData.required_documents.filter((d: any) => !d.submitted).length} pending</span>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Client Details Section */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Client Details</h4>
              <button
                onClick={handleSaveDetails}
                disabled={savingDetails}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {savingDetails ? 'Saving...' : 'Save Details'}
              </button>
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-sm"
              placeholder="Enter additional details about the client..."
            />
          </div>
        </div>

        {/* Payment Section */}
        <div className="mb-6 p-5 bg-gradient-to-br from-green-50/50 to-white rounded-xl border border-gray-200 shadow-sm">
          {(() => {
            const remainingAmount = (clientData.payment?.totalFee || 0) - (clientData.payment?.paidAmount || 0);
            return (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-700" />
                    </div>
                    <span>Payments</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    {remainingAmount > 0 && (
                      <button
                        onClick={handleOpenReminderCalendar}
                        className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center space-x-2 ${
                          customReminderDate
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={customReminderDate ? `Payment Reminder: ${new Date(customReminderDate).toLocaleDateString()}` : 'Set payment reminder'}
                      >
                        <Calendar className="w-4 h-4" />
                        {customReminderDate ? (
                          <span className="text-xs font-medium">
                            {new Date(customReminderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        ) : (
                          <span>Payment Reminder</span>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => setShowPaymentForm(!showPaymentForm)}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Payment</span>
                    </button>
                  </div>
                </div>

          {showPaymentForm && (
            <form onSubmit={handleAddPayment} className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Payment note"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setPaymentForm({ amount: '', method: 'Cash', note: '' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Add Payment
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Total Fee:</span>
                <span className="text-lg font-bold text-gray-900">€{clientData.payment?.totalFee || 0}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Paid Amount:</span>
                <span className="text-lg font-bold text-green-600">€{clientData.payment?.paidAmount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Remaining:</span>
                <span className={`text-lg font-bold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  €{remainingAmount.toFixed(2)}
                </span>
              </div>
            </div>
            {clientData.payment?.payments && clientData.payment.payments.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Payment History</h4>
                <div className="space-y-2">
                  {clientData.payment.payments.map((payment: any, index: number) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm bg-gray-50 p-2 sm:p-3 rounded">
                      <div>
                        <span className="font-medium">€{payment.amount}</span>
                        <span className="text-gray-600 ml-2">via {payment.method}</span>
                        {payment.note && <span className="text-gray-500 ml-2">- {payment.note}</span>}
                      </div>
                      <span className="text-gray-500">{new Date(payment.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
              </>
            );
          })()}
        </div>

        {/* Notes Section */}
        <div className="mb-6 p-5 bg-gradient-to-br from-blue-50/50 to-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <StickyNote className="w-5 h-5 text-blue-700" />
              </div>
              <span>Important Notes</span>
            </h3>
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            placeholder="Add important notes about this client..."
          />
        </div>

        {/* Required Documents */}
        <div className="mb-6 p-5 bg-gradient-to-br from-amber-50/50 to-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center space-x-2">
                <div className="w-1 h-6 bg-gradient-to-b from-amber-600 to-orange-600 rounded-full"></div>
                <span>Required Documents</span>
              </h3>
              {clientData.required_documents && clientData.required_documents.length > 0 && (
                <div className="flex items-center space-x-3 text-sm flex-wrap">
                  <span className="text-slate-600">
                    {clientData.required_documents.filter((d: any) => !d.isOptional && d.submitted).length} of {clientData.required_documents.filter((d: any) => !d.isOptional).length} required submitted
                  </span>
                  {clientData.required_documents.filter((d: any) => d.isOptional).length > 0 && (
                    <span className="text-blue-600 text-xs">
                      ({clientData.required_documents.filter((d: any) => d.isOptional).length} optional)
                    </span>
                  )}
                  <span className="text-emerald-600 flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>{clientData.required_documents.filter((d: any) => d.submitted).length}</span>
                  </span>
                  {clientData.required_documents.filter((d: any) => !d.isOptional && !d.submitted).length > 0 && (
                    <span className="text-red-600 flex items-center space-x-1">
                      <XCircle className="w-4 h-4" />
                      <span>{clientData.required_documents.filter((d: any) => !d.isOptional && !d.submitted).length} required pending</span>
                    </span>
                  )}
                </div>
              )}
            </div>
            {totalSubmittedDocs > 0 && (
              <button
                onClick={handleDownloadAllAsZip}
                disabled={downloadingZip}
                className="px-4 py-2 bg-slate-900 text-white text-sm rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {downloadingZip ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Creating ZIP...</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>Download All ({totalSubmittedDocs})</span>
                  </>
                )}
              </button>
            )}
          </div>
          {!clientData.required_documents || clientData.required_documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No documents required for this client.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientData.required_documents.map((doc: RequiredDocument, index) => (
                <div
                  key={doc.code || index}
                  className={`border-2 rounded-xl p-5 transition-all shadow-sm hover:shadow-md ${
                    doc.submitted
                      ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white'
                      : doc.isOptional
                      ? 'border-gray-300 bg-gradient-to-br from-gray-50 to-white'
                      : 'border-red-300 bg-gradient-to-br from-red-50 to-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        {doc.submitted ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100">
                            <XCircle className="w-5 h-5 text-red-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className={`font-semibold text-base ${
                              doc.submitted ? 'text-slate-900' : 'text-red-900'
                            }`}>
                              {doc.name}
                            </h4>
                            {doc.isOptional && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                Optional
                              </span>
                            )}
                          </div>
                          {doc.submitted ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 mt-1">
                              ✓ Submitted
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                              doc.isOptional 
                                ? 'bg-gray-100 text-gray-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {doc.isOptional ? '○ Optional' : '✗ Pending'}
                            </span>
                          )}
                        </div>
                      </div>
                      {doc.description && (
                        <p className={`text-sm mb-3 ml-11 ${
                          doc.submitted ? 'text-slate-600' : 'text-red-700/80'
                        }`}>
                          {doc.description}
                        </p>
                      )}
                      <div className="ml-11 space-y-1">
                        {doc.code && (
                          <p className={`text-xs font-medium ${
                            doc.submitted ? 'text-slate-500' : 'text-red-600/70'
                          }`}>
                            Code: <span className="font-mono">{doc.code}</span>
                          </p>
                        )}
                        {doc.submitted && doc.uploadedAt && (
                          <p className="text-xs text-slate-500">
                            Uploaded: <span className="font-medium">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                            {doc.uploadedBy && (
                              <span className="ml-2">by <span className="font-medium">{doc.uploadedBy}</span></span>
                            )}
                          </p>
                        )}
                        {doc.submitted && doc.fileName && (
                          <p className="text-xs text-slate-500">
                            File: <span className="font-medium">{doc.fileName}</span> 
                            {doc.fileSize && (
                              <span className="text-slate-400"> ({`${(doc.fileSize / 1024).toFixed(2)} KB`})</span>
                            )}
                          </p>
                        )}
                        {!doc.submitted && (
                          <p className="text-xs font-medium text-red-600 flex items-center space-x-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Document not submitted</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleOptional(doc.code, doc.isOptional || false)}
                        className={`p-2 rounded-lg transition-colors border ${
                          doc.isOptional
                            ? 'text-blue-600 hover:bg-blue-50 border-blue-200 hover:border-blue-300'
                            : 'text-gray-600 hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                        title={doc.isOptional ? 'Mark as Required' : 'Mark as Optional'}
                      >
                        {doc.isOptional ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                      {doc.submitted && doc.fileUrl ? (
                        <>
                          <button
                            onClick={() => handleViewDocument(doc.fileUrl!, doc.fileName || 'document')}
                            className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 hover:border-green-300"
                            title="View Document"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(doc.fileUrl!, doc.fileName || 'document')}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveDocument(doc.code)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(doc.code, file);
                              }
                            }}
                            disabled={uploading === doc.code}
                          />
                          <div
                            className={`px-4 py-2.5 rounded-lg transition-all flex items-center space-x-2 font-medium text-sm ${
                              uploading === doc.code
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                : 'bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-md hover:shadow-lg border border-red-700'
                            }`}
                          >
                            {uploading === doc.code ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent"></div>
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                <span>Upload Document</span>
                              </>
                            )}
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Documents */}
        <div className="mb-6 p-5 bg-gradient-to-br from-purple-50/50 to-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
              <span>Additional Documents</span>
            </h3>
            <button
              onClick={() => setShowAdditionalDocForm(!showAdditionalDocForm)}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Document</span>
            </button>
          </div>

          {showAdditionalDocForm && (
            <form onSubmit={handleUploadAdditionalDocument} className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                  <input
                    type="text"
                    required
                    value={additionalDocForm.name}
                    onChange={(e) => setAdditionalDocForm({ ...additionalDocForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="e.g., Additional Certificate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={additionalDocForm.description}
                    onChange={(e) => setAdditionalDocForm({ ...additionalDocForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAdditionalDocForm({ ...additionalDocForm, file });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdditionalDocForm(false);
                    setAdditionalDocForm({ name: '', description: '', file: null });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading === 'additional'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
                >
                  {uploading === 'additional' ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          )}

          {!clientData.additional_documents || clientData.additional_documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No additional documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientData.additional_documents.map((doc: AdditionalDocument) => (
                <div
                  key={doc.id}
                  className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        File: {doc.fileName} ({`${(doc.fileSize / 1024).toFixed(2)} KB`})
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        {doc.uploadedBy && (
                          <span className="ml-2">by <span className="font-medium">{doc.uploadedBy}</span></span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleViewDocument(doc.fileUrl, doc.fileName)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 hover:border-green-300"
                        title="View Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveAdditionalDocument(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* APORTAR DOCUMENTACIÓN Section */}
        <div className="mb-6 p-5 bg-gradient-to-br from-blue-50/50 to-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full"></div>
              <span>APORTAR DOCUMENTACIÓN</span>
            </h3>
            <button
              onClick={() => setShowAportarDocForm(!showAportarDocForm)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Document</span>
            </button>
          </div>

          {showAportarDocForm && (
            <form onSubmit={handleUploadAportarDocumentacion} className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                  <input
                    type="text"
                    required
                    value={aportarDocForm.name}
                    onChange={(e) => setAportarDocForm({ ...aportarDocForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g., Additional Certificate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={aportarDocForm.description}
                    onChange={(e) => setAportarDocForm({ ...aportarDocForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAportarDocForm({ ...aportarDocForm, file });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAportarDocForm(false);
                    setAportarDocForm({ name: '', description: '', file: null });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading === 'aportar'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                >
                  {uploading === 'aportar' ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          )}

          {!clientData.aportar_documentacion || clientData.aportar_documentacion.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientData.aportar_documentacion.map((doc: AdditionalDocument) => (
                <div
                  key={doc.id}
                  className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        File: {doc.fileName} ({`${(doc.fileSize / 1024).toFixed(2)} KB`})
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        {doc.uploadedBy && (
                          <span className="ml-2">by <span className="font-medium">{doc.uploadedBy}</span></span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleViewDocument(doc.fileUrl, doc.fileName)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 hover:border-green-300"
                        title="View Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveAportarDocumentacion(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* REQUERIMIENTO Section */}
        <div className="mb-6 p-5 bg-gradient-to-br from-amber-50/50 to-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <div className="w-1 h-6 bg-gradient-to-b from-amber-600 to-orange-600 rounded-full"></div>
              <span>REQUERIMIENTO</span>
            </h3>
            <button
              onClick={() => setShowRequerimientoForm(!showRequerimientoForm)}
              className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Document</span>
            </button>
          </div>

          {showRequerimientoForm && (
            <form onSubmit={handleUploadRequerimiento} className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                  <input
                    type="text"
                    required
                    value={requerimientoForm.name}
                    onChange={(e) => setRequerimientoForm({ ...requerimientoForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="e.g., Requirement Document"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={requerimientoForm.description}
                    onChange={(e) => setRequerimientoForm({ ...requerimientoForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setRequerimientoForm({ ...requerimientoForm, file });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequerimientoForm(false);
                    setRequerimientoForm({ name: '', description: '', file: null });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading === 'requerimiento'}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm disabled:opacity-50"
                >
                  {uploading === 'requerimiento' ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          )}

          {!clientData.requerimiento || clientData.requerimiento.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientData.requerimiento.map((doc: AdditionalDocument) => (
                <div
                  key={doc.id}
                  className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-5 h-5 text-amber-600" />
                        <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        File: {doc.fileName} ({`${(doc.fileSize / 1024).toFixed(2)} KB`})
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        {doc.uploadedBy && (
                          <span className="ml-2">by <span className="font-medium">{doc.uploadedBy}</span></span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleViewDocument(doc.fileUrl, doc.fileName)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 hover:border-green-300"
                        title="View Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveRequerimiento(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RESOLUCIÓN Section */}
        <div className="mb-6 p-5 bg-gradient-to-br from-green-50/50 to-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
              <div className="w-1 h-6 bg-gradient-to-b from-green-600 to-emerald-600 rounded-full"></div>
              <span>RESOLUCIÓN</span>
            </h3>
            <button
              onClick={() => setShowResolucionForm(!showResolucionForm)}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Document</span>
            </button>
          </div>

          {showResolucionForm && (
            <form onSubmit={handleUploadResolucion} className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                  <input
                    type="text"
                    required
                    value={resolucionForm.name}
                    onChange={(e) => setResolucionForm({ ...resolucionForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="e.g., Resolution Document"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={resolucionForm.description}
                    onChange={(e) => setResolucionForm({ ...resolucionForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setResolucionForm({ ...resolucionForm, file });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResolucionForm(false);
                    setResolucionForm({ name: '', description: '', file: null });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading === 'resolucion'}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                >
                  {uploading === 'resolucion' ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          )}

          {!clientData.resolucion || clientData.resolucion.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientData.resolucion.map((doc: AdditionalDocument) => (
                <div
                  key={doc.id}
                  className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        File: {doc.fileName} ({`${(doc.fileSize / 1024).toFixed(2)} KB`})
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                        {doc.uploadedBy && (
                          <span className="ml-2">by <span className="font-medium">{doc.uploadedBy}</span></span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleViewDocument(doc.fileUrl, doc.fileName)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 hover:border-green-300"
                        title="View Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc.fileUrl, doc.fileName)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveResolucion(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </div>
        </div>
        
        {/* Fixed Footer */}
        <div className="flex-shrink-0 flex justify-between items-center p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-b-2xl">
          <button
            onClick={handleDeleteClient}
            disabled={deleting}
            className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg shadow-red-600/20 hover:shadow-xl hover:shadow-red-600/30"
          >
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Client</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewingDocument(null);
            }
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.9) 50%, rgba(15, 23, 42, 0.85) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] flex flex-col shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 mr-4">
                {viewingDocument.fileName}
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(viewingDocument.url, viewingDocument.fileName)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {viewingDocument.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={viewingDocument.url}
                  className="w-full h-full min-h-[600px] border-0 rounded-lg"
                  title={viewingDocument.fileName}
                />
              ) : viewingDocument.url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                <div className="flex items-center justify-center">
                  <img
                    src={viewingDocument.url}
                    alt={viewingDocument.fileName}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
                  <FileText className="w-16 h-16 mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <p className="text-sm mb-4">This file type cannot be previewed in the browser.</p>
                  <button
                    onClick={() => handleDownload(viewingDocument.url, viewingDocument.fileName)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download to view</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Requested Document Modal */}
      {showRequestedDocForm && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRequestedDocForm(false);
            }
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.85) 50%, rgba(15, 23, 42, 0.8) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-purple-900">Add Requested Document</h3>
              <button
                onClick={() => setShowRequestedDocForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddRequestedDocument}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Name *</label>
                  <input
                    type="text"
                    value={requestedDocForm.name}
                    onChange={(e) => setRequestedDocForm({ ...requestedDocForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={requestedDocForm.description}
                    onChange={(e) => setRequestedDocForm({ ...requestedDocForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestedDocForm(false);
                    setRequestedDocForm({ name: '', description: '' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Add Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Reminder Duration Modal */}
      {showDurationModal && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDurationModal(false);
            }
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.85) 50%, rgba(15, 23, 42, 0.8) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-purple-900">Set Reminder Duration</h3>
                  <p className="text-xs text-gray-600 mt-0.5">Reminders will be sent every 3 days</p>
                </div>
              </div>
              <button
                onClick={() => setShowDurationModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (days) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Reminders will be sent every 3 days until all requested documents are submitted</p>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDurationModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetReminderDuration}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Set Duration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Calendar Modal */}
      {showReminderCalendar && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReminderCalendar(false);
            }
          }}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.85) 50%, rgba(15, 23, 42, 0.8) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Payment Reminder</h3>
                    <p className="text-xs text-gray-600 mt-0.5">Select a date to set a payment reminder</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReminderCalendar(false)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Reminder Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={tempReminderDate}
                      onChange={(e) => setTempReminderDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-base cursor-pointer"
                      autoFocus
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {!tempReminderDate && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>Select a date to set a payment reminder for this client</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowReminderCalendar(false);
                  setTempReminderDate('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReminderFromCalendar}
                disabled={!tempReminderDate || savingReminder}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {savingReminder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Save Reminder</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}
