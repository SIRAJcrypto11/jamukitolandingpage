// ✅ AUTO BLAST RECEIPT - Kirim struk otomatis ke customer via WhatsApp

import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// ✅ HARDCODED SYSTEM DEFAULT API - ALWAYS AVAILABLE
const SYSTEM_DEFAULT_WABLAS = {
  apiKey: 'x7fXtn51jTAqAly5EnQ3gYR65t6eaXyVO9Bf4kLYW0gsxB0U9Qs41sn',
  secretKey: '2wLnDlp2',
  domain: 'jogja.wablas.com'
};

/**
 * Get Wablas API credentials - either from system or company settings
 */
async function getWablasCredentials(companyId) {
  try {
    // ✅ TRY LOCALSTORAGE CACHE FIRST (instant)
    const cachedSettings = localStorage.getItem(`SNISHOP_WABLAS_${companyId}`);
    let settings = null;
    
    if (cachedSettings) {
      try {
        settings = JSON.parse(cachedSettings);
        console.log('⚡ Using cached Wablas settings');
      } catch (e) {}
    }
    
    // If no cache, fetch from DB
    if (!settings) {
      const companySettings = await base44.entities.CompanyWablasSettings.filter({
        company_id: companyId,
        is_active: true
      });

      if (!companySettings || companySettings.length === 0) {
        console.log('⏭️ AUTO BLAST: No company settings found');
        return null;
      }

      settings = companySettings[0];
      // Cache for next time
      localStorage.setItem(`SNISHOP_WABLAS_${companyId}`, JSON.stringify(settings));
    }

    console.log('⚙️ Settings loaded:');
    console.log('   use_system_api:', settings.use_system_api);
    console.log('   auto_send_receipt:', settings.auto_send_receipt);
    console.log('   has own api_key:', !!settings.wablas_api_key);

    // 2. Check if using system API
    if (settings.use_system_api) {
      console.log('🔧 Using SYSTEM API (HARDCODED)');
      
      // ✅ TRY DATABASE FIRST, FALLBACK TO HARDCODED
      let sysApiKey = SYSTEM_DEFAULT_WABLAS.apiKey;
      let sysSecretKey = SYSTEM_DEFAULT_WABLAS.secretKey;
      let sysDomain = SYSTEM_DEFAULT_WABLAS.domain;
      
      try {
        const systemSettings = await base44.entities.SystemWablasSettings.list();
        if (systemSettings && systemSettings.length > 0) {
          const sysSet = systemSettings[0];
          if (sysSet.wablas_api_key) {
            sysApiKey = sysSet.wablas_api_key;
            sysSecretKey = sysSet.wablas_secret_key || sysSecretKey;
            sysDomain = sysSet.wablas_domain || sysDomain;
            console.log('   ✅ Using DB System API');
          }
        }
      } catch (e) {
        console.log('   ⚠️ DB System settings not found, using hardcoded default');
      }

      console.log('   System domain:', sysDomain);
      console.log('   API Key:', sysApiKey.substring(0, 15) + '...');

      return {
        apiKey: sysApiKey,
        secretKey: sysSecretKey,
        domain: sysDomain,
        template: settings.receipt_message_template,
        autoSend: settings.auto_send_receipt
      };
    }

    // 3. Use company's own API
    console.log('🔧 Using COMPANY OWN API');
    
    if (!settings.wablas_api_key) {
      console.warn('⚠️ Company API key is empty!');
      return null;
    }

    console.log('   Company API configured:', !!settings.wablas_api_key);
    console.log('   Company domain:', settings.wablas_domain);

    return {
      apiKey: settings.wablas_api_key,
      secretKey: settings.wablas_secret_key,
      domain: settings.wablas_domain || 'jogja.wablas.com',
      template: settings.receipt_message_template,
      autoSend: settings.auto_send_receipt
    };

  } catch (error) {
    console.error('❌ ERROR getting credentials:', error);
    console.error('   Stack:', error.stack);
    return null;
  }
}

/**
 * Send receipt to customer via WhatsApp automatically
 */
export async function autoSendReceipt(transaction, company, customerPhone) {
  try {
    console.log('═══════════════════════════════════');
    console.log('📱 AUTO BLAST STARTING');
    console.log('Company:', company.name);
    console.log('Customer Phone:', customerPhone);
    console.log('═══════════════════════════════════');

    // 1. Get Wablas credentials
    const credentials = await getWablasCredentials(company.id);

    if (!credentials) {
      console.log('⏭️ AUTO BLAST: No valid credentials');
      return false;
    }

    console.log('✅ Credentials loaded');
    console.log('   API Source:', credentials.apiKey ? (credentials.apiKey.substring(0, 10) + '...') : 'NONE');
    console.log('   Domain:', credentials.domain);
    console.log('   Auto Send:', credentials.autoSend);

    if (!credentials.autoSend) {
      console.log('⏭️ AUTO BLAST: Auto send not enabled');
      return false;
    }

    if (!customerPhone) {
      console.log('⏭️ AUTO BLAST: No customer phone');
      return false;
    }

    // 2. Format phone number
    let formattedPhone = customerPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone;
    }

    console.log('📱 Formatted phone:', formattedPhone);

    // 3. Build message from template
    const template = credentials.template || 
      'Terima kasih telah berbelanja di {company_name}!\n\n📋 *Detail Transaksi*\nNo: {transaction_id}\nTanggal: {date}\nTotal: {total}\n\nKami tunggu kunjungan berikutnya! 🙏';

    const itemsList = transaction.items.map((item, idx) => 
      `${idx + 1}. ${item.product_name || item.name} - ${item.quantity}x @ Rp ${item.price.toLocaleString('id-ID')}`
    ).join('\n');

    const message = template
      .replace(/{company_name}/g, company.name)
      .replace(/{transaction_id}/g, transaction.transaction_number || transaction.id)
      .replace(/{date}/g, format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id }))
      .replace(/{total}/g, `Rp ${(transaction.total || transaction.total_amount).toLocaleString('id-ID')}`)
      .replace(/{items}/g, itemsList)
      .replace(/{customer_name}/g, transaction.customer_name || 'Customer');

    console.log('📝 Message prepared (length:', message.length, 'chars)');

    // 4. Send via Wablas
    const apiUrl = `https://${credentials.domain}/api/send-message`;

    console.log('🚀 Sending to Wablas API...');
    console.log('   URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': credentials.apiKey
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
        secret: false
      })
    });

    const result = await response.json();

    console.log('📡 Wablas Response:', result);

    if (result.status === true || result.status === 'success' || response.ok) {
      console.log('✅ ✅ ✅ AUTO BLAST SUCCESS! ✅ ✅ ✅');
      console.log('═══════════════════════════════════');
      return true;
    } else {
      console.error('❌ AUTO BLAST FAILED');
      console.error('   Response:', result);
      console.log('═══════════════════════════════════');
      return false;
    }

  } catch (error) {
    console.error('❌ ❌ ❌ AUTO BLAST ERROR ❌ ❌ ❌');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    console.log('═══════════════════════════════════');
    return false;
  }
}