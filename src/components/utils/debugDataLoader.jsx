/**
 * ✅ DEBUG DATA LOADER - Diagnose loading issues
 * 
 * USAGE:
 * import { debugDataLoad } from '@/components/utils/debugDataLoader';
 * debugDataLoad('PageName', selectedCompany?.id);
 */

export async function debugDataLoad(pageName, companyId) {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('🔍 DEBUG DATA LOAD');
  console.log('   Page:', pageName);
  console.log('   Company ID:', companyId);
  console.log('   Timestamp:', new Date().toISOString());
  console.log('═══════════════════════════════════════════');
  console.log('');
}

/**
 * ✅ INSTANT STATE UPDATER - No comparison, direct set
 */
export function instantUpdate(setState, newData, label = 'Data') {
  console.log(`✅ INSTANT UPDATE: ${label} (${Array.isArray(newData) ? newData.length : 'object'} items)`);
  setState(newData);
}

/**
 * ✅ BROADCAST HELPER - Simplified broadcasting
 */
export function broadcastUpdate(type, companyId, extra = {}) {
  try {
    const channel = new BroadcastChannel('snishop_inventory_updates');
    channel.postMessage({
      type,
      companyId,
      timestamp: Date.now(),
      ...extra
    });
    channel.close();
    console.log('📡 BROADCAST:', type, 'for company:', companyId);
  } catch (e) {
    console.warn('Broadcast failed:', e);
  }
}