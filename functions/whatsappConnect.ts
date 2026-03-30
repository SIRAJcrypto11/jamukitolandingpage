import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, sessionId, companyId } = await req.json();

    if (!companyId) {
      return Response.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Get company Wablas settings
    const settings = await base44.entities.CompanyWablasSettings.filter({
      company_id: companyId,
      is_active: true
    });

    if (!settings || settings.length === 0) {
      return Response.json({ 
        error: 'Wablas belum dikonfigurasi di Company Settings',
        needsSetup: true
      }, { status: 400 });
    }

    const wablasSetting = settings[0];
    const TOKEN = wablasSetting.wablas_api_key;
    const SECRET_KEY = wablasSetting.wablas_secret_key || '';
    const domain = wablasSetting.wablas_domain || 'jogja.wablas.com';

    console.log('🔍 CHECKING WABLAS CONNECTION');
    console.log('Domain:', domain);
    console.log('Token:', TOKEN ? `${TOKEN.substring(0, 15)}...` : 'NOT SET');

    // Sesuai dokumentasi Wablas: GET device/status dengan Authorization header
    const statusUrl = `https://${domain}/api/device/status`;
    
    const statusResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Authorization': SECRET_KEY ? `${TOKEN}.${SECRET_KEY}` : TOKEN,
        'Accept': 'application/json'
      }
    });

    const statusData = await statusResponse.json();
    console.log('📡 Wablas Response:', JSON.stringify(statusData, null, 2));

    // Parse response sesuai dokumentasi
    // Format: { status: true/false, data: { ... device info ... } }
    let isConnected = false;
    let phoneNumber = null;
    let deviceInfo = null;

    if (statusData.status === true || statusData.status === 'true') {
      const data = statusData.data;
      
      if (data) {
        // Cek apakah device sudah authenticated/connected
        isConnected = data.status === 'authenticated' || 
                     data.status === 'connected' ||
                     data.status === 'open' ||
                     data.state === 'authenticated' ||
                     data.state === 'connected';
        
        phoneNumber = data.phone || data.jid || data.number;
        deviceInfo = data;
        
        console.log('✅ Device Status:', data.status || data.state);
        console.log('📱 Phone:', phoneNumber);
      }
    } else {
      console.log('❌ Wablas response status false');
    }

    // Jika masih belum connected, coba alternative endpoint
    if (!isConnected) {
      console.log('🔄 Trying alternative endpoint...');
      
      try {
        const altUrl = `https://${domain}/api/device`;
        const altResponse = await fetch(altUrl, {
          method: 'GET',
          headers: {
            'Authorization': SECRET_KEY ? `${TOKEN}.${SECRET_KEY}` : TOKEN,
            'Accept': 'application/json'
          }
        });

        const altData = await altResponse.json();
        console.log('📡 Alternative Response:', JSON.stringify(altData, null, 2));
        
        if (altData.status === true && altData.data) {
          const devices = Array.isArray(altData.data) ? altData.data : [altData.data];
          
          if (devices.length > 0) {
            const device = devices[0];
            isConnected = device.status === 'authenticated' || 
                         device.status === 'connected';
            phoneNumber = phoneNumber || device.phone || device.jid;
            deviceInfo = device;
          }
        }
      } catch (altError) {
        console.log('⚠️ Alternative endpoint failed:', altError.message);
      }
    }

    console.log('=== FINAL RESULT ===');
    console.log('Connected:', isConnected);
    console.log('Phone:', phoneNumber);

    // Update/create session
    let session;
    
    if (sessionId) {
      const sessions = await base44.entities.WhatsAppSession.filter({
        id: sessionId,
        company_id: companyId
      });
      session = sessions?.[0];
    }

    const sessionData = {
      user_id: user.id,
      user_email: user.email,
      status: isConnected ? 'connected' : 'disconnected',
      company_id: companyId,
      phone_number: phoneNumber,
      last_connected: isConnected ? new Date().toISOString() : (session?.last_connected || null),
      session_data: deviceInfo
    };

    if (!session) {
      session = await base44.asServiceRole.entities.WhatsAppSession.create({
        ...sessionData,
        session_id: `wablas_${companyId}_${Date.now()}`
      });
    } else {
      await base44.entities.WhatsAppSession.update(session.id, sessionData);
      session = { ...session, ...sessionData };
    }

    return Response.json({
      success: true,
      message: isConnected 
        ? `✅ WABLAS TERHUBUNG! Device: ${phoneNumber}` 
        : `⚠️ Device belum authenticated - Login ke Wablas Dashboard`,
      session: {
        id: session.id,
        status: isConnected ? 'connected' : 'disconnected',
        phone_number: phoneNumber
      },
      isConnected,
      wablasResponse: statusData,
      deviceInfo: deviceInfo
    });

  } catch (error) {
    console.error('❌ CONNECTION ERROR:', error);
    
    return Response.json({ 
      error: error.message,
      message: 'Gagal koneksi ke Wablas API - Periksa API Key & Domain'
    }, { status: 500 });
  }
});