import { useState, useEffect } from 'react';
import { Plus, Users, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import { Client } from '../types';
import CreateClientModal from './CreateClientModal';
import ClientDetailsModal from './ClientDetailsModal';

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await api.getClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening client details when clicking delete
    
    const confirmMessage = `Are you sure you want to delete ${client.first_name} ${client.last_name}? This action cannot be undone and will permanently remove all client data, documents, and records.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await api.deleteClient(client.id);
      await loadClients();
    } catch (error: any) {
      alert(error.message || 'Failed to delete client');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-200 pb-4 sm:pb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 tracking-tight">Clients</h2>
          <p className="text-slate-600 text-base sm:text-lg">Manage your immigration clients and cases</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-900 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold professional-shadow-lg hover:bg-slate-800 hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>New Client</span>
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl sm:rounded-2xl professional-shadow-lg border border-gray-100 p-8 sm:p-16 text-center animate-scale-in">
          <div className="bg-slate-100 w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Users className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">No clients yet</h3>
          <p className="text-slate-500 mb-6 sm:mb-8 text-base sm:text-lg">Create your first client to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-slate-900 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-semibold hover:bg-slate-800 transition-all professional-shadow-lg hover:shadow-xl"
          >
            Create Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {clients.map((client, index) => (
            <div
              key={client.id}
              className="bg-white rounded-xl sm:rounded-2xl professional-shadow-lg border border-gray-100 p-4 sm:p-6 card-hover animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3
                    onClick={() => setSelectedClient(client)}
                    className="text-xl font-bold text-slate-900 mb-1 cursor-pointer hover:text-slate-700 transition-colors"
                  >
                    {client.first_name} {client.last_name}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">{client.case_type || 'No template assigned'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <button
                    onClick={(e) => handleDeleteClient(client, e)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete client"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Documents</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-900">
                      {client.required_documents?.filter((d: any) => d.submitted).length || 0}
                    </span>
                    <span className="text-slate-300">/</span>
                    <span className="text-sm font-semibold text-slate-600">
                      {client.required_documents?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600">Payment</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-bold text-emerald-600">
                      €{client.payment?.paidAmount || 0}
                    </span>
                    <span className="text-slate-300">/</span>
                    <span className="text-sm font-semibold text-slate-600">
                      €{client.payment?.totalFee || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateClientModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadClients();
          }}
        />
      )}

      {selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSuccess={() => {
            loadClients();
          }}
        />
      )}
    </div>
  );
}

