import React from 'react';
import { format } from 'date-fns';

export default function ReceiptTemplate({ transaction, settings, companyName, logoUrl }) {
  const receiptSettings = settings?.receipt_settings || {};

  // ✅ DEBUG: Log all parameters
  console.log('🖼️ ReceiptTemplate called with:');
  console.log('  - settings:', settings);
  console.log('  - receiptSettings:', receiptSettings);
  console.log('  - logoUrl param:', logoUrl);
  console.log('  - receiptSettings.logo_url:', receiptSettings.logo_url);
  console.log('  - show_company_logo:', receiptSettings.show_company_logo);

  // ✅ FIX: Default to true if setting is undefined (for new companies)
  const showLogo = receiptSettings.show_company_logo !== false;

  // ✅ FIX: Try multiple sources for logo URL
  const effectiveLogo = logoUrl || receiptSettings.logo_url || settings?.logo_url;

  // ✅ SYNC: Use both old and new field names for compatibility
  const showCustomerInfo = receiptSettings.show_customer_info !== false && receiptSettings.show_customer_name !== false;
  const showCashierName = receiptSettings.show_cashier_name !== false;
  const showPaymentDetails = receiptSettings.show_payment_details !== false;
  const showChange = receiptSettings.show_change !== false;
  const showPointsEarned = receiptSettings.show_points_earned !== false;
  const showCustomerPoints = receiptSettings.show_customer_points !== false;
  const showPromoMessage = receiptSettings.show_promo_message === true;
  const promoMessage = receiptSettings.promo_message || '';

  // ✅ SYNC: Support both field names for header/footer
  const headerText = receiptSettings.custom_header_text || receiptSettings.header_text || '';
  const footerMessage = receiptSettings.custom_footer_text || receiptSettings.footer_message || 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar/dikembalikan.';

  // ✅ FULL SYNC: Use Company Settings values only (NO hardcoded values)
  const bankInfo = receiptSettings.custom_bank_info || '';
  const socialMedia = receiptSettings.custom_social_media || '';
  const customAddress = receiptSettings.custom_address || '';

  // ✅ Logo size settings - DEFAULT TO XL (LARGEST)
  const logoSizeMap = {
    small: '40px',
    medium: '60px',
    large: '80px',
    xl: '100px'
  };
  const logoSize = logoSizeMap[receiptSettings.logo_size] || '100px'; // Default to XL

  // ✅ NEW: Font size settings  
  const fontSizeMap = {
    small: '11px',
    medium: '13px',
    large: '15px'
  };
  const fontSize = fontSizeMap[receiptSettings.font_size] || '13px';

  // ✅ NEW: Font family settings
  const fontFamilyMap = {
    monospace: 'monospace',
    'sans-serif': 'Arial, Helvetica, sans-serif',
    serif: 'Georgia, Times New Roman, serif'
  };
  const fontFamily = fontFamilyMap[receiptSettings.font_family] || 'monospace';

  console.log('  - showLogo:', showLogo);
  console.log('  - effectiveLogo:', effectiveLogo);
  console.log('  - logoSize:', logoSize);
  console.log('  - fontSize:', fontSize);
  console.log('  - fontFamily:', fontFamily);
  console.log('  - Will render logo?', showLogo && effectiveLogo);

  const width = receiptSettings.receipt_width === '58mm' ? '220px' : '300px';

  return (
    <div
      id="receipt-print-area"
      style={{
        width: width,
        margin: '0',
        padding: '8px',
        fontFamily: fontFamily,
        fontSize: fontSize,
        fontWeight: '600',
        backgroundColor: 'white',
        color: 'black',
        lineHeight: '1.5'
      }}
    >
      {showLogo && effectiveLogo && (
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <img
            src={effectiveLogo}
            alt="Logo"
            style={{ maxWidth: logoSize, maxHeight: logoSize, margin: '0 auto' }}
            onError={(e) => {
              console.error('❌ Logo failed to load:', effectiveLogo);
              e.target.style.display = 'none';
            }}
            onLoad={() => console.log('✅ Logo loaded successfully!', effectiveLogo)}
          />
        </div>
      )}

      <div style={{ textAlign: 'center', marginBottom: '8px', borderBottom: '1px dashed black', paddingBottom: '8px' }}>
        <div style={{ fontWeight: '900', fontSize: `calc(${fontSize} + 3px)`, marginBottom: '4px', letterSpacing: '0.5px' }}>
          {receiptSettings.business_name || companyName || 'TOKO SAYA'}
        </div>

        {/* ✅ Custom Address (dedicated field, separate from header) */}
        {customAddress && customAddress.trim() && customAddress.split('\n').map((line, idx) => (
          <div key={`addr-${idx}`} style={{ fontSize: `calc(${fontSize} - 2px)`, fontWeight: '600' }}>{line}</div>
        ))}

        {/* ✅ Fallback to business_address if no custom_address */}
        {(!customAddress || !customAddress.trim()) && receiptSettings.business_address && (
          <div style={{ fontSize: `calc(${fontSize} - 2px)`, fontWeight: '600' }}>{receiptSettings.business_address}</div>
        )}

        {receiptSettings.business_phone && (
          <div style={{ fontSize: `calc(${fontSize} - 2px)`, fontWeight: '600' }}>Customer Care : {receiptSettings.business_phone}</div>
        )}
      </div>

      {/* ✅ Header Text (title/slogan - only if not empty) */}
      {headerText && headerText.trim() && (
        <div style={{ textAlign: 'center', fontWeight: '700', marginBottom: '8px', fontSize: `calc(${fontSize})`, letterSpacing: '0.5px' }}>
          {headerText.split('\n').map((line, idx) => (
            <div key={`hdr-${idx}`}>{line}</div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '8px', fontSize: '11px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2px 0', fontWeight: '600' }}>No.Transaksi</td>
              <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>{transaction.transaction_number}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 0', fontWeight: '600' }}>Tanggal</td>
              <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>{format(new Date(transaction.created_date || Date.now()), 'dd/MM/yyyy HH:mm')}</td>
            </tr>
            {showCashierName && (
              <tr>
                <td style={{ padding: '2px 0', fontWeight: '600' }}>Kasir</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>{transaction.cashier_name}</td>
              </tr>
            )}
            {transaction.assigned_to_name && (
              <tr>
                <td style={{ padding: '2px 0', fontWeight: '600' }}>Terapis</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>{transaction.assigned_to_name}</td>
              </tr>
            )}
            {showCustomerInfo && transaction.customer_name && (
              <>
                <tr>
                  <td style={{ padding: '2px 0', fontWeight: '600' }}>Customer</td>
                  <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>{transaction.customer_name}</td>
                </tr>
                {transaction.customer_phone && (
                  <tr>
                    <td style={{ padding: '2px 0', fontWeight: '600' }}>Telp</td>
                    <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>{transaction.customer_phone}</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: '1px dashed black', borderBottom: '1px dashed black', padding: '6px 0', marginBottom: '8px' }}>
        {transaction.items?.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', letterSpacing: '0.3px' }}>
              {item.product_name}
            </div>
            <table style={{ width: '100%', fontSize: '11px', marginTop: '2px' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: '600' }}>{item.quantity} x Rp {item.price?.toLocaleString('id-ID')}</td>
                  <td style={{ textAlign: 'right', fontWeight: '700' }}>Rp {item.subtotal?.toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '8px', fontSize: '11px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2px 0', fontWeight: '600' }}>Subtotal</td>
              <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>Rp {transaction.subtotal?.toLocaleString('id-ID')}</td>
            </tr>
            {transaction.discount_amount > 0 && (
              <tr>
                <td style={{ padding: '2px 0', fontWeight: '600' }}>Diskon</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>- Rp {transaction.discount_amount?.toLocaleString('id-ID')}</td>
              </tr>
            )}
            {transaction.shipping_cost > 0 && (
              <tr>
                <td style={{ padding: '2px 0', fontWeight: '600' }}>Ongkir</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>Rp {transaction.shipping_cost?.toLocaleString('id-ID')}</td>
              </tr>
            )}
            {transaction.other_cost > 0 && (
              <tr>
                <td style={{ padding: '2px 0', fontWeight: '600' }}>Biaya Lain</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>Rp {transaction.other_cost?.toLocaleString('id-ID')}</td>
              </tr>
            )}
            <tr style={{ borderTop: '1px solid black' }}>
              <td style={{ padding: '4px 0', fontWeight: '900', fontSize: '15px', letterSpacing: '1px' }}>TOTAL</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '900', fontSize: '15px', letterSpacing: '0.5px' }}>Rp {transaction.total?.toLocaleString('id-ID')}</td>
            </tr>
            <tr>
              <td style={{ padding: '2px 0', fontWeight: '600' }}>Bayar ({transaction.payment_method})</td>
              <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '700' }}>Rp {transaction.payment_amount?.toLocaleString('id-ID')}</td>
            </tr>
            {showChange && transaction.change_amount > 0 && (
              <tr>
                <td style={{ padding: '2px 0', fontWeight: '700' }}>Kembalian</td>
                <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: '900' }}>Rp {transaction.change_amount?.toLocaleString('id-ID')}</td>
              </tr>
            )}
            {showPointsEarned && transaction.points_earned > 0 && (
              <tr>
                <td style={{ padding: '4px 0', fontWeight: '600' }}>Poin Didapat</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: '700' }}>{transaction.points_earned} poin</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {
        transaction.assigned_to_name && (
          <div style={{ marginBottom: '8px', fontSize: '11px' }}>
            <span style={{ fontWeight: '600' }}>Terapis: </span>
            <span>{transaction.assigned_to_name}</span>
          </div>
        )
      }

      {
        transaction.note && (
          <div style={{ marginBottom: '8px', fontSize: `calc(${fontSize} - 2px)`, borderTop: '1px dashed black', paddingTop: '4px' }}>
            <div style={{ fontWeight: '600' }}>Catatan:</div>
            <div>{transaction.note}</div>
          </div>
        )
      }

      {/* ✅ Bank Info Section (dari Company Settings) */}
      {bankInfo && bankInfo.trim() && (
        <div style={{ marginBottom: '8px', fontSize: `calc(${fontSize} - 2px)`, borderTop: '1px dashed black', paddingTop: '6px', textAlign: 'center' }}>
          <div style={{ fontWeight: '700', marginBottom: '4px' }}>Info Rekening</div>
          {bankInfo.split('\n').map((line, idx) => (
            <div key={idx} style={{ fontWeight: '600' }}>{line}</div>
          ))}
        </div>
      )}

      {/* ✅ Social Media Section (dari Company Settings) */}
      {socialMedia && socialMedia.trim() && (
        <div style={{ marginBottom: '8px', fontSize: `calc(${fontSize} - 2px)`, borderTop: '1px dashed black', paddingTop: '6px', textAlign: 'center' }}>
          <div style={{ fontWeight: '700', marginBottom: '4px' }}>Hubungi Kami</div>
          {socialMedia.split('\n').map((line, idx) => (
            <div key={idx} style={{ fontWeight: '600' }}>{line}</div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: `calc(${fontSize} - 2px)`, borderTop: '1px dashed black', paddingTop: '8px', fontWeight: '600' }}>
        {footerMessage.split('\n').map((line, idx) => (
          <div key={idx} style={{ marginBottom: '2px' }}>{line}</div>
        ))}
      </div>

      {showPromoMessage && promoMessage && (
        <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '8px', padding: '8px', backgroundColor: '#f0f0f0', border: '1px dashed #999', borderRadius: '4px' }}>
          <div style={{ fontWeight: '700', marginBottom: '4px' }}>🎉 PROMO</div>
          <div>{promoMessage}</div>
        </div>
      )}



      <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '8px', fontWeight: '700', letterSpacing: '0.5px', color: 'black' }}>
        Powered by SNISHOP.COM
      </div>
    </div >
  );
}

export function generateReceiptHTML(transaction, settings, companyName, logoUrl) {
  const receiptSettings = settings?.receipt_settings || {};

  // ✅ DEBUG
  console.log('🖼️ generateReceiptHTML called with logoUrl:', logoUrl);
  console.log('  receiptSettings.logo_url:', receiptSettings.logo_url);

  // ✅ FIX: Default to true if setting is undefined
  const showLogo = receiptSettings.show_company_logo !== false;
  const effectiveLogo = logoUrl || receiptSettings.logo_url || settings?.logo_url;

  // ✅ SYNC: Use both old and new field names for compatibility (same as React component)
  const showCustomerInfo = receiptSettings.show_customer_info !== false && receiptSettings.show_customer_name !== false;
  const showCashierName = receiptSettings.show_cashier_name !== false;
  const showPaymentDetails = receiptSettings.show_payment_details !== false;
  const showChange = receiptSettings.show_change !== false;
  const showPointsEarned = receiptSettings.show_points_earned !== false;
  const showPromoMessage = receiptSettings.show_promo_message === true;
  const promoMessage = receiptSettings.promo_message || '';

  const headerText = receiptSettings.custom_header_text || receiptSettings.header_text || '';
  const footerMessage = receiptSettings.custom_footer_text || receiptSettings.footer_message || 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar/dikembalikan.';
  const bankInfo = receiptSettings.custom_bank_info || '';
  const socialMedia = receiptSettings.custom_social_media || '';
  const customAddress = receiptSettings.custom_address || '';

  console.log('  effectiveLogo for HTML:', effectiveLogo);

  const width = receiptSettings.receipt_width === '58mm' ? '220px' : '300px';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Struk - ${transaction.transaction_number}</title>
<style>
@media print {
  @page { 
    size: ${receiptSettings.receipt_width === '58mm' ? '58mm' : '80mm'} auto;
    margin: 0;
  }
  body { 
    margin: 0;
    padding: 0;
  }
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: monospace;
  font-size: 13px;
  font-weight: 600;
  background: white;
  color: black;
  line-height: 1.5;
}

.receipt {
  width: ${width};
  max-width: 100%;
  margin: 0 auto;
  padding: 8px;
  background: white;
}

.center { text-align: center; }
.right { text-align: right; }
.dashed { border-bottom: 1px dashed black; }
.solid { border-top: 1px solid black; }

table {
  width: 100%;
  border-collapse: collapse;
}

td {
  padding: 2px 0;
}

.logo { 
  max-width: 60px; 
  max-height: 60px; 
  margin: 0 auto 8px;
  display: block;
}

.company-name {
  font-weight: 900;
  font-size: 16px;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.header-title {
  font-weight: 900;
  font-size: 15px;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.product-name {
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.3px;
}

.total-row {
  font-weight: 900;
  font-size: 15px;
  letter-spacing: 1px;
}

.powered-by {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: black;
}
</style>
</head>
<body>
<div class="receipt">

${showLogo && effectiveLogo ?
      `<div class="center"><img src="${effectiveLogo}" alt="Logo" class="logo"></div>` : ''}

<div class="center dashed" style="padding-bottom: 8px; margin-bottom: 8px;">
<div class="company-name">${receiptSettings.business_name || companyName || 'TOKO SAYA'}</div>
${customAddress && customAddress.trim() ? customAddress.split('\n').map(line => `<div style="font-size: 11px; font-weight: 600;">${line}</div>`).join('') : (receiptSettings.business_address ? `<div style="font-size: 11px; font-weight: 600;">${receiptSettings.business_address}</div>` : '')}
${receiptSettings.business_phone ? `<div style="font-size: 11px; font-weight: 600;">Customer Care : ${receiptSettings.business_phone}</div>` : ''}
</div>

${headerText && headerText.trim() ? `<div class="center header-title">${headerText.split('\n').map(line => `<div>${line}</div>`).join('')}</div>` : ''}

<div style="margin-bottom: 8px; font-size: 11px;">
<table>
<tr>
<td style="font-weight: 600;">No.Transaksi</td>
<td class="right" style="font-weight: 700;">${transaction.transaction_number}</td>
</tr>
<tr>
<td style="font-weight: 600;">Tanggal</td>
<td class="right" style="font-weight: 700;">${format(new Date(transaction.created_date || Date.now()), 'dd/MM/yyyy HH:mm')}</td>
</tr>
${showCashierName ? `<tr>
<td style="font-weight: 600;">Kasir</td>
<td class="right" style="font-weight: 700;">${transaction.cashier_name}</td>
</tr>` : ''}
${transaction.assigned_to_name ? `<tr>
<td style="font-weight: 600;">Terapis</td>
<td class="right" style="font-weight: 700;">${transaction.assigned_to_name}</td>
</tr>` : ''}
${showCustomerInfo && transaction.customer_name ? `<tr>
<td style="font-weight: 600;">Customer</td>
<td class="right" style="font-weight: 700;">${transaction.customer_name}</td>
</tr>${transaction.customer_phone ? `<tr>
<td style="font-weight: 600;">Telp</td>
<td class="right" style="font-weight: 700;">${transaction.customer_phone}</td>
</tr>` : ''}` : ''}
</table>
</div>

<div style="border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 6px 0; margin-bottom: 8px;">
${transaction.items?.map(item => `<div style="margin-bottom: 6px;">
<div class="product-name">${item.product_name}</div>
<table style="font-size: 11px; margin-top: 2px;">
<tr>
<td style="font-weight: 600;">${item.quantity} x Rp ${item.price?.toLocaleString('id-ID')}</td>
<td class="right" style="font-weight: 700;">Rp ${item.subtotal?.toLocaleString('id-ID')}</td>
</tr>
</table>
</div>`).join('')}
</div>

<div style="margin-bottom: 8px; font-size: 11px;">
<table>
<tr>
<td style="font-weight: 600;">Subtotal</td>
<td class="right" style="font-weight: 700;">Rp ${transaction.subtotal?.toLocaleString('id-ID')}</td>
</tr>
${transaction.discount_amount > 0 ? `<tr>
<td style="font-weight: 600;">Diskon</td>
<td class="right" style="font-weight: 700;">- Rp ${transaction.discount_amount?.toLocaleString('id-ID')}</td>
</tr>` : ''}
${transaction.shipping_cost > 0 ? `<tr>
<td style="font-weight: 600;">Ongkir</td>
<td class="right" style="font-weight: 700;">Rp ${transaction.shipping_cost?.toLocaleString('id-ID')}</td>
</tr>` : ''}
${transaction.other_cost > 0 ? `<tr>
<td style="font-weight: 600;">Biaya Lain</td>
<td class="right" style="font-weight: 700;">Rp ${transaction.other_cost?.toLocaleString('id-ID')}</td>
</tr>` : ''}
<tr class="solid">
<td class="total-row" style="padding-top: 4px;">TOTAL</td>
<td class="right total-row" style="padding-top: 4px;">Rp ${transaction.total?.toLocaleString('id-ID')}</td>
</tr>
<tr>
<td style="font-weight: 600;">Bayar (${transaction.payment_method})</td>
<td class="right" style="font-weight: 700;">Rp ${transaction.payment_amount?.toLocaleString('id-ID')}</td>
</tr>
${showChange && transaction.change_amount > 0 ? `<tr>
<td style="font-weight: 700;">Kembalian</td>
<td class="right" style="font-weight: 900;">Rp ${transaction.change_amount?.toLocaleString('id-ID')}</td>
</tr>` : ''}
${showPointsEarned && transaction.points_earned > 0 ? `<tr>
<td style="padding-top: 4px; font-weight: 600;">Poin Didapat</td>
<td class="right" style="padding-top: 4px; font-weight: 700;">${transaction.points_earned} poin</td>
</tr>` : ''}
</table>
</div>

${transaction.assigned_to_name ? `<div style="margin-bottom: 8px; font-size: 11px;">
<span style="font-weight: 600;">Terapis: </span>
<span>${transaction.assigned_to_name}</span>
</div>` : ''}

${transaction.note ? `<div style="margin-bottom: 8px; font-size: 11px; border-top: 1px dashed black; padding-top: 4px;">
<div style="font-weight: 600;">Catatan:</div>
<div>${transaction.note}</div>
</div>` : ''}

${bankInfo && bankInfo.trim() ? `<div style="margin-bottom: 8px; font-size: 11px; border-top: 1px dashed black; padding-top: 6px; text-align: center;">
<div style="font-weight: 700; margin-bottom: 4px;">Info Rekening</div>
${bankInfo.split('\n').map(line => `<div style="font-weight: 600;">${line}</div>`).join('')}
</div>` : ''}

${socialMedia && socialMedia.trim() ? `<div style="margin-bottom: 8px; font-size: 11px; border-top: 1px dashed black; padding-top: 6px; text-align: center;">
<div style="font-weight: 700; margin-bottom: 4px;">Hubungi Kami</div>
${socialMedia.split('\n').map(line => `<div style="font-weight: 600;">${line}</div>`).join('')}
</div>` : ''}

<div class="center dashed" style="padding-top: 8px; font-size: 11px; font-weight: 600;">
${footerMessage.split('\n').map(line =>
        `<div style="margin-bottom: 2px;">${line}</div>`
      ).join('')}
</div>

${showPromoMessage && promoMessage ? `<div style="text-align: center; font-size: 11px; margin-top: 8px; padding: 8px; background-color: #f0f0f0; border: 1px dashed #999; border-radius: 4px;">
<div style="font-weight: 700; margin-bottom: 4px;">🎉 PROMO</div>
<div>${promoMessage}</div>
</div>` : ''}

<div class="center powered-by" style="margin-top: 8px;">Powered by SNISHOP.COM</div>

</div>

<script>
// ✅ FIXED: Wait for logo to load before printing, print only ONCE
window.hasAutoPrinted = false;

function doPrint() {
  if (window.hasAutoPrinted) return; // Prevent double print
  window.hasAutoPrinted = true;
  window.print();
}

window.onload = function() {
  var logoImg = document.querySelector('img.logo');
  
  if (logoImg && logoImg.src) {
    // Wait for logo to load
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      // Logo already loaded
      setTimeout(doPrint, 200);
    } else {
      // Logo not yet loaded, wait for it
      logoImg.onload = function() {
        setTimeout(doPrint, 200);
      };
      logoImg.onerror = function() {
        // Logo failed to load, print anyway
        setTimeout(doPrint, 200);
      };
      // Fallback timeout if logo takes too long
      setTimeout(doPrint, 2000);
    }
  } else {
    // No logo, print after short delay
    setTimeout(doPrint, 500);
  }
};

window.onafterprint = function() {
  var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile) {
    window.close();
  }
};
</script>
</body>
</html>
  `;
}

export function printReceipt(transaction, settings, companyName, logoUrl) {
  try {
    const htmlContent = generateReceiptHTML(transaction, settings, companyName, logoUrl);

    // ✅ Try opening new window first
    const printWindow = window.open('', '_blank', 'width=400,height=600');

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // HTML script inside will handle printing after logo loads
    } else {
      // ✅ FALLBACK: Use iframe if popup blocked (instead of download)
      console.warn('Popup blocked, using iframe fallback');

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.zIndex = '99999';
      iframe.style.border = 'none';
      iframe.style.background = 'white';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      // The HTML script will handle printing, then close
      // Add listener to remove iframe after print
      iframe.contentWindow.onafterprint = function () {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 500);
      };

      // Also add close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕ Tutup';
      closeBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:100000;padding:10px 20px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;';
      closeBtn.onclick = () => {
        document.body.removeChild(iframe);
        document.body.removeChild(closeBtn);
      };
      document.body.appendChild(closeBtn);
    }

  } catch (error) {
    console.error('Print receipt error:', error);
    alert('Gagal mencetak struk. Silakan coba lagi.');
  }
}

function downloadAsHTML(htmlContent, transactionNumber) {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `struk-${transactionNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  alert('Struk telah diunduh. Buka file untuk mencetak.');
}