import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, Loader2, ChevronDown, Crown, Users, RefreshCw } from 'lucide-react';
import globalCache from '@/components/utils/globalDataCache';
import { toast } from 'sonner';

const companyLimits = {
  free: 0,
  pro: 0,
  business: 3,
  advanced: 10,
  enterprise: 20
};

// ✅ PLANS that allow company creation
const BUSINESS_PLANS = ['business', 'advanced', 'enterprise'];

export default function CompanySwitcher({ currentUser, selectedCompany, onCompanyChange }) {
  const [myCompanies, setMyCompanies] = useState([]);
  const [memberCompanies, setMemberCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [newCompanyForm, setNewCompanyForm] = useState({
    name: '',
    description: '',
    industry: 'retail'
  });

  // ✅ ULTRA STABLE - PERSISTENT COMPANIES, NEVER DISAPPEAR
  const loadCompanies = useCallback(async () => {
    if (!currentUser) {
      console.log('⚠️ No currentUser - skipping load');
      return;
    }

    const cacheKey = `companies_${currentUser.email}`;

    // ✅ CRITICAL: ALWAYS show cached companies FIRST (0ms)
    const existingCache = globalCache.get(cacheKey);

    if (existingCache && (existingCache.myCompanies || existingCache.memberCompanies)) {
      console.log('📦 INSTANT DISPLAY (0ms):', existingCache.myCompanies?.length || 0, 'owned +', existingCache.memberCompanies?.length || 0, 'member');
      setMyCompanies(existingCache.myCompanies || []);
      setMemberCompanies(existingCache.memberCompanies || []);
      setIsLoading(false); // ✅ Hide loading immediately
    }

    try {
      // ✅ BACKGROUND: Fetch fresh data silently
      console.log('🔄 BACKGROUND: Fetching fresh company list...');

      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('🚀 COMPANY SWITCHER - LOADING DATA');
      console.log('═══════════════════════════════════════════');
      console.log('👤 User:', currentUser.email);
      console.log('📋 Plan:', currentUser.subscription_plan);
      console.log('');

      // ✅ STEP 1: Fresh user data
      const freshUser = await base44.auth.me();
      console.log('✅ Step 1: Fresh user loaded');
      console.log('   - Email:', freshUser.email);
      console.log('   - Plan:', freshUser.subscription_plan);

      const allowedPlans = ['business', 'advanced', 'enterprise'];
      const hasAccess = allowedPlans.includes(freshUser.subscription_plan) ||
        allowedPlans.includes(freshUser.trial_plan);

      console.log('   - Has Access:', hasAccess);

      // ✅ STEP 2: Load OWNED companies
      console.log('');
      console.log('🏢 Step 2: Loading OWNED companies...');

      const ownedCompanies = hasAccess
        ? await base44.entities.Company.filter({ owner_email: currentUser.email })
        : [];

      console.log('✅ Owned companies loaded:', ownedCompanies.length);
      ownedCompanies.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.name} (ID: ${c.id})`);
      });

      // ✅ ULTRA SAFE: Never replace with empty if we have cache
      if (ownedCompanies && ownedCompanies.length > 0) {
        setMyCompanies(ownedCompanies);
      } else if (!existingCache?.myCompanies || existingCache.myCompanies.length === 0) {
        // Only set to empty if cache is also empty
        setMyCompanies([]);
      }
      // Otherwise keep existing state (don't update to prevent flicker)

      // ✅ STEP 3: Load MEMBER companies - ULTIMATE ROBUST STRATEGY
      console.log('');
      console.log('👥 Step 3: Loading MEMBER companies...');
      console.log('   - Strategy: Multi-method fallback');
      console.log('   - User email:', currentUser.email);

      let memberships = [];
      let loadSuccess = false;

      // ✅ STRATEGY 1: Standard filter (user-scoped)
      console.log('');
      console.log('🔹 Strategy 1: Standard user filter...');
      try {
        memberships = await base44.entities.CompanyMember.filter({
          user_email: currentUser.email,
          status: 'active'
        });

        console.log(`✅ Strategy 1 SUCCESS - Found ${memberships?.length || 0} memberships`);
        loadSuccess = true;

      } catch (e) {
        console.warn(`❌ Strategy 1 failed:`, e.message);
      }

      // ✅ STRATEGY 2: If strategy 1 failed, try with user_id
      if (!loadSuccess && currentUser.id) {
        console.log('');
        console.log('🔹 Strategy 2: Filter by user_id...');
        try {
          const membersByUserId = await base44.entities.CompanyMember.filter({
            user_id: currentUser.id,
            status: 'active'
          });

          memberships = membersByUserId;
          console.log(`✅ Strategy 2 SUCCESS - Found ${memberships?.length || 0} memberships`);
          loadSuccess = true;

        } catch (e) {
          console.warn(`❌ Strategy 2 failed:`, e.message);
        }
      }

      // ✅ STRATEGY 3: Service role with filter
      if (!loadSuccess) {
        console.log('');
        console.log('🔹 Strategy 3: Service role filter...');
        try {
          const allMembers = await base44.asServiceRole.entities.CompanyMember.filter({
            user_email: currentUser.email,
            status: 'active'
          });

          memberships = allMembers;
          console.log(`✅ Strategy 3 SUCCESS - Found ${memberships?.length || 0} memberships`);
          loadSuccess = true;

        } catch (e) {
          console.warn(`❌ Strategy 3 failed:`, e.message);
        }
      }

      // ✅ STRATEGY 4: Service role list all + manual filter
      if (!loadSuccess) {
        console.log('');
        console.log('🔹 Strategy 4: Service role list all + manual filter...');
        try {
          const allMembers = await base44.asServiceRole.entities.CompanyMember.list();

          console.log(`   - Total members in DB: ${allMembers?.length || 0}`);

          // Manual filter
          memberships = (allMembers || []).filter(m =>
            m.user_email === currentUser.email &&
            m.status === 'active'
          );

          console.log(`✅ Strategy 4 SUCCESS - Found ${memberships.length} memberships after manual filter`);
          loadSuccess = true;

        } catch (e) {
          console.warn(`❌ Strategy 4 failed:`, e.message);
        }
      }

      // ✅ Final result
      if (!loadSuccess) {
        console.error('❌❌❌ ALL STRATEGIES FAILED - No memberships loaded');
        memberships = [];
      }

      console.log('');
      console.log('📊 Memberships final count:', memberships?.length || 0);

      if (memberships && memberships.length > 0) {
        memberships.forEach((m, i) => {
          console.log(`   ${i + 1}. Company ID: ${m.company_id} | Role: ${m.role}`);
        });
      }

      // ✅ STEP 4: Load company details for each membership
      if (memberships && memberships.length > 0) {
        const companyIds = [...new Set(memberships.map(m => m.company_id).filter(Boolean))];
        console.log('');
        console.log('🔍 Step 4: Loading company details...');
        console.log('   - Unique company IDs:', companyIds.length);

        const companies = [];

        for (const companyId of companyIds) {
          try {
            console.log(`   📥 Fetching: ${companyId}...`);

            let company = null;

            // Try multiple methods
            try {
              company = await base44.entities.Company.get(companyId);
              console.log(`   ✅ Company.get SUCCESS: ${company.name}`);
            } catch (getError) {
              console.warn(`   ⚠️ Company.get failed (${getError.message}), trying filter...`);

              try {
                const filtered = await base44.entities.Company.filter({ id: companyId });
                company = filtered && filtered.length > 0 ? filtered[0] : null;

                if (company) {
                  console.log(`   ✅ Company.filter SUCCESS: ${company.name}`);
                } else {
                  console.warn(`   ⚠️ Company.filter failed, trying service role get...`);
                  try {
                    company = await base44.asServiceRole.entities.Company.get(companyId);
                    console.log(`   ✅ ServiceRole.get SUCCESS: ${company.name}`);
                  } catch (serviceError) {
                    console.error(`   ❌ All methods failed for company ${companyId}: ${serviceError.message}`);
                  }
                }
              } catch (filterError) {
                console.warn(`   ⚠️ Company.filter failed (${filterError.message}), trying service role get...`);

                try {
                  company = await base44.asServiceRole.entities.Company.get(companyId);
                  console.log(`   ✅ ServiceRole.get SUCCESS: ${company.name}`);
                } catch (serviceError) {
                  console.error(`   ❌ All methods failed for company ${companyId}: ${serviceError.message}`);
                }
              }
            }

            if (company) {
              const membership = memberships.find(m => m.company_id === companyId);
              const companyWithRole = {
                ...company,
                memberRole: membership?.role || 'employee',
                memberPermissions: membership?.permissions || {},
                memberDepartment: membership?.department,
                memberPosition: membership?.position
              };
              companies.push(companyWithRole);
              console.log(`   ✅ Added: ${company.name} (Role: ${membership?.role})`);
            }
          } catch (e) {
            console.error(`   ❌ Critical error for company ${companyId}:`, e.message);
          }
        }

        console.log('');
        console.log('✅✅✅ MEMBER COMPANIES LOADED:', companies.length);
        companies.forEach((c, i) => {
          console.log(`   ${i + 1}. ${c.name} (Role: ${c.memberRole})`);
        });

        // ✅ ULTRA SAFE: Never replace with empty
        if (companies && companies.length > 0) {
          setMemberCompanies(companies);
        } else if (!existingCache?.memberCompanies || existingCache.memberCompanies.length === 0) {
          setMemberCompanies([]);
        }
        // Otherwise keep existing state

        // ✅ Update cache
        globalCache.set(cacheKey, {
          myCompanies: ownedCompanies || existingCache?.myCompanies || [],
          memberCompanies: companies || existingCache?.memberCompanies || []
        });
      } else {
        console.log('ℹ️ No memberships found');
        // ✅ CRITICAL: Never clear member companies, keep cache
        if (!existingCache?.memberCompanies || existingCache.memberCompanies.length === 0) {
          setMemberCompanies([]);
        }

        // ✅ Update cache, preserve owned companies
        globalCache.set(cacheKey, {
          myCompanies: ownedCompanies || existingCache?.myCompanies || [],
          memberCompanies: existingCache?.memberCompanies || []
        });
      }

      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('✅ LOADING COMPLETE');
      console.log('   - Owned:', ownedCompanies.length);
      console.log('   - Member:', memberCompanies.length);
      console.log('   - TOTAL:', ownedCompanies.length + memberCompanies.length);
      console.log('═══════════════════════════════════════════');
      console.log('');

    } catch (error) {
      console.error('');
      console.error('❌ ERROR in loadCompanies:', error.message);
      console.error('');

      // ✅ CRITICAL: NEVER clear companies on error, keep cache
      if (!existingCache?.myCompanies && !existingCache?.memberCompanies) {
        setMyCompanies([]);
        setMemberCompanies([]);

        toast.error('Gagal memuat daftar perusahaan', {
          description: 'Coba refresh halaman atau klik tombol refresh',
          duration: 5000
        });
      } else {
        console.log('✅ ERROR HANDLED: Keeping cached companies');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // ✅ INITIAL LOAD - IMMEDIATE & AUTO-REFRESH
  useEffect(() => {
    if (currentUser) {
      console.log('🏢 CompanySwitcher MOUNTED - Starting initial load');
      loadCompanies();

      // ✅ Auto-refresh every 2 minutes to catch new invitations (reduced to avoid rate limits)
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh company list (background)');
        loadCompanies();
      }, 120000);

      return () => clearInterval(interval);
    }
  }, [currentUser, loadCompanies]);

  // ✅ REALTIME LISTENER - Auto-reload saat user join company
  useEffect(() => {
    const handleMemberJoined = (event) => {
      const { userEmail, companyId, companyName } = event.detail || {};

      console.log('');
      console.log('📡 EVENT: memberJoinedCompany');
      console.log('   - User:', userEmail);
      console.log('   - Company:', companyName);
      console.log('   - Current User:', currentUser?.email);

      if (userEmail === currentUser?.email) {
        console.log('✅ MATCH! Current user joined - RELOADING IMMEDIATELY');

        toast.success(`🎉 Bergabung dengan ${companyName}!`, {
          description: 'Company akan muncul di switcher...',
          duration: 3000
        });

        // ✅ INSTANT RELOAD
        setTimeout(() => {
          loadCompanies();
        }, 500); // Small delay to ensure DB write is complete
      } else {
        console.log('⏭️ Different user - ignoring');
      }
    };

    window.addEventListener('memberJoinedCompany', handleMemberJoined);

    return () => {
      window.removeEventListener('memberJoinedCompany', handleMemberJoined);
    };
  }, [currentUser, loadCompanies]);

  // ✅ LISTEN TO GENERAL COMPANY CHANGES
  useEffect(() => {
    const handleCompanyEvent = () => {
      console.log('🔄 EVENT: companyChanged - Reloading');
      loadCompanies();
    };

    window.addEventListener('companyChanged', handleCompanyEvent);
    return () => window.removeEventListener('companyChanged', handleCompanyEvent);
  }, [loadCompanies]);

  // ✅ RELOAD ON WINDOW FOCUS
  useEffect(() => {
    const handleFocus = () => {
      console.log('👁️ Window focused - Refreshing');
      loadCompanies();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadCompanies]);

  const handleCompanySelect = useCallback(async (company) => {
    try {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('🔄 ULTRA PERSISTENT COMPANY SWITCH');
      console.log('═══════════════════════════════════════════');
      console.log('   FROM:', selectedCompany?.name || 'Personal');
      console.log('   TO:', company?.name || 'Personal');
      console.log('');

      // ✅ CRITICAL: QUADRUPLE PERSISTENCE - Never lose company context
      const companyId = company ? company.id : null;
      const companyName = company ? company.name : null;

      console.log('💾 QUADRUPLE PERSIST:');

      // Layer 1: localStorage (survives refresh & browser restart)
      if (companyId) {
        localStorage.setItem('SNISHOP_ACTIVE_COMPANY_ID', companyId);
        localStorage.setItem('SNISHOP_ACTIVE_COMPANY_NAME', companyName);
        localStorage.setItem('SNISHOP_ACTIVE_COMPANY_FULL', JSON.stringify(company));
        console.log('   1️⃣ localStorage:', companyName);
      } else {
        localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_ID');
        localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_NAME');
        localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_FULL');
        console.log('   1️⃣ localStorage: CLEARED');
      }

      // Layer 2: sessionStorage (fast in-session access)
      sessionStorage.setItem('SNISHOP_COMPANY_CONTEXT', JSON.stringify({
        companyId,
        companyName,
        fullData: company,
        timestamp: Date.now()
      }));
      console.log('   2️⃣ sessionStorage: ✅');

      // Layer 3: User database (cloud permanent)
      if (currentUser) {
        await base44.auth.updateMe({
          active_company_id: companyId
        });
        console.log('   3️⃣ Cloud DB: ✅');
      }

      // Layer 4: Global cache marker
      globalCache.set('_active_company_marker', {
        id: companyId,
        name: companyName,
        fullData: company
      }, { silent: true });
      console.log('   4️⃣ Cache marker: ✅');

      console.log('');
      console.log('📡 BROADCASTING to ALL tabs & windows...');

      // ✅ Broadcast
      try {
        const channel = new BroadcastChannel('snishop_company_change');
        channel.postMessage({
          type: 'COMPANY_CHANGED',
          company: company,
          timestamp: Date.now()
        });
        channel.close();
        console.log('   ✅ BroadcastChannel sent');
      } catch (e) { }

      window.dispatchEvent(new CustomEvent('companyChanged', {
        detail: { company }
      }));
      console.log('   ✅ Window event dispatched');

      console.log('');
      console.log('🔄 RELOADING PAGE for consistency...');
      console.log('═══════════════════════════════════════════');

      // ✅ CALLBACK first
      if (onCompanyChange) {
        onCompanyChange(company);
      }

      toast.success(company ? `✅ Beralih ke ${company.name}` : '✅ Beralih ke Personal', {
        duration: 2000
      });

      // ✅ CRITICAL: Reload for consistent state
      setTimeout(() => {
        window.location.reload();
      }, 300);

    } catch (error) {
      console.error('❌ COMPANY SWITCH ERROR:', error);
      toast.error('Gagal beralih company');
    }
  }, [onCompanyChange, currentUser, selectedCompany]);

  const createCompany = async () => {
    if (!newCompanyForm.name.trim()) {
      toast.error('Nama company wajib diisi');
      return;
    }

    if (!canCreateCompany()) {
      toast.error('Anda sudah mencapai limit company');
      return;
    }

    try {
      setIsCreating(true);

      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('🏢 CREATING NEW COMPANY');
      console.log('═══════════════════════════════════════════');
      console.log('📋 Name:', newCompanyForm.name);
      console.log('👤 Owner:', currentUser.email);

      const newCompany = await base44.entities.Company.create({
        name: newCompanyForm.name,
        description: newCompanyForm.description,
        industry: newCompanyForm.industry,
        owner_id: currentUser.id,
        owner_email: currentUser.email,
        owner_subscription_plan: currentUser.subscription_plan,
        employee_count: 0
      });

      console.log('✅ Company created:', newCompany.id);

      // ✅ Create owner membership
      await base44.entities.CompanyMember.create({
        company_id: newCompany.id,
        user_email: currentUser.email,
        user_full_name: currentUser.full_name || currentUser.email,
        role: 'owner',
        status: 'active',
        permissions: {
          can_manage_members: true,
          can_manage_finance: true,
          can_manage_pos: true,
          can_view_reports: true,
          can_delete_company: true
        }
      });
      console.log('✅ Owner membership created');

      // ✅ CRITICAL: AUTO-CREATE DEFAULT WORKSPACE untuk company baru
      console.log('');
      console.log('📁 Creating default workspace for company...');

      try {
        await new Promise(r => setTimeout(r, 5000)); // Rate limit protection

        // ✅ STRICT: Check if ANY workspace exists for this company
        const existingWorkspaces = await base44.entities.Workspace.filter({
          company_id: newCompany.id
        });

        if (!existingWorkspaces || existingWorkspaces.length === 0) {
          await new Promise(r => setTimeout(r, 5000)); // Rate limit protection

          const defaultWorkspace = await base44.entities.Workspace.create({
            name: `${newCompany.name} - Workspace`,
            description: `Workspace utama untuk ${newCompany.name}`,
            company_id: newCompany.id,
            owner_id: currentUser.email,
            is_personal: false,
            icon: '🏢',
            color: '#3b82f6'
          });

          console.log('✅ DEFAULT WORKSPACE CREATED!');
          console.log('   - Name:', defaultWorkspace.name);
          console.log('   - ID:', defaultWorkspace.id);

          await new Promise(r => setTimeout(r, 5000)); // Rate limit protection

          // ✅ Create workspace membership for owner
          await base44.entities.WorkspaceMember.create({
            workspace_id: defaultWorkspace.id,
            user_id: currentUser.email,
            role: 'owner',
            permissions: {
              can_create_tasks: true,
              can_edit_tasks: true,
              can_delete_tasks: true,
              can_invite_members: true
            }
          });
          console.log('✅ Owner workspace membership created');
        } else {
          console.log('ℹ️ Workspace already exists - SKIP creation');
          console.log('   Found:', existingWorkspaces.length, 'workspace(s)');
        }
      } catch (wsError) {
        console.error('⚠️ Failed to create default workspace:', wsError);
      }

      console.log('═══════════════════════════════════════════');
      console.log('');

      toast.success(`✅ Company "${newCompany.name}" berhasil dibuat!`, {
        description: 'Workspace default sudah dibuat otomatis'
      });

      setShowCreateDialog(false);
      setNewCompanyForm({ name: '', description: '', industry: 'retail' });

      await loadCompanies();
      await handleCompanySelect(newCompany);

    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Gagal membuat company');
    } finally {
      setIsCreating(false);
    }
  };

  // ✅ FIXED: Stable check for company creation permission - ALWAYS TRUE for business+
  const canCreateCompany = useCallback(() => {
    if (!currentUser) return false;

    const plan = currentUser.subscription_plan || 'free';
    const trialPlan = currentUser.trial_plan;

    // ✅ CRITICAL FIX: Check if user has business+ plan
    const hasBusinessPlan = BUSINESS_PLANS.includes(plan) || BUSINESS_PLANS.includes(trialPlan);

    if (!hasBusinessPlan) {
      console.log('❌ No business plan - cannot create company');
      return false;
    }

    // ✅ Check limit
    const effectivePlan = BUSINESS_PLANS.includes(plan) ? plan : trialPlan;
    const limit = companyLimits[effectivePlan] || 0;

    const canCreate = myCompanies.length < limit;

    console.log('🔍 Can create company check:');
    console.log('   - Plan:', effectivePlan);
    console.log('   - Limit:', limit);
    console.log('   - Current:', myCompanies.length);
    console.log('   - Can create:', canCreate);

    return canCreate;
  }, [currentUser, myCompanies]);

  const getRoleLabel = (role) => {
    const labels = {
      owner: 'Owner',
      admin: 'Admin',
      supervisor: 'Supervisor',
      store_admin: 'Store Admin',
      stock_admin: 'Stock Admin',
      finance_admin: 'Finance',
      hr_admin: 'HR',
      transaction_admin: 'Transaksi',
      employee: 'Employee'
    };
    return labels[role] || role;
  };

  const allCompanies = [...myCompanies, ...memberCompanies];
  const hasAnyCompanyAccess = allCompanies.length > 0;

  // ✅ CRITICAL FIX: ALWAYS show Add Company button for business+ users
  const hasBusiness = BUSINESS_PLANS.includes(currentUser?.subscription_plan) ||
    BUSINESS_PLANS.includes(currentUser?.trial_plan);

  const showAddCompanyButton = hasBusiness && canCreateCompany();

  console.log('🔍 Render state:');
  console.log('   - Has business plan:', hasBusiness);
  console.log('   - Show Add button:', showAddCompanyButton);
  console.log('   - My companies:', myCompanies.length);
  console.log('   - Member companies:', memberCompanies.length);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 w-full sm:w-auto justify-between min-h-[44px]"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">
                {selectedCompany ? selectedCompany.name : 'Personal'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-72 bg-gray-800 border-gray-700 max-h-[500px] overflow-y-auto"
        >
          <div className="flex items-center justify-between px-2 py-1">
            <DropdownMenuLabel className="text-gray-300">Pilih Context</DropdownMenuLabel>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                console.log('🔄 Manual refresh triggered');
                toast.info('Memuat ulang daftar perusahaan...');
                loadCompanies();
              }}
              className="h-6 w-6 text-gray-400 hover:text-white"
              title="Refresh daftar perusahaan"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>

          <DropdownMenuItem
            onClick={() => handleCompanySelect(null)}
            className={`cursor-pointer ${!selectedCompany ? 'bg-blue-900/20' : ''} hover:bg-gray-700`}
          >
            <div className="flex items-center gap-2 w-full">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-white flex-1">Personal</span>
              {!selectedCompany && (
                <Badge className="bg-blue-600 text-xs">Active</Badge>
              )}
            </div>
          </DropdownMenuItem>

          {/* If there are any companies or it's loading, show the list structure */}
          {hasAnyCompanyAccess || isLoading ? (
            <>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuLabel className="text-gray-400 text-xs">
                Companies ({allCompanies.length})
              </DropdownMenuLabel>

              {isLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
                  <p className="text-xs text-gray-400 mt-2">Loading...</p>
                </div>
              ) : (
                <>
                  {/* ✅ OWNED COMPANIES */}
                  {myCompanies.length > 0 && (
                    <div className="py-1">
                      <div className="px-2 py-1">
                        <p className="text-xs text-gray-500">Owned by You</p>
                      </div>
                      {myCompanies.map((company) => (
                        <DropdownMenuItem
                          key={company.id}
                          onClick={() => handleCompanySelect(company)}
                          className={`cursor-pointer ${selectedCompany?.id === company.id ? 'bg-blue-900/20' : ''} hover:bg-gray-700`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Crown className="w-4 h-4 text-yellow-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm truncate">{company.name}</p>
                              <p className="text-xs text-gray-400">Owner</p>
                            </div>
                            {selectedCompany?.id === company.id && (
                              <Badge className="bg-blue-600 text-xs">Active</Badge>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}

                  {/* ✅ MEMBER COMPANIES */}
                  {memberCompanies.length > 0 && (
                    <div className="py-1">
                      <div className="px-2 py-1">
                        <p className="text-xs text-gray-500">Member of</p>
                      </div>
                      {memberCompanies.map((company) => (
                        <DropdownMenuItem
                          key={company.id}
                          onClick={() => handleCompanySelect(company)}
                          className={`cursor-pointer ${selectedCompany?.id === company.id ? 'bg-blue-900/20' : ''} hover:bg-gray-700`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Users className="w-4 h-4 text-purple-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm truncate">{company.name}</p>
                              <p className="text-xs text-gray-400">{getRoleLabel(company.memberRole)}</p>
                            </div>
                            {selectedCompany?.id === company.id && (
                              <Badge className="bg-blue-600 text-xs">Active</Badge>
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}

                  {/* If there are no companies, but we are NOT loading, and can create one */}
                  {allCompanies.length === 0 && !isLoading && canCreateCompany() && (
                    <div className="p-4 text-center">
                      <Building2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-400 mb-2">
                        Belum ada perusahaan
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowCreateDialog(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Buat Company
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* ✅ FIXED: Create New Company Button - ALWAYS VISIBLE for business+ users */}
              {showAddCompanyButton && (
                <>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <DropdownMenuItem
                    onClick={() => setShowCreateDialog(true)}
                    className="cursor-pointer hover:bg-gray-700 text-green-400"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Company Baru
                    <Badge className="ml-auto bg-green-600/20 text-green-400 text-xs">
                      {myCompanies.length}/{companyLimits[currentUser?.subscription_plan || currentUser?.trial_plan || 'free']}
                    </Badge>
                  </DropdownMenuItem>
                </>
              )}
            </>
          ) : (
            <>
              {/* ✅ If user has business+ but no companies yet - show create button */}
              {hasBusiness && showAddCompanyButton && (
                <>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <div className="p-3 text-center">
                    <Building2 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-2">
                      Belum ada company. Buat yang pertama!
                    </p>
                    <Button
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Buat Company
                    </Button>
                  </div>
                </>
              )}

              {/* If no business plan - show upgrade prompt */}
              {!hasBusiness && (
                <>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  <div className="p-3 text-center">
                    <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 mb-2">
                      Upgrade ke Business+ untuk membuat company
                    </p>
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => window.location.href = '/pricing'}
                    >
                      Upgrade Sekarang
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Buat Company Baru</DialogTitle>
            <DialogDescription className="text-gray-400">
              Buat company untuk mengelola tim dan project
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Nama Company *</Label>
              <Input
                value={newCompanyForm.name}
                onChange={(e) => setNewCompanyForm({ ...newCompanyForm, name: e.target.value })}
                placeholder="PT. Contoh Indonesia"
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Deskripsi</Label>
              <Textarea
                value={newCompanyForm.description}
                onChange={(e) => setNewCompanyForm({ ...newCompanyForm, description: e.target.value })}
                placeholder="Deskripsi singkat company..."
                className="bg-gray-800 border-gray-700 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-gray-300">Industry</Label>
              <Select
                value={newCompanyForm.industry}
                onValueChange={(value) => setNewCompanyForm({ ...newCompanyForm, industry: value })}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="food_beverage">Food & Beverage</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 p-3 rounded-lg">
              <p className="text-xs text-blue-300">
                💡 Anda dapat membuat maksimal {companyLimits[currentUser?.subscription_plan || currentUser?.trial_plan || 'free']} company dengan paket {currentUser?.subscription_plan || currentUser?.trial_plan || 'free'}
              </p>
              <p className="text-xs text-blue-300 mt-1">
                Saat ini: {myCompanies.length} / {companyLimits[currentUser?.subscription_plan || currentUser?.trial_plan || 'free']}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewCompanyForm({ name: '', description: '', industry: 'retail' });
                }}
                disabled={isCreating}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={createCompany}
                disabled={isCreating || !newCompanyForm.name.trim()}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isCreating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" /> Buat Company</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}