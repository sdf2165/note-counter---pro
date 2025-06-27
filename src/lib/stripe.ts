import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripe = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export const isStripeConfigured = () => {
  return !!stripePublishableKey;
};

export const stripeService = {
  // Create checkout session for subscription
  async createCheckoutSession(planId: string, userId: string, email: string) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          planId,
          userId,
          email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      
      const stripeInstance = await stripe;
      if (!stripeInstance) {
        throw new Error('Stripe not initialized');
      }

      const { error } = await stripeInstance.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  },

  // Simulate successful payment for demo purposes when Stripe is not configured
  async simulatePayment(planId: string) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          subscriptionId: `sub_${Date.now()}`,
          planId,
        });
      }, 2000);
    });
  },

  // Create customer portal session for subscription management
  async createPortalSession(customerId: string) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          customerId,
          returnUrl: window.location.origin,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }
};

// Stripe price IDs - Replace these with your actual Stripe price IDs
export const STRIPE_PRICES = {
  monthly: 'price_1QVxxxxxxxxxx', // $1/month
  quarterly: 'price_1QVxxxxxxxxxx', // $3/3 months  
  annual: 'price_1QVxxxxxxxxxx', // $10/year
};