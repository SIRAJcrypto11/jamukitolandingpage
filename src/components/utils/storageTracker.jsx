// ✅ STORAGE TRACKER - Track all user data usage across personal & company data

import { base44 } from '@/api/base44Client';

/**
 * Calculate approximate storage size for a record
 * Returns size in MB
 */
function calculateRecordSize(record) {
  if (!record) return 0;
  
  try {
    const jsonString = JSON.stringify(record);
    const sizeInBytes = new Blob([jsonString]).size;
    return sizeInBytes / (1024 * 1024); // Convert to MB
  } catch (e) {
    return 0.001; // Default ~1KB if calculation fails
  }
}

/**
 * Calculate total storage used by a user
 * Includes: Personal data + All company data they own/member of
 */
export async function calculateUserStorage(userId, userEmail) {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('📊 CALCULATING STORAGE FOR USER:', userEmail);
  console.log('═══════════════════════════════════════════');
  
  let totalStorage = 0;
  const breakdown = {};

  try {
    // ✅ 1. PERSONAL DATA (created_by user)
    console.log('📦 Loading personal data...');
    
    const personalEntities = [
      { name: 'Task', filter: { created_by: userEmail } },
      { name: 'Note', filter: { created_by: userEmail } },
      { name: 'Workspace', filter: { owner_id: userId } },
      { name: 'FinancialRecord', filter: { user_id: userId, company_id: null } },
      { name: 'Notification', filter: { user_id: userEmail } },
      { name: 'AttendanceRecord', filter: { user_id: userId, workspace_id: { '$ne': null } } }
    ];

    for (const entity of personalEntities) {
      try {
        const records = await base44.entities[entity.name].filter(entity.filter);
        const size = (records || []).reduce((sum, record) => sum + calculateRecordSize(record), 0);
        breakdown[`personal_${entity.name}`] = size;
        totalStorage += size;
        console.log(`   ✅ ${entity.name}: ${size.toFixed(3)} MB (${records?.length || 0} records)`);
      } catch (e) {
        console.warn(`   ⚠️ ${entity.name}: Error - ${e.message}`);
        breakdown[`personal_${entity.name}`] = 0;
      }
    }

    // ✅ 2. OWNED COMPANIES DATA
    console.log('');
    console.log('🏢 Loading owned companies data...');
    
    const ownedCompanies = await base44.entities.Company.filter({ owner_email: userEmail });
    console.log(`   Found ${ownedCompanies?.length || 0} owned companies`);

    if (ownedCompanies && ownedCompanies.length > 0) {
      for (const company of ownedCompanies) {
        console.log(`   📊 Company: ${company.name}`);
        
        const companyEntities = [
          { name: 'CompanyPOSProduct', filter: { company_id: company.id } },
          { name: 'CompanyPOSTransaction', filter: { company_id: company.id } },
          { name: 'Inventory', filter: { company_id: company.id } },
          { name: 'Customer', filter: { company_id: company.id } },
          { name: 'FinancialRecord', filter: { company_id: company.id } },
          { name: 'Employee', filter: { company_id: company.id } },
          { name: 'CompanyAttendance', filter: { company_id: company.id } },
          { name: 'Invoice', filter: { company_id: company.id } },
          { name: 'Project', filter: { company_id: company.id } }
        ];

        for (const entity of companyEntities) {
          try {
            const records = await base44.entities[entity.name].filter(entity.filter);
            const size = (records || []).reduce((sum, record) => sum + calculateRecordSize(record), 0);
            breakdown[`company_${company.id}_${entity.name}`] = size;
            totalStorage += size;
            console.log(`      ✅ ${entity.name}: ${size.toFixed(3)} MB`);
          } catch (e) {
            breakdown[`company_${company.id}_${entity.name}`] = 0;
          }
        }
      }
    }

    // ✅ 3. MEMBER COMPANIES DATA (their contributions)
    console.log('');
    console.log('👥 Loading member companies contributions...');
    
    const memberships = await base44.entities.CompanyMember.filter({
      user_email: userEmail,
      status: 'active'
    });
    
    console.log(`   Found ${memberships?.length || 0} memberships`);

    if (memberships && memberships.length > 0) {
      for (const membership of memberships) {
        console.log(`   📊 Member of Company ID: ${membership.company_id}`);
        
        // Only count data they created
        const contributionEntities = [
          { name: 'FinancialRecord', filter: { company_id: membership.company_id, created_by: userEmail } },
          { name: 'CompanyAttendance', filter: { company_id: membership.company_id, user_email: userEmail } },
          { name: 'Task', filter: { company_id: membership.company_id, created_by: userEmail } },
          { name: 'Note', filter: { company_id: membership.company_id, created_by: userEmail } }
        ];

        for (const entity of contributionEntities) {
          try {
            const records = await base44.entities[entity.name].filter(entity.filter);
            const size = (records || []).reduce((sum, record) => sum + calculateRecordSize(record), 0);
            breakdown[`member_${membership.company_id}_${entity.name}`] = size;
            totalStorage += size;
            console.log(`      ✅ ${entity.name}: ${size.toFixed(3)} MB`);
          } catch (e) {
            breakdown[`member_${membership.company_id}_${entity.name}`] = 0;
          }
        }
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('✅ TOTAL STORAGE:', totalStorage.toFixed(3), 'MB');
    console.log('═══════════════════════════════════════════');
    console.log('');

    return {
      total: totalStorage,
      breakdown
    };

  } catch (error) {
    console.error('❌ Error calculating storage:', error);
    return {
      total: 0,
      breakdown: {}
    };
  }
}

/**
 * Update user's storage_used field
 */
export async function updateUserStorageUsage(userId, userEmail) {
  try {
    const { total } = await calculateUserStorage(userId, userEmail);
    
    // ✅ Round to 2 decimal places for display
    const roundedTotal = Math.round(total * 100) / 100;
    
    await base44.auth.updateMe({
      storage_used: roundedTotal
    });

    console.log('✅ User storage updated in DB:', roundedTotal.toFixed(2), 'MB');

    // ✅ Broadcast update to UI
    window.dispatchEvent(new CustomEvent('storageUpdated', {
      detail: { newStorageUsed: roundedTotal }
    }));

    // ✅ Also update sessionStorage cache
    const cachedUserData = sessionStorage.getItem('TODOIT_USER_CACHE');
    if (cachedUserData) {
      try {
        const { user: cachedUser } = JSON.parse(cachedUserData);
        cachedUser.storage_used = roundedTotal;
        sessionStorage.setItem('TODOIT_USER_CACHE', JSON.stringify({
          user: cachedUser,
          cachedAt: Date.now()
        }));
      } catch (e) {}
    }

    return roundedTotal;
  } catch (error) {
    console.error('❌ Error updating storage:', error);
    return 0;
  }
}

/**
 * Background storage sync - runs periodically
 */
export function startStorageSync(userId, userEmail, intervalMinutes = 5) {
  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`🔄 STORAGE SYNC: Started - every ${intervalMinutes} minutes`);
  console.log(`   User: ${userEmail}`);
  
  // ✅ Initial sync after 3 seconds
  setTimeout(() => {
    console.log('🔄 STORAGE SYNC: Running initial calculation...');
    updateUserStorageUsage(userId, userEmail);
  }, 3000);

  // ✅ Periodic sync
  const interval = setInterval(() => {
    console.log('🔄 STORAGE SYNC: Running periodic calculation...');
    updateUserStorageUsage(userId, userEmail);
  }, intervalMs);

  // ✅ Sync on window focus (tab switch back)
  const handleFocus = () => {
    console.log('🔄 STORAGE SYNC: Tab focused - recalculating...');
    updateUserStorageUsage(userId, userEmail);
  };
  window.addEventListener('focus', handleFocus);

  return () => {
    clearInterval(interval);
    window.removeEventListener('focus', handleFocus);
    console.log('🛑 STORAGE SYNC: Stopped');
  };
}