import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function formatPhoneNumber(phone) {
  let cleaned = phone.replace(/\D/g, '');
  
  if (!cleaned.startsWith('62')) {
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else {
      cleaned = '62' + cleaned;
    }
  }
  
  return cleaned;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, phoneNumbers, message } = await req.json();

    if (!sessionId || !phoneNumbers || !message) {
      return Response.json({ 
        error: 'Missing required: sessionId, phoneNumbers, message' 
      }, { status: 400 });
    }

    // Validate session
    const sessions = await base44.entities.WhatsAppSession.filter({
      id: sessionId
    });

    const session = sessions?.[0];
    
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'connected') {
      return Response.json({ 
        error: 'WhatsApp not connected. Klik "Check Status" terlebih dahulu.',
        status: session.status 
      }, { status: 400 });
    }

    // Get company Wablas settings
    const settings = await base44.entities.CompanyWablasSettings.filter({
      company_id: session.company_id,
      is_active: true
    });

    if (!settings || settings.length === 0) {
      return Response.json({ error: 'Wablas settings not found' }, { status: 400 });
    }

    const wablasSetting = settings[0];
    const TOKEN = wablasSetting.wablas_api_key;
    const SECRET_KEY = wablasSetting.wablas_secret_key || '';
    const domain = wablasSetting.wablas_domain || 'jogja.wablas.com';

    // Prepare phone numbers
    const numbers = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];
    
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    // SESUAI DOKUMENTASI WABLAS: POST /api/send-message dengan Authorization header
    for (const phone of numbers) {
      try {
        const formattedNumber = formatPhoneNumber(phone);
        
        const response = await fetch(`https://${domain}/api/send-message`, {
          method: 'POST',
          headers: {
            'Authorization': SECRET_KEY ? `${TOKEN}.${SECRET_KEY}` : TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            phone: formattedNumber,
            message: message
          })
        });

        const result = await response.json();
        console.log('Send response:', result);

        if (result.status === true || result.status === 'true') {
          results.push({
            phone,
            status: 'success',
            messageId: result.data?.id || result.id || `msg_${Date.now()}`
          });
          successCount++;
        } else {
          throw new Error(result.message || 'Failed to send');
        }

        // Delay 1.5 detik antar message (rate limiting)
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error) {
        console.error(`Failed to send to ${phone}:`, error);
        results.push({
          phone,
          status: 'failed',
          error: error.message
        });
        failedCount++;
      }
    }

    // Update session stats
    await base44.entities.WhatsAppSession.update(sessionId, {
      total_messages_sent: (session.total_messages_sent || 0) + successCount
    });

    return Response.json({
      success: successCount > 0,
      message: `✅ ${successCount} pesan terkirim${failedCount > 0 ? `, ${failedCount} gagal` : ''}`,
      results,
      sentCount: successCount,
      failedCount
    });

  } catch (error) {
    console.error('Send message error:', error);
    return Response.json({ 
      error: error.message
    }, { status: 500 });
  }
});