import { useState, useEffect } from 'react';
import { FileText, Users, LayoutDashboard, Menu, X, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Templates from './components/Templates';
import Clients from './components/Clients';
import Notifications from './components/Notifications';
import ClientDetailsModal from './components/ClientDetailsModal';
import Login from './components/Login';
import { Client } from './types';

type View = 'dashboard' | 'templates' | 'clients';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-50 professional-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-2 sm:p-3 rounded-xl shadow-lg">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                  <span className="hidden sm:inline">Berliku Law Firm</span>
                  <span className="sm:hidden">Berliku Law</span>
                </h1>
                <p className="hidden sm:block text-xs text-slate-500 font-medium">Professional Case Management</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-3">
              <nav className="flex space-x-2 bg-gray-50/80 p-1.5 rounded-xl border border-gray-200/50">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-4 sm:px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    currentView === 'dashboard'
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900'
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
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900'
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
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105'
                      : 'text-slate-700 hover:bg-white hover:text-slate-900'
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
                className="p-2 text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
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
                className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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
            <div className="md:hidden border-t border-gray-200 pt-4 pb-4 animate-fade-in">
              <nav className="flex flex-col space-y-2">
                <button
                  onClick={() => {
                    setCurrentView('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 text-left ${
                    currentView === 'dashboard'
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'text-slate-700 hover:bg-slate-100'
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
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'text-slate-700 hover:bg-slate-100'
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
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5" />
                    <span>Clients</span>
                  </div>
                </button>
                <div className="pt-2 border-t border-gray-200 mt-2">
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 text-left text-red-600 hover:bg-red-50 flex items-center space-x-3"
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
    </div>
  );
}

export default App;

