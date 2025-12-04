export interface CaseTemplate {
  id: string;
  name: string;
  description?: string;
  required_documents: RequiredDocument[];
  reminder_interval_days: number;
  administrative_silence_days: number;
  created_at: string;
  updated_at: string;
}

export interface RequiredDocument {
  code: string;
  name: string;
  description?: string;
  submitted?: boolean;
  fileUrl?: string;
  uploadedAt?: string;
  fileName?: string;
  fileSize?: number;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  case_template_id?: string;
  case_type?: string;
  required_documents: RequiredDocument[];
  reminder_interval_days: number;
  administrative_silence_days: number;
  payment: PaymentInfo;
  submitted_to_immigration: boolean;
  application_date?: string;
  notifications: Notification[];
  additional_docs_required: boolean;
  notes?: string;
  additional_documents?: AdditionalDocument[];
  created_at: string;
  updated_at: string;
}

export interface PaymentInfo {
  totalFee: number;
  paidAmount: number;
  payments: Payment[];
}

export interface Payment {
  amount: number;
  date: string;
  method: string;
  note?: string;
}

export interface Notification {
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface AdditionalDocument {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

