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
      payment_type = 'bank_transfer',
      bank = 'bca',
      order_items = [],
      payment_purpose,
      related_request_id
    } = body;

    console.log('🏦 CREATE MIDTRANS PAYMENT');
    console.log('User:', user.email);
    console.log('Amount:', amount);

    // Get Midtrans credentials
    let serverKey = null;
    let mode = 'sandbox';
    
    try {
      const settings = await base44.asServiceRole.entities.PaymentGatewaySettings.filter({
        gateway_name: 'midtrans',
        is_active: true
      });
      
      if (settings && settings.length > 0) {
        serverKey = settings[0].server_key;
        mode = settings[0].mode || 'sandbox';
      }
    } catch (dbError) {
      console.warn('⚠️ Database credentials not found');
    }

    if (!serverKey) {
      serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
    }

    if (!serverKey) {
      return Response.json({
        success: false,
        message: 'Midtrans belum dikonfigurasi. Hubungi admin.'
      });
    }

    const baseUrl = mode === 'production' 
      ? 'https://api.midtrans.com' 
      : 'https://api.sandbox.midtrans.com';

    const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create Midtrans transaction
    const transactionResponse = await fetch(`${baseUrl}/v2/charge`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(serverKey + ':')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        payment_type: payment_type,
        transaction_details: {
          order_id: orderId,
          gross_amount: amount
        },
        customer_details: {
          email: user.email,
          first_name: user.full_name || user.email.split('@')[0]
        },
        item_details: order_items.length > 0 ? order_items : [{
          id: 'ITEM-1',
          price: amount,
          quantity: 1,
          name: 'Payment'
        }],
        bank_transfer: payment_type === 'bank_transfer' ? {
          bank: bank
        } : undefined
      })
    });

    const transactionData = await transactionResponse.json();

    if (transactionData.status_code !== '201') {
      throw new Error(transactionData.status_message || 'Failed to create transaction');
    }

    // Save to database
    const dbTransactionData = {
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      reference_id: transactionData.transaction_id,
      merchant_ref: orderId,
      payment_method: 'midtrans',
      payment_name: `Midtrans ${payment_type}`,
      amount: amount,
      total_amount: amount,
      status: 'UNPAID',
      payment_url: transactionData.redirect_url || '',
      payment_instructions: transactionData.va_numbers ? {
        bank: transactionData.va_numbers[0]?.bank,
        va_number: transactionData.va_numbers[0]?.va_number
      } : {},
      payment_purpose: payment_purpose || 'other',
      related_request_id: related_request_id || null
    };

    await base44.asServiceRole.entities.PaymentTransaction.create(dbTransactionData);

    console.log('✅ Midtrans transaction created:', transactionData.transaction_id);

    return Response.json({
      success: true,
      data: {
        transaction_id: transactionData.transaction_id,
        order_id: orderId,
        checkout_url: transactionData.redirect_url,
        va_numbers: transactionData.va_numbers,
        reference: transactionData.transaction_id
      }
    });

  } catch (error) {
    console.error('❌ Midtrans payment error:', error);
    return Response.json({ 
      success: false, 
      message: error.message
    }, { status: 500 });
  }
});