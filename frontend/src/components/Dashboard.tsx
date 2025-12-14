import { useEffect, useState } from 'react';
import { FileText, Users, CheckCircle, Clock, Send, X, AlertCircle, AlertTriangle, Gavel, DollarSign, FilePlus } from 'lucide-react';
import { api } from '../utils/api';
import { CaseTemplate, Client } from '../types';
import ClientDetailsModal from './ClientDetailsModal';
import { t } from '../utils/i18n';

export default function Dashboard() {
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showReadyToSubmitModal, setShowReadyToSubmitModal] = useState(false);
  const [showAwaitingModal, setShowAwaitingModal] = useState(false);
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);
  const [showAportarDocumentacionModal, setShowAportarDocumentacionModal] = useState(false);
  const [showRequerimientoModal, setShowRequerimientoModal] = useState(false);
  const [showRecursoModal, setShowRecursoModal] = useState(false);
  const [showUrgentesModal, setShowUrgentesModal] = useState(false);
  const [showPagosModal, setShowPagosModal] = useState(false);
  const [, forceUpdate] = useState({});
  
  // Explicitly reference modal states to satisfy TypeScript
  void showAportarDocumentacionModal;
  void showRequerimientoModal;
  void showRecursoModal;
  void showUrgentesModal;
  void showPagosModal;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Listen for language changes to force re-render
    const handleLanguageChange = () => {
      forceUpdate({});
    };
    window.addEventListener('languagechange', handleLanguageChange);
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, clientsData] = await Promise.all([
        api.getCaseTemplates(),
        api.getClients(),
      ]);
      setTemplates(templatesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const submittedToAdmin = clients.filter((client) => client.submitted_to_immigration);
  // Clients ready to submit (all documents complete, not yet submitted)
  const readyToSubmit = clients.filter((client) => {
    if (client.submitted_to_immigration) return false;
    const requiredDocs = client.required_documents?.filter((d: any) => !d.isOptional) || [];
    return requiredDocs.length > 0 && requiredDocs.every((d: any) => d.submitted);
  });
  // Clients with incomplete documents (pending documentation)
  const awaitingSubmission = clients.filter((client) => {
    if (client.submitted_to_immigration) return false;
    const requiredDocs = client.required_documents?.filter((d: any) => !d.isOptional) || [];
    return requiredDocs.length > 0 && requiredDocs.some((d: any) => !d.submitted);
  });
  
  // APORTAR DOCUMENTACIÓN: Clients that need to add missing documents (not submitted, has missing required docs)
  const aportarDocumentacion = clients.filter((client) => {
    if (client.submitted_to_immigration) return false;
    const requiredDocs = client.required_documents?.filter((d: any) => !d.isOptional) || [];
    return requiredDocs.length > 0 && requiredDocs.some((d: any) => !d.submitted);
  });
  
  // REQUERIMIENTO: Clients with pending requested documents (submitted clients with pending requested docs)
  const requerimiento = clients.filter((client) => {
    if (!client.submitted_to_immigration) return false;
    const requestedDocs = client.requested_documents || [];
    return requestedDocs.length > 0 && requestedDocs.some((d: any) => !d.submitted);
  });
  
  // RECURSO: Clients that need to file an appeal (placeholder - can be expanded later)
  // For now, this could be clients with expired administrative silence or specific status
  const recurso = clients.filter((client) => {
    if (!client.submitted_to_immigration || !client.application_date) return false;
    // Check if administrative silence has expired (could indicate need for appeal)
    const appDate = new Date(client.application_date);
    const silenceDays = client.administrative_silence_days || 60;
    const silenceEndDate = new Date(appDate);
    silenceEndDate.setDate(silenceEndDate.getDate() + silenceDays);
    const now = new Date();
    // If silence period has expired, might need appeal
    return now > silenceEndDate;
  });
  
  // URGENTES: Clients with urgent deadlines within 72 hours
  const urgentes = clients.filter((client) => {
    const now = new Date();
    const hours72 = 72 * 60 * 60 * 1000; // 72 hours in milliseconds
    
    // Check custom reminder date
    if (client.custom_reminder_date) {
      const reminderDate = new Date(client.custom_reminder_date);
      const timeDiff = reminderDate.getTime() - now.getTime();
      if (timeDiff > 0 && timeDiff <= hours72) return true;
    }
    
    // Check requested documents deadline
    if (client.submitted_to_immigration && client.requested_documents) {
      const requestedDocs = client.requested_documents || [];
      const pendingDocs = requestedDocs.filter((d: any) => !d.submitted);
      if (pendingDocs.length > 0) {
        const durationDays = client.requested_documents_reminder_duration_days || 10;
        const lastRequestDate = pendingDocs[0]?.requestedAt 
          ? new Date(pendingDocs[0].requestedAt)
          : client.application_date 
            ? new Date(client.application_date)
            : null;
        if (lastRequestDate) {
          const deadline = new Date(lastRequestDate);
          deadline.setDate(deadline.getDate() + durationDays);
          const timeDiff = deadline.getTime() - now.getTime();
          if (timeDiff > 0 && timeDiff <= hours72) return true;
        }
      }
    }
    
    // Check administrative silence expiring soon
    if (client.submitted_to_immigration && client.application_date) {
      const appDate = new Date(client.application_date);
      const silenceDays = client.administrative_silence_days || 60;
      const silenceEndDate = new Date(appDate);
      silenceEndDate.setDate(silenceEndDate.getDate() + silenceDays);
      const timeDiff = silenceEndDate.getTime() - now.getTime();
      if (timeDiff > 0 && timeDiff <= hours72) return true;
    }
    
    return false;
  });
  
  // PAGOS: Clients with pending payments
  const pagos = clients.filter((client) => {
    const totalFee = client.payment?.totalFee || 0;
    const paidAmount = client.payment?.paidAmount || 0;
    return totalFee > paidAmount;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-amber-200/50 pb-4 sm:pb-6">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 bg-clip-text text-transparent mb-2 tracking-tight">
          {t('dashboard.title')}
        </h2>
        <p className="text-amber-700/80 text-base sm:text-lg font-medium">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
        <div className="glass-gold rounded-2xl p-5 sm:p-6 glass-hover animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-3 rounded-xl shadow-lg">
              <FileText className="w-6 h-6 text-amber-800" />
            </div>
            <span className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider">{t('dashboard.templates')}</span>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent mb-2">{templates.length}</p>
          <p className="text-sm text-amber-700/70 font-medium leading-relaxed">{t('dashboard.activeTemplates')}</p>
        </div>

        <div className="glass-gold rounded-2xl p-5 sm:p-6 glass-hover animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-3 rounded-xl shadow-lg">
              <Users className="w-6 h-6 text-amber-800" />
            </div>
            <span className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider">{t('dashboard.clients')}</span>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent mb-2">{clients.length}</p>
          <p className="text-sm text-amber-700/70 font-medium leading-relaxed">{t('dashboard.totalClients')}</p>
        </div>

        <div 
          onClick={() => setShowReadyToSubmitModal(true)}
          className="rounded-2xl p-5 sm:p-6 animate-slide-up cursor-pointer transition-all duration-200 hover:shadow-xl border-2 border-green-400"
          style={{ 
            animationDelay: '0.2s',
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.2) 50%, rgba(34, 197, 94, 0.15) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: '0 8px 32px 0 rgba(34, 197, 94, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-green-200 to-green-300 p-3 rounded-xl shadow-lg">
              <CheckCircle className="w-6 h-6 text-green-900" />
            </div>
            <span className="text-xs font-semibold text-green-800 uppercase tracking-wider">{t('dashboard.readyToSubmit')}</span>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-green-900 to-green-700 bg-clip-text text-transparent mb-2">{readyToSubmit.length}</p>
          <p className="text-sm text-green-800 font-medium leading-relaxed mb-2">{t('dashboard.readyToSubmitDesc')}</p>
          {readyToSubmit.length > 0 && (
            <p className="text-xs text-green-700 font-semibold">{t('dashboard.clickToView')}</p>
          )}
        </div>

        <div 
          onClick={() => setShowAwaitingModal(true)}
          className="glass-gold rounded-2xl p-5 sm:p-6 glass-hover animate-slide-up cursor-pointer transition-all duration-200 hover:shadow-xl"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-3 rounded-xl shadow-lg">
              <Clock className="w-6 h-6 text-amber-800" />
            </div>
            <span className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider">{t('dashboard.pending')}</span>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent mb-2">{awaitingSubmission.length}</p>
          <p className="text-sm text-amber-700/70 font-medium leading-relaxed mb-2">{t('dashboard.awaitingSubmission')}</p>
          <p className="text-xs text-amber-600 font-semibold">{t('dashboard.clickToView')}</p>
        </div>

        <div 
          onClick={() => setShowSubmittedModal(true)}
          className="glass-gold rounded-2xl p-5 sm:p-6 glass-hover animate-slide-up cursor-pointer transition-all duration-200 hover:shadow-xl"
          style={{ animationDelay: '0.4s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-3 rounded-xl shadow-lg">
              <Send className="w-6 h-6 text-amber-800" />
            </div>
            <span className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider">{t('dashboard.administrative')}</span>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent mb-2">{submittedToAdmin.length}</p>
          <p className="text-sm text-amber-700/70 font-medium leading-relaxed mb-2">
            {submittedToAdmin.length === 1 ? t('dashboard.caseSubmitted') : t('dashboard.casesSubmitted')}
          </p>
          <p className="text-xs text-amber-600 font-semibold">{t('dashboard.clickToView')}</p>
        </div>

        {/* APORTAR DOCUMENTACIÓN Box */}
        <div 
          onClick={() => setShowAportarDocumentacionModal(true)}
          className="glass-gold rounded-2xl p-5 sm:p-6 glass-hover animate-slide-up cursor-pointer transition-all duration-200 hover:shadow-xl"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-3 rounded-xl shadow-lg">
              <FilePlus className="w-6 h-6 text-amber-800" />
            </div>
            <span className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider">{t('dashboard.aportarDocumentacion')}</span>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent mb-2">{aportarDocumentacion.length}</p>
          <p className="text-sm text-amber-700/70 font-medium leading-relaxed mb-2">{t('dashboard.aportarDocumentacionDesc')}</p>
          <p className="text-xs text-amber-600 font-semibold">{t('dashboard.clickToView')}</p>
        </div>

        {/* REQUERIMIENTO Box */}
        <div 
          onClick={() => setShowRequerimientoModal(true)}
          className="glass-gold rounded-2xl p-5 sm:p-6 glass-hover animate-slide-up cursor-pointer transition-all duration-200 hover:shadow-xl"
          style={{ animationDelay: '0.6s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-3 rounded-xl shadow-lg">
              <AlertCircle className="w-6 h-6 text-amber-800" />
            </div>
            <span className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider">{t('dashboard.requerimiento')}</span>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent mb-2">{requerimiento.length}</p>
          <p className="text-sm text-amber-700/70 font-medium leading-relaxed mb-2">{t('dashboard.requerimientoDesc')}</p>
          {requerimiento.length > 0 && (
            <p className="text-xs text-amber-600 font-semibold">{t('dashboard.clickToView')}</p>
          )}
        </div>

        {/* RECURSO Box */}
        <div 
          onClick={() => setShowRecursoModal(true)}
          className="glass-gold rounded-2xl p-5 sm:p-6 glass-hover animate-slide-up cursor-pointer transition-all duration-200 hover:shadow-xl"
          style={{ animationDelay: '0.7s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-3 rounded-xl shadow-lg">
              <Gavel className="w-6 h-6 text-amber-800" />
            </div>
            <span className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider">{t('dashboard.recurso')}</span>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent mb-2">{recurso.length}</p>
          <p className="text-sm text-amber-700/70 font-medium leading-relaxed mb-2">{t('dashboard.recursoDesc')}</p>
          {recurso.length > 0 && (
            <p className="text-xs text-amber-600 font-semibold">{t('dashboard.clickToView')}</p>
          )}
        </div>

        {/* URGENTES Box */}
        <div 
          onClick={() => setShowUrgentesModal(true)}
          className="rounded-2xl p-5 sm:p-6 animate-slide-up cursor-pointer transition-all duration-200 hover:shadow-xl border-2 border-red-500"
          style={{ 
            animationDelay: '0.8s',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.2) 50%, rgba(239, 68, 68, 0.15) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: '0 8px 32px 0 rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-red-300 to-red-400 p-3 rounded-xl shadow-lg">
              <AlertTriangle className="w-6 h-6 text-red-950" />
            </div>
            <span className="text-xs font-semibold text-red-900 uppercase tracking-wider">{t('dashboard.urgentes')}</span>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-red-950 to-red-800 bg-clip-text text-transparent mb-2">{urgentes.length}</p>
          <p className="text-sm text-red-900 font-medium leading-relaxed mb-2">{t('dashboard.urgentesDesc')}</p>
          {urgentes.length > 0 && (
            <p className="text-xs text-red-800 font-semibold">{t('dashboard.clickToView')}</p>
          )}
        </div>

        {/* PAGOS Box */}
        <div 
          onClick={() => setShowPagosModal(true)}
          className="glass-gold rounded-2xl p-5 sm:p-6 glass-hover animate-slide-up cursor-pointer transition-all duration-200 hover:shadow-xl"
          style={{ animationDelay: '0.8s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-3 rounded-xl shadow-lg">
              <DollarSign className="w-6 h-6 text-amber-800" />
            </div>
            <span className="text-xs font-semibold text-amber-700/70 uppercase tracking-wider">{t('dashboard.pagos')}</span>
          </div>
          <p className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent mb-2">{pagos.length}</p>
          <p className="text-sm text-amber-700/70 font-medium leading-relaxed mb-2">{t('dashboard.pagosDesc')}</p>
          {pagos.length > 0 && (
            <p className="text-xs text-amber-600 font-semibold">{t('dashboard.clickToView')}</p>
          )}
        </div>
      </div>

      {/* Recent Clients */}
      <div className="glass-gold rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-800 to-amber-700 bg-clip-text text-transparent">{t('dashboard.recentClients')}</h3>
            <p className="text-xs sm:text-sm text-amber-700/70 mt-1 font-medium">{t('dashboard.latestActivity')}</p>
          </div>
        </div>
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-amber-300 mx-auto mb-4" />
            <p className="text-amber-700/80 font-medium">{t('dashboard.noClients')}</p>
            <p className="text-sm text-amber-600/70 mt-1">{t('dashboard.createFirstClient')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.slice(0, 5).map((client) => (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 glass rounded-xl glass-hover group cursor-pointer gap-3 sm:gap-0"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="bg-gradient-to-br from-amber-200 to-amber-300 group-hover:from-amber-300 group-hover:to-amber-400 p-2.5 rounded-lg transition-colors shadow-md">
                    <Users className="w-5 h-5 text-amber-800" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 text-lg group-hover:text-amber-800 transition-colors">
                      {client.first_name} {client.last_name}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-amber-700/80 font-medium">{client.case_type || 'No template assigned'}</p>
                          {(() => {
                            // Calculate reminder status
                            const calculateReminderStatus = () => {
                              if (client.submitted_to_immigration) return null;
                              
                              const pendingRequiredDocs = client.required_documents?.filter((d: any) => !d.submitted && !d.isOptional).length || 0;
                              if (pendingRequiredDocs === 0) return null;
                              
                              // Find last activity date
                              // If no documents uploaded, reminder starts from client creation date
                              // If documents uploaded, reminder starts from most recent upload date
                              const submittedDocs = client.required_documents?.filter((d: any) => d.submitted && d.uploadedAt) || [];
                              let lastActivityDate: Date;
                              let hasNoUploads = false;
                              
                              if (submittedDocs.length > 0) {
                                const uploadDates = submittedDocs
                                  .map((d: any) => new Date(d.uploadedAt))
                                  .sort((a: Date, b: Date) => b.getTime() - a.getTime());
                                lastActivityDate = uploadDates[0];
                              } else {
                                // No documents uploaded yet - reminder starts from client creation
                                lastActivityDate = new Date(client.created_at);
                                hasNoUploads = true;
                              }
                              
                              const reminderDays = client.reminder_interval_days || 10;
                              const nextReminderDate = new Date(lastActivityDate);
                              nextReminderDate.setDate(nextReminderDate.getDate() + reminderDays);
                              
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              nextReminderDate.setHours(0, 0, 0, 0);
                              
                              const daysUntilReminder = Math.ceil((nextReminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              
                              return {
                                daysUntilReminder,
                                isOverdue: daysUntilReminder < 0,
                                isDueSoon: daysUntilReminder <= 2 && daysUntilReminder >= 0,
                                hasNoUploads, // Track if no documents uploaded yet
                              };
                            };
                            
                            const reminderStatus = calculateReminderStatus();
                            
                            if (!reminderStatus) {
                              return (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <p className="text-xs text-slate-500 font-medium">
                                    {t('dashboard.interval')}: {client.reminder_interval_days} {t('dashboard.days')}
                                  </p>
                                </div>
                              );
                            }
                            
                            const { daysUntilReminder, isOverdue, isDueSoon, hasNoUploads } = reminderStatus;
                            
                            return (
                              <div className="flex items-center space-x-1">
                                <Clock className={`w-3.5 h-3.5 ${
                                  isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-500' : 'text-slate-400'
                                }`} />
                                <p className={`text-xs font-medium ${
                                  isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-slate-500'
                                }`}>
                                  {isOverdue 
                                    ? `${t('dashboard.overdue')} ${Math.abs(daysUntilReminder)} ${t('dashboard.days')}${hasNoUploads ? ` ${t('dashboard.noDocs')}` : ''}`
                                    : daysUntilReminder === 0
                                    ? t('dashboard.dueToday')
                                    : `${t('dashboard.dueIn')} ${daysUntilReminder} ${t('dashboard.days')}${hasNoUploads ? ` ${t('dashboard.noDocs')}` : ''}`
                                  }
                                </p>
                              </div>
                            );
                          })()}
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <div className="inline-flex items-center space-x-2 bg-white px-3 sm:px-4 py-2 rounded-lg border border-amber-200 shadow-md">
                    <span className="text-base sm:text-lg font-bold text-amber-800">
                      {client.required_documents?.filter((d: any) => d.submitted).length || 0}
                    </span>
                    <span className="text-amber-400">/</span>
                    <span className="text-base sm:text-lg font-semibold text-amber-700">
                      {client.required_documents?.length || 0}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600/70 mt-1 font-medium">{t('dashboard.documents')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* APORTAR DOCUMENTACIÓN Modal */}
      {showAportarDocumentacionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-amber-900">{t('dashboard.aportarDocumentacion')}</h2>
                  <p className="text-amber-700 mt-1">{t('dashboard.aportarDocumentacionDesc')}</p>
                </div>
                <button
                  onClick={() => setShowAportarDocumentacionModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {aportarDocumentacion.length === 0 ? (
                <div className="text-center py-12">
                  <FilePlus className="w-16 h-16 mx-auto text-amber-400 mb-4" />
                  <p className="text-gray-500 font-medium text-lg">{t('dashboard.allSubmitted')}</p>
                  <p className="text-sm text-gray-400 mt-1">Todos los documentos requeridos han sido proporcionados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aportarDocumentacion.map((client) => {
                    const missingDocs = (client.required_documents || []).filter((d: any) => !d.submitted && !d.isOptional);
                    return (
                      <div
                        key={client.id}
                        onClick={() => {
                          setSelectedClient(client);
                          setShowAportarDocumentacionModal(false);
                        }}
                        className="p-4 border-2 border-amber-200 rounded-xl hover:border-amber-300 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-amber-50 to-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-amber-900 text-lg">{client.first_name} {client.last_name}</h3>
                            <p className="text-sm text-amber-700 mt-1">{client.case_type || 'No template'}</p>
                            <p className="text-xs text-amber-600 mt-2">
                              {missingDocs.length} documento(s) faltante(s): {missingDocs.map((d: any) => d.name).join(', ')}
                            </p>
                          </div>
                          <FilePlus className="w-6 h-6 text-amber-600 ml-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REQUERIMIENTO Modal */}
      {showRequerimientoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-amber-900">{t('dashboard.requerimiento')}</h2>
                  <p className="text-amber-700 mt-1">{t('dashboard.requerimientoDesc')}</p>
                </div>
                <button
                  onClick={() => setShowRequerimientoModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {requerimiento.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 mx-auto text-amber-400 mb-4" />
                  <p className="text-gray-500 font-medium text-lg">{t('dashboard.allSubmitted')}</p>
                  <p className="text-sm text-gray-400 mt-1">Todos los documentos solicitados han sido proporcionados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requerimiento.map((client) => {
                    const pendingDocs = (client.requested_documents || []).filter((d: any) => !d.submitted);
                    return (
                      <div
                        key={client.id}
                        onClick={() => {
                          setSelectedClient(client);
                          setShowRequerimientoModal(false);
                        }}
                        className="p-4 border-2 border-amber-200 rounded-xl hover:border-amber-300 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-amber-50 to-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-amber-900 text-lg">{client.first_name} {client.last_name}</h3>
                            <p className="text-sm text-amber-700 mt-1">{client.case_type || 'No template'}</p>
                            <p className="text-xs text-amber-600 mt-2">
                              {pendingDocs.length} documento(s) pendiente(s): {pendingDocs.map((d: any) => d.name).join(', ')}
                            </p>
                          </div>
                          <AlertCircle className="w-6 h-6 text-amber-600 ml-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECURSO Modal */}
      {showRecursoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-amber-900">{t('dashboard.recurso')}</h2>
                  <p className="text-amber-700 mt-1">{t('dashboard.recursoDesc')}</p>
                </div>
                <button
                  onClick={() => setShowRecursoModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {recurso.length === 0 ? (
                <div className="text-center py-12">
                  <Gavel className="w-16 h-16 mx-auto text-amber-400 mb-4" />
                  <p className="text-gray-500 font-medium text-lg">No hay recursos pendientes</p>
                  <p className="text-sm text-gray-400 mt-1">No hay casos que requieran presentar recurso</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recurso.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client);
                        setShowRecursoModal(false);
                      }}
                      className="p-4 border-2 border-amber-200 rounded-xl hover:border-amber-300 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-amber-50 to-white"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-amber-900 text-lg">{client.first_name} {client.last_name}</h3>
                          <p className="text-sm text-amber-700 mt-1">{client.case_type || 'No template'}</p>
                          {client.application_date && (
                            <p className="text-xs text-amber-600 mt-2">
                              Presentado: {new Date(client.application_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Gavel className="w-6 h-6 text-amber-600 ml-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* URGENTES Modal */}
      {showUrgentesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-red-900">{t('dashboard.urgentes')}</h2>
                  <p className="text-red-700 mt-1">{t('dashboard.urgentesDesc')}</p>
                </div>
                <button
                  onClick={() => setShowUrgentesModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {urgentes.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 mx-auto text-red-400 mb-4" />
                  <p className="text-gray-500 font-medium text-lg">No hay trámites urgentes</p>
                  <p className="text-sm text-gray-400 mt-1">Todos los trámites están al día</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {urgentes.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client);
                        setShowUrgentesModal(false);
                      }}
                      className="p-4 border-2 border-red-300 rounded-xl hover:border-red-400 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-red-50 to-white"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-red-900 text-lg">{client.first_name} {client.last_name}</h3>
                          <p className="text-sm text-red-700 mt-1">{client.case_type || 'No template'}</p>
                          <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ Acción requerida en menos de 72 horas</p>
                        </div>
                        <AlertTriangle className="w-6 h-6 text-red-600 ml-4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PAGOS Modal */}
      {showPagosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-amber-900">{t('dashboard.pagos')}</h2>
                  <p className="text-amber-700 mt-1">{t('dashboard.pagosDesc')}</p>
                </div>
                <button
                  onClick={() => setShowPagosModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {pagos.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-16 h-16 mx-auto text-amber-400 mb-4" />
                  <p className="text-gray-500 font-medium text-lg">No hay pagos pendientes</p>
                  <p className="text-sm text-gray-400 mt-1">Todos los pagos están al día</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pagos.map((client) => {
                    const totalFee = client.payment?.totalFee || 0;
                    const paidAmount = client.payment?.paidAmount || 0;
                    const remaining = totalFee - paidAmount;
                    return (
                      <div
                        key={client.id}
                        onClick={() => {
                          setSelectedClient(client);
                          setShowPagosModal(false);
                        }}
                        className="p-4 border-2 border-amber-200 rounded-xl hover:border-amber-300 hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-amber-50 to-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-amber-900 text-lg">{client.first_name} {client.last_name}</h3>
                            <p className="text-sm text-amber-700 mt-1">{client.case_type || 'No template'}</p>
                            <p className="text-xs text-amber-600 mt-2 font-semibold">
                              Pendiente: €{remaining.toFixed(2)} / Total: €{totalFee.toFixed(2)}
                            </p>
                          </div>
                          <DollarSign className="w-6 h-6 text-amber-600 ml-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Ready to Submit Modal */}
      {showReadyToSubmitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in my-4 sm:my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.readyToSubmitTitle')}</h2>
                <p className="text-slate-600 mt-1">{t('dashboard.readyToSubmitDesc')}</p>
              </div>
              <button
                onClick={() => setShowReadyToSubmitModal(false)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {readyToSubmit.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <p className="text-slate-500 font-medium text-lg">{t('dashboard.allSubmitted')}</p>
                <p className="text-sm text-slate-400 mt-1">{t('dashboard.noAwaiting')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {readyToSubmit.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client);
                      setShowReadyToSubmitModal(false);
                    }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 bg-emerald-50 rounded-xl hover:bg-emerald-100 border-2 border-emerald-200 transition-all duration-200 group cursor-pointer hover:border-emerald-300 hover:shadow-md"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-emerald-200 group-hover:bg-emerald-300 p-2.5 rounded-lg transition-colors flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-base sm:text-lg group-hover:text-slate-700 transition-colors truncate">
                          {client.first_name} {client.last_name}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 truncate mt-1">{client.case_type || t('clients.noTemplate')}</p>
                      </div>
                    </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="inline-flex items-center space-x-2 bg-white px-3 sm:px-4 py-2 rounded-lg border border-green-200">
                          <span className="text-base sm:text-lg font-bold text-green-700">
                            {client.required_documents?.filter((d: any) => d.submitted).length || 0}
                          </span>
                          <span className="text-slate-400">/</span>
                          <span className="text-base sm:text-lg font-semibold text-slate-600">
                            {client.required_documents?.length || 0}
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1 font-medium">{t('dashboard.documents')}</p>
                      </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Awaiting Submission Modal */}
      {showAwaitingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in my-4 sm:my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.awaitingSubmissionTitle')}</h2>
                <p className="text-slate-600 mt-1">{t('dashboard.awaitingSubmissionDesc')}</p>
              </div>
              <button
                onClick={() => setShowAwaitingModal(false)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {awaitingSubmission.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <p className="text-slate-500 font-medium text-lg">{t('dashboard.allSubmitted')}</p>
                <p className="text-sm text-slate-400 mt-1">{t('dashboard.noAwaiting')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {awaitingSubmission.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client);
                      setShowAwaitingModal(false);
                    }}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 bg-amber-50 rounded-xl hover:bg-amber-100 border-2 border-amber-200 transition-all duration-200 group cursor-pointer hover:border-amber-300 hover:shadow-md"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-amber-200 group-hover:bg-amber-300 p-2.5 rounded-lg transition-colors flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-amber-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-base sm:text-lg group-hover:text-slate-700 transition-colors truncate">
                          {client.first_name} {client.last_name}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 gap-1 sm:gap-0">
                          <p className="text-xs sm:text-sm text-slate-600 truncate">{client.case_type || 'No template assigned'}</p>
                          {(() => {
                            // Calculate reminder status
                            const calculateReminderStatus = () => {
                              const pendingRequiredDocs = client.required_documents?.filter((d: any) => !d.submitted && !d.isOptional).length || 0;
                              if (pendingRequiredDocs === 0) return null;
                              
                              // Find last activity date
                              // If no documents uploaded, reminder starts from client creation date
                              // If documents uploaded, reminder starts from most recent upload date
                              const submittedDocs = client.required_documents?.filter((d: any) => d.submitted && d.uploadedAt) || [];
                              let lastActivityDate: Date;
                              let hasNoUploads = false;
                              
                              if (submittedDocs.length > 0) {
                                const uploadDates = submittedDocs
                                  .map((d: any) => new Date(d.uploadedAt))
                                  .sort((a: Date, b: Date) => b.getTime() - a.getTime());
                                lastActivityDate = uploadDates[0];
                              } else {
                                // No documents uploaded yet - reminder starts from client creation
                                lastActivityDate = new Date(client.created_at);
                                hasNoUploads = true;
                              }
                              
                              const reminderDays = client.reminder_interval_days || 10;
                              const nextReminderDate = new Date(lastActivityDate);
                              nextReminderDate.setDate(nextReminderDate.getDate() + reminderDays);
                              
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              nextReminderDate.setHours(0, 0, 0, 0);
                              
                              const daysUntilReminder = Math.ceil((nextReminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              
                              return {
                                daysUntilReminder,
                                isOverdue: daysUntilReminder < 0,
                                isDueSoon: daysUntilReminder <= 2 && daysUntilReminder >= 0,
                                hasNoUploads, // Track if no documents uploaded yet
                              };
                            };
                            
                            const reminderStatus = calculateReminderStatus();
                            
                            if (!reminderStatus) {
                              return (
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <p className="text-xs text-amber-700 font-medium">
                                    {t('dashboard.interval')}: {client.reminder_interval_days} {t('dashboard.days')}
                                  </p>
                                </div>
                              );
                            }
                            
                            const { daysUntilReminder, isOverdue, isDueSoon, hasNoUploads } = reminderStatus;
                            
                            return (
                              <div className="flex items-center space-x-1">
                                <Clock className={`w-3.5 h-3.5 ${
                                  isOverdue ? 'text-red-500' : isDueSoon ? 'text-amber-600' : 'text-amber-500'
                                }`} />
                                <p className={`text-xs font-medium ${
                                  isOverdue ? 'text-red-700' : isDueSoon ? 'text-amber-700' : 'text-amber-600'
                                }`}>
                                  {isOverdue 
                                    ? `⚠️ ${t('dashboard.overdue')} ${Math.abs(daysUntilReminder)} ${t('dashboard.days')}${hasNoUploads ? ` ${t('dashboard.noDocs')}` : ''}`
                                    : daysUntilReminder === 0
                                    ? `⚠️ ${t('dashboard.dueToday')}`
                                    : isDueSoon
                                    ? `⚠️ ${t('dashboard.dueIn')} ${daysUntilReminder} ${t('dashboard.days')}${hasNoUploads ? ` ${t('dashboard.noDocs')}` : ''}`
                                    : `${t('dashboard.dueIn')} ${daysUntilReminder} ${t('dashboard.days')}${hasNoUploads ? ` ${t('dashboard.noDocs')}` : ''}`
                                  }
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <div className="inline-flex items-center space-x-2 bg-white px-3 sm:px-4 py-2 rounded-lg border border-amber-200">
                        <span className="text-base sm:text-lg font-bold text-slate-900">
                          {client.required_documents?.filter((d: any) => d.submitted).length || 0}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-base sm:text-lg font-semibold text-slate-600">
                          {client.required_documents?.length || 0}
                        </span>
                      </div>
                      <p className="text-xs text-amber-600 mt-1 font-medium">{t('dashboard.documents')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submitted to Administrative Modal */}
      {showSubmittedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in my-4 sm:my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t('dashboard.submittedToAdminTitle')}</h2>
                <p className="text-slate-600 mt-1">{t('dashboard.submittedToAdminDesc')}</p>
              </div>
              <button
                onClick={() => setShowSubmittedModal(false)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submittedToAdmin.length === 0 ? (
              <div className="text-center py-12">
                <Send className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium text-lg">{t('dashboard.noSubmitted')}</p>
                <p className="text-sm text-slate-400 mt-1">{t('dashboard.submitCases')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submittedToAdmin.map((client) => {
                  // Calculate administrative silence countdown
                  const calculateSilenceCountdown = () => {
                    if (!client.application_date) return null;
                    const applicationDate = new Date(client.application_date);
                    const silenceDays = client.administrative_silence_days || 60;
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
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client);
                        setShowSubmittedModal(false);
                      }}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 group cursor-pointer hover:shadow-md ${
                        silenceInfo?.isExpired
                          ? 'bg-red-50 border-red-200 hover:border-red-300'
                          : silenceInfo?.isExpiringSoon
                          ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                          : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div className={`p-2 sm:p-2.5 rounded-lg transition-colors flex-shrink-0 ${
                          silenceInfo?.isExpired
                            ? 'bg-red-200 group-hover:bg-red-300'
                            : silenceInfo?.isExpiringSoon
                            ? 'bg-orange-200 group-hover:bg-orange-300'
                            : 'bg-emerald-200 group-hover:bg-emerald-300'
                        }`}>
                          <CheckCircle className={`w-5 h-5 ${
                            silenceInfo?.isExpired
                              ? 'text-red-700'
                              : silenceInfo?.isExpiringSoon
                              ? 'text-orange-700'
                              : 'text-emerald-700'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-base sm:text-lg group-hover:text-slate-700 transition-colors truncate">
                            {client.first_name} {client.last_name}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 gap-1 sm:gap-0">
                            <p className="text-xs sm:text-sm text-slate-600 truncate">{client.case_type || 'No template assigned'}</p>
                            {client.application_date && (
                              <div className="flex items-center space-x-1">
                                <Clock className={`w-3.5 h-3.5 ${
                                  silenceInfo?.isExpired
                                    ? 'text-red-600'
                                    : silenceInfo?.isExpiringSoon
                                    ? 'text-orange-600'
                                    : 'text-emerald-600'
                                }`} />
                                <p className={`text-xs font-medium ${
                                  silenceInfo?.isExpired
                                    ? 'text-red-700'
                                    : silenceInfo?.isExpiringSoon
                                    ? 'text-orange-700'
                                    : 'text-emerald-700'
                                }`}>
                                  {silenceInfo?.isExpired
                                    ? `${t('dashboard.expired')} ${Math.abs(silenceInfo.daysRemaining)} ${t('dashboard.daysAgo')}`
                                    : silenceInfo?.isExpiringSoon
                                    ? t('dashboard.expiringSoon', { days: silenceInfo.daysRemaining })
                                    : `${silenceInfo?.daysRemaining || 0} ${t('dashboard.daysRemaining')}`}
                                </p>
                              </div>
                            )}
                          </div>
                          {client.application_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              {t('dashboard.submitted')}: {new Date(client.application_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className={`inline-flex items-center space-x-2 bg-white px-3 sm:px-4 py-2 rounded-lg border ${
                          silenceInfo?.isExpired
                            ? 'border-red-200'
                            : silenceInfo?.isExpiringSoon
                            ? 'border-orange-200'
                            : 'border-emerald-200'
                        }`}>
                          <span className="text-base sm:text-lg font-bold text-slate-900">
                            {client.required_documents?.filter((d: any) => d.submitted).length || 0}
                          </span>
                          <span className="text-slate-400">/</span>
                          <span className="text-base sm:text-lg font-semibold text-slate-600">
                            {client.required_documents?.length || 0}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 font-medium ${
                          silenceInfo?.isExpired
                            ? 'text-red-600'
                            : silenceInfo?.isExpiringSoon
                            ? 'text-orange-600'
                            : 'text-emerald-600'
                        }`}>
                          {t('dashboard.documents')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

