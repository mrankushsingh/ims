// Use environment variable in production, relative path in development
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  
  // Try to get Firebase ID token
  try {
    const { getIdToken } = await import('./firebase.js');
    const token = await getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    // Firebase not configured or user not logged in
  }
  
  return headers;
}

export const api = {
  async getCaseTemplates() {
    const response = await fetch(`${API_URL}/case-templates`);
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  },

  async createCaseTemplate(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/case-templates`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create template' }));
      throw new Error(error.error || error.details || 'Failed to create template');
    }
    return response.json();
  },

  async updateCaseTemplate(id: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/case-templates/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update template');
    return response.json();
  },

  async deleteCaseTemplate(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/case-templates/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete template');
    return response.json();
  },

  async getClients() {
    const response = await fetch(`${API_URL}/clients`);
    if (!response.ok) throw new Error('Failed to fetch clients');
    return response.json();
  },

  async getClient(id: string) {
    const response = await fetch(`${API_URL}/clients/${id}`);
    if (!response.ok) throw new Error('Failed to fetch client');
    return response.json();
  },

  async createClient(data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create client');
    return response.json();
  },

  async updateClient(id: string, data: any) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update client');
    return response.json();
  },

  async uploadDocument(clientId: string, documentCode: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const token = await (await import('./firebase.js')).getIdToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/clients/${clientId}/documents/${documentCode}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload document' }));
      throw new Error(error.error || 'Failed to upload document');
    }

    return response.json();
  },

  async addPayment(clientId: string, amount: number, method: string, note?: string) {
    const client = await this.getClient(clientId);
    const newPayment = {
      amount,
      date: new Date().toISOString(),
      method,
      note: note || undefined,
    };
    
    const updatedPayments = [...(client.payment.payments || []), newPayment];
    const newPaidAmount = (client.payment.paidAmount || 0) + amount;

    return this.updateClient(clientId, {
      payment: {
        ...client.payment,
        paidAmount: newPaidAmount,
        payments: updatedPayments,
      },
    });
  },

  async updateNotes(clientId: string, notes: string) {
    return this.updateClient(clientId, { notes });
  },

  async uploadAdditionalDocument(clientId: string, name: string, description: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }

    const token = await (await import('./firebase.js')).getIdToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/clients/${clientId}/additional-documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload additional document' }));
      throw new Error(error.error || 'Failed to upload additional document');
    }

    return response.json();
  },

  async removeDocument(clientId: string, documentCode: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${clientId}/documents/${documentCode}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to remove document' }));
      throw new Error(error.error || 'Failed to remove document');
    }

    return response.json();
  },

  async removeAdditionalDocument(clientId: string, documentId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${clientId}/additional-documents/${documentId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to remove additional document' }));
      throw new Error(error.error || 'Failed to remove additional document');
    }

    return response.json();
  },

  // Requested Documents (only for submitted clients)
  async addRequestedDocument(clientId: string, data: { name: string; description?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${clientId}/requested-documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to add requested document' }));
      throw new Error(error.error || 'Failed to add requested document');
    }
    return response.json();
  },

  async uploadRequestedDocument(clientId: string, documentCode: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = await getAuthHeaders();
    // Remove Content-Type header to let browser set it with boundary for FormData
    delete (headers as any)['Content-Type'];
    const response = await fetch(`${API_URL}/clients/${clientId}/requested-documents/${documentCode}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload requested document' }));
      throw new Error(error.error || 'Failed to upload requested document');
    }
    return response.json();
  },

  async removeRequestedDocument(clientId: string, documentCode: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${clientId}/requested-documents/${documentCode}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to remove requested document' }));
      throw new Error(error.error || 'Failed to remove requested document');
    }
    return response.json();
  },

  async setRequestedDocumentsReminderDuration(clientId: string, durationDays: number) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${clientId}/requested-documents-reminder-duration`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ durationDays }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update reminder duration' }));
      throw new Error(error.error || 'Failed to update reminder duration');
    }
    return response.json();
  },

  async updateRequestedDocumentsLastReminder(clientId: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${clientId}/requested-documents-last-reminder`, {
      method: 'PUT',
      headers,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update last reminder date' }));
      throw new Error(error.error || 'Failed to update last reminder date');
    }
    return response.json();
  },

  // APORTAR DOCUMENTACIÓN
  async uploadAportarDocumentacion(clientId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = await getAuthHeaders();
    delete (headers as any)['Content-Type'];
    const response = await fetch(`${API_URL}/clients/${clientId}/aportar-documentacion/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload document' }));
      throw new Error(error.error || 'Failed to upload document');
    }
    return response.json();
  },

  async removeAportarDocumentacion(clientId: string, documentCode: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${clientId}/aportar-documentacion/${documentCode}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to remove document' }));
      throw new Error(error.error || 'Failed to remove document');
    }
    return response.json();
  },

  // REQUERIMIENTO
  async uploadRequerimiento(clientId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = await getAuthHeaders();
    delete (headers as any)['Content-Type'];
    const response = await fetch(`${API_URL}/clients/${clientId}/requerimiento/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload document' }));
      throw new Error(error.error || 'Failed to upload document');
    }
    return response.json();
  },

  async removeRequerimiento(clientId: string, documentCode: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${clientId}/requerimiento/${documentCode}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to remove document' }));
      throw new Error(error.error || 'Failed to remove document');
    }
    return response.json();
  },

  // RESOLUCIÓN
  async uploadResolucion(clientId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = await getAuthHeaders();
    delete (headers as any)['Content-Type'];
    const response = await fetch(`${API_URL}/clients/${clientId}/resolucion/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload document' }));
      throw new Error(error.error || 'Failed to upload document');
    }
    return response.json();
  },

  async removeResolucion(clientId: string, documentCode: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${clientId}/resolucion/${documentCode}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to remove document' }));
      throw new Error(error.error || 'Failed to remove document');
    }
    return response.json();
  },

  async submitToAdministrative(clientId: string) {
    return this.updateClient(clientId, {
      submitted_to_immigration: true,
      application_date: new Date().toISOString(),
    });
  },

  async deleteClient(id: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clients/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete client');
    return response.json();
  },
};

