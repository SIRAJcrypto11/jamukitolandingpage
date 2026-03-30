// ✅ DATA OPERATION HOOKS - Track storage on every create/update/delete

import { base44 } from '@/api/base44Client';

let storageUpdateTimeout = null;

/**
 * Trigger storage recalculation with debouncing
 */
async function triggerStorageUpdate(userId, userEmail) {
  // Clear existing timeout
  if (storageUpdateTimeout) {
    clearTimeout(storageUpdateTimeout);
  }

  // Debounce - wait 2 seconds after last operation
  storageUpdateTimeout = setTimeout(async () => {
    try {
      console.log('🔄 AUTO STORAGE UPDATE triggered for:', userEmail);
      
      const { updateUserStorageUsage } = await import('./storageTracker');
      const newStorage = await updateUserStorageUsage(userId, userEmail);
      
      console.log('✅ Storage updated:', newStorage.toFixed(3), 'MB');
    } catch (error) {
      console.error('❌ Auto storage update failed:', error);
    }
  }, 2000);
}

/**
 * Wrap entity create to track storage
 */
export async function createWithTracking(entityName, data, userId, userEmail) {
  const result = await base44.entities[entityName].create(data);
  
  // Trigger storage update in background
  if (userId && userEmail) {
    triggerStorageUpdate(userId, userEmail);
  }
  
  return result;
}

/**
 * Wrap entity bulk create to track storage
 */
export async function bulkCreateWithTracking(entityName, dataArray, userId, userEmail) {
  const result = await base44.entities[entityName].bulkCreate(dataArray);
  
  // Trigger storage update in background
  if (userId && userEmail) {
    triggerStorageUpdate(userId, userEmail);
  }
  
  return result;
}

/**
 * Wrap entity update to track storage
 */
export async function updateWithTracking(entityName, id, data, userId, userEmail) {
  const result = await base44.entities[entityName].update(id, data);
  
  // Trigger storage update in background
  if (userId && userEmail) {
    triggerStorageUpdate(userId, userEmail);
  }
  
  return result;
}

/**
 * Wrap entity delete to track storage
 */
export async function deleteWithTracking(entityName, id, userId, userEmail) {
  const result = await base44.entities[entityName].delete(id);
  
  // Trigger storage update in background
  if (userId && userEmail) {
    triggerStorageUpdate(userId, userEmail);
  }
  
  return result;
}

/**
 * Force immediate storage recalculation
 */
export async function forceStorageUpdate(userId, userEmail) {
  if (storageUpdateTimeout) {
    clearTimeout(storageUpdateTimeout);
  }
  
  try {
    const { updateUserStorageUsage } = await import('./storageTracker');
    const newStorage = await updateUserStorageUsage(userId, userEmail);
    console.log('✅ FORCE Storage update:', newStorage.toFixed(3), 'MB');
    return newStorage;
  } catch (error) {
    console.error('❌ Force storage update failed:', error);
    return 0;
  }
}