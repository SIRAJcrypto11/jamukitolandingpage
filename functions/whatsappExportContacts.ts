import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, format = 'csv' } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'sessionId required' }, { status: 400 });
    }

    console.log('═══════════════════════════════════');
    console.log('📥 EXPORT CONTACTS - START');
    console.log('Session ID:', sessionId);
    console.log('Format:', format);
    console.log('═══════════════════════════════════');

    // Get session
    const session = await base44.asServiceRole.entities.WhatsAppSession.get({ id: sessionId });
    
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'connected') {
      return Response.json({ error: 'Session not connected' }, { status: 400 });
    }

    console.log('✅ Session found:', session.phone_number);

    // Get Wablas settings
    const settings = await base44.asServiceRole.entities.CompanyWablasSettings.filter({
      company_id: session.company_id,
      is_active: true
    });

    if (!settings || settings.length === 0) {
      return Response.json({ error: 'Wablas not configured' }, { status: 400 });
    }

    const wablasSetting = settings[0];
    const TOKEN = wablasSetting.wablas_api_key;
    const SECRET_KEY = wablasSetting.wablas_secret_key || '';
    const domain = wablasSetting.wablas_domain || 'solo.wablas.com';

    console.log('🔑 Using domain:', domain);

    // ✅ FETCH CHATS - Get ALL chat messages to extract phone numbers
    const authHeader = SECRET_KEY ? `${TOKEN}.${SECRET_KEY}` : TOKEN;
    const chatsUrl = `https://${domain}/api/chats?limit=10000&sort=desc`;
    
    console.log('📡 Fetching ALL chats from:', chatsUrl);

    const chatsResponse = await fetch(chatsUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      }
    });

    const chatsData = await chatsResponse.json();
    console.log('📊 Chats response:', chatsData);

    if (chatsData.status !== true && chatsData.status !== 'true') {
      console.error('❌ Failed to fetch chats:', chatsData.message);
      return Response.json({ 
        error: 'Failed to fetch chats: ' + (chatsData.message || 'Unknown error') 
      }, { status: 500 });
    }

    const allChats = chatsData.data || [];
    console.log(`✅ Found ${allChats.length} chats`);

    // Extract unique phone numbers from chats
    const phoneNumbersSet = new Set();
    const contactsMap = new Map();

    allChats.forEach(chat => {
      if (chat.phone) {
        const cleanPhone = chat.phone.replace(/\D/g, '');
        phoneNumbersSet.add(cleanPhone);
        
        // Store contact info
        if (!contactsMap.has(cleanPhone)) {
          contactsMap.set(cleanPhone, {
            phone_number: cleanPhone,
            contact_name: chat.name || chat.pushname || cleanPhone,
            last_message: chat.last_message || '',
            last_message_time: chat.time || new Date().toISOString()
          });
        }
      }
    });

    console.log(`📋 Extracted ${phoneNumbersSet.size} unique phone numbers`);

    // Save to database
    let savedCount = 0;
    const contactsToExport = [];

    for (const [phone, contactInfo] of contactsMap.entries()) {
      try {
        // Check if exists
        const existing = await base44.asServiceRole.entities.WhatsAppContact.filter({
          session_id: sessionId,
          phone_number: phone
        });

        if (existing && existing.length > 0) {
          // Update
          await base44.asServiceRole.entities.WhatsAppContact.update(existing[0].id, {
            contact_name: contactInfo.contact_name,
            last_synced: new Date().toISOString()
          });
        } else {
          // Create new
          await base44.asServiceRole.entities.WhatsAppContact.create({
            session_id: sessionId,
            user_id: user.email,
            company_id: session.company_id,
            phone_number: phone,
            contact_name: contactInfo.contact_name,
            last_synced: new Date().toISOString()
          });
        }

        contactsToExport.push({
          name: contactInfo.contact_name,
          phone: phone,
          formatted_phone: phone.startsWith('62') ? phone : '62' + phone
        });

        savedCount++;
      } catch (error) {
        console.error('Error saving contact:', phone, error);
      }
    }

    console.log(`✅ Saved ${savedCount} contacts to database`);

    // Update session
    await base44.asServiceRole.entities.WhatsAppSession.update(sessionId, {
      total_contacts: savedCount,
      last_connected: new Date().toISOString()
    });

    // Generate export file
    let fileContent = '';
    
    if (format === 'vcf') {
      // ✅ VCF FORMAT - Compatible with Google Contacts & Smartphone
      contactsToExport.forEach(contact => {
        fileContent += `BEGIN:VCARD\n`;
        fileContent += `VERSION:3.0\n`;
        fileContent += `FN:${contact.name}\n`;
        fileContent += `TEL;TYPE=CELL:+${contact.formatted_phone}\n`;
        fileContent += `END:VCARD\n\n`;
      });
    } else {
      // ✅ CSV FORMAT - Compatible with Google Contacts
      fileContent = 'Name,Phone\n';
      contactsToExport.forEach(contact => {
        fileContent += `"${contact.name}","+${contact.formatted_phone}"\n`;
      });
    }

    console.log('✅ Export file generated');
    console.log('═══════════════════════════════════');

    return new Response(fileContent, {
      status: 200,
      headers: {
        'Content-Type': format === 'vcf' ? 'text/vcard' : 'text/csv',
        'Content-Disposition': `attachment; filename="whatsapp_contacts_${Date.now()}.${format}"`
      }
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});