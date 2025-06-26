import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { IndianRupee, Menu, Github, Globe, History, Calculator, Save, Eye, EyeOff, X, Mail, Heart, DollarSign, MenuIcon, Crown, Cloud, Smartphone, Shield, FileText, Printer, User, LogOut, Download, Settings, CreditCard, Database, Bell } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { authService, UserProfile } from './lib/auth';
import { cloudStorageService } from './lib/cloudStorage';
import { exportService } from './lib/exportService';
import DenominationCounter from './components/DenominationCounter';
import HistoryTab from './components/HistoryTab';
import SimpleCalculator from './components/SimpleCalculator';
import AuthModal from './components/AuthModal';
import SubscriptionModal from './components/SubscriptionModal';
import PremiumFeatureGate from './components/PremiumFeatureGate';
import UserProfileModal from './components/UserProfileModal';
import EmailVerificationBanner from './components/EmailVerificationBanner';

const CURRENCY_DENOMINATIONS = {
  INR: [
    { value: 500, type: 'note' },
    { value: 200, type: 'note' },
    { value: 100, type: 'note' },
    { value: 50, type: 'note' },
    { value: 20, type: 'note' },
    { value: 10, type: 'note' },
    { value: 5, type: 'note' },
    { value: 2, type: 'coin' },
    { value: 1, type: 'coin' },
  ],
  USD: [
    { value: 100, type: 'note' },
    { value: 50, type: 'note' },
    { value: 20, type: 'note' },
    { value: 10, type: 'note' },
    { value: 5, type: 'note' },
    { value: 1, type: 'note' },
    { value: 0.25, type: 'coin' },
    { value: 0.10, type: 'coin' },
    { value: 0.05, type: 'coin' },
    { value: 0.01, type: 'coin' },
  ]
};

interface CountState {
  [key: number]: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<'counter' | 'history'>('counter');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sendToCalculator, setSendToCalculator] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEmailBanner, setShowEmailBanner] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<'INR' | 'USD'>('INR');
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [counts, setCounts] = useState<CountState>(() => {
    const savedCounts = localStorage.getItem(`denominationCounts_${selectedCurrency}`);
    if (savedCounts) {
      return JSON.parse(savedCounts);
    }
    
    const initialCounts: CountState = {};
    CURRENCY_DENOMINATIONS[selectedCurrency].forEach(denom => {
      initialCounts[denom.value] = 0;
    });
    return initialCounts;
  });

  useEffect(() => {
    if (isSupabaseConfigured()) {
      checkAuth();
      
      // Listen for auth changes
      const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
          await syncFromCloud();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  useEffect(() => {
    const savedCounts = localStorage.getItem(`denominationCounts_${selectedCurrency}`);
    if (savedCounts) {
      setCounts(JSON.parse(savedCounts));
    } else {
      const initialCounts: CountState = {};
      CURRENCY_DENOMINATIONS[selectedCurrency].forEach(denom => {
        initialCounts[denom.value] = 0;
      });
      setCounts(initialCounts);
    }
  }, [selectedCurrency]);

  // Check for premium features access and show auth/subscription modals
  const checkPremiumAccess = (featureName: string) => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }
    
    if (!authService.isEmailVerified(user, userProfile)) {
      setShowEmailBanner(true);
      return false;
    }
    
    if (!authService.hasPremiumAccess(userProfile)) {
      setShowSubscriptionModal(true);
      return false;
    }
    
    return true;
  };

  const checkAuth = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        await loadUserProfile(currentUser.id);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await authService.getUserProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const syncToCloud = async () => {
    if (!user || !authService.hasPremiumAccess(userProfile)) return;
    
    setSyncStatus('syncing');
    try {
      await cloudStorageService.syncToCloud(user.id, selectedCurrency);
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Sync to cloud failed:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const syncFromCloud = async () => {
    if (!user || !authService.hasPremiumAccess(userProfile)) return;
    
    setSyncStatus('syncing');
    try {
      await cloudStorageService.syncFromCloud(user.id, selectedCurrency);
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
      // Reload the page to reflect synced data
      window.location.reload();
    } catch (error) {
      console.error('Sync from cloud failed:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const totalAmount = Object.entries(counts).reduce(
    (sum, [denomination, count]) => sum + (Number(denomination) * count), 
    0
  );

  const totalCount = Object.values(counts).reduce(
    (sum, count) => sum + count, 
    0
  );

  useEffect(() => {
    localStorage.setItem(`denominationCounts_${selectedCurrency}`, JSON.stringify(counts));
    
    // Auto-sync to cloud if premium user
    if (user && authService.hasPremiumAccess(userProfile)) {
      const debounceTimer = setTimeout(() => {
        syncToCloud();
      }, 2000);
      
      return () => clearTimeout(debounceTimer);
    }
  }, [counts, selectedCurrency, user, userProfile]);

  const handleCountChange = (denomination: number, count: number) => {
    if (isNaN(count)) return;
    setCounts(prev => ({
      ...prev,
      [denomination]: count
    }));
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all counts?')) {
      const resetCounts: CountState = {};
      CURRENCY_DENOMINATIONS[selectedCurrency].forEach(denom => {
        resetCounts[denom.value] = 0;
      });
      setCounts(resetCounts);
    }
  };

  const handleSave = async () => {
    const currentCounts = localStorage.getItem(`denominationCounts_${selectedCurrency}`);
    if (!currentCounts) return;
    
    const counts = JSON.parse(currentCounts);
    
    const totalAmount = Object.entries(counts).reduce(
      (sum, [denomination, count]) => sum + (Number(denomination) * Number(count)), 
      0
    );
    
    const totalCount = Object.values(counts).reduce(
      (sum, count) => sum + Number(count), 
      0
    );
    
    const savedHistory = localStorage.getItem(`countNoteHistory_${selectedCurrency}`) || '[]';
    const history = JSON.parse(savedHistory);
    
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      totalAmount,
      totalCount,
      denominationCounts: counts,
      currency: selectedCurrency
    };
    
    const updatedHistory = [newEntry, ...history];
    localStorage.setItem(`countNoteHistory_${selectedCurrency}`, JSON.stringify(updatedHistory));
    
    // Sync to cloud if premium user
    if (user && authService.hasPremiumAccess(userProfile)) {
      await syncToCloud();
    }
    
    alert('Summary saved successfully!');
  };

  const handleExportPDF = () => {
    if (!checkPremiumAccess('PDF Export')) return;
    
    const history = JSON.parse(localStorage.getItem(`countNoteHistory_${selectedCurrency}`) || '[]');
    if (history.length === 0) {
      alert('No data to export. Please save some counting sessions first.');
      return;
    }
    exportService.exportToPDF(history, `Note Counter Report - ${selectedCurrency}`);
  };

  const handleExportExcel = () => {
    if (!checkPremiumAccess('Excel Export')) return;
    
    const history = JSON.parse(localStorage.getItem(`countNoteHistory_${selectedCurrency}`) || '[]');
    if (history.length === 0) {
      alert('No data to export. Please save some counting sessions first.');
      return;
    }
    exportService.exportToExcel(history, `Note Counter Report - ${selectedCurrency}`);
  };

  const handlePrint = () => {
    if (!checkPremiumAccess('Print Reports')) return;
    
    const history = JSON.parse(localStorage.getItem(`countNoteHistory_${selectedCurrency}`) || '[]');
    if (history.length === 0) {
      alert('No data to print. Please save some counting sessions first.');
      return;
    }
    exportService.printData(history, `Note Counter Report - ${selectedCurrency}`);
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const leftColumnDenominations = CURRENCY_DENOMINATIONS[selectedCurrency].slice(0, Math.ceil(CURRENCY_DENOMINATIONS[selectedCurrency].length / 2));
  const rightColumnDenominations = CURRENCY_DENOMINATIONS[selectedCurrency].slice(Math.ceil(CURRENCY_DENOMINATIONS[selectedCurrency].length / 2));

  const formatAmount = (amount: number) => {
    if (hideAmounts) return '••••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency,
      minimumFractionDigits: selectedCurrency === 'USD' ? 2 : 0,
    }).format(amount);
  };

  const CurrencyIcon = selectedCurrency === 'INR' ? IndianRupee : DollarSign;

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Cloud className="animate-pulse text-blue-500" size={16} />;
      case 'synced':
        return <Cloud className="text-green-500" size={16} />;
      case 'error':
        return <Cloud className="text-red-500" size={16} />;
      default:
        return <Cloud className="text-gray-400" size={16} />;
    }
  };

  const MenuModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Menu</h2>
            <button
              onClick={() => setShowMenu(false)}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* User Section */}
            {user ? (
              <section>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Account</h3>
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <User className="text-white" size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-800 truncate">{user.email}</div>
                        <div className="text-sm text-gray-600">
                          {authService.hasPremiumAccess(userProfile) ? 'Premium Member' : 'Free Account'}
                          {!authService.isEmailVerified(user, userProfile) && (
                            <span className="text-red-600 ml-2">(Email not verified)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {authService.hasPremiumAccess(userProfile) && (
                      <div className="flex items-center text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full flex-shrink-0">
                        <Crown size={16} className="mr-1" />
                        <span className="text-sm font-medium">Premium</span>
                      </div>
                    )}
                  </div>
                  
                  {authService.hasPremiumAccess(userProfile) && (
                    <div className="flex items-center text-sm text-gray-600 mb-3 bg-white p-2 rounded-md">
                      {getSyncStatusIcon()}
                      <span className="ml-2">
                        {syncStatus === 'syncing' && 'Syncing data...'}
                        {syncStatus === 'synced' && 'Data synced successfully'}
                        {syncStatus === 'error' && 'Sync failed - please try again'}
                        {syncStatus === 'idle' && 'Cloud sync enabled'}
                      </span>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowProfileModal(true);
                      }}
                      className="bg-white text-indigo-600 py-2 px-3 rounded-md hover:bg-indigo-50 transition-colors flex items-center justify-center font-medium text-sm border border-indigo-200"
                    >
                      <Settings size={16} className="mr-2" />
                      Profile
                    </button>
                    {!authService.hasPremiumAccess(userProfile) && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowSubscriptionModal(true);
                        }}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 px-3 rounded-md hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md flex items-center justify-center font-medium text-sm"
                      >
                        <Crown size={16} className="mr-2" />
                        Upgrade
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleSignOut();
                      }}
                      className="bg-gray-200 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center text-sm col-span-2"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Account</h3>
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="text-gray-600" size={32} />
                    </div>
                    <p className="text-gray-600 mb-4">Sign in to access premium features and sync your data across devices</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center font-medium"
                  >
                    <User size={20} className="mr-2" />
                    Sign In / Sign Up
                  </button>
                </div>
              </section>
            )}

            {/* Quick Actions */}
            <section>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setHideAmounts(!hideAmounts);
                  }}
                  className="bg-gray-100 text-gray-700 py-2 px-3 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center text-sm"
                >
                  {hideAmounts ? <Eye size={16} className="mr-2" /> : <EyeOff size={16} className="mr-2" />}
                  {hideAmounts ? 'Show' : 'Hide'} Amounts
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleSave();
                  }}
                  className="bg-green-100 text-green-700 py-2 px-3 rounded-md hover:bg-green-200 transition-colors flex items-center justify-center text-sm"
                >
                  <Save size={16} className="mr-2" />
                  Save Current
                </button>
              </div>
            </section>

            {/* Export Section */}
            <section>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Export & Print</h3>
              <div className="grid grid-cols-1 gap-2">
                <PremiumFeatureGate
                  userProfile={userProfile}
                  onUpgradeClick={() => {
                    setShowMenu(false);
                    if (!user) {
                      setShowAuthModal(true);
                    } else {
                      setShowSubscriptionModal(true);
                    }
                  }}
                  featureName="PDF Export"
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleExportPDF();
                    }}
                    className="w-full px-4 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center justify-center font-medium"
                  >
                    <FileText className="mr-2" size={18} />
                    Export to PDF
                  </button>
                </PremiumFeatureGate>

                <PremiumFeatureGate
                  userProfile={userProfile}
                  onUpgradeClick={() => {
                    setShowMenu(false);
                    if (!user) {
                      setShowAuthModal(true);
                    } else {
                      setShowSubscriptionModal(true);
                    }
                  }}
                  featureName="Excel Export"
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleExportExcel();
                    }}
                    className="w-full px-4 py-3 text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors flex items-center justify-center font-medium"
                  >
                    <Download className="mr-2" size={18} />
                    Export to Excel
                  </button>
                </PremiumFeatureGate>

                <PremiumFeatureGate
                  userProfile={userProfile}
                  onUpgradeClick={() => {
                    setShowMenu(false);
                    if (!user) {
                      setShowAuthModal(true);
                    } else {
                      setShowSubscriptionModal(true);
                    }
                  }}
                  featureName="Print Reports"
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handlePrint();
                    }}
                    className="w-full px-4 py-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center justify-center font-medium"
                  >
                    <Printer className="mr-2" size={18} />
                    Print Report
                  </button>
                </PremiumFeatureGate>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Documentation</h3>
              <div className="space-y-4">
                <section>
                  <h4 className="text-lg font-medium text-gray-700 mb-2">Currency Support</h4>
                  <p className="text-gray-600 mb-2">
                    Note Counter supports multiple currencies:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Switch between INR and USD from the currency selector</li>
                    <li>Each currency maintains its own separate history</li>
                    <li>Automatic formatting based on currency selection</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-lg font-medium text-gray-700 mb-2">Quick Math Input</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Type <code className="bg-gray-100 px-1 rounded">+13</code> to add 13</li>
                    <li>Type <code className="bg-gray-100 px-1 rounded">-5</code> to subtract 5</li>
                    <li>Press Enter or click outside to calculate</li>
                  </ul>
                </section>

                <section>
                  <h4 className="text-lg font-medium text-gray-700 mb-2">Premium Features</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Cloud storage and multi-device sync</li>
                    <li>Export to PDF and Excel formats</li>
                    <li>Print professional reports</li>
                    <li>Daily automatic backups</li>
                  </ul>
                </section>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Contact & Feedback</h3>
              <div className="space-y-4">
                <a
                  href="mailto:patilyasshh@gmail.com"
                  className="block px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                  <Mail className="inline-block mr-2" size={18} />
                  Send Feedback
                </a>
                <a
                  href="https://www.yashpatil.tech/more/contact.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                  <Globe className="inline-block mr-2" size={18} />
                  Contact Developer
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="*" element={
          <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
            {/* Email Verification Banner */}
            {user && showEmailBanner && !authService.isEmailVerified(user, userProfile) && (
              <EmailVerificationBanner
                user={user}
                userProfile={userProfile}
                onClose={() => setShowEmailBanner(false)}
              />
            )}

            <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 shadow-lg relative z-40">
              <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-xl md:text-2xl font-bold flex items-center">
                  <CurrencyIcon className="mr-2" size={20} />
                  <span className="hidden sm:inline">Note Counter</span>
                  <span className="sm:hidden">Counter</span>
                  {authService.hasPremiumAccess(userProfile) && (
                    <Crown className="ml-2 text-yellow-300" size={20} />
                  )}
                </h1>
                <div className="md:hidden">
                  <button 
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 rounded-md hover:bg-indigo-700/50 transition-colors"
                  >
                    <Menu size={24} />
                  </button>
                </div>
                <div className="hidden md:flex space-x-2 lg:space-x-4 items-center">
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value as 'INR' | 'USD')}
                    className="bg-white text-indigo-600 px-2 py-1 rounded-md font-medium text-sm"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                  <button
                    className={`py-2 px-3 rounded-md font-medium transition-all text-sm ${
                      activeTab === 'counter'
                        ? 'bg-white text-indigo-600'
                        : 'text-white hover:bg-indigo-700/50'
                    }`}
                    onClick={() => setActiveTab('counter')}
                  >
                    <div className="flex items-center">
                      <CurrencyIcon className="mr-1" size={16} />
                      <span className="hidden lg:inline">Money Counter</span>
                      <span className="lg:hidden">Counter</span>
                    </div>
                  </button>
                  <button
                    className={`py-2 px-3 rounded-md font-medium transition-all text-sm ${
                      activeTab === 'history'
                        ? 'bg-white text-indigo-600'
                        : 'text-white hover:bg-indigo-700/50'
                    }`}
                    onClick={() => setActiveTab('history')}
                  >
                    <div className="flex items-center">
                      <History className="mr-1" size={16} />
                      History
                    </div>
                  </button>
                  {user && authService.hasPremiumAccess(userProfile) && (
                    <div className="flex items-center text-sm">
                      {getSyncStatusIcon()}
                    </div>
                  )}
                  {user ? (
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="ml-2 p-2 rounded-full hover:bg-indigo-700/50 transition-colors flex items-center relative"
                      title="User Profile"
                    >
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                        <User className="text-indigo-600" size={16} />
                      </div>
                      {!authService.isEmailVerified(user, userProfile) && (
                        <div className="w-2 h-2 bg-red-500 rounded-full absolute top-1 right-1"></div>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="ml-2 bg-white text-indigo-600 py-2 px-3 rounded-md hover:bg-gray-100 transition-colors font-medium text-sm"
                    >
                      Sign In
                    </button>
                  )}
                  <button
                    onClick={() => setShowMenu(true)}
                    className="ml-2 p-2 rounded-full hover:bg-indigo-700/50 transition-colors"
                    title="Menu"
                  >
                    <MenuIcon size={20} />
                  </button>
                </div>
              </div>
            </header>

            {mobileMenuOpen && (
              <div className="md:hidden bg-indigo-500 text-white relative z-30">
                <div className="container mx-auto p-2">
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value as 'INR' | 'USD')}
                    className="w-full mb-2 bg-white text-indigo-600 px-3 py-2 rounded-md font-medium"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                  <button
                    className={`w-full py-2 px-4 rounded-md font-medium mb-2 transition-all ${
                      activeTab === 'counter'
                        ? 'bg-white text-indigo-600'
                        : 'text-white hover:bg-indigo-700/50'
                    }`}
                    onClick={() => {
                      setActiveTab('counter');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center">
                      <CurrencyIcon className="mr-2" size={18} />
                      Money Counter
                    </div>
                  </button>
                  <button
                    className={`w-full py-2 px-4 rounded-md font-medium mb-2 transition-all ${
                      activeTab === 'history'
                        ? 'bg-white text-indigo-600'
                        : 'text-white hover:bg-indigo-700/50'
                    }`}
                    onClick={() => {
                      setActiveTab('history');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center">
                      <History className="mr-2" size={18} />
                      History
                    </div>
                  </button>
                  {user ? (
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2 px-4 rounded-md font-medium mb-2 text-white hover:bg-indigo-700/50 flex items-center"
                    >
                      <User className="mr-2" size={18} />
                      Profile
                      {!authService.isEmailVerified(user, userProfile) && (
                        <div className="w-2 h-2 bg-red-500 rounded-full ml-2"></div>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowAuthModal(true);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full py-2 px-4 rounded-md font-medium mb-2 bg-white text-indigo-600 hover:bg-gray-100"
                    >
                      Sign In
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowMenu(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-4 rounded-md font-medium mb-2 text-white hover:bg-indigo-700/50"
                  >
                    <div className="flex items-center">
                      <MenuIcon className="mr-2" size={18} />
                      Menu
                    </div>
                  </button>
                </div>
              </div>
            )}

            {showMenu && <MenuModal />}
            
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              onAuthSuccess={() => {
                setShowAuthModal(false);
                checkAuth();
              }}
            />

            <SubscriptionModal
              isOpen={showSubscriptionModal}
              onClose={() => setShowSubscriptionModal(false)}
              userProfile={userProfile}
              selectedCurrency={selectedCurrency}
              onSubscriptionSuccess={() => {
                setShowSubscriptionModal(false);
                if (user) loadUserProfile(user.id);
              }}
            />

            <UserProfileModal
              isOpen={showProfileModal}
              onClose={() => setShowProfileModal(false)}
              user={user}
              userProfile={userProfile}
              onProfileUpdate={() => {
                if (user) loadUserProfile(user.id);
              }}
              onUpgradeClick={() => {
                setShowProfileModal(false);
                setShowSubscriptionModal(true);
              }}
              onSignOut={handleSignOut}
              syncStatus={syncStatus}
              onSyncToCloud={syncToCloud}
              onSyncFromCloud={syncFromCloud}
            />

            <div className="container mx-auto p-4 relative z-10">
              {activeTab === 'counter' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-lg p-4 h-full border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg lg:text-xl font-semibold text-gray-800">Count Your Money</h2>
                        <button
                          onClick={() => setHideAmounts(!hideAmounts)}
                          className="text-gray-600 hover:text-indigo-600 transition-colors p-1"
                          title={hideAmounts ? "Show amounts" : "Hide amounts"}
                        >
                          {hideAmounts ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {leftColumnDenominations.map((denom) => (
                          <DenominationCounter
                            key={denom.value}
                            value={denom.value}
                            type={denom.type}
                            count={counts[denom.value] || 0}
                            onCountChange={(count) => handleCountChange(denom.value, count)}
                            hideAmount={hideAmounts}
                            currency={selectedCurrency}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-lg p-4 h-full border border-gray-200">
                      <h2 className="text-lg lg:text-xl font-semibold mb-4 text-gray-800">&nbsp;</h2>
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                        {rightColumnDenominations.map((denom) => (
                          <DenominationCounter
                            key={denom.value}
                            value={denom.value}
                            type={denom.type}
                            count={counts[denom.value] || 0}
                            onCountChange={(count) => handleCountChange(denom.value, count)}
                            hideAmount={hideAmounts}
                            currency={selectedCurrency}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-lg p-4 h-full border border-gray-200">
                      <h2 className="text-lg lg:text-xl font-semibold mb-4 text-gray-800">Summary</h2>
                      
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
                          <h3 className="text-base font-medium text-gray-700">Total Count</h3>
                          <p className="text-2xl lg:text-3xl font-bold text-indigo-600">
                            {totalCount}
                          </p>
                        </div>
                        
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
                          <h3 className="text-base font-medium text-gray-700">Total Amount</h3>
                          <p className="text-2xl lg:text-3xl font-bold text-indigo-600 break-all">
                            {formatAmount(totalAmount)}
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                          <button 
                            onClick={handleReset}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md transition-all shadow-md active:transform active:scale-95"
                          >
                            Reset All
                          </button>
                          <button 
                            onClick={handleSave}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-all shadow-md active:transform active:scale-95 flex items-center justify-center"
                          >
                            <Save size={18} className="mr-2" />
                            Save
                          </button>
                        </div>

                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id="sendToCalculator"
                            checked={sendToCalculator}
                            onChange={(e) => setSendToCalculator(e.target.checked)}
                            className="mr-2"
                          />
                          <label htmlFor="sendToCalculator" className="text-sm text-gray-600">
                            Use total amount in calculator
                          </label>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex items-center mb-2">
                            <Calculator size={18} className="mr-2 text-indigo-600" />
                            <h3 className="text-base font-medium text-gray-700">Calculator</h3>
                          </div>
                          <SimpleCalculator initialValue={sendToCalculator ? totalAmount.toString() : ''} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <HistoryTab 
                  hideAmounts={hideAmounts} 
                  selectedCurrency={selectedCurrency}
                  userProfile={userProfile}
                  onUpgradeClick={() => {
                    if (!user) {
                      setShowAuthModal(true);
                    } else {
                      setShowSubscriptionModal(true);
                    }
                  }}
                />
              )}
            </div>

            <footer className="bg-gray-800 text-white py-6 mt-8 relative z-10">
              <div className="container mx-auto px-4">
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                  <a 
                    href="https://github.com/PATILYASHH" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-gray-300 hover:text-white transition-colors"
                  >
                    <Github size={20} className="mr-2" />
                    <span>Yash Patil</span>
                  </a>
                  <a 
                    href="https://yashpatil.tech" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-gray-300 hover:text-white transition-colors"
                  >
                    <Globe size={20} className="mr-2" />
                    <span>yashpatil.tech</span>
                  </a>
                  <a 
                    href="https://github.com/sponsors/PATILYASHH" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-gray-300 hover:text-white transition-colors"
                  >
                    <Heart size={20} className="mr-2" />
                    <span>Sponsor</span>
                  </a>
                  <span className="text-gray-400 text-sm">Version 11.0.0</span>
                </div>
              </div>
            </footer>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;