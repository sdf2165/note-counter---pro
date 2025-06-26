import React from 'react';
import { Crown, Lock } from 'lucide-react';
import { UserProfile } from '../lib/auth';
import { authService } from '../lib/auth';

interface PremiumFeatureGateProps {
  userProfile: UserProfile | null;
  onUpgradeClick: () => void;
  children: React.ReactNode;
  featureName: string;
}

const PremiumFeatureGate: React.FC<PremiumFeatureGateProps> = ({
  userProfile,
  onUpgradeClick,
  children,
  featureName
}) => {
  const hasPremiumAccess = authService.hasPremiumAccess(userProfile);

  if (hasPremiumAccess) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gray-100 bg-opacity-95 backdrop-blur-sm z-20 flex items-center justify-center rounded-lg">
        <div className="text-center p-4 max-w-xs">
          <div className="flex justify-center mb-3">
            <div className="bg-yellow-100 p-3 rounded-full">
              <Crown className="text-yellow-600" size={24} />
            </div>
          </div>
          <h3 className="text-base font-semibold text-gray-800 mb-2">
            Premium Feature
          </h3>
          <p className="text-gray-600 mb-3 text-sm">
            {featureName} is available with Premium subscription
          </p>
          <button
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 transition-all shadow-md flex items-center mx-auto text-sm"
          >
            <Crown size={16} className="mr-2" />
            Upgrade to Premium
          </button>
        </div>
      </div>
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
    </div>
  );
};

export default PremiumFeatureGate;