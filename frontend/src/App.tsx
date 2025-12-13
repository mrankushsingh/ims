import { useState, useEffect } from 'react';
import { FileText, Users, LayoutDashboard, Menu, X, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Templates from './components/Templates';
import Clients from './components/Clients';
import Notifications from './components/Notifications';
import ClientDetailsModal from './components/ClientDetailsModal';
import Login from './components/Login';
import Logo from './components/Logo';
import { ToastContainer, subscribeToToasts, Toast } from './components/Toast';
import { onAuthChange, getCurrentUser, logout as firebaseLogout, isFirebaseAvailable } from './utils/firebase';
import { Client } from './types';

type View = 'dashboard' | 'templates' | 'clients';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Check if Firebase is available
    if (!isFirebaseAvailable()) {
      console.error('Firebase Authentication is not configured. Please set Firebase environment variables.');
      // Don't set authenticated - user must configure Firebase
      return;
    }

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthChange((user) => {
      setIsAuthenticated(!!user);
    });

    // Check initial auth state
    const user = getCurrentUser();
    if (user) {
      setIsAuthenticated(true);
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Subscribe to toast notifications
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    if (!isFirebaseAvailable()) {
      console.error('Firebase is not configured');
      setIsAuthenticated(false);
      return;
    }

    try {
      await firebaseLogout();
      setIsAuthenticated(false);
    } catch (error: any) {
      console.error('Logout error:', error);
      // Still set authenticated to false even if logout fails
      setIsAuthenticated(false);
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header 
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'linear-gradient(135deg, rgba(180, 83, 9, 0.85) 0%, rgba(154, 52, 18, 0.9) 50%, rgba(180, 83, 9, 0.85) 100%)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Logo size="md" animated={true} />
              <div className="hidden sm:block">
                <p className="text-xs text-amber-200/80 font-medium uppercase tracking-wider">Immigration Case Manager</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              <nav className="flex space-x-2 bg-amber-900/40 backdrop-blur-sm p-1.5 rounded-xl border border-amber-700/30">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-4 sm:px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    currentView === 'dashboard'
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-amber-900 shadow-lg shadow-yellow-500/30 scale-105'
                      : 'text-amber-100 hover:bg-amber-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </div>
                </button>
                <button
                  onClick={() => setCurrentView('templates')}
                  className={`px-4 sm:px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    currentView === 'templates'
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-amber-900 shadow-lg shadow-yellow-500/30 scale-105'
                      : 'text-amber-100 hover:bg-amber-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Templates</span>
                  </div>
                </button>
                <button
                  onClick={() => setCurrentView('clients')}
                  className={`px-4 sm:px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    currentView === 'clients'
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-amber-900 shadow-lg shadow-yellow-500/30 scale-105'
                      : 'text-amber-100 hover:bg-amber-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Clients</span>
                  </div>
                </button>
              </nav>
              <Notifications onClientClick={setSelectedClient} />
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 text-amber-100 hover:bg-amber-800/50 hover:text-white rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              <Notifications onClientClick={setSelectedClient} />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-amber-100 hover:bg-amber-800/50 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                  <div className="md:hidden border-t border-amber-700/30 pt-4 pb-4 animate-fade-in">
                    <nav className="flex flex-col space-y-2">
                      <button
                        onClick={() => {
                          setCurrentView('dashboard');
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 text-left ${
                          currentView === 'dashboard'
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-amber-900 shadow-lg'
                            : 'text-amber-100 hover:bg-amber-800/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <LayoutDashboard className="w-5 h-5" />
                          <span>Dashboard</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setCurrentView('templates');
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 text-left ${
                          currentView === 'templates'
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-amber-900 shadow-lg'
                            : 'text-amber-100 hover:bg-amber-800/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5" />
                          <span>Templates</span>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setCurrentView('clients');
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 text-left ${
                          currentView === 'clients'
                            ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-amber-900 shadow-lg'
                            : 'text-amber-100 hover:bg-amber-800/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Users className="w-5 h-5" />
                          <span>Clients</span>
                        </div>
                      </button>
                      <div className="pt-2 border-t border-amber-700/30 mt-2">
                        <button
                          onClick={() => {
                            handleLogout();
                            setMobileMenuOpen(false);
                          }}
                          className="w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 text-left text-red-300 hover:bg-red-900/30 flex items-center space-x-3"
                        >
                          <LogOut className="w-5 h-5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </nav>
                  </div>
                )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="animate-fade-in">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'templates' && <Templates />}
          {currentView === 'clients' && <Clients />}
        </div>
      </main>

      {selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onSuccess={() => {
            setSelectedClient(null);
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={handleCloseToast} />
    </div>
  );
}

export default App;

