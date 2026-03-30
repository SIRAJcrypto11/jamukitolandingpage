import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { companyId, testPhone } = await req.json();

    if (!companyId || !testPhone) {
      return Response.json({ error: 'Company ID dan nomor test required' }, { status: 400 });
    }

    // Get Wablas settings
    const settings = await base44.entities.CompanyWablasSettings.filter({
      company_id: companyId,
      is_active: true
    });

    if (!settings || settings.length === 0) {
      return Response.json({ 
        error: 'Wablas settings not found'
      }, { status: 400 });
    }

    const wablasSetting = settings[0];
    const TOKEN = wablasSetting.wablas_api_key;
    const SECRET_KEY = wablasSetting.wablas_secret_key || '';
    const domain = wablasSetting.wablas_domain || 'jogja.wablas.com';

    console.log('🔥 TEST KONEKSI WABLAS');
    console.log('Domain:', domain);

    // Format phone number
    let phone = testPhone.replace(/\D/g, '');
    if (!phone.startsWith('62')) {
      if (phone.startsWith('0')) {
        phone = '62' + phone.substring(1);
      } else {
        phone = '62' + phone;
      }
    }

    console.log('Sending test to:', phone);

    // KIRIM PESAN TEST
    const sendUrl = `https://${domain}/api/send-message`;
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': SECRET_KEY ? `${TOKEN}.${SECRET_KEY}` : TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        phone: phone,
        message: `✅ TEST KONEKSI WABLAS\n\nSistem SNISHOP berhasil terhubung dengan Wablas!\n\nWaktu: ${new Date().toLocaleString('id-ID')}\nCompany: ${companyId}`
      })
    });

    const sendData = await sendResponse.json();
    console.log('Send Response:', JSON.stringify(sendData, null, 2));

    const success = sendData.status === true || sendData.status === 'true';

    if (success) {
      console.log('✅ PESAN BERHASIL TERKIRIM = WABLAS CONNECTED!');

      // CREATE/UPDATE SESSION DENGAN STATUS CONNECTED
      const sessions = await base44.entities.WhatsAppSession.filter({
        company_id: companyId
      });

      let session;
      const sessionData = {
        user_id: user.id,
        user_email: user.email,
        status: 'connected', // ✅ CONNECTED karena pesan berhasil
        company_id: companyId,
        phone_number: phone,
        last_connected: new Date().toISOString(),
        total_messages_sent: sessions[0] ? (sessions[0].total_messages_sent || 0) + 1 : 1
      };

      if (sessions && sessions.length > 0) {
        session = sessions[0];
        await base44.entities.WhatsAppSession.update(session.id, sessionData);
      } else {
        session = await base44.asServiceRole.entities.WhatsAppSession.create({
          ...sessionData,
          session_id: `wablas_${companyId}_${Date.now()}`
        });
      }

      return Response.json({
        success: true,
        message: `✅ WABLAS TERHUBUNG! Pesan test berhasil dikirim ke ${testPhone}`,
        session: {
          id: session.id,
          status: 'connected',
          phone_number: phone
        },
        sendResponse: sendData
      });

    } else {
      console.log('❌ GAGAL KIRIM PESAN');
      
      return Response.json({
        success: false,
        message: `❌ Gagal kirim pesan test: ${sendData.message || 'Unknown error'}`,
        error: sendData.message,
        sendResponse: sendData,
        troubleshooting: [
          '1. Pastikan API Key & Secret Key benar di Company Settings',
          '2. Pastikan device sudah authenticated di Wablas dashboard',
          '3. Cek domain Wablas sudah benar (jogja.wablas.com)',
          '4. Pastikan nomor WhatsApp format Indonesia (08xxx atau 628xxx)'
        ]
      });
    }

  } catch (error) {
    console.error('❌ TEST ERROR:', error);
    
    return Response.json({ 
      success: false,
      error: error.message,
      message: '❌ Test koneksi error - Periksa API Key dan domain Wablas'
    }, { status: 500 });
  }
});