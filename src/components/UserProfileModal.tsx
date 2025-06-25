import React, { useState, useEffect } from 'react';
import { X, User, Mail, Crown, Calendar, CreditCard, Cloud, Database, Settings, Bell, Shield, Download, FileText, Printer, LogOut, Smartphone, CheckCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { UserProfile } from '../lib/auth';
import { authService } from '../lib/auth';
import { cloudStorageService } from '../lib/cloudStorage';
import { exportService } from '../lib/exportService';
import { stripeService, isStripeConfigured } from '../lib/stripe';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userProfile: UserProfile | null;
  onProfileUpdate: () => void;
  onUpgradeClick: () => void;
  onSignOut: () => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  onSyncToCloud: () => void;
  onSyncFromCloud: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  userProfile,
  onProfileUpdate,
  onUpgradeClick,
  onSignOut,
  syncStatus,
  onSyncToCloud,
  onSyncFromCloud
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'data' | 'export'>('profile');
  const [cloudData, setCloudData] = useState<any[]>([]);
  const [loadingCloudData, setLoadingCloudData] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === 'data' && user && authService.hasPremiumAccess(userProfile)) {
      loadCloudData();
    }
  }, [isOpen, activeTab, user, userProfile]);

  const loadCloudData = async () => {
    if (!user) return;
    
    setLoadingCloudData(true);
    try {
      const data = await cloudStorageService.getAllUserData(user.id);
      setCloudData(data);
    } catch (error) {
      console.error('Error loading cloud data:', error);
    } finally {
      setLoadingCloudData(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!userProfile?.stripe_customer_id) {
      alert('No subscription found to manage');
      return;
    }

    try {
      await stripeService.createPortalSession(userProfile.stripe_customer_id);
    } catch (error) {
      console.error('Error opening customer portal:', error);
      alert('Failed to open subscription management portal');
    }
  };

  const handleExportPDF = () => {
    const history = JSON.parse(localStorage.getItem('countNoteHistory_INR') || '[]');
    const historyUSD = JSON.parse(localStorage.getItem('countNoteHistory_USD') || '[]');
    const allHistory = [...history, ...historyUSD];
    
    if (allHistory.length === 0) {
      alert('No data to export. Please save some counting sessions first.');
      return;
    }
    exportService.exportToPDF(allHistory, 'Complete Note Counter Report');
  };

  const handleExportExcel = () => {
    const history = JSON.parse(localStorage.getItem('countNoteHistory_INR') || '[]');
    const historyUSD = JSON.parse(localStorage.getItem('countNoteHistory_USD') || '[]');
    const allHistory = [...history, ...historyUSD];
    
    if (allHistory.length === 0) {
      alert('No data to export. Please save some counting sessions first.');
      return;
    }
    exportService.exportToExcel(allHistory, 'Complete Note Counter Report');
  };

  const handlePrint = () => {
    const history = JSON.parse(localStorage.getItem('countNoteHistory_INR') || '[]');
    const historyUSD = JSON.parse(localStorage.getItem('countNoteHistory_USD') || '[]');
    const allHistory = [...history, ...historyUSD];
    
    if (allHistory.length === 0) {
      alert('No data to print. Please save some counting sessions first.');
      return;
    }
    exportService.printData(allHistory, 'Complete Note Counter Report');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSubscriptionStatus = () => {
    if (!userProfile) return { status: 'Free Account', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    
    if (authService.hasPremiumAccess(userProfile)) {
      return { 
        status: 'Premium Active', 
        color: 'text-green-600', 
        bgColor: 'bg-green-100',
        tier: userProfile.subscription_tier === 'monthly' ? 'Monthly Plan' : 
              userProfile.subscription_tier === 'quarterly' ? 'Quarterly Plan' : 'Annual Plan'
      };
    }
    
    return { status: 'Free Account', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  };

  const getSyncStatusDisplay = () => {
    switch (syncStatus) {
      case 'syncing':
        return { text: 'Syncing...', color: 'text-blue-600', icon: RefreshCw, animate: true };
      case 'synced':
        return { text: 'Synced', color: 'text-green-600', icon: CheckCircle, animate: false };
      case 'error':
        return { text: 'Sync Failed', color: 'text-red-600', icon: AlertCircle, animate: false };
      default:
        return { text: 'Ready to Sync', color: 'text-gray-600', icon: Cloud, animate: false };
    }
  };

  if (!isOpen || !user) return null;

  const subscriptionInfo = getSubscriptionStatus();
  const syncInfo = getSyncStatusDisplay();
  const SyncIcon = syncInfo.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                <User className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user.email}</h2>
                <div className="flex items-center mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${subscriptionInfo.bgColor} ${subscriptionInfo.color}`}>
                    {subscriptionInfo.status}
                  </span>
                  {authService.hasPremiumAccess(userProfile) && (
                    <Crown className="ml-2 text-yellow-300" size={20} />
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'subscription', label: 'Subscription', icon: CreditCard },
              { id: 'data', label: 'Data Management', icon: Database },
              { id: 'export', label: 'Export & Print', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={18} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <Mail className="mr-2 text-indigo-600" size={20} />
                    Account Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email Address</label>
                      <p className="text-gray-800">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Account Created</label>
                      <p className="text-gray-800">{formatDate(user.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Account Type</label>
                      <p className="text-gray-800">
                        {authService.hasPremiumAccess(userProfile) ? 'Premium Member' : 'Free User'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                    <Shield className="mr-2 text-green-600" size={20} />
                    Security & Privacy
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Email Verification</span>
                      {authService.isEmailVerified(user, userProfile) ? (
                        <CheckCircle className="text-green-500" size={16} />
                      ) : (
                        <AlertCircle className="text-red-500" size={16} />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Data Encryption</span>
                      <CheckCircle className="text-green-500" size={16} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Secure Cloud Storage</span>
                      {authService.hasPremiumAccess(userProfile) ? (
                        <CheckCircle className="text-green-500" size={16} />
                      ) : (
                        <span className="text-sm text-gray-500">Premium Only</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <Smartphone className="mr-2 text-blue-600" size={20} />
                  Multi-Device Access
                </h3>
                <p className="text-gray-600 mb-3">
                  {authService.hasPremiumAccess(userProfile) 
                    ? 'Your data is automatically synced across all your devices. Access your note counter from anywhere!'
                    : 'Upgrade to Premium to sync your data across all devices and access from anywhere.'
                  }
                </p>
                {!authService.hasPremiumAccess(userProfile) && (
                  <button
                    onClick={onUpgradeClick}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 px-4 rounded-md hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md flex items-center"
                  >
                    <Crown size={18} className="mr-2" />
                    Upgrade to Premium
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <CreditCard className="mr-2 text-indigo-600" size={24} />
                  Subscription Details
                </h3>
                
                {authService.hasPremiumAccess(userProfile) ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Current Plan</label>
                        <p className="text-lg font-semibold text-indigo-600">
                          {subscriptionInfo.tier}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <p className="text-lg font-semibold text-green-600">Active</p>
                      </div>
                      {userProfile?.subscription_start && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Started</label>
                          <p className="text-gray-800">{formatDate(userProfile.subscription_start)}</p>
                        </div>
                      )}
                      {userProfile?.subscription_end && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Renews</label>
                          <p className="text-gray-800">{formatDate(userProfile.subscription_end)}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">Premium Features Included:</h4>
                      <ul className="space-y-1 text-gray-600">
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-500 mr-2" />
                          Unlimited cloud storage and sync
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-500 mr-2" />
                          Multi-device access
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-500 mr-2" />
                          PDF and Excel export
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-500 mr-2" />
                          Print reports
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-500 mr-2" />
                          Priority support
                        </li>
                      </ul>
                    </div>

                    {isStripeConfigured() && (
                      <div className="flex space-x-3">
                        <button
                          onClick={handleManageSubscription}
                          className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors flex items-center"
                        >
                          <ExternalLink size={16} className="mr-2" />
                          Manage Subscription
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mb-4">
                      <Crown className="mx-auto text-yellow-500" size={48} />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Free Account</h4>
                    <p className="text-gray-600 mb-4">
                      You're currently using the free version of Note Counter. Upgrade to unlock premium features!
                    </p>
                    <button
                      onClick={onUpgradeClick}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg"
                    >
                      <Crown size={20} className="mr-2 inline" />
                      Upgrade to Premium
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Database className="mr-2 text-blue-600" size={24} />
                  Data Management
                </h3>
                
                {authService.hasPremiumAccess(userProfile) ? (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                        <Cloud className="mr-2 text-blue-600" size={20} />
                        Cloud Sync Status
                      </h4>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <SyncIcon 
                            size={20} 
                            className={`mr-2 ${syncInfo.color} ${syncInfo.animate ? 'animate-spin' : ''}`} 
                          />
                          <span className={`font-medium ${syncInfo.color}`}>{syncInfo.text}</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={onSyncToCloud}
                            disabled={syncStatus === 'syncing'}
                            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                          >
                            <Cloud size={16} className="mr-2" />
                            Sync to Cloud
                          </button>
                          <button
                            onClick={onSyncFromCloud}
                            disabled={syncStatus === 'syncing'}
                            className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                          >
                            <Download size={16} className="mr-2" />
                            Sync from Cloud
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Last sync: {syncStatus === 'synced' ? 'Just now' : 'Unknown'}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3">Cloud Data Overview</h4>
                      {loadingCloudData ? (
                        <div className="text-center py-4">
                          <RefreshCw className="animate-spin mx-auto text-blue-500" size={24} />
                          <p className="text-gray-600 mt-2">Loading cloud data...</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cloudData.length > 0 ? (
                            cloudData.map((item, index) => (
                              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                                <div>
                                  <span className="font-medium text-gray-800">{item.data_type}</span>
                                  <p className="text-sm text-gray-600">
                                    Last updated: {new Date(item.updated_at).toLocaleString()}
                                  </p>
                                </div>
                                <CheckCircle className="text-green-500" size={16} />
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-600 text-center py-4">No cloud data found</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mb-4">
                      <Database className="mx-auto text-gray-400" size={48} />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Cloud Data Management</h4>
                    <p className="text-gray-600 mb-4">
                      Upgrade to Premium to access cloud storage, automatic syncing, and data backup features.
                    </p>
                    <button
                      onClick={onUpgradeClick}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg"
                    >
                      <Crown size={20} className="mr-2 inline" />
                      Upgrade to Premium
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <FileText className="mr-2 text-green-600" size={24} />
                  Export & Print Options
                </h3>
                
                {authService.hasPremiumAccess(userProfile) ? (
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">
                      Export your complete note counting history and reports in various formats.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={handleExportPDF}
                        className="bg-red-500 text-white py-4 px-6 rounded-lg hover:bg-red-600 transition-colors flex flex-col items-center space-y-2 shadow-md"
                      >
                        <FileText size={32} />
                        <span className="font-semibold">Export to PDF</span>
                        <span className="text-sm opacity-90">Professional reports</span>
                      </button>
                      
                      <button
                        onClick={handleExportExcel}
                        className="bg-green-500 text-white py-4 px-6 rounded-lg hover:bg-green-600 transition-colors flex flex-col items-center space-y-2 shadow-md"
                      >
                        <Download size={32} />
                        <span className="font-semibold">Export to Excel</span>
                        <span className="text-sm opacity-90">Spreadsheet format</span>
                      </button>
                      
                      <button
                        onClick={handlePrint}
                        className="bg-indigo-500 text-white py-4 px-6 rounded-lg hover:bg-indigo-600 transition-colors flex flex-col items-center space-y-2 shadow-md"
                      >
                        <Printer size={32} />
                        <span className="font-semibold">Print Reports</span>
                        <span className="text-sm opacity-90">Direct printing</span>
                      </button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">Export Features:</h4>
                      <ul className="space-y-1 text-gray-600">
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-500 mr-2" />
                          Complete transaction history
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-500 mr-2" />
                          Detailed denomination breakdowns
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-500 mr-2" />
                          Professional formatting
                        </li>
                        <li className="flex items-center">
                          <CheckCircle size={16} className="text-green-500 mr-2" />
                          Multiple currency support
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mb-4">
                      <FileText className="mx-auto text-gray-400" size={48} />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">Premium Export Features</h4>
                    <p className="text-gray-600 mb-4">
                      Upgrade to Premium to export your data to PDF, Excel, and print professional reports.
                    </p>
                    <button
                      onClick={onUpgradeClick}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg"
                    >
                      <Crown size={20} className="mr-2 inline" />
                      Upgrade to Premium
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Member since {formatDate(user.created_at)}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors flex items-center"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;