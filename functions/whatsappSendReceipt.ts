import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  let cleaned = phone.toString().replace(/\D/g, '');
  
  if (!cleaned.startsWith('62')) {
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    } else {
      cleaned = '62' + cleaned;
    }
  }
  
  console.log(`📞 Format: ${phone} → ${cleaned}`);
  return cleaned;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { companyId, transaction, memberPhone } = await req.json();

    console.log('═══════════════════════════════════');
    console.log('📱 WABLAS SEND RECEIPT - START');
    console.log('═══════════════════════════════════');
    console.log('Company ID:', companyId);
    console.log('Member Phone (RAW):', memberPhone);
    console.log('Transaction Number:', transaction?.transaction_number);
    console.log('Transaction Items:', transaction?.items?.length);

    if (!companyId || !transaction || !memberPhone) {
      console.error('❌ MISSING DATA:', { companyId: !!companyId, transaction: !!transaction, memberPhone: !!memberPhone });
      return Response.json({ 
        error: 'Missing required: companyId, transaction, memberPhone',
        success: false
      }, { status: 400 });
    }

    // Get company
    const company = await base44.asServiceRole.entities.Company.get({ id: companyId });
    if (!company) {
      console.error('❌ Company not found:', companyId);
      return Response.json({ error: 'Company not found', success: false }, { status: 404 });
    }

    console.log('🏢 Company:', company.name);

    // Get Wablas settings
    const settings = await base44.asServiceRole.entities.CompanyWablasSettings.filter({
      company_id: companyId,
      is_active: true
    });

    if (!settings || settings.length === 0) {
      console.error('❌ Wablas settings not found for company:', companyId);
      return Response.json({ 
        error: 'Wablas not configured for this company',
        success: false 
      }, { status: 400 });
    }

    const wablasSetting = settings[0];
    
    // ✅ SYSTEM DEFAULT API - HARDCODED FALLBACK
    const SYSTEM_DEFAULT_API_KEY = 'x7fXtn51jTAqAly5EnQ3gYR65t6eaXyVO9Bf4kLYW0gsxB0U9Qs41sn';
    const SYSTEM_DEFAULT_SECRET = '2wLnDlp2';
    const SYSTEM_DEFAULT_DOMAIN = 'jogja.wablas.com';
    
    let TOKEN = wablasSetting.wablas_api_key;
    let SECRET_KEY = wablasSetting.wablas_secret_key || '';
    let domain = wablasSetting.wablas_domain || SYSTEM_DEFAULT_DOMAIN;
    
    // ✅ If company uses system API, get from SystemWablasSettings or use hardcoded
    if (wablasSetting.use_system_api) {
      console.log('🔧 Company uses SYSTEM API');
      
      try {
        const systemSettings = await base44.asServiceRole.entities.SystemWablasSettings.list();
        if (systemSettings && systemSettings.length > 0 && systemSettings[0].wablas_api_key) {
          TOKEN = systemSettings[0].wablas_api_key;
          SECRET_KEY = systemSettings[0].wablas_secret_key || '';
          domain = systemSettings[0].wablas_domain || SYSTEM_DEFAULT_DOMAIN;
          console.log('   ✅ Using DB System API');
        } else {
          // Use hardcoded default
          TOKEN = SYSTEM_DEFAULT_API_KEY;
          SECRET_KEY = SYSTEM_DEFAULT_SECRET;
          domain = SYSTEM_DEFAULT_DOMAIN;
          console.log('   ✅ Using HARDCODED System API');
        }
      } catch (e) {
        // Fallback to hardcoded
        TOKEN = SYSTEM_DEFAULT_API_KEY;
        SECRET_KEY = SYSTEM_DEFAULT_SECRET;
        domain = SYSTEM_DEFAULT_DOMAIN;
        console.log('   ⚠️ Fallback to HARDCODED System API');
      }
    }

    console.log('🔑 Wablas Config:');
    console.log('  Domain:', domain);
    console.log('  Token:', TOKEN ? `${TOKEN.substring(0, 15)}...` : 'NOT SET');
    console.log('  Secret:', SECRET_KEY ? 'SET' : 'NOT SET');

    // Format receipt message
    const date = new Date(transaction.transaction_date || transaction.created_date || Date.now()).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let message = `╔════════════════════════╗\n`;
    message += `   📄 *STRUK PEMBAYARAN*\n`;
    message += `╚════════════════════════╝\n\n`;
    message += `🏢 *${company.name}*\n`;
    message += `📅 ${date}\n`;
    message += `🧾 No: *${transaction.invoice_number || transaction.transaction_number || transaction.id.substring(0, 8)}*\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*DETAIL PEMBELIAN*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Items
    if (transaction.items && transaction.items.length > 0) {
      transaction.items.forEach((item, index) => {
        const itemTotal = (item.subtotal || (item.quantity * item.price));
        message += `${index + 1}. *${item.product_name}*\n`;
        message += `   ${item.quantity} x ${formatCurrency(item.price)}\n`;
        message += `   = ${formatCurrency(itemTotal)}\n\n`;
      });
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Subtotal: ${formatCurrency(transaction.subtotal || 0)}\n`;
    
    if ((transaction.tax || transaction.tax_amount || 0) > 0) {
      message += `Pajak: ${formatCurrency(transaction.tax || transaction.tax_amount)}\n`;
    }
    
    if ((transaction.discount_amount || 0) > 0) {
      message += `Diskon: -${formatCurrency(transaction.discount_amount)}\n`;
    }

    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*TOTAL: ${formatCurrency(transaction.total || transaction.total_amount)}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (transaction.payment_method) {
      message += `💳 Pembayaran: ${transaction.payment_method}\n`;
    }

    if (transaction.payment_amount) {
      message += `💰 Dibayar: ${formatCurrency(transaction.payment_amount)}\n`;
      if ((transaction.change_amount || 0) > 0) {
        message += `💵 Kembalian: ${formatCurrency(transaction.change_amount)}\n`;
      }
    }

    message += `\n✨ *Terima kasih sudah berbelanja!* ✨\n`;
    
    if ((transaction.points_earned || 0) > 0) {
      message += `\n🎁 *Poin yang didapat: ${transaction.points_earned} poin*\n`;
    }

    console.log('📝 Receipt message prepared');
    console.log('Message length:', message.length, 'chars');

    // Format phone number
    const formattedNumber = formatPhoneNumber(memberPhone);
    
    if (!formattedNumber) {
      console.error('❌ Invalid phone number:', memberPhone);
      return Response.json({
        success: false,
        error: 'Invalid phone number format'
      }, { status: 400 });
    }
    
    console.log('📞 Formatted phone:', formattedNumber);
    
    // Send via Wablas
    const sendUrl = `https://${domain}/api/send-message`;
    console.log('🌐 Wablas URL:', sendUrl);

    const authHeader = SECRET_KEY ? `${TOKEN}.${SECRET_KEY}` : TOKEN;
    console.log('🔐 Auth header:', authHeader.substring(0, 20) + '...');

    const payload = new URLSearchParams({
      phone: formattedNumber,
      message: message
    });

    console.log('📤 Sending to Wablas...');

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: payload.toString()
    });

    const result = await response.json();
    
    console.log('═══════════════════════════════════');
    console.log('📡 WABLAS RESPONSE:');
    console.log('Status Code:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('═══════════════════════════════════');

    if (result.status === true || result.status === 'true') {
      console.log('✅ ✅ ✅ STRUK BERHASIL DIKIRIM! ✅ ✅ ✅');
      
      return Response.json({
        success: true,
        message: `✅ Struk berhasil dikirim ke WhatsApp ${formattedNumber}`,
        messageId: result.data?.id || result.id,
        wablasResponse: result
      });
    } else {
      console.error('❌ WABLAS GAGAL:', result.message);
      throw new Error(result.message || 'Wablas send failed');
    }

  } catch (error) {
    console.error('═══════════════════════════════════');
    console.error('❌ ❌ ❌ SEND RECEIPT ERROR ❌ ❌ ❌');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════');
    
    return Response.json({ 
      success: false,
      error: error.message,
      message: `Gagal mengirim struk: ${error.message}`
    }, { status: 500 });
  }
});