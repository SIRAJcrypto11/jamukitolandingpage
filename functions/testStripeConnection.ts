import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.11.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        success: false, 
        message: 'Unauthorized - Admin only' 
      }, { status: 401 });
    }

    // Get Stripe credentials
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
        message: 'Stripe credentials not configured'
      });
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16'
    });

    // Test API call
    const balance = await stripe.balance.retrieve();

    return Response.json({
      success: true,
      message: 'Stripe connection successful',
      data: {
        available: balance.available,
        pending: balance.pending,
        currency: balance.available[0]?.currency || 'usd'
      }
    });

  } catch (error) {
    console.error('❌ Stripe test error:', error);
    return Response.json({ 
      success: false, 
      message: error.message
    }, { status: 500 });
  }
});