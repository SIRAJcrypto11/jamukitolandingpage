import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
      currency = 'USD',
      description,
      payment_purpose,
      related_request_id
    } = body;

    console.log('💰 CREATE PAYPAL PAYMENT');
    console.log('User:', user.email);
    console.log('Amount:', amount);

    // Get PayPal credentials
    let clientId = null;
    let clientSecret = null;
    let mode = 'sandbox';
    
    try {
      const settings = await base44.asServiceRole.entities.PaymentGatewaySettings.filter({
        gateway_name: 'paypal',
        is_active: true
      });
      
      if (settings && settings.length > 0) {
        clientId = settings[0].client_id;
        clientSecret = settings[0].client_secret;
        mode = settings[0].mode || 'sandbox';
      }
    } catch (dbError) {
      console.warn('⚠️ Database credentials not found');
    }

    if (!clientId || !clientSecret) {
      clientId = Deno.env.get('PAYPAL_CLIENT_ID');
      clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    }

    if (!clientId || !clientSecret) {
      return Response.json({
        success: false,
        message: 'PayPal belum dikonfigurasi. Hubungi admin.'
      });
    }

    const baseUrl = mode === 'production' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';

    // Get PayPal access token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // Create PayPal order
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toString()
          },
          description: description || 'SNISHOP Payment'
        }],
        application_context: {
          return_url: `${req.headers.get('origin')}/success`,
          cancel_url: `${req.headers.get('origin')}/cancel`
        }
      })
    });

    const orderData = await orderResponse.json();

    if (!orderData.id) {
      throw new Error('Failed to create PayPal order');
    }

    // Get approval URL
    const approvalUrl = orderData.links.find(link => link.rel === 'approve')?.href;

    // Save transaction
    const transactionData = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      reference_id: orderData.id,
      payment_method: 'paypal',
      payment_name: 'PayPal',
      amount: amount,
      total_amount: amount,
      status: 'UNPAID',
      checkout_url: approvalUrl,
      payment_purpose: payment_purpose || 'other',
      related_request_id: related_request_id || null
    };

    await base44.asServiceRole.entities.PaymentTransaction.create(transactionData);

    console.log('✅ PayPal order created:', orderData.id);

    return Response.json({
      success: true,
      data: {
        order_id: orderData.id,
        checkout_url: approvalUrl,
        reference: orderData.id
      }
    });

  } catch (error) {
    console.error('❌ PayPal payment error:', error);
    return Response.json({ 
      success: false, 
      message: error.message
    }, { status: 500 });
  }
});