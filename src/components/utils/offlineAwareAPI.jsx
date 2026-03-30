/**
 * Offline-Aware API Wrapper
 * Transparent wrapper untuk semua API calls dengan offline fallback
 * TIDAK MENGUBAH BEHAVIOR EXISTING - Hanya menambah offline support
 */

import { base44 } from '@/api/base44Client';
import { offlineStorage } from '../offline/OfflineStorage';

const isOnline = () => navigator.onLine;

/**
 * ✅ WRAPPER untuk Entity Operations
 * Automatically handles offline/online switching
 * 
 * CARA PAKAI (BACKWARD COMPATIBLE):
 * const result = await offlineAwareAPI.Task.create(data);
 * const tasks = await offlineAwareAPI.Task.list();
 * const task = await offlineAwareAPI.Task.get(id);
 * await offlineAwareAPI.Task.update(id, data);
 * await offlineAwareAPI.Task.delete(id);
 */

class OfflineAwareEntity {
  constructor(entityName) {
    this.entityName = entityName;
    this.sdk = base44.entities[entityName];
  }

  async create(data) {
    try {
      if (isOnline()) {
        // ✅ ONLINE: Normal API call
        const result = await this.sdk.create(data);
        
        // Save to offline cache
        await offlineStorage.saveToLocal(this.entityName, result).catch(() => {});
        
        return result;
      } else {
        // ✅ OFFLINE: Save locally with temp ID
        const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const offlineRecord = {
          ...data,
          id: tempId,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          _offline: true
        };

        await offlineStorage.saveToLocal(this.entityName, offlineRecord);
        await offlineStorage.addToSyncQueue('create', this.entityName, data, tempId);

        console.log(`📵 [Offline Create] ${this.entityName}:`, tempId);
        
        // Trigger UI update
        window.dispatchEvent(new CustomEvent('offlineDataChanged', {
          detail: { entity: this.entityName, method: 'create', data: offlineRecord }
        }));

        return offlineRecord;
      }
    } catch (error) {
      console.error(`❌ Create ${this.entityName} failed:`, error);
      throw error;
    }
  }

  async list(sort) {
    try {
      if (isOnline()) {
        // ✅ ONLINE: Normal API call
        const result = await this.sdk.list(sort);
        
        // Update offline cache
        if (result && result.length > 0) {
          await offlineStorage.saveToLocal(this.entityName, result).catch(() => {});
        }
        
        return result;
      } else {
        // ✅ OFFLINE: Read from cache
        const cached = await offlineStorage.getFromLocal(this.entityName);
        console.log(`📵 [Offline List] ${this.entityName}: ${cached.length} records`);
        return cached;
      }
    } catch (error) {
      // Fallback to cache on error
      console.warn(`⚠️ List ${this.entityName} failed, using cache:`, error.message);
      const cached = await offlineStorage.getFromLocal(this.entityName);
      return cached;
    }
  }

  async filter(query, sort) {
    try {
      if (isOnline()) {
        // ✅ ONLINE: Normal API call
        const result = await this.sdk.filter(query, sort);
        
        // Update offline cache
        if (result && result.length > 0) {
          await offlineStorage.saveToLocal(this.entityName, result).catch(() => {});
        }
        
        return result;
      } else {
        // ✅ OFFLINE: Filter from cache
        const allData = await offlineStorage.getFromLocal(this.entityName);
        
        // Simple filter implementation
        let filtered = allData;
        
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            filtered = filtered.filter(item => item[key] === value);
          }
        });
        
        console.log(`📵 [Offline Filter] ${this.entityName}: ${filtered.length} records`);
        return filtered;
      }
    } catch (error) {
      console.warn(`⚠️ Filter ${this.entityName} failed, using cache:`, error.message);
      const cached = await offlineStorage.getFromLocal(this.entityName);
      return cached;
    }
  }

  async get(id) {
    try {
      if (isOnline()) {
        // ✅ ONLINE: Normal API call
        const result = await this.sdk.get(id);
        
        // Update offline cache
        if (result) {
          await offlineStorage.saveToLocal(this.entityName, result).catch(() => {});
        }
        
        return result;
      } else {
        // ✅ OFFLINE: Get from cache
        const allData = await offlineStorage.getFromLocal(this.entityName);
        const found = allData.find(item => item.id === id);
        console.log(`📵 [Offline Get] ${this.entityName}:`, found ? 'found' : 'not found');
        return found || null;
      }
    } catch (error) {
      console.warn(`⚠️ Get ${this.entityName} failed, using cache:`, error.message);
      const allData = await offlineStorage.getFromLocal(this.entityName);
      return allData.find(item => item.id === id) || null;
    }
  }

  async update(id, data) {
    try {
      if (isOnline()) {
        // ✅ ONLINE: Normal API call
        const result = await this.sdk.update(id, data);
        
        // Update offline cache
        if (result) {
          await offlineStorage.saveToLocal(this.entityName, result).catch(() => {});
        }
        
        return result;
      } else {
        // ✅ OFFLINE: Update locally
        const allData = await offlineStorage.getFromLocal(this.entityName);
        const existing = allData.find(item => item.id === id);

        if (existing) {
          const updated = {
            ...existing,
            ...data,
            updated_date: new Date().toISOString(),
            _offline: true
          };

          await offlineStorage.saveToLocal(this.entityName, updated);
          await offlineStorage.addToSyncQueue('update', this.entityName, data, id);

          console.log(`📵 [Offline Update] ${this.entityName}:`, id);
          
          // Trigger UI update
          window.dispatchEvent(new CustomEvent('offlineDataChanged', {
            detail: { entity: this.entityName, method: 'update', id, data: updated }
          }));

          return updated;
        }

        throw new Error('Record not found in offline cache');
      }
    } catch (error) {
      console.error(`❌ Update ${this.entityName} failed:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      if (isOnline()) {
        // ✅ ONLINE: Normal API call
        await this.sdk.delete(id);
        
        // Remove from offline cache
        await offlineStorage.deleteFromLocal(this.entityName, id).catch(() => {});
        
        return { success: true };
      } else {
        // ✅ OFFLINE: Mark for deletion
        await offlineStorage.deleteFromLocal(this.entityName, id);
        await offlineStorage.addToSyncQueue('delete', this.entityName, null, id);

        console.log(`📵 [Offline Delete] ${this.entityName}:`, id);
        
        // Trigger UI update
        window.dispatchEvent(new CustomEvent('offlineDataChanged', {
          detail: { entity: this.entityName, method: 'delete', id }
        }));

        return { success: true };
      }
    } catch (error) {
      console.error(`❌ Delete ${this.entityName} failed:`, error);
      throw error;
    }
  }
}

// ✅ PROXY untuk semua entities
const entityProxyHandler = {
  get(target, entityName) {
    if (!target[entityName]) {
      target[entityName] = new OfflineAwareEntity(entityName);
    }
    return target[entityName];
  }
};

// ✅ EXPORT: Drop-in replacement untuk base44.entities
export const offlineAwareAPI = {
  entities: new Proxy({}, entityProxyHandler),
  
  // ✅ Auth methods (always online)
  auth: base44.auth,
  
  // ✅ Integrations (always online)
  integrations: base44.integrations,
  
  // ✅ Functions (always online)
  functions: base44.functions
};

// ✅ BACKWARD COMPATIBLE: Can be used as drop-in replacement
// OLD: const tasks = await base44.entities.Task.list();
// NEW: const tasks = await offlineAwareAPI.entities.Task.list();
// BEHAVIOR: Same! Tapi dengan offline fallback otomatis