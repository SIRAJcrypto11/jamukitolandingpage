import { base44 } from '@/api/base44Client';

const DEFAULT_COMPANY_ID = '694cc38feacdffcc010f0d60';

export const getDefaultCompanyForLanding = async () => {
  try {
    // Try direct ID lookup first
    const company = await base44.entities.Company.get(DEFAULT_COMPANY_ID);

    if (company) {
      console.log('✅ Default company loaded:', company.name);
      return company;
    }

    // Fallback: search by name
    const companies = await base44.entities.Company.filter({
      name: 'JAMU KITO INTERNATIONAL'
    });

    if (companies && companies.length > 0) {
      console.log('✅ Default company found via name:', companies[0].name);
      return companies[0];
    }

    console.warn('⚠️ Default company not found');
    return null;
  } catch (error) {
    console.error('❌ Error loading default company:', error);
    return null;
  }
};

export const syncLandingProducts = async (companyId = DEFAULT_COMPANY_ID) => {
  try {
    const products = await base44.entities.CompanyPOSProduct.filter({
      company_id: companyId,
      is_active: true
    });

    console.log('✅ Products synced:', products?.length || 0);
    return products || [];
  } catch (error) {
    console.error('❌ Error syncing products:', error);
    return [];
  }
};

export default {
  getDefaultCompanyForLanding,
  syncLandingProducts,
  DEFAULT_COMPANY_ID
};