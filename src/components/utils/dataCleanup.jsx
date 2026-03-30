/**
 * Utility to clean up orphaned company references
 * Call this when user logs in or when company errors occur
 */

import { User } from '@/entities/User';
import { Company } from '@/entities/Company';
import { CompanyMember } from '@/entities/CompanyMember';

export async function cleanupOrphanedCompanyReferences(user) {
  if (!user) return;

  console.log('🧹 Starting cleanup for user:', user.email);

  try {
    // Check if user has an active_company_id
    if (user.active_company_id) {
      try {
        // Try to load the company
        await Company.get(user.active_company_id);
        console.log('✅ Active company exists');
      } catch (error) {
        // Company doesn't exist - clear it
        console.log('❌ Active company not found, clearing...');
        
        try {
          await User.updateMyUserData({ active_company_id: null });
          console.log('✅ Cleared orphaned active_company_id');
        } catch (clearError) {
          console.log('⚠️ Could not clear active_company_id:', clearError.message);
        }
      }
    }

    // Clean up orphaned company memberships
    try {
      const memberships = await CompanyMember.filter({ user_email: user.email });
      
      const orphanedIds = [];
      for (const membership of memberships) {
        try {
          await Company.get(membership.company_id);
        } catch (e) {
          // Company doesn't exist
          orphanedIds.push(membership.id);
        }
      }

      if (orphanedIds.length > 0) {
        console.log('🧹 Found', orphanedIds.length, 'orphaned memberships');
        
        for (const id of orphanedIds) {
          try {
            await CompanyMember.delete(id);
            console.log('✅ Deleted orphaned membership:', id);
          } catch (e) {
            console.log('⚠️ Membership already gone:', id);
          }
        }
      }
    } catch (e) {
      console.log('⚠️ No memberships to clean');
    }

    console.log('✅ Cleanup completed');
    
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

export default cleanupOrphanedCompanyReferences;