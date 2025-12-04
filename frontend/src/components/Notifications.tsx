import { useState, useEffect } from 'react';
import { Bell, X, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../utils/api';
import { Client } from '../types';

interface Reminder {
  client: Client;
  type: 'reminder' | 'silence_expiring' | 'silence_expired' | 'documents_pending';
  message: string;
  priority: 'high' | 'medium' | 'low';
  daysRemaining?: number;
}

interface Props {
  onClientClick: (client: Client) => void;
}

export default function Notifications({ onClientClick }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopups, setShowPopups] = useState(true);

  useEffect(() => {
    loadReminders();
    const interval = setInterval(loadReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const clients = await api.getClients();
      const newReminders: Reminder[] = [];

      clients.forEach((client: Client) => {
        // Check for administrative silence expiring/expired
        if (client.submitted_to_immigration && client.application_date) {
          const applicationDate = new Date(client.application_date);
          const silenceDays = client.administrative_silence_days || 60;
          const endDate = new Date(applicationDate);
          endDate.setDate(endDate.getDate() + silenceDays);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (daysRemaining < 0) {
            newReminders.push({
              client,
              type: 'silence_expired',
              message: `Administrative silence period expired ${Math.abs(daysRemaining)} days ago for ${client.first_name} ${client.last_name}`,
              priority: 'high',
              daysRemaining,
            });
          } else if (daysRemaining <= 7) {
            newReminders.push({
              client,
              type: 'silence_expiring',
              message: `Administrative silence period expiring in ${daysRemaining} days for ${client.first_name} ${client.last_name}`,
              priority: daysRemaining <= 3 ? 'high' : 'medium',
              daysRemaining,
            });
          }
        }

        // Check for reminder interval based on document activity
        // Only show reminder if client has pending documents and hasn't been submitted
        if (!client.submitted_to_immigration) {
          const pendingDocs = client.required_documents?.filter((d: any) => !d.submitted).length || 0;
          
          if (pendingDocs > 0) {
            // Find the most recent document upload date
            const submittedDocs = client.required_documents?.filter((d: any) => d.submitted && d.uploadedAt) || [];
            let lastDocumentDate: Date;
            
            if (submittedDocs.length > 0) {
              // Use the most recent document upload date
              const uploadDates = submittedDocs
                .map((d: any) => new Date(d.uploadedAt))
                .sort((a: Date, b: Date) => b.getTime() - a.getTime());
              lastDocumentDate = uploadDates[0];
            } else {
              // If no documents uploaded yet, use client creation date
              lastDocumentDate = new Date(client.created_at);
            }

            const reminderDays = client.reminder_interval_days || 10;
            const nextReminderDate = new Date(lastDocumentDate);
            nextReminderDate.setDate(nextReminderDate.getDate() + reminderDays);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            nextReminderDate.setHours(0, 0, 0, 0);
            
            const daysSinceReminder = Math.floor((today.getTime() - nextReminderDate.getTime()) / (1000 * 60 * 60 * 24));

            // Show reminder if the interval has passed
            if (daysSinceReminder >= 0) {
              const submittedCount = client.required_documents?.filter((d: any) => d.submitted).length || 0;
              const totalCount = client.required_documents?.length || 0;
              
              newReminders.push({
                client,
                type: 'reminder',
                message: `${pendingDocs} document(s) still pending for ${client.first_name} ${client.last_name}. Last activity: ${submittedCount}/${totalCount} documents submitted.`,
                priority: daysSinceReminder >= 7 ? 'high' : daysSinceReminder >= 3 ? 'medium' : 'low',
                daysRemaining: -daysSinceReminder, // Negative means overdue
              });
            }
          }
        }
      });

      setReminders(newReminders);
      
      // Show pop-ups for high priority reminders
      if (showPopups && newReminders.filter(r => r.priority === 'high').length > 0) {
        setTimeout(() => {
          setShowPopups(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = reminders.length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'silence_expired':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'silence_expiring':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'documents_pending':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <>
      {/* Notification Icon */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden animate-scale-in">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Notifications</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {unreadCount} {unreadCount === 1 ? 'reminder' : 'reminders'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[500px]">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-700 mx-auto"></div>
                  </div>
                ) : reminders.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">All caught up!</p>
                    <p className="text-sm text-slate-400 mt-1">No reminders at this time</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {reminders.map((reminder, index) => (
                      <div
                        key={`${reminder.client.id}-${reminder.type}-${index}`}
                        onClick={() => {
                          onClientClick(reminder.client);
                          setIsOpen(false);
                        }}
                        className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors border-l-4 ${
                          reminder.priority === 'high'
                            ? 'border-l-red-500'
                            : reminder.priority === 'medium'
                            ? 'border-l-orange-500'
                            : 'border-l-blue-500'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${getPriorityColor(reminder.priority)}`}>
                            {getIcon(reminder.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {reminder.client.first_name} {reminder.client.last_name}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">{reminder.message}</p>
                            {reminder.type === 'reminder' && reminder.daysRemaining !== undefined && (
                              <p className={`text-xs font-medium mt-1 ${
                                reminder.daysRemaining < 0
                                  ? 'text-red-600'
                                  : reminder.daysRemaining === 0
                                  ? 'text-orange-600'
                                  : 'text-blue-600'
                              }`}>
                                {reminder.daysRemaining < 0
                                  ? `⚠️ Reminder overdue by ${Math.abs(reminder.daysRemaining)} day(s)`
                                  : reminder.daysRemaining === 0
                                  ? '⏰ Reminder due today'
                                  : `${reminder.daysRemaining} day(s) until reminder`}
                              </p>
                            )}
                            {reminder.daysRemaining !== undefined && reminder.type !== 'reminder' && (
                              <p className={`text-xs font-medium mt-1 ${
                                reminder.daysRemaining < 0
                                  ? 'text-red-600'
                                  : reminder.daysRemaining <= 7
                                  ? 'text-orange-600'
                                  : 'text-blue-600'
                              }`}>
                                {reminder.daysRemaining < 0
                                  ? `Expired ${Math.abs(reminder.daysRemaining)} days ago`
                                  : `${reminder.daysRemaining} days remaining`}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              {reminder.client.case_type || 'No template'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pop-up Notifications for High Priority */}
      {showPopups && reminders.filter(r => r.priority === 'high').length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-md">
          {reminders
            .filter(r => r.priority === 'high')
            .slice(0, 3)
            .map((reminder, index) => (
              <div
                key={`popup-${reminder.client.id}-${reminder.type}-${index}`}
                className="bg-white rounded-xl shadow-2xl border-2 border-red-200 p-4 animate-slide-up professional-shadow-xl"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start space-x-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    {getIcon(reminder.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {reminder.client.first_name} {reminder.client.last_name}
                      </h4>
                      <button
                        onClick={() => setShowPopups(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-700">{reminder.message}</p>
                    {reminder.type === 'reminder' && reminder.daysRemaining !== undefined && (
                      <p className={`text-xs font-semibold mt-1 ${
                        reminder.daysRemaining < 0 ? 'text-red-600' : 'text-orange-600'
                      }`}>
                        {reminder.daysRemaining < 0
                          ? `⚠️ ${Math.abs(reminder.daysRemaining)} day(s) overdue`
                          : '⏰ Due today'}
                      </p>
                    )}
                    <button
                      onClick={() => {
                        onClientClick(reminder.client);
                        setShowPopups(false);
                      }}
                      className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}

