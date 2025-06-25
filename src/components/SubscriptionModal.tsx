import React, { useState } from 'react';
import { X, Crown, Check, CreditCard, Shield, Cloud, Smartphone, FileText, Printer, AlertCircle } from 'lucide-react';
import { authService } from '../lib/auth';
import { stripeService, isStripeConfigured } from '../lib/stripe';
import { pricingService, PricingPlan } from '../lib/pricing';
import { UserProfile } from '../lib/auth';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onSubscriptionSuccess: () => void;
  selectedCurrency: 'INR' | 'USD';
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ 
  isOpen, 
  onClose, 
  userProfile,
  onSubscriptionSuccess,
  selectedCurrency 
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const plans = pricingService.getPricingPlans();
  const exchangeRate = pricingService.getExchangeRate();

  const handleSubscribe = async () => {
    if (!userProfile) {
      setError('Please sign in to subscribe');
      return;
    }

    if (!authService.isEmailVerified(null, userProfile)) {
      setError('Please verify your email address before subscribing');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      if (isStripeConfigured()) {
        // Use real Stripe integration
        await stripeService.createCheckoutSession(
          selectedPlan,
          userProfile.id,
          userProfile.email
        );
      } else {
        // Demo mode - simulate payment
        console.log('Demo mode: Simulating payment...');
        await stripeService.simulatePayment(selectedPlan);
        
        // Update subscription in database
        await authService.updateSubscription(userProfile.id, selectedPlan);
        
        alert('🎉 Subscription activated successfully! (Demo mode)');
        onSubscriptionSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan)!;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <Crown className="text-yellow-500 mr-3" size={32} />
              <h2 className="text-3xl font-bold text-gray-800">Upgrade to Premium</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          {!isStripeConfigured() && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md flex items-center">
              <AlertCircle size={18} className="mr-2" />
              Demo mode: Stripe not configured. Subscription will be simulated.
            </div>
          )}

          {selectedCurrency === 'INR' && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center">
              <Check size={18} className="mr-2" />
              Prices shown in Indian Rupees (₹) at current exchange rate: $1 = ₹{exchangeRate}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Plan Selection */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Choose Your Plan</h3>
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selectedPlan === plan.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-lg">{plan.name}</h4>
                        <div className="text-2xl font-bold text-indigo-600">
                          {pricingService.formatPrice(plan, selectedCurrency)}
                          <span className="text-sm text-gray-600">/{plan.period}</span>
                        </div>
                        {plan.savings && (
                          <div className="text-green-600 text-sm font-medium">
                            {pricingService.getSavingsText(plan, selectedCurrency)}
                          </div>
                        )}
                        {selectedCurrency === 'INR' && (
                          <div className="text-xs text-gray-500 mt-1">
                            ${plan.priceUSD} USD
                          </div>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 ${
                        selectedPlan === plan.id
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedPlan === plan.id && (
                          <Check size={14} className="text-white m-0.5" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">7-Day Free Trial</h4>
                <p className="text-blue-700 text-sm">
                  Try Premium risk-free! Cancel anytime within 7 days for a full refund.
                </p>
              </div>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-xl font-semibold mb-4">Premium Features</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Cloud className="text-blue-500 mt-1" size={20} />
                  <div>
                    <h4 className="font-medium text-gray-800">Cloud Storage & Sync</h4>
                    <p className="text-gray-600 text-sm">Unlimited cloud storage with automatic syncing across all devices</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Smartphone className="text-green-500 mt-1" size={20} />
                  <div>
                    <h4 className="font-medium text-gray-800">Multi-Device Access</h4>
                    <p className="text-gray-600 text-sm">Access your data from any device, anywhere in the world</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Shield className="text-purple-500 mt-1" size={20} />
                  <div>
                    <h4 className="font-medium text-gray-800">Daily Backups</h4>
                    <p className="text-gray-600 text-sm">Automatic daily backups ensure your data is never lost</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <FileText className="text-red-500 mt-1" size={20} />
                  <div>
                    <h4 className="font-medium text-gray-800">Export to PDF & Excel</h4>
                    <p className="text-gray-600 text-sm">Export your reports as professional PDFs or Excel spreadsheets</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Printer className="text-indigo-500 mt-1" size={20} />
                  <div>
                    <h4 className="font-medium text-gray-800">Print Reports</h4>
                    <p className="text-gray-600 text-sm">Print detailed reports directly from the application</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Additional Benefits</h4>
                <ul className="space-y-1 text-gray-700 text-sm">
                  <li className="flex items-center">
                    <Check size={16} className="text-green-500 mr-2" />
                    Priority customer support
                  </li>
                  <li className="flex items-center">
                    <Check size={16} className="text-green-500 mr-2" />
                    Advanced analytics and insights
                  </li>
                  <li className="flex items-center">
                    <Check size={16} className="text-green-500 mr-2" />
                    No ads or promotional content
                  </li>
                  <li className="flex items-center">
                    <Check size={16} className="text-green-500 mr-2" />
                    Early access to new features
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-lg font-semibold">
                  Total: {pricingService.formatPrice(selectedPlanData, selectedCurrency)}
                </div>
                <div className="text-gray-600 text-sm">
                  Billed every {selectedPlanData.period}
                </div>
                {selectedPlanData.savings && (
                  <div className="text-green-600 text-sm font-medium">
                    {pricingService.getSavingsText(selectedPlanData, selectedCurrency)}
                  </div>
                )}
              </div>
              <button
                onClick={handleSubscribe}
                disabled={loading || !userProfile || !authService.isEmailVerified(null, userProfile)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-8 rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg transform hover:scale-105 flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <CreditCard size={20} className="mr-2" />
                {loading ? 'Processing...' : isStripeConfigured() ? 'Subscribe with Stripe' : 'Subscribe Now (Demo)'}
              </button>
            </div>
            <p className="text-gray-500 text-sm text-center">
              {isStripeConfigured() 
                ? 'Secure payment with Stripe • Cancel anytime • 7-day money-back guarantee'
                : 'Demo mode: No actual payment required • Full features unlocked for testing'
              }
            </p>
            {!authService.isEmailVerified(null, userProfile) && (
              <p className="text-red-500 text-sm text-center mt-2">
                Please verify your email address before subscribing
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;