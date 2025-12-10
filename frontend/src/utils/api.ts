// Use environment variable in production, relative path in development
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Get auth token from localStorage (for future use in API calls)
export const getAuthToken = () => {
  return localStorage.getItem('authToken') || '';
};

// Set auth token in localStorage
export const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token);
};

// Remove auth token from localStorage
export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

export const api = {
  async verifyToken(idToken: string) {
    const response = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to verify token' }));
      throw new Error(error.error || 'Failed to verify token');
    }
    return response.json();
  },
  async getCaseTemplates() {
    const response = await fetch(`${API_URL}/case-templates`);
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  },

  async createCaseTemplate(data: any) {
    const response = await fetch(`${API_URL}/case-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to create template' }));
      throw new Error(error.error || error.details || 'Failed to create template');
    }
    return response.json();
  },

  async updateCaseTemplate(id: string, data: any) {
    const response = await fetch(`${API_URL}/case-templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update template');
    return response.json();
  },

  async deleteCaseTemplate(id: string) {
    const response = await fetch(`${API_URL}/case-templates/${id}`, {
      method: 'DELETE',
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
    const response = await fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create client');
    return response.json();
  },

  async updateClient(id: string, data: any) {
    const response = await fetch(`${API_URL}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update client');
    return response.json();
  },

  async uploadDocument(clientId: string, documentCode: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/clients/${clientId}/documents/${documentCode}`, {
      method: 'POST',
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

    const response = await fetch(`${API_URL}/clients/${clientId}/additional-documents`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to upload additional document' }));
      throw new Error(error.error || 'Failed to upload additional document');
    }

    return response.json();
  },

  async removeDocument(clientId: string, documentCode: string) {
    const response = await fetch(`${API_URL}/clients/${clientId}/documents/${documentCode}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to remove document' }));
      throw new Error(error.error || 'Failed to remove document');
    }

    return response.json();
  },

  async removeAdditionalDocument(clientId: string, documentId: string) {
    const response = await fetch(`${API_URL}/clients/${clientId}/additional-documents/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to remove additional document' }));
      throw new Error(error.error || 'Failed to remove additional document');
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
    const response = await fetch(`${API_URL}/clients/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete client');
    return response.json();
  },
};

