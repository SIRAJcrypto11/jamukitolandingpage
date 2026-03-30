import { base44 } from '@/api/base44Client';

/**
 * Comprehensive company access control system
 * Checks user role and permissions in a company
 */

// Role hierarchy - higher roles inherit permissions from lower ones
const ROLE_HIERARCHY = {
  owner: ['owner', 'admin', 'supervisor', 'store_admin', 'stock_admin', 'finance_admin', 'hr_admin', 'transaction_admin', 'employee'],
  admin: ['admin', 'supervisor', 'store_admin', 'stock_admin', 'finance_admin', 'hr_admin', 'transaction_admin', 'employee'],
  supervisor: ['supervisor', 'employee'],
  store_admin: ['store_admin', 'employee'],
  stock_admin: ['stock_admin', 'employee'],
  finance_admin: ['finance_admin', 'employee'],
  hr_admin: ['hr_admin', 'employee'],
  transaction_admin: ['transaction_admin', 'employee'],
  employee: ['employee']
};

// Default permissions per role
const DEFAULT_PERMISSIONS = {
  owner: {
    can_view_dashboard: true,
    can_view_tasks: true,
    can_create_tasks: true,
    can_edit_tasks: true,
    can_delete_tasks: true,
    can_view_notes: true,
    can_create_notes: true,
    can_edit_notes: true,
    can_delete_notes: true,
    can_view_hr: true,
    can_edit_hr: true,
    can_view_finance: true,
    can_edit_finance: true,
    can_view_inventory: true,
    can_edit_inventory: true,
    can_view_projects: true,
    can_edit_projects: true,
    can_view_pos: true,
    can_use_pos: true,
    can_view_reports: true,
    can_manage_members: true,
    can_manage_roles: true,
    can_view_settings: true,
    can_edit_settings: true
  },
  admin: {
    can_view_dashboard: true,
    can_view_tasks: true,
    can_create_tasks: true,
    can_edit_tasks: true,
    can_delete_tasks: true,
    can_view_notes: true,
    can_create_notes: true,
    can_edit_notes: true,
    can_delete_notes: true,
    can_view_hr: true,
    can_edit_hr: true,
    can_view_finance: true,
    can_edit_finance: true,
    can_view_inventory: true,
    can_edit_inventory: true,
    can_view_projects: true,
    can_edit_projects: true,
    can_view_pos: true,
    can_use_pos: true,
    can_view_reports: true,
    can_manage_members: false,
    can_manage_roles: false,
    can_view_settings: true,
    can_edit_settings: false
  },
  supervisor: {
    can_view_dashboard: true,
    can_view_tasks: true,
    can_create_tasks: true,
    can_edit_tasks: true,
    can_delete_tasks: false,
    can_view_notes: true,
    can_create_notes: true,
    can_edit_notes: true,
    can_delete_notes: false,
    can_view_hr: true,
    can_edit_hr: false,
    can_view_finance: true,
    can_edit_finance: false,
    can_view_inventory: true,
    can_edit_inventory: false,
    can_view_projects: true,
    can_edit_projects: false,
    can_view_pos: true,
    can_use_pos: false,
    can_view_reports: true,
    can_manage_members: false,
    can_manage_roles: false,
    can_view_settings: false,
    can_edit_settings: false
  },
  finance_admin: {
    can_view_dashboard: true,
    can_view_tasks: false,
    can_create_tasks: false,
    can_edit_tasks: false,
    can_delete_tasks: false,
    can_view_notes: false,
    can_create_notes: false,
    can_edit_notes: false,
    can_delete_notes: false,
    can_view_hr: false,
    can_edit_hr: false,
    can_view_finance: true,
    can_edit_finance: true,
    can_view_inventory: false,
    can_edit_inventory: false,
    can_view_projects: false,
    can_edit_projects: false,
    can_view_pos: true,
    can_use_pos: true,
    can_view_reports: true,
    can_manage_members: false,
    can_manage_roles: false,
    can_view_settings: false,
    can_edit_settings: false
  },
  hr_admin: {
    can_view_dashboard: true,
    can_view_tasks: true,
    can_create_tasks: false,
    can_edit_tasks: false,
    can_delete_tasks: false,
    can_view_notes: false,
    can_create_notes: false,
    can_edit_notes: false,
    can_delete_notes: false,
    can_view_hr: true,
    can_edit_hr: true,
    can_view_finance: false,
    can_edit_finance: false,
    can_view_inventory: false,
    can_edit_inventory: false,
    can_view_projects: false,
    can_edit_projects: false,
    can_view_pos: false,
    can_use_pos: false,
    can_view_reports: true,
    can_manage_members: false,
    can_manage_roles: false,
    can_view_settings: false,
    can_edit_settings: false
  },
  stock_admin: {
    can_view_dashboard: true,
    can_view_tasks: false,
    can_create_tasks: false,
    can_edit_tasks: false,
    can_delete_tasks: false,
    can_view_notes: false,
    can_create_notes: false,
    can_edit_notes: false,
    can_delete_notes: false,
    can_view_hr: false,
    can_edit_hr: false,
    can_view_finance: false,
    can_edit_finance: false,
    can_view_inventory: true,
    can_edit_inventory: true,
    can_view_projects: false,
    can_edit_projects: false,
    can_view_pos: false,
    can_use_pos: false,
    can_view_reports: true,
    can_manage_members: false,
    can_manage_roles: false,
    can_view_settings: false,
    can_edit_settings: false
  },
  store_admin: {
    can_view_dashboard: true,
    can_view_tasks: false,
    can_create_tasks: false,
    can_edit_tasks: false,
    can_delete_tasks: false,
    can_view_notes: false,
    can_create_notes: false,
    can_edit_notes: false,
    can_delete_notes: false,
    can_view_hr: false,
    can_edit_hr: false,
    can_view_finance: false,
    can_edit_finance: false,
    can_view_inventory: true,
    can_edit_inventory: true,
    can_view_projects: false,
    can_edit_projects: false,
    can_view_pos: true,
    can_use_pos: true,
    can_view_reports: true,
    can_manage_members: false,
    can_manage_roles: false,
    can_view_settings: false,
    can_edit_settings: false
  },
  transaction_admin: {
    can_view_dashboard: true,
    can_view_tasks: false,
    can_create_tasks: false,
    can_edit_tasks: false,
    can_delete_tasks: false,
    can_view_notes: false,
    can_create_notes: false,
    can_edit_notes: false,
    can_delete_notes: false,
    can_view_hr: false,
    can_edit_hr: false,
    can_view_finance: true,
    can_edit_finance: true,
    can_view_inventory: false,
    can_edit_inventory: false,
    can_view_projects: false,
    can_edit_projects: false,
    can_view_pos: true,
    can_use_pos: true,
    can_view_reports: true,
    can_manage_members: false,
    can_manage_roles: false,
    can_view_settings: false,
    can_edit_settings: false
  },
  employee: {
    can_view_dashboard: true,
    can_view_tasks: true,
    can_create_tasks: true,
    can_edit_tasks: true,
    can_delete_tasks: false,
    can_view_notes: true,
    can_create_notes: true,
    can_edit_notes: true,
    can_delete_notes: false,
    can_view_hr: false,
    can_edit_hr: false,
    can_view_finance: false,
    can_edit_finance: false,
    can_view_inventory: false,
    can_edit_inventory: false,
    can_view_projects: true,
    can_edit_projects: false,
    can_view_pos: false,
    can_use_pos: false,
    can_view_reports: false,
    can_manage_members: false,
    can_manage_roles: false,
    can_view_settings: false,
    can_edit_settings: false
  }
};

/**
 * Get company member info for a user
 */
export const getCompanyMember = async (companyId, userEmail) => {
  try {
    const members = await base44.entities.CompanyMember.filter({
      company_id: companyId,
      user_email: userEmail,
      status: 'active'
    });

    return members && members.length > 0 ? members[0] : null;
  } catch (error) {
    console.error('Error getting company member:', error);
    return null;
  }
};

/**
 * Check if user has access to company
 * Returns true if user is owner, admin, or active member
 */
export const hasCompanyAccess = async (companyId, userEmail, company = null) => {
  try {
    // If company object provided and user is owner
    if (company && company.owner_email === userEmail) {
      return true;
    }

    // Check if user is active member
    const member = await getCompanyMember(companyId, userEmail);
    return !!member;
  } catch (error) {
    console.error('Error checking company access:', error);
    return false;
  }
};

/**
 * Get user's role in company
 */
export const getCompanyRole = async (companyId, userEmail, company = null) => {
  try {
    // If company object provided and user is owner
    if (company && company.owner_email === userEmail) {
      return 'owner';
    }

    // Check member role
    const member = await getCompanyMember(companyId, userEmail);
    return member ? member.role : null;
  } catch (error) {
    console.error('Error getting company role:', error);
    return null;
  }
};

/**
 * Get permissions for user in company
 */
export const getCompanyPermissions = async (companyId, userEmail, company = null) => {
  try {
    const role = await getCompanyRole(companyId, userEmail, company);

    if (!role) {
      return null;
    }

    // Get member for custom permissions
    const member = await getCompanyMember(companyId, userEmail);

    // Merge default permissions with custom permissions
    const defaultPerms = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.employee;
    const customPerms = member?.permissions || {};

    return {
      ...defaultPerms,
      ...customPerms
    };
  } catch (error) {
    console.error('Error getting company permissions:', error);
    return null;
  }
};

/**
 * Check specific permission
 */
export const hasPermission = async (companyId, userEmail, permission, company = null) => {
  try {
    const permissions = await getCompanyPermissions(companyId, userEmail, company);
    return permissions ? permissions[permission] === true : false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

/**
 * Check multiple permissions (AND logic - all must be true)
 */
export const hasAllPermissions = async (companyId, userEmail, permissions, company = null) => {
  try {
    const perms = await getCompanyPermissions(companyId, userEmail, company);
    return permissions.every(p => perms?.[p] === true);
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

/**
 * Check if user can manage this company (owner or admin)
 */
export const canManageCompany = async (companyId, userEmail, company = null) => {
  try {
    const role = await getCompanyRole(companyId, userEmail, company);
    return role === 'owner' || role === 'admin';
  } catch (error) {
    console.error('Error checking management access:', error);
    return false;
  }
};

/**
 * Get all accessible companies for user
 */
export const getAccessibleCompanies = async (userEmail) => {
  try {
    // Get companies where user is owner
    const ownedCompanies = await base44.entities.Company.filter({
      owner_email: userEmail
    });

    // Get companies where user is member
    const memberCompanies = await base44.entities.CompanyMember.filter({
      user_email: userEmail,
      status: 'active'
    });

    const memberCompanyIds = memberCompanies?.map(m => m.company_id) || [];
    const memberCompaniesData = memberCompanyIds.length > 0
      ? await Promise.all(memberCompanyIds.map(id => base44.entities.Company.get(id)))
      : [];

    return {
      owned: ownedCompanies || [],
      member: memberCompaniesData.filter(c => c) || []
    };
  } catch (error) {
    console.error('Error getting accessible companies:', error);
    return { owned: [], member: [] };
  }
};

export default {
  getCompanyMember,
  hasCompanyAccess,
  getCompanyRole,
  getCompanyPermissions,
  hasPermission,
  hasAllPermissions,
  canManageCompany,
  getAccessibleCompanies,
  DEFAULT_PERMISSIONS,
  ROLE_HIERARCHY
};