import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { differenceInHours } from 'date-fns';

/**
 * ✅ BACKUP REMINDER - ONLY ONCE per 24-hour period
 * - Check last backup for each company owned
 * - Show notification ONCE if 24+ hours since last backup
 * - Only for company owners
 * - Won't show again until next 24-hour period or after backup
 */
export default function BackupReminder({ currentUser }) {
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!currentUser) return;

    // ✅ CHECK ONCE ON MOUNT - No interval, only single check
    const checkBackups = async () => {
      try {
        // Get companies owned by user
        const ownedCompanies = await base44.entities.Company.filter({
          owner_email: currentUser.email
        });

        if (!ownedCompanies || ownedCompanies.length === 0) {
          console.log('ℹ️ User owns no companies - skipping backup check');
          return;
        }

        console.log('🔍 Checking backups for', ownedCompanies.length, 'companies...');

        // ✅ Check each company
        for (const company of ownedCompanies) {
          try {
            // Get last backup
            const lastBackup = await base44.entities.CompanyBackup.filter({
              company_id: company.id
            }, '-backup_date', 1); // Get most recent backup

            const lastBackupDate = lastBackup && lastBackup.length > 0 
              ? new Date(lastBackup[0].backup_date)
              : null;

            const hoursSinceBackup = lastBackupDate
              ? differenceInHours(new Date(), lastBackupDate)
              : 999; // No backup = many hours

            // ✅ SHOW REMINDER if 24+ hours - BUT ONLY ONCE
            if (hoursSinceBackup >= 24) {
              console.log(`⚠️ Company "${company.name}" needs backup (${hoursSinceBackup}h ago)`);

              // ✅ PERSISTENT CHECK - Once per backup cycle (not per day)
              const reminderKey = `backup_reminder_shown_${company.id}_${lastBackupDate ? lastBackupDate.getTime() : 'never'}`;
              
              if (localStorage.getItem(reminderKey)) {
                console.log('⏭️ Reminder already shown for this backup cycle:', company.name);
                continue;
              }

              // ✅ Show notification ONCE
              toast.warning(`⏰ Backup Data ${company.name}`, {
                description: lastBackupDate 
                  ? `Sudah ${Math.floor(hoursSinceBackup)} jam sejak backup terakhir. Backup sekarang untuk keamanan data.`
                  : 'Belum ada backup. Backup sekarang untuk keamanan data perusahaan.',
                duration: 15000, // Longer duration
                action: {
                  label: 'Backup Sekarang',
                  onClick: () => {
                    // Navigate to company settings backup tab
                    window.location.href = `/company-settings?tab=backup&company=${company.id}`;
                  }
                }
              });

              // ✅ Mark as shown for this backup cycle
              localStorage.setItem(reminderKey, 'true');
              
              console.log('✅ Backup reminder shown for', company.name, '- Won\'t show again until next backup or 24h from now');
            }

            // ✅ Delay between companies to avoid rate limit
            await new Promise(r => setTimeout(r, 1000));

          } catch (err) {
            console.warn(`Could not check backup for ${company.name}:`, err.message);
          }
        }

      } catch (error) {
        console.error('Error checking backups:', error);
      }
    };

    // ✅ CHECK ONLY ONCE on mount after delay - NO INTERVAL
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      
      setTimeout(() => {
        checkBackups();
      }, 10000); // Check after 10 seconds on mount
    }

    // ✅ NO INTERVAL - Only check once per session/page load
    // User will see reminder again on next login or page refresh

  }, [currentUser]);

  return null; // No UI - background checker
}