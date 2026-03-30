/**
 * OfflineStorage - IndexedDB wrapper untuk offline data storage
 * Menyimpan semua data entities + APPLICATION STATE (company context)
 */

const DB_NAME = 'SNISHOP_OFFLINE_DB';
const DB_VERSION = 2; // ✅ INCREASED version untuk tambah AppState store

class OfflineStorageManager {
  constructor() {
    this.db = null;
    this.initPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ IndexedDB initialization failed');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // ✅ Create object stores for all entities
        const stores = [
          'Task',
          'Note',
          'Workspace',
          'FinancialRecord',
          'TransactionCategory',
          'Budget',
          'Company',
          'CompanyMember',
          'Notification',
          'Label',
          'Comment',
          'User',
          'CompanyPOSProduct',
          'CompanyPOSTransaction',
          'Inventory'
        ];

        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: false });
            store.createIndex('workspace_id', 'workspace_id', { unique: false });
            store.createIndex('company_id', 'company_id', { unique: false });
            store.createIndex('user_id', 'user_id', { unique: false });
            store.createIndex('created_date', 'created_date', { unique: false });
            console.log(`✅ Created object store: ${storeName}`);
          }
        });

        // ✅ Sync queue store
        if (!db.objectStoreNames.contains('SyncQueue')) {
          const syncStore = db.createObjectStore('SyncQueue', { keyPath: 'queueId', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('entity', 'entity', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
          console.log('✅ Created SyncQueue store');
        }

        // ✅ Metadata store
        if (!db.objectStoreNames.contains('Metadata')) {
          db.createObjectStore('Metadata', { keyPath: 'key' });
          console.log('✅ Created Metadata store');
        }

        // ✅ NEW: AppState store untuk menyimpan application state
        if (!db.objectStoreNames.contains('AppState')) {
          db.createObjectStore('AppState', { keyPath: 'key' });
          console.log('✅ Created AppState store');
        }
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  // ✅ SAVE DATA TO LOCAL
  async saveToLocal(entityName, data) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction([entityName], 'readwrite');
      const store = tx.objectStore(entityName);

      const records = Array.isArray(data) ? data : [data];

      for (const record of records) {
        await store.put(record);
      }

      console.log(`💾 Saved ${records.length} ${entityName} records to local storage`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save ${entityName} to local:`, error);
      return false;
    }
  }

  // ✅ GET DATA FROM LOCAL
  async getFromLocal(entityName, filter = {}) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction([entityName], 'readonly');
      const store = tx.objectStore(entityName);

      const allData = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Apply filters
      let filtered = allData || [];

      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && value.$in) {
            // Support $in operator
            filtered = filtered.filter(item => value.$in.includes(item[key]));
          } else if (typeof value === 'object' && value.$ne) {
            // Support $ne operator
            filtered = filtered.filter(item => item[key] !== value.$ne);
          } else {
            filtered = filtered.filter(item => item[key] === value);
          }
        }
      });

      console.log(`📦 Retrieved ${filtered.length} ${entityName} records from local storage`);
      return filtered;
    } catch (error) {
      console.error(`❌ Failed to get ${entityName} from local:`, error);
      return [];
    }
  }

  // ✅ DELETE FROM LOCAL
  async deleteFromLocal(entityName, id) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction([entityName], 'readwrite');
      const store = tx.objectStore(entityName);

      await store.delete(id);
      console.log(`🗑️ Deleted ${entityName} with id ${id} from local storage`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete ${entityName} from local:`, error);
      return false;
    }
  }

  // ✅ ADD TO SYNC QUEUE
  async addToSyncQueue(operation, entity, data, originalId = null) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction(['SyncQueue'], 'readwrite');
      const store = tx.objectStore('SyncQueue');

      const queueItem = {
        operation, // 'create', 'update', 'delete'
        entity,
        data,
        originalId,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0
      };

      await store.add(queueItem);
      console.log(`📋 Added ${operation} ${entity} to sync queue`);
      return true;
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error);
      return false;
    }
  }

  // ✅ GET SYNC QUEUE
  async getSyncQueue() {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction(['SyncQueue'], 'readonly');
      const store = tx.objectStore('SyncQueue');

      const queue = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return (queue || []).filter(item => item.status === 'pending');
    } catch (error) {
      console.error('❌ Failed to get sync queue:', error);
      return [];
    }
  }

  // ✅ UPDATE SYNC QUEUE ITEM
  async updateSyncQueueItem(queueId, updates) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction(['SyncQueue'], 'readwrite');
      const store = tx.objectStore('SyncQueue');

      const item = await store.get(queueId);
      if (item) {
        const updated = { ...item, ...updates };
        await store.put(updated);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to update sync queue item:', error);
      return false;
    }
  }

  // ✅ DELETE SYNC QUEUE ITEM
  async deleteSyncQueueItem(queueId) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction(['SyncQueue'], 'readwrite');
      const store = tx.objectStore('SyncQueue');

      await store.delete(queueId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete sync queue item:', error);
      return false;
    }
  }

  // ✅ NEW: SAVE APP STATE (company context, etc)
  async saveAppState(key, value) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction(['AppState'], 'readwrite');
      const store = tx.objectStore('AppState');

      await store.put({ 
        key, 
        value, 
        timestamp: Date.now() 
      });

      console.log(`💾 Saved app state: ${key}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save app state:', error);
      return false;
    }
  }

  // ✅ NEW: GET APP STATE
  async getAppState(key) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction(['AppState'], 'readonly');
      const store = tx.objectStore('AppState');

      const result = await new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return result?.value;
    } catch (error) {
      console.error('❌ Failed to get app state:', error);
      return null;
    }
  }

  // ✅ CLEAR ALL LOCAL DATA
  async clearAll() {
    try {
      const db = await this.ensureDB();
      const stores = Array.from(db.objectStoreNames);

      for (const storeName of stores) {
        const tx = db.transaction([storeName], 'readwrite');
        await tx.objectStore(storeName).clear();
      }

      console.log('🗑️ All offline data cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear offline data:', error);
      return false;
    }
  }

  // ✅ GET METADATA
  async getMetadata(key) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction(['Metadata'], 'readonly');
      const store = tx.objectStore('Metadata');

      const result = await new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return result?.value;
    } catch (error) {
      console.error('❌ Failed to get metadata:', error);
      return null;
    }
  }

  // ✅ SET METADATA
  async setMetadata(key, value) {
    try {
      const db = await this.ensureDB();
      const tx = db.transaction(['Metadata'], 'readwrite');
      const store = tx.objectStore('Metadata');

      await store.put({ key, value, updatedAt: Date.now() });
      return true;
    } catch (error) {
      console.error('❌ Failed to set metadata:', error);
      return false;
    }
  }
}

// ✅ SINGLETON INSTANCE
export const offlineStorage = new OfflineStorageManager();