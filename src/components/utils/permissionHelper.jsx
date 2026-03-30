/**
 * ADVANCED PERMISSION HELPER - GRANULAR ACCESS CONTROL
 * Kontrol akses detail untuk setiap member perusahaan
 */

/**
 * Check if user is company owner
 * @param {Object} currentUser - Current user object
 * @param {Object} company - Company object
 * @returns {Boolean}
 */
export const isCompanyOwner = (currentUser, company) => {
  if (!company || !currentUser) return false;
  return company.owner_email === currentUser.email;
};

/**
 * Check if user has permission in company
 * @param {Object} member - CompanyMember object
 * @param {String} permissionKey - Permission key to check
 * @returns {Boolean}
 */
export const hasCompanyPermission = (member, permissionKey) => {
  if (!member) return false;
  if (member.role === 'owner') return true;
  return member.permissions?.[permissionKey] === true;
};

/**
 * Check if user has specific permission
 * @param {Object} member - CompanyMember object with permissions
 * @param {String} permissionKey - Permission key to check
 * @returns {Boolean}
 */
export const hasPermission = (member, permissionKey) => {
  if (!member) return false;

  // Owner has all permissions
  if (member.role === 'owner') return true;

  // Check specific permission
  return member.permissions?.[permissionKey] === true;
};

/**
 * Check if user can VIEW a module
 * @param {Object} member - CompanyMember object
 * @param {String} module - Module name
 * @returns {Boolean}
 */
export const canViewModule = (member, module) => {
  if (!member) return false;
  if (member.role === 'owner') return true;

  const viewPermissions = {
    'dashboard': 'can_view_dashboard',
    'tasks': 'can_view_tasks',
    'notes': 'can_view_notes',
    'finance': 'can_view_finance',
    'pos': 'can_view_pos',
    'pos_cashier': 'can_view_pos',
    'hr': 'can_view_hr',
    'inventory': 'can_view_inventory',
    'projects': 'can_view_projects',
    'reports': 'can_view_reports',
    'settings': 'can_view_settings',
    'crm': 'can_view_pos',
    'invoices': 'can_view_finance',
    'documents': 'can_view_dashboard',
    'attendance': 'can_view_hr',
    'kpi': 'can_view_hr',
    'payroll': 'can_view_hr',
    'assets': 'can_view_projects',
    'manufacturing': 'can_view_inventory',
    'analytics': 'can_view_reports',
    'email_marketing': 'can_view_settings',
    'appointments': 'can_view_pos',
    'team_chat': 'can_view_dashboard',
    'goals': 'can_view_dashboard'
  };

  const permissionKey = viewPermissions[module];
  return permissionKey ? hasPermission(member, permissionKey) : false;
};

/**
 * Check if user can CREATE in a module
 * @param {Object} member - CompanyMember object
 * @param {String} module - Module name
 * @returns {Boolean}
 */
export const canCreateInModule = (member, module) => {
  if (!member) return false;
  if (member.role === 'owner') return true;

  const createPermissions = {
    'tasks': 'can_create_tasks',
    'notes': 'can_create_notes',
    'finance': 'can_edit_finance',
    'pos': 'can_use_pos',
    'hr': 'can_edit_hr',
    'inventory': 'can_edit_inventory',
    'projects': 'can_edit_projects'
  };

  const permissionKey = createPermissions[module];
  return permissionKey ? hasPermission(member, permissionKey) : false;
};

/**
 * Check if user can EDIT in a module
 * @param {Object} member - CompanyMember object
 * @param {String} module - Module name
 * @returns {Boolean}
 */
export const canEditModule = (member, module) => {
  if (!member) return false;
  if (member.role === 'owner') return true;

  const editPermissions = {
    'tasks': 'can_edit_tasks',
    'notes': 'can_edit_notes',
    'finance': 'can_edit_finance',
    'pos': 'can_edit_pos_transactions',
    'hr': 'can_edit_hr',
    'inventory': 'can_edit_inventory',
    'projects': 'can_edit_projects',
    'settings': 'can_edit_settings'
  };

  const permissionKey = editPermissions[module];
  return permissionKey ? hasPermission(member, permissionKey) : false;
};

/**
 * Check if user can DELETE in a module
 * @param {Object} member - CompanyMember object
 * @param {String} module - Module name
 * @returns {Boolean}
 */
export const canDeleteInModule = (member, module) => {
  if (!member) return false;
  if (member.role === 'owner') return true;

  const deletePermissions = {
    'tasks': 'can_delete_tasks',
    'notes': 'can_delete_notes',
    'finance': 'can_edit_finance',
    'pos': 'can_edit_pos_transactions',
    'inventory': 'can_edit_inventory'
  };

  const permissionKey = deletePermissions[module];
  return permissionKey ? hasPermission(member, permissionKey) : false;
};

/**
 * Get available dashboard menu cards based on permissions
 * Returns array of menu IDs that user can access
 * @param {Object} member - CompanyMember object
 * @param {Object} company - Company object
 * @returns {Array} - Array of menu IDs
 */
export const getAvailableDashboardMenus = (member, company) => {
  if (!member || !company) return [];

  const allMenus = [
    { id: 'dashboard', permission: 'can_view_dashboard' },
    { id: 'company_pos_cashier', permission: 'can_view_pos' },
    { id: 'company_pos', permission: 'can_view_pos' },
    { id: 'company_products', permission: 'can_view_pos' },
    { id: 'company_crm', permission: 'can_view_pos' },
    { id: 'company_invoices', permission: 'can_view_finance' },
    { id: 'company_documents', permission: 'can_view_dashboard' },
    { id: 'company_attendance', permission: 'can_view_hr' },
    { id: 'hr', permission: 'can_view_hr' },
    { id: 'payroll_automation', permission: 'can_view_hr' },
    { id: 'kpi', permission: 'can_view_hr' },
    { id: 'projects', permission: 'can_view_projects' },
    { id: 'assets', permission: 'can_view_projects' },
    { id: 'inventory', permission: 'can_view_inventory' },
    { id: 'manufacturing', permission: 'can_view_inventory' },
    { id: 'company_settings', permission: 'can_view_settings' },
    { id: 'advanced_analytics', permission: 'can_view_reports' },
    { id: 'email_marketing', permission: 'can_view_settings' },
    { id: 'goal_tracking', permission: 'can_view_dashboard' },
    { id: 'team_chat', permission: 'can_view_dashboard' },
    { id: 'appointments', permission: 'can_view_pos' }
  ];

  // Owner sees everything
  if (member.role === 'owner') {
    return allMenus.map(m => m.id);
  }

  // Filter based on permissions
  return allMenus
    .filter(menu => hasPermission(member, menu.permission))
    .map(m => m.id);
};

/**
 * Get available sidebar menus based on permissions
 * @param {Object} member - CompanyMember object
 * @returns {Array} - Array of menu IDs
 */
export const getAvailableSidebarMenus = (member) => {
  if (!member) return [];

  const allMenus = [
    { id: 'dashboard', permission: 'can_view_dashboard' },
    { id: 'tasks', permission: 'can_view_tasks' },
    { id: 'notes', permission: 'can_view_notes' },
    { id: 'workspaces', permission: 'can_view_dashboard' },
    { id: 'attendance', permission: 'can_view_hr' },
    { id: 'company_pos_cashier', permission: 'can_view_pos' },
    { id: 'company_pos', permission: 'can_view_pos' },
    { id: 'company_products', permission: 'can_view_pos' },
    { id: 'company_crm', permission: 'can_view_pos' },
    { id: 'company_invoices', permission: 'can_view_finance' },
    { id: 'company_documents', permission: 'can_view_dashboard' },
    { id: 'company_attendance', permission: 'can_view_hr' },
    { id: 'hr', permission: 'can_view_hr' },
    { id: 'payroll_automation', permission: 'can_view_hr' },
    { id: 'kpi', permission: 'can_view_hr' },
    { id: 'projects', permission: 'can_view_projects' },
    { id: 'assets', permission: 'can_view_projects' },
    { id: 'inventory', permission: 'can_view_inventory' },
    { id: 'manufacturing', permission: 'can_view_inventory' },
    { id: 'company_settings', permission: 'can_view_settings' },
    { id: 'advanced_analytics', permission: 'can_view_reports' },
    { id: 'email_marketing', permission: 'can_view_settings' },
    { id: 'goal_tracking', permission: 'can_view_dashboard' },
    { id: 'team_chat', permission: 'can_view_dashboard' },
    { id: 'appointments', permission: 'can_view_pos' }
  ];

  // Owner sees everything
  if (member.role === 'owner') {
    return allMenus.map(m => m.id);
  }

  // Filter based on permissions
  return allMenus
    .filter(menu => hasPermission(member, menu.permission))
    .map(m => m.id);
};

/**
 * Check if current user is owner or has specific permission
 * @param {Object} company - Company object
 * @param {Object} currentUser - Current user object
 * @param {Object} member - CompanyMember object
 * @param {String} permissionKey - Permission key to check
 * @returns {Boolean}
 */
export const canUserPerformAction = (company, currentUser, member, permissionKey) => {
  if (!company || !currentUser) return false;

  // Check if owner
  if (company.owner_email === currentUser.email) return true;

  // Check member permission
  return hasPermission(member, permissionKey);
};

/**
 * Get permission summary for display
 * @param {Object} member - CompanyMember object
 * @returns {Object} - Summary of permissions by category
 */
export const getPermissionSummary = (member) => {
  if (!member) return {};

  if (member.role === 'owner') {
    return {
      dashboard: { view: true, create: true, edit: true, delete: true },
      tasks: { view: true, create: true, edit: true, delete: true },
      notes: { view: true, create: true, edit: true, delete: true },
      finance: { view: true, create: true, edit: true, delete: true },
      pos: { view: true, create: true, edit: true, delete: true },
      hr: { view: true, create: true, edit: true, delete: true },
      inventory: { view: true, create: true, edit: true, delete: true },
      projects: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, create: true, edit: true, delete: true },
      settings: { view: true, create: true, edit: true, delete: true }
    };
  }

  return {
    dashboard: {
      view: hasPermission(member, 'can_view_dashboard'),
      create: false,
      edit: false,
      delete: false
    },
    tasks: {
      view: hasPermission(member, 'can_view_tasks'),
      create: hasPermission(member, 'can_create_tasks'),
      edit: hasPermission(member, 'can_edit_tasks'),
      delete: hasPermission(member, 'can_delete_tasks')
    },
    notes: {
      view: hasPermission(member, 'can_view_notes'),
      create: hasPermission(member, 'can_create_notes'),
      edit: hasPermission(member, 'can_edit_notes'),
      delete: hasPermission(member, 'can_delete_notes')
    },
    finance: {
      view: hasPermission(member, 'can_view_finance'),
      create: hasPermission(member, 'can_edit_finance'),
      edit: hasPermission(member, 'can_edit_finance'),
      delete: hasPermission(member, 'can_edit_finance')
    },
    pos: {
      view: hasPermission(member, 'can_view_pos'),
      create: hasPermission(member, 'can_use_pos'),
      edit: hasPermission(member, 'can_edit_pos_transactions'),
      delete: hasPermission(member, 'can_edit_pos_transactions')
    },
    hr: {
      view: hasPermission(member, 'can_view_hr'),
      create: hasPermission(member, 'can_edit_hr'),
      edit: hasPermission(member, 'can_edit_hr'),
      delete: hasPermission(member, 'can_edit_hr')
    },
    inventory: {
      view: hasPermission(member, 'can_view_inventory'),
      create: hasPermission(member, 'can_edit_inventory'),
      edit: hasPermission(member, 'can_edit_inventory'),
      delete: hasPermission(member, 'can_edit_inventory')
    },
    projects: {
      view: hasPermission(member, 'can_view_projects'),
      create: hasPermission(member, 'can_edit_projects'),
      edit: hasPermission(member, 'can_edit_projects'),
      delete: hasPermission(member, 'can_edit_projects')
    },
    reports: {
      view: hasPermission(member, 'can_view_reports'),
      create: false,
      edit: false,
      delete: false
    },
    settings: {
      view: hasPermission(member, 'can_view_settings'),
      create: hasPermission(member, 'can_edit_settings'),
      edit: hasPermission(member, 'can_edit_settings'),
      delete: hasPermission(member, 'can_edit_settings')
    }
  };
};

/**
 * Shorthand helper: Check if user can edit in a specific module
 * @param {Object} company - Company object
 * @param {Object} currentUser - Current user object
 * @param {Object} member - CompanyMember object
 * @param {String} module - Module name
 * @returns {Boolean}
 */
export const canUserEdit = (company, currentUser, member, module) => {
  if (!company || !currentUser) {
    // Personal mode - always allow edit for own data
    return true;
  }

  // Check if owner
  if (company.owner_email === currentUser.email) return true;

  // Check member permission
  return canEditModule(member, module);
};

/**
 * Shorthand helper: Check if user can delete in a specific module
 * @param {Object} company - Company object
 * @param {Object} currentUser - Current user object
 * @param {Object} member - CompanyMember object
 * @param {String} module - Module name
 * @returns {Boolean}
 */
export const canUserDelete = (company, currentUser, member, module) => {
  if (!company || !currentUser) {
    // Personal mode - always allow delete for own data
    return true;
  }

  // Check if owner
  if (company.owner_email === currentUser.email) return true;

  // Check member permission
  return canDeleteInModule(member, module);
};

/**
 * Shorthand helper: Check if user can create in a specific module
 * @param {Object} company - Company object
 * @param {Object} currentUser - Current user object
 * @param {Object} member - CompanyMember object
 * @param {String} module - Module name
 * @returns {Boolean}
 */
export const canUserCreate = (company, currentUser, member, module) => {
  if (!company || !currentUser) {
    // Personal mode - always allow create for own data
    return true;
  }

  // Check if owner
  if (company.owner_email === currentUser.email) return true;

  // Check member permission
  return canCreateInModule(member, module);
};

/**
 * Shorthand helper: Check if user can view a specific module
 * @param {Object} company - Company object
 * @param {Object} currentUser - Current user object
 * @param {Object} member - CompanyMember object
 * @param {String} module - Module name
 * @returns {Boolean}
 */
export const canUserView = (company, currentUser, member, module) => {
  if (!company || !currentUser) {
    // Personal mode - always allow view for own data
    return true;
  }

  // Check if owner
  if (company.owner_email === currentUser.email) return true;

  // Check member permission
  return canViewModule(member, module);
};