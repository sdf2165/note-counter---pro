import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  subscription_tier: 'free' | 'monthly' | 'quarterly' | 'annual';
  subscription_status: 'inactive' | 'active' | 'cancelled' | 'expired';
  subscription_start?: string;
  subscription_end?: string;
  email_verified: boolean;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export const authService = {
  // Sign up new user with email verification
  async signUp(email: string, password: string) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`
      }
    });
    
    if (error) throw error;
    return data;
  },

  // Sign in user
  async signIn(email: string, password: string) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Check if email is verified
    if (data.user && !data.user.email_confirmed_at) {
      throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
    }
    
    return data;
  },

  // Resend verification email
  async resendVerification(email: string) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`
      }
    });
    
    if (error) throw error;
  },

  // Sign out user
  async signOut() {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  async getCurrentUser() {
    if (!supabase) return null;
    
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
    
    return data;
  },

  // Update subscription
  async updateSubscription(userId: string, tier: 'monthly' | 'quarterly' | 'annual', stripeCustomerId?: string) {
    if (!supabase) throw new Error('Supabase not configured');
    
    const subscriptionEnd = new Date();
    if (tier === 'monthly') {
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    } else if (tier === 'quarterly') {
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 3);
    } else {
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    }
    
    const updateData: any = {
      subscription_tier: tier,
      subscription_status: 'active',
      subscription_start: new Date().toISOString(),
      subscription_end: subscriptionEnd.toISOString(),
    };

    if (stripeCustomerId) {
      updateData.stripe_customer_id = stripeCustomerId;
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Check if user has premium access
  hasPremiumAccess(profile: UserProfile | null): boolean {
    if (!profile) return false;
    
    // Check email verification first
    if (!profile.email_verified) return false;
    
    // Admin always has access
    if (profile.email === 'patilyasshh@gmail.com') return true;
    
    // Check subscription status and expiry
    if (profile.subscription_status !== 'active') return false;
    
    if (profile.subscription_end) {
      const endDate = new Date(profile.subscription_end);
      const now = new Date();
      return endDate > now;
    }
    
    return false;
  },

  // Check if user is admin
  isAdmin(profile: UserProfile | null): boolean {
    return profile?.email === 'patilyasshh@gmail.com';
  },

  // Check if email is verified
  isEmailVerified(user: any, profile: UserProfile | null): boolean {
    return !!(user?.email_confirmed_at || profile?.email_verified);
  }
};