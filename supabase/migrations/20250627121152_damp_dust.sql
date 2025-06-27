/*
  # Add Stripe customer ID to user profiles

  1. Changes
    - Add stripe_customer_id column to user_profiles table
    - Update subscription_tier to include quarterly option

  2. Security
    - Maintain existing RLS policies
*/

-- Add stripe_customer_id column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Update subscription_tier constraint to include quarterly
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_check;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_subscription_tier_check 
CHECK (subscription_tier IN ('free', 'monthly', 'quarterly', 'annual'));

-- Create index for stripe_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id 
ON user_profiles(stripe_customer_id);