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
        message: 'Unauthorized - Please login',
        payment_methods: []
      }, { status: 401 });
    }
    
    if (!user) {
      return Response.json({ 
        success: false, 
        message: 'Unauthorized - Please login',
        payment_methods: []
      }, { status: 401 });
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('💳 GET TRIPAY PAYMENT METHODS');
    console.log('User:', user.email);
    console.log('═══════════════════════════════════════════');
    
    let apiKey = null;
    let mode = 'sandbox';
    
    try {
      const settings = await base44.asServiceRole.entities.PaymentGatewaySettings.filter({
        gateway_name: 'tripay'
      });
      
      if (settings && settings.length > 0 && settings[0].api_key) {
        apiKey = settings[0].api_key;
        mode = settings[0].mode || 'sandbox';
        console.log('✅ Using credentials from DATABASE');
        console.log('   - Mode:', mode);
      }
    } catch (dbError) {
      console.warn('⚠️ Database credentials not found:', dbError.message);
    }
    
    if (!apiKey) {
      apiKey = Deno.env.get('TRIPAY_API_KEY');
      if (apiKey) {
        console.log('✅ Using credentials from ENVIRONMENT SECRETS');
      }
    }
    
    if (!apiKey) {
      console.error('❌ No API Key found!');
      return Response.json({
        success: false,
        message: 'API Key tidak ditemukan. Silakan konfigurasi di Admin Dashboard → Tripay.',
        payment_methods: []
      }, { status: 200 });
    }
    
    const baseUrl = mode === 'production' 
      ? 'https://tripay.co.id/api' 
      : 'https://tripay.co.id/api-sandbox';
    
    const url = `${baseUrl}/merchant/payment-channel`;
    
    console.log('📡 Calling Tripay API...');
    console.log('   - URL:', url);
    console.log('   - Mode:', mode);
    
    let response;
    let result;
    
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        signal: AbortSignal.timeout(10000)
      });
      
      result = await response.json();
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return Response.json({
        success: false,
        message: 'Gagal terhubung ke Tripay. Periksa koneksi internet atau coba lagi.',
        payment_methods: []
      }, { status: 200 });
    }
    
    console.log('📥 Tripay Response:', {
      ok: response.ok,
      status: response.status,
      success: result?.success,
      dataLength: result?.data?.length,
      message: result?.message
    });
    
    if (!response.ok || !result.success) {
      console.error('❌ Tripay API Error:', result);
      return Response.json({
        success: false,
        message: result.message || 'Gagal terhubung ke Tripay',
        payment_methods: []
      }, { status: 200 });
    }
    
    console.log('✅ Payment methods fetched:', result.data?.length || 0);
    console.log('═══════════════════════════════════════════');
    console.log('');
    
    return Response.json({
      success: true,
      payment_methods: result.data || [],
      total: result.data?.length || 0
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return Response.json({ 
      success: false, 
      message: 'Terjadi kesalahan server. Silakan coba lagi.',
      payment_methods: [],
      error: error.message
    }, { status: 200 });
  }
});