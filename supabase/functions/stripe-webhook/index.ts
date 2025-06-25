import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    )

    console.log('Webhook event type:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { userId, planId } = session.metadata || {}

        if (userId && planId) {
          await handleSubscriptionActivation(userId, planId, session)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancellation(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSuccess(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailure(invoice)
        break
      }
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Webhook error', { status: 400 })
  }
})

async function handleSubscriptionActivation(userId: string, planId: string, session: Stripe.Checkout.Session) {
  try {
    const subscriptionEnd = new Date()
    
    // Calculate subscription end date based on plan
    switch (planId) {
      case 'monthly':
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1)
        break
      case 'quarterly':
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 3)
        break
      case 'annual':
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1)
        break
    }

    const { error } = await supabaseClient
      .from('user_profiles')
      .update({
        subscription_tier: planId,
        subscription_status: 'active',
        subscription_start: new Date().toISOString(),
        subscription_end: subscriptionEnd.toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user subscription:', error)
    } else {
      console.log(`Subscription activated for user ${userId} with plan ${planId}`)
    }
  } catch (error) {
    console.error('Error in handleSubscriptionActivation:', error)
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.userId
    if (!userId) return

    const status = subscription.status === 'active' ? 'active' : 'inactive'
    
    const { error } = await supabaseClient
      .from('user_profiles')
      .update({
        subscription_status: status,
      })
      .eq('id', userId)

    if (error) {
      console.error('Error updating subscription status:', error)
    }
  } catch (error) {
    console.error('Error in handleSubscriptionUpdate:', error)
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  try {
    const userId = subscription.metadata?.userId
    if (!userId) return

    const { error } = await supabaseClient
      .from('user_profiles')
      .update({
        subscription_status: 'cancelled',
      })
      .eq('id', userId)

    if (error) {
      console.error('Error updating subscription cancellation:', error)
    }
  } catch (error) {
    console.error('Error in handleSubscriptionCancellation:', error)
  }
}

async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata?.userId
    
    if (!userId) return

    // Update subscription status to active on successful payment
    const { error } = await supabaseClient
      .from('user_profiles')
      .update({
        subscription_status: 'active',
      })
      .eq('id', userId)

    if (error) {
      console.error('Error updating payment success:', error)
    }
  } catch (error) {
    console.error('Error in handlePaymentSuccess:', error)
  }
}

async function handlePaymentFailure(invoice: Stripe.Invoice) {
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = subscription.metadata?.userId
    
    if (!userId) return

    // Mark subscription as expired on payment failure
    const { error } = await supabaseClient
      .from('user_profiles')
      .update({
        subscription_status: 'expired',
      })
      .eq('id', userId)

    if (error) {
      console.error('Error updating payment failure:', error)
    }
  } catch (error) {
    console.error('Error in handlePaymentFailure:', error)
  }
}