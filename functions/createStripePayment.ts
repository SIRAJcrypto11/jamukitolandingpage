import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        success: false, 
        message: 'Unauthorized - Please login'
      }, { status: 401 });
    }

    const body = await req.json();
    const { 
      amount, 
      currency = 'idr',
      description,
      payment_purpose,
      related_request_id,
      metadata = {}
    } = body;

    console.log('💳 CREATE STRIPE PAYMENT');
    console.log('User:', user.email);
    console.log('Amount:', amount);

    // Get Stripe credentials from database
    let secretKey = null;
    
    try {
      const settings = await base44.asServiceRole.entities.PaymentGatewaySettings.filter({
        gateway_name: 'stripe',
        is_active: true
      });
      
      if (settings && settings.length > 0) {
        secretKey = settings[0].secret_key;
      }
    } catch (dbError) {
      console.warn('⚠️ Database credentials not found');
    }

    if (!secretKey) {
      secretKey = Deno.env.get('STRIPE_SECRET_KEY');
    }

    if (!secretKey) {
      return Response.json({
        success: false,
        message: 'Stripe belum dikonfigurasi. Hubungi admin.'
      });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency,
          product_data: {
            name: description || 'SNISHOP Payment',
            description: `Payment for ${payment_purpose || 'service'}`
          },
          unit_amount: Math.round(amount * 100) // Convert to cents
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/cancel`,
      customer_email: user.email,
      metadata: {
        user_id: user.id,
        payment_purpose: payment_purpose || 'other',
        related_request_id: related_request_id || '',
        ...metadata
      }
    });

    // Save transaction to database
    const transactionData = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      reference_id: session.id,
      payment_method: 'stripe',
      payment_name: 'Stripe Card Payment',
      amount: amount,
      total_amount: amount,
      status: 'UNPAID',
      checkout_url: session.url,
      payment_purpose: payment_purpose || 'other',
      related_request_id: related_request_id || null
    };

    await base44.asServiceRole.entities.PaymentTransaction.create(transactionData);

    console.log('✅ Stripe session created:', session.id);

    return Response.json({
      success: true,
      data: {
        session_id: session.id,
        checkout_url: session.url,
        reference: session.id
      }
    });

  } catch (error) {
    console.error('❌ Stripe payment error:', error);
    return Response.json({ 
      success: false, 
      message: error.message
    }, { status: 500 });
  }
});