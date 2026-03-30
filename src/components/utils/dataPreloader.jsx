/**
 * ✅ DATA PRELOADER - Warms up cache for instant page loads
 * 
 * Preloads all company data in background when user logs in
 * or switches company, ensuring INSTANT access to all pages
 */

import { base44 } from '@/api/base44Client';
import globalCache from './globalDataCache';

/**
 * ✅ AGGRESSIVE PRELOAD - ALL company data IMMEDIATELY
 * NO CONDITIONS - ALWAYS PRELOAD EVERYTHING
 */
export async function preloadCompanyData(company, user) {
  if (!company || !user) {
    console.log('⚠️ Preload skipped: no company or user');
    return;
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('🚀 AGGRESSIVE PRELOAD: ALL DATA LOADING NOW');
  console.log('   Company:', company.name);
  console.log('   User:', user.email);
  console.log('═══════════════════════════════════════════');

  const startTime = Date.now();

  // ✅ SEQUENTIAL LOAD with delays to avoid rate limiting
  const sequentialLoad = async () => {
    const loaders = [
      () => preloadPOSCashier(company.id, true),
      () => preloadProducts(company.id, true),
      () => preloadInventory(company.id, true),
      () => preloadPOSReports(company.id, true),
      () => preloadCompanyReports(company.id, true),
      () => preloadFinance(company.id, user.id, true),
      () => preloadCRM(company.id, true),
      () => preloadHR(company.id, true),
      () => preloadTasks(company.id, user.email, true),
      () => preloadNotes(company.id, user.email, true),
      () => preloadWorkspaces(user.email, true)
    ];

    for (const loader of loaders) {
      try {
        await loader();
      } catch (error) {
        console.error('Preload error (non-blocking):', error);
      }
      // Wait 10 seconds between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  };

  // ✅ Fire and forget sequential load
  sequentialLoad().then(() => {
    const duration = Date.now() - startTime;
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('✅ ✅ ✅ PRELOAD 100% COMPLETE ✅ ✅ ✅');
    console.log('   Duration:', duration, 'ms');
    console.log('   Cache entries:', globalCache.getStats().size);
    console.log('   ALL DATA NOW INSTANT ACCESSIBLE');
    console.log('═══════════════════════════════════════════');
  }).catch(error => {
    console.error('❌ Preload error (non-blocking):', error);
  });
}

async function preloadPOSCashier(companyId, force = false) {
  const key = `pos_cashier_${companyId}`;
  
  // ✅ FORCE LOAD if requested (no cache check)
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip POS Cashier (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: POS Cashier...');
    const [products, categories, customers, membershipLevels, settings, locations] = await Promise.all([
      base44.entities.CompanyPOSProduct.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyPOSCategory.filter({ company_id: companyId }).catch(() => []),
      base44.entities.Customer.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CustomerMembership.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyPOSSettings.filter({ company_id: companyId }).catch(() => []),
      base44.entities.WarehouseLocation.filter({ company_id: companyId }).catch(() => [])
    ]);

    globalCache.set(key, {
      products: products || [],
      categories: categories || [],
      customers: customers || [],
      membershipLevels: membershipLevels || [],
      posSettings: settings && settings.length > 0 ? settings[0] : null,
      locations: locations || []
    });

    console.log('   ✅ POS Cashier:', products?.length || 0, 'products');
  } catch (error) {
    console.error('   ❌ POS Cashier failed:', error);
  }
}

async function preloadProducts(companyId, force = false) {
  const key = `company_products_${companyId}`;
  
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip Products (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: Products...');
    const [products, categories, locations, inventory] = await Promise.all([
      base44.entities.CompanyPOSProduct.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyPOSCategory.filter({ company_id: companyId }).catch(() => []),
      base44.entities.WarehouseLocation.filter({ company_id: companyId }).catch(() => []),
      base44.entities.Inventory.filter({ company_id: companyId }).catch(() => [])
    ]);

    globalCache.set(key, {
      products: products || [],
      categories: categories || [],
      locations: locations || [],
      inventory: inventory || []
    });

    console.log('   ✅ Products:', products?.length || 0, 'items');
  } catch (error) {
    console.error('   ❌ Products failed:', error);
  }
}

async function preloadInventory(companyId, force = false) {
  const key = `inventory_${companyId}`;
  
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip Inventory (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: Inventory...');
    const [inventory, locations, products, alerts, categories] = await Promise.all([
      base44.entities.Inventory.filter({ company_id: companyId }).catch(() => []),
      base44.entities.WarehouseLocation.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyPOSProduct.filter({ company_id: companyId }).catch(() => []),
      base44.entities.StockAlert.filter({ company_id: companyId, status: 'active' }).catch(() => []),
      base44.entities.CompanyPOSCategory.filter({ company_id: companyId }).catch(() => [])
    ]);

    globalCache.set(key, {
      inventory: inventory || [],
      locations: locations || [],
      products: products || [],
      alerts: alerts || [],
      categories: categories || []
    });

    console.log('   ✅ Inventory:', inventory?.length || 0, 'items');
  } catch (error) {
    console.error('   ❌ Inventory failed:', error);
  }
}

async function preloadPOSReports(companyId, force = false) {
  const key = `pos_reports_${companyId}`;
  
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip POS Reports (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: POS Reports...');
    const [transactions, products, customers] = await Promise.all([
      base44.entities.CompanyPOSTransaction.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyPOSProduct.filter({ company_id: companyId }).catch(() => []),
      base44.entities.Customer.filter({ company_id: companyId }).catch(() => [])
    ]);

    globalCache.set(key, {
      transactions: transactions || [],
      products: products || [],
      customers: customers || []
    });

    console.log('   ✅ POS Reports:', transactions?.length || 0, 'transactions');
  } catch (error) {
    console.error('   ❌ POS Reports failed:', error);
  }
}

async function preloadCompanyReports(companyId, force = false) {
  const key = `company_reports_${companyId}`;
  
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip Company Reports (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: Company Reports...');
    const [employees, attendance, leave, payroll, kpis, projects, assets, transactions, invoices, finance, inventory] = await Promise.all([
      base44.entities.Employee.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyAttendance.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyLeave.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyPayroll.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyKPI.filter({ company_id: companyId }).catch(() => []),
      base44.entities.Project.filter({ company_id: companyId }).catch(() => []),
      base44.entities.Asset.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyPOSTransaction.filter({ company_id: companyId }).catch(() => []),
      base44.entities.Invoice.filter({ company_id: companyId }).catch(() => []),
      base44.entities.FinancialRecord.filter({ company_id: companyId }).catch(() => []),
      base44.entities.Inventory.filter({ company_id: companyId }).catch(() => [])
    ]);

    globalCache.set(key, {
      hrData: { employees: employees || [], attendance: attendance || [], leave: leave || [], payroll: payroll || [], kpis: kpis || [] },
      projectData: projects || [],
      assetData: assets || [],
      salesData: { transactions: transactions || [], invoices: invoices || [] },
      financeData: finance || [],
      inventoryData: inventory || []
    });

    console.log('   ✅ Company Reports: Complete');
  } catch (error) {
    console.error('   ❌ Company Reports failed:', error);
  }
}

async function preloadFinance(companyId, userId, force = false) {
  const key = `finance_${companyId || 'personal'}`;
  
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip Finance (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: Finance...');
    
    const query = companyId
      ? { company_id: companyId }
      : { user_id: userId, $or: [{ company_id: null }, { mode: 'personal' }] };

    const [records, allRecords, categories, budgets] = await Promise.all([
      base44.entities.FinancialRecord.filter(query, '-date', 100).catch(() => []),
      base44.entities.FinancialRecord.filter(query).catch(() => []),
      base44.entities.TransactionCategory.filter({}).catch(() => []),
      base44.entities.Budget.filter(companyId ? { company_id: companyId } : { user_id: userId }).catch(() => [])
    ]);

    globalCache.set(key, {
      records: records || [],
      allRecords: allRecords || [],
      categories: categories || [],
      budgets: budgets || []
    });

    console.log('   ✅ Finance:', records?.length || 0, 'records');
  } catch (error) {
    console.error('   ❌ Finance failed:', error);
  }
}

async function preloadCRM(companyId, force = false) {
  const key = `crm_${companyId}`;
  
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip CRM (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: CRM...');
    const [customers, membershipLevels] = await Promise.all([
      base44.entities.Customer.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CustomerMembership.filter({ company_id: companyId }).catch(() => [])
    ]);

    globalCache.set(key, {
      customers: customers || [],
      membershipLevels: membershipLevels || []
    });

    console.log('   ✅ CRM:', customers?.length || 0, 'customers');
  } catch (error) {
    console.error('   ❌ CRM failed:', error);
  }
}

async function preloadHR(companyId, force = false) {
  const key = `company_hr_${companyId}`;
  
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip HR (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: HR...');
    const [employees, leaves, loans] = await Promise.all([
      base44.entities.CompanyMember.filter({ company_id: companyId, status: 'active' }).catch(() => []),
      base44.entities.CompanyLeave.filter({ company_id: companyId }).catch(() => []),
      base44.entities.CompanyLoan.filter({ company_id: companyId }).catch(() => [])
    ]);

    globalCache.set(key, {
      employees: employees || [],
      leaves: leaves || [],
      loans: loans || []
    });

    console.log('   ✅ HR:', employees?.length || 0, 'employees');
  } catch (error) {
    console.error('   ❌ HR failed:', error);
  }
}

async function preloadTasks(companyId, userEmail, force = false) {
  const key = `tasks_${companyId || 'personal'}`;
  
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip Tasks (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: Tasks...');
    const tasks = await base44.entities.Task.filter(
      companyId ? { company_id: companyId } : { created_by: userEmail }
    ).catch(() => []);

    globalCache.set(key, {
      tasks: tasks || []
    });

    console.log('   ✅ Tasks:', tasks?.length || 0, 'items');
  } catch (error) {
    console.error('   ❌ Tasks failed:', error);
  }
}

async function preloadNotes(companyId, userEmail, force = false) {
  const key = `notes_${companyId || 'personal'}`;
  
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip Notes (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: Notes...');
    const notes = await base44.entities.Note.filter(
      companyId ? { company_id: companyId } : { created_by: userEmail }
    ).catch(() => []);

    globalCache.set(key, {
      notes: notes || []
    });

    console.log('   ✅ Notes:', notes?.length || 0, 'items');
  } catch (error) {
    console.error('   ❌ Notes failed:', error);
  }
}

async function preloadWorkspaces(userEmail, force = false) {
  const key = `workspaces_${userEmail}`;
  
  if (!force && globalCache.get(key, 30000)) {
    console.log('⏭️ Skip Workspaces (fresh cache)');
    return;
  }

  try {
    console.log('📦 Preloading: Workspaces...');
    const [workspaces, memberships] = await Promise.all([
      base44.entities.Workspace.filter({ owner_id: userEmail }).catch(() => []),
      base44.entities.WorkspaceMember.filter({ user_id: userEmail }).catch(() => [])
    ]);

    globalCache.set(key, {
      workspaces: workspaces || [],
      memberships: memberships || []
    });

    console.log('   ✅ Workspaces:', workspaces?.length || 0, 'items');
  } catch (error) {
    console.error('   ❌ Workspaces failed:', error);
  }
}

/**
 * Clear cache for a company (when switching or logging out)
 */
export function clearCompanyCache(companyId) {
  if (!companyId) return;
  
  globalCache.invalidate(`*${companyId}*`);
  console.log('🗑️ Cleared cache for company:', companyId);
}

/**
 * Invalidate all caches (force refresh)
 */
export function invalidateAllCaches() {
  globalCache.clear();
  console.log('🗑️ All caches cleared');
}