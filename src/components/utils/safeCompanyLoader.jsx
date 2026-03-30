/**
 * Safe company loader that handles all errors gracefully
 * and automatically cleans up orphaned references
 */

import { Company } from '@/entities/Company';
import { User } from '@/entities/User';

/**
 * Safely get a company by ID
 * Returns null if company doesn't exist (404)
 * Automatically clears orphaned reference from user
 */
export async function safeGetCompany(companyId, currentUser = null) {
  if (!companyId) return null;

  try {
    const company = await Company.get(companyId);
    return company;
  } catch (error) {
    // Check if it's a 404 error
    const is404 = error?.response?.status === 404 || 
                  error?.message?.includes('not found') ||
                  error?.message?.includes('404');

    if (is404) {
      console.log('❌ Company not found (404):', companyId);
      
      // If we have current user and this is their active company, clear it
      if (currentUser?.active_company_id === companyId) {
        console.log('🧹 Clearing orphaned active_company_id from user');
        try {
          await User.updateMyUserData({ active_company_id: null });
          console.log('✅ Cleared orphaned reference');
        } catch (clearError) {
          console.log('⚠️ Could not clear reference:', clearError.message);
        }
      }
    } else {
      console.error('❌ Error loading company:', error.message);
    }

    return null;
  }
}

/**
 * Safely filter companies
 * Returns empty array on error
 */
export async function safeFilterCompanies(filters, currentUser = null) {
  try {
    const companies = await Company.filter(filters);
    return companies || [];
  } catch (error) {
    console.log('⚠️ Error filtering companies:', error.message);
    return [];
  }
}

/**
 * Safely create a company with retry and verification
 * Returns the created company or null on error
 */
export async function safeCreateCompany(data) {
  try {
    console.log('🔨 Creating company:', data.name);
    
    // Create the company
    const company = await Company.create(data);
    
    if (!company || !company.id) {
      console.log('❌ Company creation returned no ID');
      return null;
    }
    
    console.log('✅ Company created with ID:', company.id);
    
    // Wait a moment for database to sync
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to verify it exists (with retries)
    let verified = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔍 Verification attempt ${attempt}/3...`);
        verified = await Company.get(company.id);
        
        if (verified) {
          console.log('✅ Company verified successfully');
          return verified;
        }
      } catch (verifyError) {
        const is404 = verifyError?.response?.status === 404;
        
        if (is404 && attempt < 3) {
          console.log(`⏳ Not found yet, waiting before retry ${attempt}/3...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else if (is404) {
          console.log('❌ Company not found after 3 attempts');
        } else {
          console.log('⚠️ Verify error:', verifyError.message);
        }
      }
    }
    
    // If verification failed but we have the creation response, return it anyway
    if (company && company.id) {
      console.log('⚠️ Using unverified company from creation response');
      return company;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error creating company:', error.message);
    
    // Check if it's a 404 during creation (shouldn't happen but handle it)
    const is404 = error?.response?.status === 404;
    if (is404) {
      console.error('❌ Got 404 during company creation - this is unexpected');
    }
    
    return null;
  }
}

export default {
  safeGetCompany,
  safeFilterCompanies,
  safeCreateCompany
};