import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        success: false, 
        message: 'Unauthorized - Admin only' 
      }, { status: 401 });
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('🌐 DETECTING SERVER IP (PRIMARY ONLY)');
    console.log('═══════════════════════════════════════════');
    
    let primaryIP = null;
    
    try {
      console.log('📡 Fetching current server IP from ipify.org...');
      const response = await fetch('https://api.ipify.org?format=json', { 
        signal: AbortSignal.timeout(5000) 
      });
      const data = await response.json();
      
      if (data && data.ip) {
        primaryIP = data.ip;
        console.log('✅ IP detected:', primaryIP);
      }
    } catch (e) {
      console.error('❌ Detection failed:', e.message);
    }
    
    if (!primaryIP) {
      return Response.json({
        success: false,
        message: 'Tidak dapat mendeteksi IP server. Pastikan server memiliki akses internet.',
        primaryIP: null
      });
    }
    
    console.log('');
    console.log('📊 RESULT: IP =', primaryIP);
    console.log('═══════════════════════════════════════════');
    console.log('');
    
    return Response.json({
      success: true,
      primaryIP: primaryIP,
      message: `IP Server saat ini: ${primaryIP}`,
      note: 'IP ini adalah IP yang sedang digunakan server Anda saat ini. Whitelist IP ini di Tripay.'
    });
    
  } catch (error) {
    console.error('❌ Error detecting IP:', error);
    return Response.json({ 
      success: false, 
      message: error.message,
      primaryIP: null
    }, { status: 500 });
  }
});