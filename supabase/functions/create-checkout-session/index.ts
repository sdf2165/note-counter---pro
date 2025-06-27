import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { planId, userId, email } = await req.json()

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    // Initialize Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Define price mapping - Replace with your actual Stripe price IDs
    const priceMapping = {
      monthly: 'price_1QVxxxxxxxxxxx', // $1/month
      quarterly: 'price_1QVxxxxxxxxxxx', // $3/3 months
      annual: 'price_1QVxxxxxxxxxxx' // $10/year
    }

    const priceId = priceMapping[planId as keyof typeof priceMapping]
    if (!priceId) {
      throw new Error('Invalid plan ID')
    }

    // Create or retrieve Stripe customer
    let customer
    try {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      })
      
      if (customers.data.length > 0) {
        customer = customers.data[0]
      } else {
        customer = await stripe.customers.create({
          email: email,
          metadata: {
            userId: userId
          }
        })
      }
    } catch (error) {
      console.error('Error creating/retrieving customer:', error)
      throw new Error('Failed to create customer')
    }

    // Update user profile with Stripe customer ID
    await supabaseClient
      .from('user_profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId)

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/`,
      metadata: {
        userId,
        planId,
      },
      subscription_data: {
        metadata: {
          userId,
          planId,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true
      },
      automatic_tax: {
        enabled: true
      }
    })

    return new Response(
      JSON.stringify({ sessionId: session.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})