import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, FileText, Download, Trash2, Plus, DollarSign, StickyNote, Archive, XCircle, AlertCircle, Send, Clock, Eye } from 'lucide-react';
import JSZip from 'jszip';
import { api } from '../utils/api';
import { Client, RequiredDocument, AdditionalDocument } from '../types';

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
  const [notes, setNotes] = useState(client.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadClient();
  }, [client.id]);

  useEffect(() => {
    setNotes(clientData.notes || '');
  }, [clientData.notes]);

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
    setUploading(documentCode);

    try {
      await api.uploadDocument(client.id, documentCode, file);
      await loadClient();
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveDocument = async (documentCode: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;

    setError('');
    try {
      await api.removeDocument(client.id, documentCode);
      await loadClient();
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to remove document');
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
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to add payment');
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setError('');
    try {
      await api.updateNotes(client.id, notes);
      await loadClient();
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
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

    setUploading('additional');
    try {
      await api.uploadAdditionalDocument(
        client.id,
        additionalDocForm.name,
        additionalDocForm.description,
        additionalDocForm.file
      );
      setAdditionalDocForm({ name: '', description: '', file: null });
      setShowAdditionalDocForm(false);
      await loadClient();
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveAdditionalDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to remove this document?')) return;

    setError('');
    try {
      await api.removeAdditionalDocument(client.id, documentId);
      await loadClient();
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to remove document');
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  const handleViewDocument = (fileUrl: string) => {
    // Handle relative URLs (if fileUrl starts with /uploads, it's relative to the server)
    let url = fileUrl;
    if (fileUrl.startsWith('/uploads/')) {
      // For relative paths, use the current origin
      url = window.location.origin + fileUrl;
    }
    // Open document in new tab
    window.open(url, '_blank');
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
    if (!confirm('Are you sure you want to submit this case to the administrative authority? This will start the administrative silence timer.')) {
      return;
    }

    setError('');
    try {
      await api.submitToAdministrative(client.id);
      await loadClient();
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'Failed to submit to administrative');
    }
  };

  const handleDeleteClient = async () => {
    const confirmMessage = `Are you sure you want to delete ${clientData.first_name} ${clientData.last_name}? This action cannot be undone and will permanently remove all client data, documents, and records.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);
    setError('');
    try {
      await api.deleteClient(client.id);
      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to delete client');
      setDeleting(false);
    }
  };

  const remainingAmount = (clientData.payment?.totalFee || 0) - (clientData.payment?.paidAmount || 0);
  
  // Count total submitted documents
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in my-2 sm:my-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {clientData.first_name} {clientData.last_name}
            </h2>
            <p className="text-gray-600 mt-1">{clientData.case_type || 'No template assigned'}</p>
          </div>
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

        {/* Administrative Submission Status */}
        {!clientData.submitted_to_immigration ? (
          <div className="mb-6 p-5 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-100 p-3 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 text-lg">Not Submitted to Administrative Authority</h3>
                  <p className="text-sm text-amber-700 mt-1">Submit the case to start the administrative silence timer</p>
                </div>
              </div>
              <button
                onClick={handleSubmitToAdministrative}
                className="px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors shadow-md hover:shadow-lg flex items-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>Submit to Administrative</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={`mb-6 p-5 rounded-xl border-2 ${
            silenceInfo?.isExpired
              ? 'bg-red-50 border-red-200'
              : silenceInfo?.isExpiringSoon
              ? 'bg-orange-50 border-orange-200'
              : 'bg-emerald-50 border-emerald-200'
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

        {/* Client Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Client Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Email:</span>
              <span className="ml-2 text-gray-900">{clientData.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Phone:</span>
              <span className="ml-2 text-gray-900">{clientData.phone || 'N/A'}</span>
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
        </div>

        {/* Payment Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Payments</span>
            </h3>
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Payment</span>
            </button>
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
        </div>

        {/* Notes Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <StickyNote className="w-5 h-5" />
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
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Required Documents</h3>
              {clientData.required_documents && clientData.required_documents.length > 0 && (
                <div className="flex items-center space-x-3 text-sm">
                  <span className="text-slate-600">
                    {clientData.required_documents.filter((d: any) => d.submitted).length} of {clientData.required_documents.length} submitted
                  </span>
                  <span className="text-emerald-600 flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>{clientData.required_documents.filter((d: any) => d.submitted).length}</span>
                  </span>
                  {clientData.required_documents.filter((d: any) => !d.submitted).length > 0 && (
                    <span className="text-red-600 flex items-center space-x-1">
                      <XCircle className="w-4 h-4" />
                      <span>{clientData.required_documents.filter((d: any) => !d.submitted).length}</span>
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
                  className={`border-2 rounded-xl p-5 transition-all ${
                    doc.submitted
                      ? 'border-emerald-200 bg-emerald-50/50 shadow-sm'
                      : 'border-red-200 bg-red-50/50 shadow-sm'
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
                          <h4 className={`font-semibold text-base ${
                            doc.submitted ? 'text-slate-900' : 'text-red-900'
                          }`}>
                            {doc.name}
                          </h4>
                          {doc.submitted ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 mt-1">
                              ✓ Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 mt-1">
                              ✗ Pending
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
                      {doc.submitted && doc.fileUrl ? (
                        <>
                          <button
                            onClick={() => handleViewDocument(doc.fileUrl!)}
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
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Additional Documents</h3>
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
                  className="border-2 border-purple-200 bg-purple-50 rounded-lg p-4"
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
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleViewDocument(doc.fileUrl)}
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

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <button
            onClick={handleDeleteClient}
            disabled={deleting}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
