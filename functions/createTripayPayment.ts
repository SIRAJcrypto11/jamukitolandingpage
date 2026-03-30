import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      console.error('❌ Auth error:', authError);
      return Response.json({ 
        success: false, 
        message: 'Unauthorized - Please login'
      }, { status: 401 });
    }
    
    if (!user) {
      return Response.json({ 
        success: false, 
        message: 'Unauthorized - Please login'
      }, { status: 401 });
    }
    
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return Response.json({
        success: false,
        message: 'Invalid request body'
      }, { status: 200 });
    }
    
    const { 
      payment_method, 
      amount, 
      order_items, 
      customer_name, 
      customer_email, 
      customer_phone,
      payment_purpose,
      related_request_id 
    } = body;
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('💳 CREATE TRIPAY PAYMENT');
    console.log('═══════════════════════════════════════════');
    console.log('User:', user.email);
    console.log('Method:', payment_method);
    console.log('Amount:', amount);
    console.log('Purpose:', payment_purpose);
    
    let apiKey = null;
    let privateKey = null;
    let merchantCode = null;
    let mode = 'sandbox';
    
    try {
      const settings = await base44.asServiceRole.entities.PaymentGatewaySettings.filter({
        gateway_name: 'tripay'
      });
      
      if (settings && settings.length > 0) {
        const config = settings[0];
        if (config.api_key && config.private_key && config.merchant_code) {
          apiKey = config.api_key;
          privateKey = config.private_key;
          merchantCode = config.merchant_code;
          mode = config.mode || 'sandbox';
          console.log('✅ Using credentials from DATABASE');
          console.log('   - Mode:', mode);
          console.log('   - Merchant:', merchantCode);
        }
      }
    } catch (dbError) {
      console.warn('⚠️ Database credentials not found:', dbError.message);
    }
    
    if (!apiKey || !privateKey) {
      apiKey = Deno.env.get('TRIPAY_API_KEY');
      privateKey = Deno.env.get('TRIPAY_PRIVATE_KEY');
      if (apiKey && privateKey) {
        console.log('✅ Using credentials from ENVIRONMENT SECRETS');
      }
    }
    
    if (!apiKey || !privateKey || !merchantCode) {
      console.error('❌ Credentials incomplete!');
      return Response.json({
        success: false,
        message: 'Konfigurasi Tripay belum lengkap. Hubungi admin untuk setup API Key, Private Key, dan Merchant Code.'
      }, { status: 200 });
    }
    
    const merchantRef = `INV-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
      const signatureString = `${merchantCode}${merchantRef}${amount}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(signatureString);
      const keyData = encoder.encode(privateKey);
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const signature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const baseUrl = mode === 'production' 
        ? 'https://tripay.co.id/api' 
        : 'https://tripay.co.id/api-sandbox';
      
      const requestBody = {
        method: payment_method,
        merchant_ref: merchantRef,
        amount: amount,
        customer_name: customer_name || user.full_name || user.email,
        customer_email: customer_email || user.email,
        customer_phone: customer_phone || '08123456789',
        order_items: order_items,
        signature: signature
      };
      
      console.log('📡 Calling Tripay API...');
      console.log('   - Merchant Ref:', merchantRef);
      
      const response = await fetch(`${baseUrl}/transaction/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000)
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('❌ Tripay API Error:', result);
        return Response.json({
          success: false,
          message: result.message || 'Gagal membuat transaksi',
          data: null
        }, { status: 200 });
      }
      
      console.log('✅ Transaction created:', result.data.reference);
      
      // ✅ FIX: Convert payment_instructions array to object
      let paymentInstructions = {};
      if (result.data.instructions && Array.isArray(result.data.instructions)) {
        paymentInstructions = {
          title: result.data.payment_name || 'Instruksi Pembayaran',
          steps: result.data.instructions
        };
      }
      
      // ✅ FIX: Convert expired_time to ISO string
      let expiredAt = null;
      if (result.data.expired_time) {
        try {
          const expiredDate = new Date(result.data.expired_time * 1000);
          expiredAt = expiredDate.toISOString();
        } catch (e) {
          console.warn('⚠️ Failed to parse expired_time:', e);
        }
      }
      
      // ✅ CREATE DEPOSIT REQUEST (for deposit purpose)
      let depositRequestId = related_request_id;
      
      if (payment_purpose === 'deposit' && !depositRequestId) {
        try {
          const depositRequest = await base44.asServiceRole.entities.DepositRequest.create({
            user_id: user.id,
            user_email: user.email,
            user_full_name: user.full_name || user.email,
            amount: amount,
            proof_image_url: 'tripay_pending',
            status: 'pending',
            payment_method: 'tripay'
          });
          depositRequestId = depositRequest.id;
          console.log('✅ DepositRequest created:', depositRequestId);
        } catch (e) {
          console.warn('⚠️ Failed to create DepositRequest:', e.message);
        }
      }
      
      const transactionData = {
        user_id: user.id,
        user_email: user.email,
        user_name: customer_name || user.full_name || user.email,
        reference_id: result.data.reference,
        merchant_ref: merchantRef,
        payment_method: payment_method,
        payment_name: result.data.payment_name || payment_method,
        amount: amount,
        fee: result.data.total_fee || 0,
        total_amount: result.data.amount_received || amount,
        status: 'UNPAID',
        payment_url: result.data.payment_url || result.data.checkout_url || '',
        checkout_url: result.data.checkout_url || '',
        qr_url: result.data.qr_url || '',
        payment_instructions: paymentInstructions,
        order_items: order_items,
        payment_purpose: payment_purpose || 'other',
        related_request_id: depositRequestId || related_request_id || null,
        expired_at: expiredAt
      };
      
      console.log('💾 Saving transaction to database...');
      
      await base44.asServiceRole.entities.PaymentTransaction.create(transactionData);
      
      console.log('✅ Transaction saved to database');
      console.log('═══════════════════════════════════════════');
      console.log('');
      
      return Response.json({
        success: true,
        data: result.data
      }, { status: 200 });
      
    } catch (error) {
      console.error('❌ Payment creation error:', error);
      return Response.json({ 
        success: false, 
        message: 'Gagal membuat pembayaran: ' + error.message,
        data: null
      }, { status: 200 });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return Response.json({ 
      success: false, 
      message: 'Terjadi kesalahan server: ' + error.message,
      data: null
    }, { status: 200 });
  }
});