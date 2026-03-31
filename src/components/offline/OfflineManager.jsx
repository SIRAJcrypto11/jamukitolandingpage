import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { offlineStorage } from './OfflineStorage';
import { toast } from 'sonner';

/**
 * OfflineManager - Background service untuk manage offline/online sync
 * - Deteksi online/offline status
 * - Auto-sync saat online kembali
 * - Maintain company context saat offline
 * - Conflict resolution
 */

export default function OfflineManager({ user, selectedCompany, onStatusChange }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncIntervalRef = useRef(null);
  const lastSyncRef = useRef(0);
  const companyContextRef = useRef(selectedCompany);

  // ✅ UPDATE company context ref when it changes
  useEffect(() => {
    companyContextRef.current = selectedCompany;
    
    // ✅ SAVE company context to offline storage
    if (selectedCompany) {
      offlineStorage.saveAppState('active_company', {
        id: selectedCompany.id,
        name: selectedCompany.name,
        owner_id: selectedCompany.owner_id
      }).catch(() => {});
      
      console.log('💾 Company context saved:', selectedCompany.name);
    } else {
      offlineStorage.saveAppState('active_company', null).catch(() => {});
      console.log('💾 Personal mode saved');
    }
  }, [selectedCompany]);

  // ✅ MONITOR ONLINE/OFFLINE STATUS
  useEffect(() => {
    const handleOnline = () => {
      console.log('');
      console.log('🌐 ═══════════════════════════════════════════');
      console.log('✅ INTERNET CONNECTION RESTORED!');
      console.log('═══════════════════════════════════════════');
      console.log('');
      
      setIsOnline(true);
      
      toast.success('🌐 Online!', {
        description: 'Koneksi internet tersambung kembali. Memulai sinkronisasi...',
        duration: 3000
      });

      // ✅ Trigger sync immediately
      setTimeout(() => {
        syncOfflineData();
      }, 1000);
    };

    const handleOffline = () => {
      console.log('');
      console.log('📵 ═══════════════════════════════════════════');
      console.log('⚠️ INTERNET CONNECTION LOST!');
      console.log('📋 Current context:', companyContextRef.current ? `Company: ${companyContextRef.current.name}` : 'Personal');
      console.log('═══════════════════════════════════════════');
      console.log('');
      
      setIsOnline(false);
      
      toast.warning('📵 Mode Offline Aktif', {
        description: 'Koneksi terputus. Semua perubahan akan disimpan dan disinkronkan saat online.',
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ✅ Check initial status
    if (navigator.onLine) {
      console.log('🌐 Initial status: ONLINE');
    } else {
      console.log('📵 Initial status: OFFLINE');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ✅ UPDATE PENDING COUNT
  const updatePendingCount = useCallback(async () => {
    try {
      const queue = await offlineStorage.getSyncQueue();
      setPendingCount(queue.length);
      
      if (onStatusChange) {
        onStatusChange({ isOnline, pendingCount: queue.length, isSyncing });
      }
    } catch (error) {
      console.error('Failed to update pending count:', error);
    }
  }, [isOnline, isSyncing, onStatusChange]);

  // ✅ SYNC OFFLINE DATA TO SERVER
  const syncOfflineData = useCallback(async () => {
    if (!isOnline || isSyncing) {
      console.log('⏭️ Skipping sync (offline or already syncing)');
      return;
    }

    // ✅ Rate limiting - max 1 sync per 5 seconds
    const now = Date.now();
    if (now - lastSyncRef.current < 5000) {
      console.log('⏳ Sync rate limit - wait 5 seconds');
      return;
    }
    lastSyncRef.current = now;

    try {
      setIsSyncing(true);

      console.log('');
      console.log('🔄 ═══════════════════════════════════════════');
      console.log('⬆️ STARTING OFFLINE DATA SYNC');
      console.log('═══════════════════════════════════════════');
      console.log('');

      const queue = await offlineStorage.getSyncQueue();

      if (queue.length === 0) {
        console.log('✅ No pending operations to sync');
        setIsSyncing(false);
        return;
      }

      console.log(`📋 Found ${queue.length} pending operations`);

      let successCount = 0;
      let failCount = 0;

      for (const item of queue) {
        try {
          console.log('');
          console.log(`🔄 Syncing: ${item.operation} ${item.entity} (ID: ${item.queueId})`);

          const entitySDK = base44.entities[item.entity];

          if (!entitySDK) {
            console.error(`❌ Entity SDK not found: ${item.entity}`);
            await offlineStorage.updateSyncQueueItem(item.queueId, { 
              status: 'failed', 
              error: 'Entity SDK not found' 
            });
            failCount++;
            continue;
          }

          let result;

          switch (item.operation) {
            case 'create':
              console.log('   - Creating new record...');
              result = await entitySDK.create(item.data);
              
              // ✅ Update local with server ID
              if (result && result.id) {
                await offlineStorage.saveToLocal(item.entity, result);
                
                // ✅ Delete temp offline record
                if (item.originalId && item.originalId.startsWith('offline_')) {
                  await offlineStorage.deleteFromLocal(item.entity, item.originalId);
                }
              }
              break;

            case 'update':
              console.log('   - Updating record:', item.originalId);
              
              // ✅ Check if record still exists on server
              try {
                await entitySDK.get(item.originalId);
                result = await entitySDK.update(item.originalId, item.data);
              } catch (error) {
                if (error?.message?.includes('not found') || error?.message?.includes('404')) {
                  // Record deleted on server - create new one
                  console.log('   - Record not found, creating new instead');
                  result = await entitySDK.create(item.data);
                } else {
                  throw error;
                }
              }
              
              // ✅ Update local cache
              if (result) {
                await offlineStorage.saveToLocal(item.entity, result);
              }
              break;

            case 'delete':
              console.log('   - Deleting record:', item.originalId);
              
              try {
                await entitySDK.delete(item.originalId);
              } catch (error) {
                // If already deleted, that's ok
                if (!error?.message?.includes('not found')) {
                  throw error;
                }
              }
              
              // ✅ Delete from local
              await offlineStorage.deleteFromLocal(item.entity, item.originalId);
              break;

            default:
              console.error('❌ Unknown operation:', item.operation);
              continue;
          }

          // ✅ Remove from sync queue
          await offlineStorage.deleteSyncQueueItem(item.queueId);
          
          console.log(`✅ ${item.operation} ${item.entity} synced successfully`);
          successCount++;

          // ✅ Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          console.error(`❌ Failed to sync ${item.operation} ${item.entity}:`, error);

          // ✅ Update retry count
          const newRetryCount = (item.retryCount || 0) + 1;

          if (newRetryCount >= 3) {
            // ✅ Mark as failed after 3 retries
            await offlineStorage.updateSyncQueueItem(item.queueId, {
              status: 'failed',
              error: error.message,
              retryCount: newRetryCount
            });
            failCount++;
          } else {
            // ✅ Retry later
            await offlineStorage.updateSyncQueueItem(item.queueId, {
              retryCount: newRetryCount,
              lastError: error.message
            });
          }
        }
      }

      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('✅ SYNC COMPLETE!');
      console.log(`   - Success: ${successCount}`);
      console.log(`   - Failed: ${failCount}`);
      console.log('═══════════════════════════════════════════');
      console.log('');

      if (successCount > 0) {
        toast.success(`✅ ${successCount} perubahan berhasil disinkronkan!`, {
          duration: 3000
        });

        // ✅ Trigger global refresh
        window.dispatchEvent(new Event('offlineSyncComplete'));
        
        // ✅ Force reload pages that use synced data
        window.dispatchEvent(new Event('forceReloadTasks'));
        window.dispatchEvent(new Event('forceReloadNotes'));
        
        // ✅ Broadcast untuk finance
        const channel = new BroadcastChannel('snishop_finance_updates');
        channel.postMessage({
          type: 'SYNC_COMPLETE',
          timestamp: Date.now()
        });
        channel.close();
      }

      if (failCount > 0) {
        toast.error(`⚠️ ${failCount} perubahan gagal disinkronkan. Akan dicoba lagi nanti.`, {
          duration: 5000
        });
      }

    } catch (error) {
      console.error('❌ Sync process error:', error);
    } finally {
      setIsSyncing(false);
      updatePendingCount();
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  // ✅ PERIODIC SYNC CHECK
  useEffect(() => {
    if (!user) return;

    updatePendingCount();

    if (isOnline) {
      // ✅ Check and sync every 15 seconds when online
      syncIntervalRef.current = setInterval(() => {
        syncOfflineData();
      }, 15000);

      // ✅ Immediate sync when coming online
      syncOfflineData();
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isOnline, user, syncOfflineData, updatePendingCount]);

  // ✅ LISTEN FOR MANUAL SYNC TRIGGER
  useEffect(() => {
    const handleManualSync = () => {
      console.log('🔄 Manual sync triggered');
      syncOfflineData();
    };

    window.addEventListener('triggerOfflineSync', handleManualSync);

    return () => {
      window.removeEventListener('triggerOfflineSync', handleManualSync);
    };
  }, [syncOfflineData]);

  // ✅ This is a background service - no UI
  return null;
}

// ✅ EXPORT HELPER FUNCTIONS
export { offlineStorage };