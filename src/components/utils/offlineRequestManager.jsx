/**
 * OfflineRequestManager - Enhanced request manager dengan offline support
 * Extends requestManager untuk support offline operations
 */

import { offlineStorage } from '../offline/OfflineStorage';

class OfflineRequestManager {
  constructor() {
    this.isOnline = navigator.onLine;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 OfflineRequestManager: Online mode activated');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📵 OfflineRequestManager: Offline mode activated');
    });
  }

  /**
   * ✅ OFFLINE-AWARE REQUEST
   * Automatically switches between online API and offline storage
   */
  async offlineAwareRequest(entity, method, params = {}) {
    const entityName = typeof entity === 'string' ? entity : entity.name;

    // ✅ ONLINE MODE - Use normal API
    if (this.isOnline) {
      try {
        console.log(`🌐 [Online] ${method} ${entityName}`);
        
        // Dynamic import to get entity SDK
        const entityModule = await import(`@/entities/${entityName}`);
        const entitySDK = entityModule[entityName];

        let result;

        switch (method) {
          case 'list':
            result = await entitySDK.list();
            // ✅ Save to local cache
            if (result && result.length > 0) {
              await offlineStorage.saveToLocal(entityName, result);
            }
            break;

          case 'filter':
            result = await entitySDK.filter(params.filter || {});
            // ✅ Save to local cache
            if (result && result.length > 0) {
              await offlineStorage.saveToLocal(entityName, result);
            }
            break;

          case 'get':
            result = await entitySDK.get(params.id);
            // ✅ Save to local cache
            if (result) {
              await offlineStorage.saveToLocal(entityName, result);
            }
            break;

          case 'create':
            result = await entitySDK.create(params.data);
            // ✅ Save to local cache
            if (result) {
              await offlineStorage.saveToLocal(entityName, result);
            }
            break;

          case 'update':
            result = await entitySDK.update(params.id, params.data);
            // ✅ Update local cache
            if (result) {
              await offlineStorage.saveToLocal(entityName, result);
            }
            break;

          case 'delete':
            result = await entitySDK.delete(params.id);
            // ✅ Delete from local cache
            await offlineStorage.deleteFromLocal(entityName, params.id);
            break;

          default:
            throw new Error(`Unknown method: ${method}`);
        }

        return result;

      } catch (error) {
        console.error(`❌ Online request failed for ${method} ${entityName}:`, error);
        
        // ✅ Fallback to offline if online request fails
        if (method === 'list' || method === 'filter' || method === 'get') {
          console.log(`📵 Falling back to offline storage`);
          return this.handleOfflineRead(entityName, method, params);
        }
        
        throw error;
      }
    }

    // ✅ OFFLINE MODE
    console.log(`📵 [Offline] ${method} ${entityName}`);

    if (method === 'list' || method === 'filter' || method === 'get') {
      return this.handleOfflineRead(entityName, method, params);
    } else {
      return this.handleOfflineWrite(entityName, method, params);
    }
  }

  /**
   * ✅ HANDLE OFFLINE READ OPERATIONS
   */
  async handleOfflineRead(entityName, method, params) {
    try {
      let result;

      switch (method) {
        case 'list':
          result = await offlineStorage.getFromLocal(entityName);
          break;

        case 'filter':
          result = await offlineStorage.getFromLocal(entityName, params.filter || {});
          break;

        case 'get':
          const allData = await offlineStorage.getFromLocal(entityName);
          result = allData.find(item => item.id === params.id);
          break;

        default:
          result = [];
      }

      console.log(`📦 [Offline Read] ${method} ${entityName}: ${Array.isArray(result) ? result.length : result ? 1 : 0} records`);
      return result;

    } catch (error) {
      console.error(`❌ Offline read failed:`, error);
      return method === 'get' ? null : [];
    }
  }

  /**
   * ✅ HANDLE OFFLINE WRITE OPERATIONS
   */
  async handleOfflineWrite(entityName, method, params) {
    try {
      let result;

      switch (method) {
        case 'create':
          // ✅ Generate temporary ID
          const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newRecord = {
            ...params.data,
            id: tempId,
            created_date: new Date().toISOString(),
            updated_date: new Date().toISOString(),
            _offline: true
          };

          // ✅ Save to local
          await offlineStorage.saveToLocal(entityName, newRecord);

          // ✅ Add to sync queue
          await offlineStorage.addToSyncQueue('create', entityName, params.data, tempId);

          result = newRecord;
          console.log(`💾 [Offline Create] ${entityName}: ${tempId}`);
          break;

        case 'update':
          // ✅ Update local
          const existingData = await offlineStorage.getFromLocal(entityName);
          const recordToUpdate = existingData.find(item => item.id === params.id);

          if (recordToUpdate) {
            const updatedRecord = {
              ...recordToUpdate,
              ...params.data,
              updated_date: new Date().toISOString(),
              _offline: true
            };

            await offlineStorage.saveToLocal(entityName, updatedRecord);

            // ✅ Add to sync queue
            await offlineStorage.addToSyncQueue('update', entityName, params.data, params.id);

            result = updatedRecord;
            console.log(`💾 [Offline Update] ${entityName}: ${params.id}`);
          } else {
            throw new Error('Record not found in local storage');
          }
          break;

        case 'delete':
          // ✅ Mark as deleted locally (don't actually delete yet)
          await offlineStorage.deleteFromLocal(entityName, params.id);

          // ✅ Add to sync queue
          await offlineStorage.addToSyncQueue('delete', entityName, null, params.id);

          result = { success: true };
          console.log(`💾 [Offline Delete] ${entityName}: ${params.id}`);
          break;

        default:
          throw new Error(`Unknown write method: ${method}`);
      }

      // ✅ Trigger UI update
      window.dispatchEvent(new CustomEvent('offlineDataChanged', {
        detail: { entity: entityName, method, id: params.id || result?.id }
      }));

      return result;

    } catch (error) {
      console.error(`❌ Offline write failed:`, error);
      throw error;
    }
  }
}

// ✅ SINGLETON INSTANCE
export const offlineRequestManager = new OfflineRequestManager();

/**
 * ✅ OFFLINE-AWARE WRAPPER FOR ENTITY OPERATIONS
 * Usage: await offlineRequest('Task', 'create', { data: {...} })
 */
export async function offlineRequest(entity, method, params = {}) {
  return offlineRequestManager.offlineAwareRequest(entity, method, params);
}