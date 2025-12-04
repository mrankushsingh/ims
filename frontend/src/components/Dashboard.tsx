import { useEffect, useState } from 'react';
import { FileText, Users, CheckCircle, Clock, Send, X, AlertCircle } from 'lucide-react';
import { api } from '../utils/api';
import { CaseTemplate, Client } from '../types';
import ClientDetailsModal from './ClientDetailsModal';

export default function Dashboard() {
  const [templates, setTemplates] = useState<CaseTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAwaitingModal, setShowAwaitingModal] = useState(false);
  const [showSubmittedModal, setShowSubmittedModal] = useState(false);

  useEffect(() => {
    loadData();
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

  const totalDocs = clients.reduce((sum, client) => sum + (client.required_documents?.length || 0), 0);
  const submittedDocs = clients.reduce(
    (sum, client) => sum + (client.required_documents?.filter((d: any) => d.submitted).length || 0),
    0
  );
  const submittedToAdmin = clients.filter((client) => client.submitted_to_immigration);
  const awaitingSubmission = clients.filter((client) => !client.submitted_to_immigration);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-gray-200 pb-4 sm:pb-6">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 tracking-tight">Dashboard</h2>
        <p className="text-slate-600 text-base sm:text-lg">Comprehensive overview of your immigration cases</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 professional-shadow-lg border border-gray-100 card-hover animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-slate-100 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-slate-700" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Templates</span>
          </div>
          <p className="text-4xl font-bold text-slate-900 mb-1">{templates.length}</p>
          <p className="text-sm text-slate-500">Active case templates</p>
        </div>

        <div className="bg-white rounded-2xl p-6 professional-shadow-lg border border-gray-100 card-hover animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-50 p-3 rounded-xl">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clients</span>
          </div>
          <p className="text-4xl font-bold text-slate-900 mb-1">{clients.length}</p>
          <p className="text-sm text-slate-500">Total active clients</p>
        </div>

        <div className="bg-white rounded-2xl p-6 professional-shadow-lg border border-gray-100 card-hover animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted</span>
          </div>
          <p className="text-4xl font-bold text-slate-900 mb-1">{submittedDocs}/{totalDocs}</p>
          <p className="text-sm text-slate-500">Documents completed</p>
        </div>

        <div 
          onClick={() => setShowAwaitingModal(true)}
          className="bg-white rounded-2xl p-6 professional-shadow-lg border border-gray-100 card-hover animate-slide-up cursor-pointer hover:border-amber-300 hover:shadow-xl transition-all"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-4xl font-bold text-slate-900 mb-1">{awaitingSubmission.length}</p>
          <p className="text-sm text-slate-500">Awaiting submission</p>
          <p className="text-xs text-amber-600 mt-2 font-medium">Click to view →</p>
        </div>

        <div 
          onClick={() => setShowSubmittedModal(true)}
          className="bg-white rounded-2xl p-6 professional-shadow-lg border border-gray-100 card-hover animate-slide-up cursor-pointer hover:border-indigo-300 hover:shadow-xl transition-all"
          style={{ animationDelay: '0.4s' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-indigo-50 p-3 rounded-xl">
              <Send className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Administrative</span>
          </div>
          <p className="text-4xl font-bold text-slate-900 mb-1">{submittedToAdmin.length}</p>
          <p className="text-sm text-slate-500">
            {submittedToAdmin.length === 1 ? 'Case submitted' : 'Cases submitted'}
          </p>
          <p className="text-xs text-indigo-600 mt-2 font-medium">Click to view →</p>
        </div>
      </div>

      {/* Recent Clients */}
      <div className="bg-white rounded-xl sm:rounded-2xl professional-shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8 animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Recent Clients</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Latest client activity</p>
          </div>
        </div>
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No clients yet</p>
            <p className="text-sm text-slate-400 mt-1">Create your first client to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.slice(0, 5).map((client) => (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-5 bg-slate-50 rounded-xl hover:bg-slate-100 border border-slate-200/50 transition-all duration-200 group cursor-pointer hover:border-slate-300 hover:shadow-md gap-3 sm:gap-0"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="bg-slate-200 group-hover:bg-slate-300 p-2.5 rounded-lg transition-colors">
                    <Users className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-lg group-hover:text-slate-700 transition-colors">
                      {client.first_name} {client.last_name}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-slate-500">{client.case_type || 'No template assigned'}</p>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-xs text-slate-500 font-medium">
                          Reminder: {client.reminder_interval_days} days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <div className="inline-flex items-center space-x-2 bg-white px-3 sm:px-4 py-2 rounded-lg border border-slate-200">
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      {client.required_documents?.filter((d: any) => d.submitted).length || 0}
                    </span>
                    <span className="text-slate-400">/</span>
                    <span className="text-base sm:text-lg font-semibold text-slate-600">
                      {client.required_documents?.length || 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">documents</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Awaiting Submission Modal */}
      {showAwaitingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in my-4 sm:my-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Clients Awaiting Submission</h2>
                <p className="text-slate-600 mt-1">Clients not yet submitted to administrative authority</p>
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
                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                <p className="text-slate-500 font-medium text-lg">All clients have been submitted</p>
                <p className="text-sm text-slate-400 mt-1">No clients awaiting submission</p>
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
                    className="flex items-center justify-between p-5 bg-amber-50 rounded-xl hover:bg-amber-100 border-2 border-amber-200 transition-all duration-200 group cursor-pointer hover:border-amber-300 hover:shadow-md"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-amber-200 group-hover:bg-amber-300 p-2.5 rounded-lg transition-colors">
                        <AlertCircle className="w-5 h-5 text-amber-700" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-lg group-hover:text-slate-700 transition-colors">
                          {client.first_name} {client.last_name}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-slate-600">{client.case_type || 'No template assigned'}</p>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <p className="text-xs text-amber-700 font-medium">
                              Reminder: {client.reminder_interval_days} days
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-amber-200">
                        <span className="text-lg font-bold text-slate-900">
                          {client.required_documents?.filter((d: any) => d.submitted).length || 0}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-lg font-semibold text-slate-600">
                          {client.required_documents?.length || 0}
                        </span>
                      </div>
                      <p className="text-xs text-amber-600 mt-1 font-medium">documents</p>
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
                <h2 className="text-2xl font-bold text-slate-900">Cases Submitted to Administrative</h2>
                <p className="text-slate-600 mt-1">Clients submitted to administrative authority</p>
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
                <p className="text-slate-500 font-medium text-lg">No cases submitted yet</p>
                <p className="text-sm text-slate-400 mt-1">Submit cases to administrative authority to see them here</p>
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
                      className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-200 group cursor-pointer hover:shadow-md ${
                        silenceInfo?.isExpired
                          ? 'bg-red-50 border-red-200 hover:border-red-300'
                          : silenceInfo?.isExpiringSoon
                          ? 'bg-orange-50 border-orange-200 hover:border-orange-300'
                          : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`p-2.5 rounded-lg transition-colors ${
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
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 text-lg group-hover:text-slate-700 transition-colors">
                            {client.first_name} {client.last_name}
                          </p>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-slate-600">{client.case_type || 'No template assigned'}</p>
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
                                    ? `Expired ${Math.abs(silenceInfo.daysRemaining)} days ago`
                                    : silenceInfo?.isExpiringSoon
                                    ? `⚠️ ${silenceInfo.daysRemaining} days left`
                                    : `${silenceInfo?.daysRemaining || 0} days remaining`}
                                </p>
                              </div>
                            )}
                          </div>
                          {client.application_date && (
                            <p className="text-xs text-slate-500 mt-1">
                              Submitted: {new Date(client.application_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border ${
                          silenceInfo?.isExpired
                            ? 'border-red-200'
                            : silenceInfo?.isExpiringSoon
                            ? 'border-orange-200'
                            : 'border-emerald-200'
                        }`}>
                          <span className="text-lg font-bold text-slate-900">
                            {client.required_documents?.filter((d: any) => d.submitted).length || 0}
                          </span>
                          <span className="text-slate-400">/</span>
                          <span className="text-lg font-semibold text-slate-600">
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
                          documents
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

