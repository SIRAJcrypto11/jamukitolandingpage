import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { offlineStorage } from './OfflineStorage';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Download, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * OfflineDataPreloader - Preload semua data penting untuk offline mode
 * Runs once on app load untuk cache initial data
 * MENJAGA COMPANY CONTEXT saat preload
 */

export default function OfflineDataPreloader({ user, selectedCompany, onComplete }) {
  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentEntity, setCurrentEntity] = useState('');
  const [hasPreloaded, setHasPreloaded] = useState(false);
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!user || hasRunRef.current) return;

    // ✅ Check if already preloaded recently (within 30 minutes)
    const checkLastPreload = async () => {
      const lastPreload = await offlineStorage.getMetadata('last_preload_time');
      const now = Date.now();

      // ✅ REDUCED cache time dari 1 jam ke 30 menit untuk lebih fresh
      if (lastPreload && (now - lastPreload) < 1800000) {
        console.log('✅ Data already preloaded recently - skipping');
        setHasPreloaded(true);
        if (onComplete) onComplete();
        return;
      }

      // ✅ Start preloading
      hasRunRef.current = true;
      preloadData();
    };

    checkLastPreload();
  }, [user, selectedCompany]);

  const preloadData = async () => {
    if (!navigator.onLine) {
      console.log('📵 Offline - skipping preload');
      if (onComplete) onComplete();
      return;
    }

    try {
      setIsPreloading(true);
      setProgress(0);

      console.log('');
      console.log('📥 ═══════════════════════════════════════════');
      console.log('⬇️ PRELOADING DATA FOR OFFLINE MODE');
      if (selectedCompany) {
        console.log('🏢 Company Mode:', selectedCompany.name);
      } else {
        console.log('🏠 Personal Mode');
      }
      console.log('═══════════════════════════════════════════');
      console.log('');

      // ✅ Save current context FIRST
      if (selectedCompany) {
        await offlineStorage.saveAppState('active_company', {
          id: selectedCompany.id,
          name: selectedCompany.name,
          owner_id: selectedCompany.owner_id
        });
      } else {
        await offlineStorage.saveAppState('active_company', null);
      }

      // ✅ List of entities to preload
      const entitiesToPreload = [
        { name: 'User', method: 'me', filter: {} },
        { name: 'Workspace', method: 'list', filter: {} },
        { name: 'Task', method: 'list', filter: {} },
        { name: 'Note', method: 'list', filter: {} },
        { name: 'FinancialRecord', method: 'list', filter: {} },
        { name: 'TransactionCategory', method: 'filter', filter: { user_id: user.id } },
        { name: 'Budget', method: 'filter', filter: { user_id: user.id } },
        { name: 'Label', method: 'filter', filter: { user_id: user.id } },
        { name: 'Notification', method: 'filter', filter: { user_id: user.email } }
      ];

      // ✅ Add company-specific entities if in company mode
      if (selectedCompany) {
        entitiesToPreload.push(
          { name: 'Company', method: 'get', filter: { id: selectedCompany.id } },
          { name: 'CompanyMember', method: 'filter', filter: { company_id: selectedCompany.id } },
          { name: 'CompanyPOSProduct', method: 'filter', filter: { company_id: selectedCompany.id } },
          { name: 'CompanyPOSTransaction', method: 'filter', filter: { company_id: selectedCompany.id } },
          { name: 'Inventory', method: 'filter', filter: { company_id: selectedCompany.id } }
        );
      }

      const totalSteps = entitiesToPreload.length;
      let completedSteps = 0;

      for (const entity of entitiesToPreload) {
        try {
          setCurrentEntity(entity.name);
          console.log(`📥 Preloading ${entity.name}...`);

          const entitySDK = base44.entities[entity.name];
          let data;

          if (entity.method === 'me') {
            data = [await base44.auth.me()];
          } else if (entity.method === 'list') {
            data = await entitySDK.list();
          } else if (entity.method === 'filter') {
            data = await entitySDK.filter(entity.filter);
          } else if (entity.method === 'get') {
            const result = await entitySDK.get(entity.filter.id);
            data = result ? [result] : [];
          }

          if (data && data.length > 0) {
            await offlineStorage.saveToLocal(entity.name, data);
            console.log(`   ✅ ${data.length} records saved`);
          } else {
            console.log(`   ⚠️ No data to save`);
          }

          completedSteps++;
          setProgress((completedSteps / totalSteps) * 100);

          // ✅ Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          console.error(`   ❌ Failed to preload ${entity.name}:`, error.message);
          // Continue with next entity even if one fails
          completedSteps++;
          setProgress((completedSteps / totalSteps) * 100);
        }
      }

      // ✅ Save metadata
      await offlineStorage.setMetadata('last_preload_time', Date.now());
      await offlineStorage.setMetadata('preload_user_id', user.id);
      await offlineStorage.setMetadata('preload_company_id', selectedCompany?.id || null);

      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('✅ DATA PRELOADING COMPLETE!');
      console.log('═══════════════════════════════════════════');
      console.log('');

      setHasPreloaded(true);

      if (onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error('❌ Preload process failed:', error);
      if (onComplete) onComplete();
    } finally {
      setIsPreloading(false);
      
      // ✅ Hide UI after 2 seconds
      setTimeout(() => {
        setProgress(0);
      }, 2000);
    }
  };

  // ✅ Don't show UI if not preloading or already completed
  if (!isPreloading && !hasPreloaded) return null;

  return (
    <AnimatePresence>
      {isPreloading && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <Card className="bg-gray-900 border-gray-700 shadow-2xl w-80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Download className="w-5 h-5 text-blue-400 animate-bounce" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Menyiapkan Mode Offline</p>
                  <p className="text-xs text-gray-400">{currentEntity}</p>
                </div>
                {progress === 100 && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
              </div>
              
              <Progress value={progress} className="h-2 mb-2" />
              
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{Math.round(progress)}%</span>
                <span>{progress === 100 ? 'Selesai!' : 'Mengunduh data...'}</span>
              </div>

              {progress === 100 && (
                <div className="mt-3 p-2 bg-green-900/20 border border-green-700 rounded text-xs text-green-300">
                  ✅ Mode offline siap! Aplikasi akan tetap berfungsi tanpa internet.
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}