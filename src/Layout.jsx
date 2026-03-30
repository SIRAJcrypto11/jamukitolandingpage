import React, { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ErrorBoundary from '@/components/utils/ErrorBoundary';
import NetworkDetector from '@/components/utils/NetworkDetector';
import LoadingFallback from '@/components/utils/LoadingFallback';
import ServiceWorkerRegistration from '@/components/utils/ServiceWorkerRegistration';
import AuthRecovery from '@/components/utils/AuthRecovery';
import CorsDebugger from '@/components/utils/CorsDebugger';
import DeviceCompatibility from '@/components/utils/DeviceCompatibility';
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { CompanyMember } from "@/entities/CompanyMember";
import { Workspace } from "@/entities/Workspace";
import { WorkspaceMember } from "@/entities/WorkspaceMember";
import { Task } from "@/entities/Task";
import { Note } from "@/entities/Note";
import { ReferralCode } from "@/entities/ReferralCode";
import { withRetry } from '@/components/utils/apiHelpers';
import cleanupOrphanedCompanyReferences from '@/components/utils/dataCleanup';
import { safeGetCompany, safeFilterCompanies } from '@/components/utils/safeCompanyLoader';
import { cachedRequest, invalidateCache } from '@/components/utils/requestManager';
import InvitationHandler from './components/company/InvitationHandler';
import CompanySwitcher from './components/erp/CompanySwitcher';
import LowStockNotifier from './components/inventory/LowStockNotifier';
import SubscriptionSync from './components/layout/SubscriptionSync';
import MembershipExpiryChecker from './components/layout/MembershipExpiryChecker';
import MembershipBanner from './components/layout/MembershipBanner';
import ExpiryNotificationModal from './components/layout/ExpiryNotificationModal';
import ShoppingCartIcon from './components/layout/ShoppingCartIcon';
import {
  LayoutDashboard,
  CheckSquare,
  FileText,
  Users,
  Settings,
  Crown,
  User as UserIcon,
  LogOut,
  BarChart2,
  Sparkles,
  Clock,
  Shield,
  Wallet,
  Star,
  Search,
  X,
  Loader2,
  ShoppingCart,
  Briefcase,
  Gift,
  Newspaper,
  Package,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Store,
  Receipt,
  Users2,
  TrendingUp,
  Calculator,
  Target,
  FolderKanban,
  Mail,
  MessageSquare,
  Calendar,
  Boxes,
  DollarSign,
  Goal,
  Building2,
  Factory,
  ClipboardList,
  Truck,
  Award,
  GraduationCap,
  FileCheck,
  Zap,
  Sun,
  Moon,
  Smartphone } from

"lucide-react";
import { base44 } from '@/api/base44Client';
import {
  Button } from

"@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from

"@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "./components/layout/NotificationBell";
import TaskNotificationChecker from "./components/layout/TaskNotificationChecker";
import AddonPurchaseModal from "./components/pricing/AddonPurchaseModal";
import ReferralCodeModal from "./components/referral/ReferralCodeModal";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const subscriptionNames = {
  free: "Gratis",
  pro: "Pro",
  business: "Business",
  advanced: "Advanced",
  enterprise: "Enterprise"
};

const storageLimits = {
  free: 100,
  pro: 1000,
  business: 5000,
  advanced: 15000,
  enterprise: 20000
};

const companyLimits = {
  free: 0,
  pro: 0,
  business: 3,
  advanced: 10,
  enterprise: 20
};

const trialInfo = {
  free: { name: 'Pro', duration: 7 },
  pro: { name: 'Advanced', duration: 14 },
  business: { name: 'Enterprise', duration: 7 },
  advanced: { name: 'Enterprise', duration: 30 },
  enterprise: { name: 'Enterprise', duration: 14 }
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
};

const publicPagesList = ["Home", "Pricing"];

const warmUpCache = async (currentUser) => {
  if (!currentUser) return;
  try {
    await cachedRequest('WorkspaceMember', 'filter', { user_id: currentUser.email });
    await new Promise((r) => setTimeout(r, 1000));
    await cachedRequest('CompanyMember', 'filter', { user_email: currentUser.email, status: 'active' });
    await new Promise((r) => setTimeout(r, 1000));
    await cachedRequest('Task', 'filter', { created_by: currentUser.email, status: { '$ne': 'done' } });
  } catch (error) {
    console.warn("Cache warm-up failed:", error);
  }
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('SNISHOP_THEME') || "dark";
  });
  const [showAttendanceLink, setShowAttendanceLink] = useState(false);
  const [eligibleTrial, setEligibleTrial] = useState(null);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [showReferralPopup, setShowReferralPopup] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const sidebarRef = useRef(null);
  const hamburgerRef = useRef(null);
  const justToggledRef = useRef(null);

  const clickOutsideTimerRef = useRef(null);

  const [expandedMenus, setExpandedMenus] = useState({
    administration: false,
    shop: false,
    finance: false,
    erp: false,
    pos_group: false,
    sales_group: false,
    hr_group: false,
    operations_group: false,
    comm_group: false,
    analytics_group: false
  });

  const [menuSettings, setMenuSettings] = useState([]);

  const [selectedCompany, setSelectedCompany] = useState(() => {
    // ✅ CRITICAL: Load from localStorage IMMEDIATELY for instant state
    const storedCompanyId = localStorage.getItem('SNISHOP_ACTIVE_COMPANY_ID');
    const storedCompanyName = localStorage.getItem('SNISHOP_ACTIVE_COMPANY_NAME');
    const storedCompanyData = localStorage.getItem('SNISHOP_ACTIVE_COMPANY_FULL');

    console.log('🔍 INIT: Company state initialization');
    console.log('   - Stored ID:', storedCompanyId);
    console.log('   - Stored Name:', storedCompanyName);

    if (storedCompanyId && storedCompanyName) {
      console.log('✅ PERSISTENT: Restoring company:', storedCompanyName);

      // Try to use full company data if available
      if (storedCompanyData) {
        try {
          const fullData = JSON.parse(storedCompanyData);
          console.log('✅ PERSISTENT: Full company data restored');
          return fullData;
        } catch (e) {
          console.warn('⚠️ Failed to parse full company data');
        }
      }

      // Fallback to placeholder
      console.log('⚙️ PERSISTENT: Using placeholder while loading full data');
      return {
        id: storedCompanyId,
        name: storedCompanyName,
        _isPlaceholder: true
      };
    }

    console.log('ℹ️ PERSISTENT: No stored company - Starting in Personal mode');
    return null;
  });

  const hasInitializedRef = useRef(false);



  const isPublicPage = useMemo(() => publicPagesList.includes(currentPageName), [currentPageName]);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('SNISHOP_THEME', newTheme);
      document.documentElement.className = newTheme;
      toast.success(`Tema ${newTheme === 'dark' ? 'Gelap' : 'Terang'} diaktifkan`, {
        duration: 2000
      });
      return newTheme;
    });
  }, []);

  useEffect(() => {
    document.documentElement.className = theme;
    document.body.className = theme;
  }, [theme]);

  const loadMenuSettings = async () => {
    try {
      const settings = await cachedRequest('MenuSettings', 'filter', { is_active: true });
      setMenuSettings(settings || []);
    } catch (error) {
      setMenuSettings([]);
    }
  };

  useEffect(() => {
    if (user) {
      setTimeout(() => loadMenuSettings(), 500);
    }
  }, [user]);

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const checkAttendancePermission = useCallback(async (currentUser) => {
    if (!currentUser) return;
    try {
      const memberOf = await cachedRequest('WorkspaceMember', 'filter', { user_id: currentUser.email });
      if (!memberOf || memberOf.length === 0) {
        setShowAttendanceLink(false);
        return;
      }

      const workspaceIds = memberOf.map((m) => m.workspace_id).filter(Boolean);
      const uniqueWorkspaceIds = [...new Set(workspaceIds)];

      const workspaces = [];
      for (const wsId of uniqueWorkspaceIds) {
        try {
          const ws = await cachedRequest('Workspace', 'get', { id: wsId });
          if (ws) workspaces.push(ws);
          await new Promise((r) => setTimeout(r, 500));
        } catch (err) {}
      }

      if (workspaces.length === 0) {
        setShowAttendanceLink(false);
        return;
      }

      const ownerEmails = [...new Set(workspaces.map((w) => w.owner_id).filter(Boolean))];
      if (ownerEmails.length === 0) {
        setShowAttendanceLink(false);
        return;
      }

      const owners = await cachedRequest('User', 'filter', { email: { '$in': ownerEmails } });
      const hasPremiumOwner = (owners || []).some((owner) =>
      owner && (owner.subscription_plan === 'advanced' || owner.subscription_plan === 'business' || owner.subscription_plan === 'enterprise')
      );

      setShowAttendanceLink(hasPremiumOwner);
    } catch (e) {
      setShowAttendanceLink(false);
    }
  }, []);

  const loadUserAndPermissions = useCallback(async () => {
    const MAX_RETRIES = 5; // ✅ Increased to 5 retries
    let retryCount = 0;

    const attemptLoad = async () => {
      try {
        // ✅ CRITICAL: Test storage availability first
        try {
          const testKey = '__auth_test__';
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);
        } catch (storageError) {
          console.error('❌ Storage blocked:', storageError);
          toast.error('Browser Anda memblokir penyimpanan. Nonaktifkan mode incognito/private.');
          return;
        }

        // ✅ PERSISTENT AUTH - Check localStorage first (survives page reload)
        const persistentUserData = localStorage.getItem('SNISHOP_USER_AUTH');
        if (persistentUserData) {
          try {
            const { user: persistentUser, cachedAt } = JSON.parse(persistentUserData);
            const cacheAge = Date.now() - cachedAt;

            // ✅ Extended cache - 24 hours instead of 5 minutes
            if (cacheAge < 86400000 && persistentUser) {
              console.log('✅ AUTH: Using persistent cache (age:', Math.floor(cacheAge / 1000 / 60), 'minutes)');
              setUser(persistentUser);

              // ✅ Refresh in background (non-blocking)
              setTimeout(() => {
                User.me().then((freshUser) => {
                  if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(persistentUser)) {
                    setUser(freshUser);
                    localStorage.setItem('SNISHOP_USER_AUTH', JSON.stringify({
                      user: freshUser,
                      cachedAt: Date.now()
                    }));
                  }
                }).catch(() => {});
              }, 2000);

              // ✅ AUTO-REGISTER as customer to default company (IMMEDIATE)
              setTimeout(async () => {
                try {
                  const DEFAULT_COMPANY_ID = '694cc38feacdffcc010f0d60';
                  const existingMember = await base44.entities.CompanyMember.filter({
                    company_id: DEFAULT_COMPANY_ID,
                    user_email: cachedUser.email
                  });

                  if (!existingMember || existingMember.length === 0) {
                    await base44.entities.CompanyMember.create({
                      company_id: DEFAULT_COMPANY_ID,
                      user_email: cachedUser.email,
                      user_name: cachedUser.full_name || cachedUser.email,
                      user_id: cachedUser.id,
                      role: 'customer',
                      status: 'active',
                      permissions: {}
                    });
                    console.log('✅ Auto-registered as customer to JAMU KITO');
                  }
                } catch (e) {
                  console.warn('Auto-register customer failed:', e);
                }
              }, 1000);

              setTimeout(() => {
                User.me().then(async (freshUser) => {
                  if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(cachedUser)) {
                    let processedFreshUser = { ...freshUser };

                    if (processedFreshUser.membership_end_date && processedFreshUser.membership_duration_type !== 'lifetime') {
                      const endDate = new Date(processedFreshUser.membership_end_date);
                      const now = new Date();

                      if (now > endDate) {
                        await User.update(processedFreshUser.id, {
                          subscription_plan: 'free',
                          membership_duration_type: null,
                          membership_start_date: null,
                          membership_end_date: null,
                          admin_tier: 'none'
                        });
                        processedFreshUser = {
                          ...processedFreshUser,
                          subscription_plan: 'free',
                          membership_duration_type: null,
                          membership_start_date: null,
                          membership_end_date: null,
                          admin_tier: 'none'
                        };
                      }
                    }

                    if (!processedFreshUser.referral_code) {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                      let code = '';
                      for (let i = 0; i < 8; i++) {
                        code += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      User.update(processedFreshUser.id, { referral_code: code }).catch(() => {});
                      try {
                        await ReferralCode.create({
                          code,
                          user_id: processedFreshUser.id,
                          user_email: processedFreshUser.email,
                          user_name: processedFreshUser.full_name || processedFreshUser.email,
                          is_active: true
                        });
                      } catch (e) {}
                      processedFreshUser.referral_code = code;
                    }

                    const now = new Date();
                    if (processedFreshUser.ai_usage_period_start) {
                      const periodStartDate = new Date(processedFreshUser.ai_usage_period_start);
                      if (differenceInDays(now, periodStartDate) >= 30) {
                        User.update(processedFreshUser.id, {
                          ai_monthly_usage: 0,
                          ai_usage_period_start: now.toISOString().split('T')[0]
                        }).catch(() => {});
                        processedFreshUser.ai_monthly_usage = 0;
                      }
                    }

                    setUser(processedFreshUser);
                    sessionStorage.setItem('TODOIT_USER_CACHE', JSON.stringify({
                      user: processedFreshUser,
                      cachedAt: Date.now()
                    }));

                    checkAttendancePermission(processedFreshUser);
                  }
                }).catch(() => {});
              }, 2000);

              return;
            }
          } catch (e) {
            console.warn('Failed to parse persistent auth cache:', e);
          }
        }

        // ✅ FALLBACK: Try sessionStorage
        const cachedUserData = sessionStorage.getItem('TODOIT_USER_CACHE');
        if (cachedUserData) {
          try {
            const { user: cachedUser, cachedAt } = JSON.parse(cachedUserData);
            const cacheAge = Date.now() - cachedAt;

            if (cacheAge < 300000 && cachedUser) {
              console.log('✅ AUTH: Using session cache');
              setUser(cachedUser);

              setTimeout(() => {
                User.me().then((freshUser) => {
                  if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(cachedUser)) {
                    setUser(freshUser);
                    localStorage.setItem('SNISHOP_USER_AUTH', JSON.stringify({
                      user: freshUser,
                      cachedAt: Date.now()
                    }));
                    sessionStorage.setItem('TODOIT_USER_CACHE', JSON.stringify({
                      user: freshUser,
                      cachedAt: Date.now()
                    }));
                  }
                }).catch(() => {});
              }, 2000);

              return;
            }
          } catch (e) {}
        }

        console.log('✅ AUTH: Fetching fresh user data...');
        let userData;

        try {
          userData = await User.me();
        } catch (fetchError) {
          console.error('❌ User.me() failed:', fetchError);

          // ✅ CRITICAL: Don't immediately fail - try emergency recovery
          const emergencyCache = localStorage.getItem('SNISHOP_USER_AUTH');
          if (emergencyCache) {
            try {
              const { user: emergencyUser } = JSON.parse(emergencyCache);
              if (emergencyUser) {
                console.log('🆘 EMERGENCY: Using cached user data');
                setUser(emergencyUser);

                toast.warning('Mode terbatas: Menggunakan data tersimpan', {
                  description: 'Beberapa fitur mungkin tidak tersedia',
                  duration: 5000
                });
                return;
              }
            } catch (e) {}
          }

          throw fetchError; // Re-throw to trigger retry mechanism
        }

        if (!userData) {
          console.log('⚠️ AUTH: No user data returned');
          setUser(null);
          return;
        }

        // ✅ AUTO-REGISTER as customer to default company (IMMEDIATE)
        setTimeout(async () => {
          try {
            const DEFAULT_COMPANY_ID = '694cc38feacdffcc010f0d60';
            const existingMember = await base44.entities.CompanyMember.filter({
              company_id: DEFAULT_COMPANY_ID,
              user_email: userData.email
            });

            if (!existingMember || existingMember.length === 0) {
              await base44.entities.CompanyMember.create({
                company_id: DEFAULT_COMPANY_ID,
                user_email: userData.email,
                user_name: userData.full_name || userData.email,
                user_id: userData.id,
                role: 'customer',
                status: 'active',
                permissions: {}
              });
              console.log('✅ Auto-registered as customer to JAMU KITO');
            }
          } catch (e) {
            console.warn('Auto-register customer failed:', e);
          }
        }, 1000);

        if (userData.membership_end_date && userData.membership_duration_type !== 'lifetime') {
          const endDate = new Date(userData.membership_end_date);
          const now = new Date();

          if (now > endDate) {
            await User.update(userData.id, {
              subscription_plan: 'free',
              membership_duration_type: null,
              membership_start_date: null,
              membership_end_date: null,
              admin_tier: 'none'
            });

            userData = {
              ...userData,
              subscription_plan: 'free',
              membership_duration_type: null,
              membership_start_date: null,
              membership_end_date: null,
              admin_tier: 'none'
            };
          }
        }

        if (!userData.referral_code) {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let code = '';
          for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }

          User.update(userData.id, { referral_code: code }).catch(() => {});

          try {
            await ReferralCode.create({
              code,
              user_id: userData.id,
              user_email: userData.email,
              user_name: userData.full_name || userData.email,
              is_active: true
            });
          } catch (e) {}

          userData.referral_code = code;
        }

        const now = new Date();
        if (userData.ai_usage_period_start) {
          const periodStartDate = new Date(userData.ai_usage_period_start);
          if (differenceInDays(now, periodStartDate) >= 30) {
            User.update(userData.id, {
              ai_monthly_usage: 0,
              ai_usage_period_start: now.toISOString().split('T')[0]
            }).catch(() => {});
            userData.ai_monthly_usage = 0;
          }
        } else {
          User.update(userData.id, {
            ai_usage_period_start: now.toISOString().split('T')[0]
          }).catch(() => {});
          userData.ai_usage_period_start = now.toISOString().split('T')[0];
        }

        setUser(userData);

        // ✅ DUAL CACHE - Both localStorage (persistent) and sessionStorage (fast)
        const authCache = JSON.stringify({
          user: userData,
          cachedAt: Date.now()
        });

        localStorage.setItem('SNISHOP_USER_AUTH', authCache);
        sessionStorage.setItem('TODOIT_USER_CACHE', authCache);

        const createdDate = userData.created_date ? new Date(userData.created_date) : null;
        const isNewUser = createdDate && now - createdDate < 7 * 24 * 60 * 60 * 1000;
        if (isNewUser && !userData.referred_by && !userData.preferences?.referral_modal_dismissed) {
          setTimeout(() => setShowReferralPopup(true), 5000);
        }

      } catch (error) {
        console.error("❌ Auth error:", error);

        // ✅ ENHANCED RETRY MECHANISM - More aggressive retries
        const isNetworkError =
        error.message?.includes('network') ||
        error.message?.includes('fetch') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.name === 'NetworkError' ||
        error.name === 'TypeError';

        if (retryCount < MAX_RETRIES && isNetworkError) {
          retryCount++;
          const delayMs = Math.min(1000 * Math.pow(2, retryCount - 1), 5000); // Exponential backoff: 1s, 2s, 4s, 5s, 5s
          console.log(`⚠️ AUTH: Network error detected - Retry ${retryCount}/${MAX_RETRIES} in ${delayMs}ms...`);

          toast.error(`Koneksi bermasalah, mencoba lagi... (${retryCount}/${MAX_RETRIES})`, {
            duration: 2000
          });

          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return attemptLoad();
        }

        // ✅ FALLBACK: If all retries failed, try to use any cached data
        const emergencyCachedUser = localStorage.getItem('SNISHOP_USER_AUTH') || sessionStorage.getItem('TODOIT_USER_CACHE');
        if (emergencyCachedUser && retryCount >= MAX_RETRIES) {
          try {
            const { user: cachedUser } = JSON.parse(emergencyCachedUser);
            if (cachedUser) {
              console.log('⚠️ AUTH: Using emergency cache after max retries');
              setUser(cachedUser);
              toast.warning('Mode offline: Menggunakan data tersimpan', {
                duration: 5000
              });
              return;
            }
          } catch (e) {}
        }

        console.error('❌ AUTH: All recovery attempts failed');
        setUser(null);
      }
    };

    return attemptLoad();
  }, [checkAttendancePermission]);

  const handleCompanyChange = useCallback(async (company) => {
    try {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('🔄 COMPANY CHANGE');
      console.log('   FROM:', selectedCompany?.name || 'Personal');
      console.log('   TO:', company?.name || 'Personal');
      console.log('═══════════════════════════════════════════');

      // ✅ CRITICAL: Update state IMMEDIATELY
      setSelectedCompany(company);

      if (company) {
        // ✅ TRIPLE PERSIST - localStorage + sessionStorage + memory
        localStorage.setItem('SNISHOP_ACTIVE_COMPANY_ID', company.id);
        localStorage.setItem('SNISHOP_ACTIVE_COMPANY_NAME', company.name);
        localStorage.setItem('SNISHOP_ACTIVE_COMPANY_FULL', JSON.stringify(company));
        sessionStorage.setItem('SNISHOP_ACTIVE_COMPANY_ID', company.id);
        sessionStorage.setItem('SNISHOP_ACTIVE_COMPANY_FULL', JSON.stringify(company));
        console.log('💾 PERSISTENT: Company saved (triple)');
      } else {
        localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_ID');
        localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_NAME');
        localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_FULL');
        sessionStorage.removeItem('SNISHOP_ACTIVE_COMPANY_ID');
        sessionStorage.removeItem('SNISHOP_ACTIVE_COMPANY_FULL');
        console.log('🗑️ PERSISTENT: Cleared to Personal');
      }

      if (user) {
        const updatedUser = {
          ...user,
          active_company_id: company ? company.id : null
        };
        setUser(updatedUser);

        sessionStorage.setItem('TODOIT_USER_CACHE', JSON.stringify({
          user: updatedUser,
          cachedAt: Date.now()
        }));
      }

      // ✅ Broadcast to ALL tabs
      try {
        const channel = new BroadcastChannel('snishop_company_change');
        channel.postMessage({
          type: 'COMPANY_CHANGED',
          company: company,
          timestamp: Date.now()
        });
        channel.close();
      } catch (e) {}

      // ✅ CRITICAL: Clear ALL cache for fresh data load
      globalCache.invalidate('*');

      // ✅ Reload page for consistent state
      setTimeout(() => {
        window.location.reload();
      }, 100);

      console.log('═══════════════════════════════════════════');

    } catch (error) {
      console.error('Error changing company:', error);
    }
  }, [user, selectedCompany]);

  const loadActiveCompany = useCallback(async () => {
    if (!user) {
      console.log('⚠️ loadActiveCompany: No user yet');
      return;
    }

    try {
      const storedCompanyId = localStorage.getItem('SNISHOP_ACTIVE_COMPANY_ID');
      const storedCompanyName = localStorage.getItem('SNISHOP_ACTIVE_COMPANY_NAME');
      const storedCompanyFull = localStorage.getItem('SNISHOP_ACTIVE_COMPANY_FULL');

      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('🔍 LOAD ACTIVE COMPANY - CHECKING STATE');
      console.log('═══════════════════════════════════════════');
      console.log('📦 localStorage ID:', storedCompanyId);
      console.log('📦 localStorage Name:', storedCompanyName);
      console.log('📦 Has Full Data:', !!storedCompanyFull);
      console.log('🎯 Current selectedCompany:', selectedCompany?.name || 'null');
      console.log('🔖 Is Placeholder:', selectedCompany?._isPlaceholder);
      console.log('');

      // ✅ ULTRA CRITICAL FIX: Company is LOCKED once loaded, NEVER auto-switch to Personal
      if (selectedCompany && !selectedCompany._isPlaceholder) {
        console.log('🔒 LOCKED: Company already loaded - NEVER auto-switch');
        console.log('   Current:', selectedCompany.name);
        console.log('   Stored:', storedCompanyName);

        // ✅ CRITICAL: Company LOCKED - Never auto-switch
        console.log('🔒 LOCKED: Company already set - NO AUTO SWITCH');
        console.log('   Current:', selectedCompany.name);
        console.log('   Stored:', storedCompanyName);
        console.log('═══════════════════════════════════════════');
        return;
      }

      // ✅ If placeholder, upgrade to full data
      if (selectedCompany?._isPlaceholder && storedCompanyId === selectedCompany.id) {
        console.log('📥 PERSISTENT: Upgrading placeholder to full data...');

        if (storedCompanyFull) {
          try {
            const cachedCompany = JSON.parse(storedCompanyFull);
            setSelectedCompany(cachedCompany);
            console.log('✅ PERSISTENT: Full company restored from cache');
            console.log('═══════════════════════════════════════════');
            return;
          } catch (e) {
            console.warn('⚠️ Failed to parse cached company');
          }
        }

        // Fetch from server
        try {
          const fullCompany = await Company.get(storedCompanyId);
          if (fullCompany) {
            setSelectedCompany(fullCompany);
            localStorage.setItem('SNISHOP_ACTIVE_COMPANY_FULL', JSON.stringify(fullCompany));
            console.log('✅ PERSISTENT: Full company loaded from server');
            console.log('═══════════════════════════════════════════');
            return;
          }
        } catch (e) {
          console.warn('⚠️ PERSISTENT: Server load failed, keeping placeholder');
          console.log('═══════════════════════════════════════════');
          return;
        }
      }

      // ✅ RESTORE from storage if nothing selected
      if (!selectedCompany && storedCompanyId && storedCompanyName) {
        console.log('🔄 PERSISTENT: No company selected - RESTORING FROM STORAGE');
        console.log('   - ID:', storedCompanyId);
        console.log('   - Name:', storedCompanyName);

        // First try cached full data
        if (storedCompanyFull) {
          try {
            const cachedCompany = JSON.parse(storedCompanyFull);
            setSelectedCompany(cachedCompany);
            console.log('✅ PERSISTENT: Company restored from full cache:', cachedCompany.name);
            console.log('═══════════════════════════════════════════');
            return;
          } catch (e) {
            console.warn('⚠️ Failed to parse full cache');
          }
        }

        // Use placeholder while loading
        console.log('⏳ PERSISTENT: Setting placeholder...');
        setSelectedCompany({
          id: storedCompanyId,
          name: storedCompanyName,
          _isPlaceholder: true
        });

        // Load full data in background
        setTimeout(async () => {
          try {
            const company = await Company.get(storedCompanyId);
            if (company) {
              setSelectedCompany(company);
              localStorage.setItem('SNISHOP_ACTIVE_COMPANY_FULL', JSON.stringify(company));
              console.log('✅ PERSISTENT: Full company loaded from server:', company.name);
            }
          } catch (error) {
            console.warn('⚠️ PERSISTENT: Server load failed - keeping placeholder');
          }
        }, 100);

        console.log('═══════════════════════════════════════════');
        return;
      }

      // ✅ If no storage, stay in Personal
      if (!storedCompanyId) {
        console.log('ℹ️ PERSISTENT: No stored company - Personal mode confirmed');
        console.log('═══════════════════════════════════════════');
        setSelectedCompany(null);
      }

    } catch (error) {
      console.error('❌ Error in loadActiveCompany:', error);
      console.log('═══════════════════════════════════════════');
    }
  }, [user, selectedCompany]);

  // ✅ LISTEN to BroadcastChannel for cross-tab sync
  useEffect(() => {
    const channel = new BroadcastChannel('snishop_company_change');

    channel.onmessage = (event) => {
      const { type, company, timestamp } = event.data;

      if (type === 'COMPANY_CHANGED') {
        console.log('📡 BroadcastChannel: Company changed in another tab');
        console.log('   - Company:', company?.name || 'Personal');

        // ✅ Update state without triggering reload
        setSelectedCompany(company);

        if (company) {
          localStorage.setItem('SNISHOP_ACTIVE_COMPANY_ID', company.id);
          localStorage.setItem('SNISHOP_ACTIVE_COMPANY_NAME', company.name);
          localStorage.setItem('SNISHOP_ACTIVE_COMPANY_FULL', JSON.stringify(company));
        } else {
          localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_ID');
          localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_NAME');
          localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_FULL');
        }
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // ✅ CRITICAL: Only run ONCE when user loads
  const companyLoadedRef = useRef(false);

  useEffect(() => {
    console.log('🔄 Company load trigger check');
    console.log('   - Has user:', !!user);
    console.log('   - Already loaded:', companyLoadedRef.current);
    console.log('   - Selected company:', selectedCompany?.name || 'None');
    console.log('   - localStorage ID:', localStorage.getItem('SNISHOP_ACTIVE_COMPANY_ID'));

    if (user && !companyLoadedRef.current) {
      companyLoadedRef.current = true;
      loadActiveCompany();
    } else if (!user) {
      console.log('⚠️ No user - clearing company selection');
      companyLoadedRef.current = false;
      setSelectedCompany(null);
    }
  }, [user, loadActiveCompany]);

  useEffect(() => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('🔄 LAYOUT MOUNT/UPDATE');
    console.log('   - Is Public Page:', isPublicPage);
    console.log('   - Has Initialized:', hasInitializedRef.current);
    console.log('   - Selected Company:', selectedCompany?.name || 'Personal');
    console.log('═══════════════════════════════════════════');

    if (!isPublicPage && !hasInitializedRef.current) {
      hasInitializedRef.current = true;

      // ✅ CRITICAL: Wrap in error handler to prevent infinite loops
      try {
        loadUserAndPermissions();
      } catch (error) {
        console.error('❌ Failed to load user:', error);
        toast.error('Gagal memuat data pengguna. Silakan refresh halaman.');
      }
    } else if (isPublicPage) {
      setUser(null);
    }
  }, [isPublicPage, loadUserAndPermissions]);

  // ✅ AUTO-RECOVERY: Detect when user is stuck in auth loop
  useEffect(() => {
    const authCheckInterval = setInterval(() => {
      const currentPath = window.location.pathname;
      const isLoginPage = currentPath.includes('login') || currentPath.includes('auth');

      // If user data exists in cache but UI shows not logged in
      const cachedAuth = localStorage.getItem('SNISHOP_USER_AUTH');
      if (cachedAuth && !user && !isLoginPage && !isPublicPage) {
        console.log('⚠️ AUTH RECOVERY: User data exists but not loaded - attempting recovery...');

        try {
          const { user: cachedUser, cachedAt } = JSON.parse(cachedAuth);
          const cacheAge = Date.now() - cachedAt;

          // If cache is less than 24 hours old, use it
          if (cacheAge < 86400000 && cachedUser) {
            console.log('✅ AUTH RECOVERY: Restoring user from cache');
            setUser(cachedUser);
          }
        } catch (e) {
          console.error('❌ AUTH RECOVERY: Failed to parse cache');
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(authCheckInterval);
  }, [user, isPublicPage]);



  useEffect(() => {
    if (user && user.preferences) {
      if (user.preferences.primary_color) {
        document.documentElement.style.setProperty('--primary', user.preferences.primary_color);
      } else {
        document.documentElement.style.removeProperty('--primary');
      }

      if (!user.trial_plan) {
        const currentPlan = user.subscription_plan || 'free';
        const nextTrial = trialInfo[currentPlan];

        if (nextTrial && !user.trial_used?.[nextTrial.name.toLowerCase()]) {
          setEligibleTrial(nextTrial);
        } else {
          setEligibleTrial(null);
        }
      } else {
        setEligibleTrial(null);
      }
    }
  }, [user]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      const wasMobile = isMobile;

      setIsMobile(mobile);

      if (wasMobile !== mobile) {
        if (mobile) {
          setIsSidebarOpen(false);
        } else {
          setIsSidebarOpen(true);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      if (clickOutsideTimerRef.current) {
        clearTimeout(clickOutsideTimerRef.current);
      }
      return;
    }

    if (!isSidebarOpen) {
      if (clickOutsideTimerRef.current) {
        clearTimeout(clickOutsideTimerRef.current);
      }
      return;
    }

    const handleClickOutside = (event) => {
      if (justToggledRef.current) return;
      if (sidebarRef.current && sidebarRef.current.contains(event.target)) return;
      if (hamburgerRef.current && hamburgerRef.current.contains(event.target)) return;
      const isTriggerButton = event.target.closest('[data-sidebar-trigger]');
      if (isTriggerButton) return;

      setIsSidebarOpen(false);
    };

    clickOutsideTimerRef.current = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }, 1500);

    return () => {
      if (clickOutsideTimerRef.current) {
        clearTimeout(clickOutsideTimerRef.current);
      }
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSidebarOpen, isMobile]);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
        setSearchResults([]);
        setIsSearchLoading(false);
        return;
      }
      setIsSearchLoading(true);
      try {
        const [tasks, notes, workspaces] = await Promise.all([
        cachedRequest('Task', 'filter', { title: { '$ilike': `%${debouncedSearchQuery}%` } }),
        cachedRequest('Note', 'filter', { title: { '$ilike': `%${debouncedSearchQuery}%` } }),
        cachedRequest('Workspace', 'filter', { name: { '$ilike': `%${debouncedSearchQuery}%` } })]);

        setSearchResults([
        ...(tasks || []).map((t) => ({ ...t, type: 'Tugas', path: createPageUrl("Tasks", t.id) })),
        ...(notes || []).map((n) => ({ ...n, type: 'Catatan', path: createPageUrl("Notes", n.id) })),
        ...(workspaces || []).map((w) => ({ ...w, type: 'Workspace', path: createPageUrl("Workspaces", w.id) }))]);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearchLoading(false);
      }
    };

    if (debouncedSearchQuery) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery]);

  const handleItemClick = useCallback((item) => {
    if (!item) return;

    const typeToPageNameMap = {
      'Tugas': 'Tasks',
      'Catatan': 'Notes',
      'Workspace': 'Workspaces'
    };

    const targetPageName = typeToPageNameMap[item.type] || item.type;

    if (item.path && item.path.startsWith('http')) {
      window.open(item.path, '_blank');
    } else {
      window.location.href = item.path || createPageUrl(targetPageName);
    }
    closeSidebar();
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [closeSidebar]);

  const handleLogout = async () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('TODOIT_USER_CACHE');
      localStorage.removeItem('TODOIT_DATA_CACHE');
      localStorage.removeItem('SNISHOP_USER_AUTH'); // ✅ Clear persistent auth
      localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_ID');
      localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_NAME');
      localStorage.removeItem('SNISHOP_ACTIVE_COMPANY_FULL');
      await User.logout();
    } catch (e) {}
    window.location.href = '/';
  };

  const toggleMenu = (menuKey) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  const isMenuVisible = useCallback((menuId) => {
    if (!user || !menuSettings || menuSettings.length === 0) return true;
    const setting = menuSettings.find((m) => m && m.menu_id === menuId);
    if (!setting) return true;

    const plan = user.subscription_plan || 'free';
    const isAdmin = user.role === 'admin';

    if (isAdmin && setting.is_visible_admin) return true;

    switch (plan) {
      case 'free':return setting.is_visible_free;
      case 'pro':return setting.is_visible_pro;
      case 'business':return setting.is_visible_business;
      case 'advanced':return setting.is_visible_advanced;
      case 'enterprise':return setting.is_visible_enterprise;
      default:return true;
    }
  }, [user, menuSettings]);

  const hasCompanyAccess = useCallback(() => {
    if (!user) return false;
    const plan = user.subscription_plan || 'free';
    const trialPlan = user.trial_plan;
    const allowedPlans = ['business', 'advanced', 'enterprise'];
    return allowedPlans.includes(plan) || allowedPlans.includes(trialPlan);
  }, [user]);

  const menuStructure = useMemo(() => {
    const adminAppMenus = [];

    if (user && user.role === 'admin' && user.admin_type === 'owner') {
      adminAppMenus.push({
        id: 'admin_pos',
        title: "POS Admin",
        url: createPageUrl("POS"),
        icon: CreditCard,
        type: 'single',
        badge: 'ADMIN'
      });
    }

    const menus = [
    {
      id: 'dashboard',
      title: "Dashboard",
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
      type: 'single'
    },

    {
      id: 'administration',
      title: selectedCompany ? "Administrasi Tim" : "Administrasi Bisnis",
      icon: Briefcase,
      type: 'group',
      badge: !selectedCompany ? 'Personal' : 'Bisnis',
      badgeColor: !selectedCompany ? 'bg-blue-600' : 'bg-green-600',
      children: [
      { id: 'tasks', title: "Tugas", url: createPageUrl("Tasks"), icon: CheckSquare },
      { id: 'notes', title: "Catatan", url: createPageUrl("Notes"), icon: FileText },
      { id: 'workspaces', title: "Workspace", url: createPageUrl("Workspaces"), icon: Users },
      ...(showAttendanceLink ? [{
        id: 'attendance',
        title: "Absensi",
        url: createPageUrl("Attendance"),
        icon: Clock,
        isPremium: true
      }] : [])]

    },

    ...adminAppMenus,

    {
      id: 'finance',
      title: "Keuangan",
      icon: TrendingUp,
      type: 'group',
      badge: selectedCompany ? 'Bisnis' : 'Personal',
      badgeColor: selectedCompany ? 'bg-green-600' : 'bg-blue-600',
      children: [
      { id: 'finance_recording', title: "Pencatatan", url: createPageUrl("Finance"), icon: Receipt },
      { id: 'finance_report', title: "Laporan", url: createPageUrl("Analytics"), icon: BarChart2 },
      { id: 'hpp', title: "HPP Calculator", url: createPageUrl("HPP"), badge: 'NEW', icon: Calculator }]

    },

    ...(selectedCompany ? [
    {
      id: 'company_reports',
      title: "Business Reports",
      url: createPageUrl("CompanyReports"),
      icon: BarChart2,
      type: 'single',
      badge: 'Bisnis',
      badgeColor: 'bg-purple-600'
    },

    {
      id: 'pos_group',
      title: "Point of Sale",
      icon: CreditCard,
      type: 'group',
      badge: 'Bisnis',
      badgeColor: 'bg-green-600',
      children: [
      { id: 'pos_cashier', title: "Kasir", url: createPageUrl("CompanyPOSCashier"), icon: CreditCard },
      { id: 'pos_management', title: "POS Management", url: createPageUrl("CompanyPOS"), icon: Store },
      { id: 'pos_reports', title: "Laporan POS", url: createPageUrl("POSReports"), icon: BarChart2 }]

    },

    {
      id: 'sales_group',
      title: "Customer & Sales",
      icon: Users,
      type: 'group',
      badge: 'Bisnis',
      badgeColor: 'bg-green-600',
      children: [
      { id: 'crm', title: "Database Pelanggan", url: createPageUrl("CRM"), icon: Users },
      { id: 'company_products', title: "Produk & Jasa", url: createPageUrl("CompanyProducts"), icon: Package },
      { id: 'invoices', title: "Invoice & Quotation", url: createPageUrl("Invoices"), icon: Receipt },
      { id: 'appointments', title: "Appointments", url: createPageUrl("Appointments"), icon: Calendar }]

    },

    {
      id: 'hr_group',
      title: "HR & Payroll",
      icon: Users2,
      type: 'group',
      badge: 'Bisnis',
      badgeColor: 'bg-green-600',
      children: [
      { id: 'employee_portal', title: "Portal Karyawan", url: createPageUrl("EmployeePortal"), icon: UserIcon, badge: 'NEW' },
      { id: 'company_hr', title: "HR Management", url: createPageUrl("CompanyHR"), icon: Users2 },
      { id: 'company_attendance', title: "Absensi", url: createPageUrl("CompanyAttendance"), icon: Clock },
      { id: 'payroll_automation', title: "Payroll", url: createPageUrl("PayrollAutomation"), icon: DollarSign, badge: 'NEW' },
      { id: 'performance_reviews', title: "Performance", url: createPageUrl("PerformanceReviews"), icon: Award, badge: 'NEW' },
      { id: 'kpi', title: "KPI Tracking", url: createPageUrl("KPI"), icon: Target }]

    },

    {
      id: 'operations_group',
      title: "Operations",
      icon: Briefcase,
      type: 'group',
      badge: 'Bisnis',
      badgeColor: 'bg-green-600',
      children: [
      { id: 'projects', title: "Projects", url: createPageUrl("Projects"), icon: FolderKanban },
      { id: 'inventory', title: "Inventory", url: createPageUrl("Inventory"), icon: Boxes, badge: 'NEW' },
      { id: 'manufacturing', title: "Manufacturing", url: createPageUrl("Manufacturing"), icon: Factory, badge: 'NEW' },
      { id: 'assets', title: "Assets", url: createPageUrl("Assets"), icon: Package }]

    },

    {
      id: 'comm_group',
      title: "Communication",
      icon: MessageSquare,
      type: 'group',
      badge: 'Bisnis',
      badgeColor: 'bg-green-600',
      children: [
      { id: 'whatsapp_web', title: "WhatsApp Web", url: createPageUrl("WhatsAppWeb"), icon: Smartphone, badge: 'NEW' },
      { id: 'team_chat', title: "Team Chat", url: createPageUrl("TeamChat"), icon: MessageSquare },
      { id: 'email_marketing', title: "Email Marketing", url: createPageUrl("EmailMarketing"), icon: Mail },
      { id: 'documents', title: "Dokumen", url: createPageUrl("Documents"), icon: FileText }]

    },

    {
      id: 'analytics_group',
      title: "Analytics & Goals",
      icon: Target,
      type: 'group',
      badge: 'Bisnis',
      badgeColor: 'bg-green-600',
      children: [
      { id: 'advanced_analytics', title: "Analytics", url: createPageUrl("AdvancedAnalytics"), icon: BarChart2 },
      { id: 'goal_tracking', title: "Goals", url: createPageUrl("GoalTracking"), icon: Goal }]

    },

    {
      id: 'company_settings',
      title: "Company Settings",
      url: createPageUrl("CompanySettings"),
      icon: Settings,
      type: 'single',
      badge: 'Bisnis',
      badgeColor: 'bg-green-600'
    },

    {
      id: 'company_orders',
      title: "Pesanan Masuk",
      url: createPageUrl("CompanyOrders"),
      icon: ShoppingCart,
      type: 'single',
      badge: 'Bisnis',
      badgeColor: 'bg-purple-600'
    }] :
    [
    {
      id: 'shop',
      title: "Toko Digital",
      icon: Store,
      type: 'group',
      badge: 'Personal',
      badgeColor: 'bg-blue-600',
      children: [
      { id: 'marketplace', title: "Marketplace", url: createPageUrl("Shop"), icon: ShoppingCart },
      { id: 'my_company_orders', title: "Pesanan Saya", url: createPageUrl("MyCompanyOrders"), icon: Package },
      { id: 'my_orders', title: "Pesanan Digital", url: createPageUrl("MyOrders"), icon: Package },
      { id: 'saldo', title: "Saldo", url: createPageUrl("Saldo"), icon: Wallet }]

    }]),


    {
      id: 'ai_assistant',
      title: "AI Assistant",
      url: createPageUrl("AI"),
      icon: Sparkles,
      type: 'single'
    },

    ...(!selectedCompany ? [
    {
      id: 'referral_program',
      title: "Referral",
      url: createPageUrl("Referral"),
      icon: Gift,
      type: 'single',
      badge: 'Personal',
      badgeColor: 'bg-pink-600'
    }] :
    [])];


    return menus.filter((menu) => menu && (menu.type === 'group' ? menu.children && menu.children.length > 0 : true));
  }, [showAttendanceLink, user, selectedCompany]);

  const settingsNavItems = useMemo(() => {
    const items = [
    { id: 'updates', title: "Pembaruan", url: createPageUrl("Updates"), icon: Newspaper },
    { id: 'settings', title: "Pengaturan", url: createPageUrl("Settings"), icon: Settings }];


    if (user && user.role === 'admin') {
      const adminLabel = user.admin_type === 'owner' ? "Admin Owner" : user.admin_type === 'basic' ? "Admin Transaksi" : "Admin Dashboard";
      items.unshift({ id: 'admin_dashboard', title: adminLabel, url: createPageUrl("AdminDashboard"), icon: Shield });
    }

    return items.filter((item) => item && isMenuVisible(item.id));
  }, [user, isMenuVisible]);

  const storageUsedPercentage = user ? (user.storage_used || 0) / storageLimits[user.subscription_plan || 'free'] * 100 : 0;
  const primaryColor = user?.preferences?.primary_color || "#3b82f6";

  const hexToRgb = (hex) => {
    if (!hex) return null;
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : null;
  };

  useEffect(() => {
    const handleNavigation = (e) => {
      if (e && e.detail && e.detail.path) {
        window.location.href = createPageUrl(e.detail.path);
      }
    };
    window.addEventListener('navigateTo', handleNavigation);
    return () => window.removeEventListener('navigateTo', handleNavigation);
  }, []);

  // ✅ Public pages - render immediately with error protection
  if (isPublicPage) {
    return (
      <ErrorBoundary>
        <CorsDebugger />
        <NetworkDetector />
        <div className={`font-sans ${theme}`}>{children}</div>
      </ErrorBoundary>);

  }

  // ✅ INSTANT RENDER - No loading state, render immediately with placeholder
  // User data will populate after mount

  return (
    <ErrorBoundary>
      <DeviceCompatibility />
      <CorsDebugger />
      <AuthRecovery onUserLoaded={setUser} />
      <ServiceWorkerRegistration />
      <NetworkDetector />
      <div className={`min-h-screen flex w-full ${theme} relative overflow-hidden`}
      style={{
        minHeight: '100dvh',
        WebkitOverflowScrolling: 'touch',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor: theme === 'dark' ? '#171717' : '#FFFFFF'
      }}>

        <style>
          {`
            html, body {
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              -webkit-overflow-scrolling: touch;
              touch-action: manipulation;
              overscroll-behavior: contain;
            }

            * {
              scroll-behavior: auto;
              -webkit-overflow-scrolling: touch;
              scrollbar-width: thin;
              scrollbar-color: ${theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(156, 163, 175, 0.3)'} transparent;
            }

            *::-webkit-scrollbar { width: 4px; height: 4px; }
            *::-webkit-scrollbar-track { background: transparent; }
            *::-webkit-scrollbar-thumb {
              background: ${theme === 'dark' ? 'rgba(75, 85, 99, 0.2)' : 'rgba(156, 163, 175, 0.3)'};
              border-radius: 2px;
            }
            *::-webkit-scrollbar-thumb:hover {
              background: ${theme === 'dark' ? 'rgba(75, 85, 99, 0.4)' : 'rgba(156, 163, 175, 0.5)'};
            }

            .instant-transition { transition: none !important; }
            .instant-render { animation: none !important; transition: none !important; }

            .sidebar-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.5);
              z-index: 40;
              opacity: ${isSidebarOpen && isMobile ? '1' : '0'};
              pointer-events: ${isSidebarOpen && isMobile ? 'auto' : 'none'};
              transition: opacity 0.15s ease;
            }

            .full-height-mobile { height: 100vh; height: 100dvh; }

            @media (max-width: 767px) {
              * {
                -webkit-tap-highlight-color: transparent;
                -webkit-touch-callout: none;
                -webkit-user-select: none;
                user-select: none;
              }

              input, textarea, select, button {
                -webkit-user-select: text;
                user-select: text;
              }

              .mobile-optimized {
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
              }

              .mobile-safe {
                min-height: 44px !important;
                min-width: 44px !important;
              }
            }



            .pulse-glow { animation: pulse-glow 2s infinite; }
            @keyframes pulse-glow {
              0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
              50% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
            }
          `}
        </style>



        {user && <TaskNotificationChecker user={user} />}
        {user && <InvitationHandler user={user} onCompanyChange={handleCompanyChange} />}
        {user && selectedCompany && <LowStockNotifier selectedCompany={selectedCompany} currentUser={user} />}
        {user && <SubscriptionSync currentUser={user} />}
        {user && <MembershipExpiryChecker currentUser={user} onUserUpdate={setUser} />}

        <div
          className={`absolute inset-0 backdrop-blur-sm -z-10`}
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(23, 23, 23, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            backgroundImage: user?.preferences?.wallpaper_url ? `url(${user.preferences.wallpaper_url})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }} />

        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />

        <div
          className={`border-r flex-shrink-0 ${isMobile ? 'fixed h-full' : 'relative h-screen'} ${isMobile ? 'inset-y-0 left-0' : ''} flex flex-col instant-render`}
          ref={sidebarRef}
          style={{
            width: isSidebarOpen ? '288px' : isMobile ? '0px' : '80px',
            transition: 'width 0.15s ease',
            overflow: isMobile && !isSidebarOpen ? 'hidden' : 'visible',
            backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: theme === 'dark' ? '#3F3F3F' : '#E5E7EB',
            zIndex: isMobile ? 45 : 50
          }}>

          {(!isMobile || isSidebarOpen) && <div className={`border-b ${isSidebarOpen ? 'p-4' : 'p-2'} flex ${isSidebarOpen ? 'items-center justify-between' : 'flex-col items-center justify-center gap-2'} flex-shrink-0 z-10`} style={{
            borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.5)' : '#E5E7EB',
            backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF'
          }}>
            <div className={`flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center w-full'}`}>
              {isSidebarOpen ? <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694cc3048109b291dcf39d6d/0002ba199_logo_jamu_kito-removebg-preview1.png" alt="SNISHOP" className="h-8 object-contain flex-shrink-0" loading="eager" /> : <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">S</div>}
            </div>

            {!isMobile && <Button variant="ghost" size="icon" onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSidebarOpen(!isSidebarOpen);
            }} className="flex-shrink-0" style={{
              color: theme === 'dark' ? '#E5E7EB' : '#374151'
            }} data-sidebar-trigger>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isSidebarOpen ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
              </svg>
            </Button>}
          </div>}

          <div className="flex-1 overflow-y-auto mobile-scroll mobile-optimized">
            <div className="p-2">
              <div className="mx-3 py-2 relative flex w-full min-w-0 flex-col">
                <div className="space-y-1">
                  {menuStructure.map((menu) => menu && isMenuVisible(menu.id) && <div key={menu.id}>
                    {menu.type === 'single' ? <Link to={menu.url} onClick={() => {
                      if (isMobile) setIsSidebarOpen(false);
                    }} className={`sidebar-menu-item flex items-center gap-4 px-3 py-2 rounded-lg instant-transition mobile-safe ${!isSidebarOpen ? 'justify-center' : ''}`} style={{
                      color: location.pathname === menu.url || currentPageName === menu.id ? theme === 'dark' ? '#93C5FD' : '#2563EB' : theme === 'dark' ? '#E5E7EB' : '#6B7280',
                      backgroundColor: location.pathname === menu.url || currentPageName === menu.id ? theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      fontWeight: location.pathname === menu.url || currentPageName === menu.id ? '600' : '500'
                    }}>
                      <menu.icon className="w-5 h-5 flex-shrink-0" />
                      {isSidebarOpen && <>
                        <span className="text-sm font-medium truncate">{menu.title}</span>
                        {menu.badge && <Badge className={`${menu.badgeColor || 'bg-green-600'} text-white text-xs ml-auto flex-shrink-0`}>{menu.badge}</Badge>}
                      </>}
                    </Link> : <div>
                      <button onClick={() => toggleMenu(menu.id)} className={`sidebar-menu-item flex items-center gap-4 px-3 py-2 rounded-lg instant-transition w-full mobile-safe ${!isSidebarOpen ? 'justify-center' : ''}`} style={{
                        color: theme === 'dark' ? '#E5E7EB' : '#374151'
                      }}>
                        <menu.icon className="w-5 h-5 flex-shrink-0" />
                        {isSidebarOpen && <>
                          <span className="text-sm font-medium flex-1 text-left truncate">{menu.title}</span>
                          {menu.badge && <Badge className={`${menu.badgeColor || 'bg-blue-600'} text-white text-xs flex-shrink-0`}>{menu.badge}</Badge>}
                          {expandedMenus[menu.id] ? <ChevronDown className="w-4 h-4 ml-auto flex-shrink-0" /> : <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />}
                        </>}
                      </button>

                      {expandedMenus[menu.id] && isSidebarOpen && menu.children && <div className="ml-4 mt-1 space-y-1">
                        {menu.children.map((child) => child && isMenuVisible(child.id) && <Link key={child.id} to={child.url} onClick={() => {
                          if (isMobile) setIsSidebarOpen(false);
                        }} className={`flex items-center gap-4 px-3 py-2 rounded-lg instant-transition mobile-safe`} style={{
                          color: location.pathname === child.url ? theme === 'dark' ? '#93C5FD' : '#2563EB' : theme === 'dark' ? '#D1D5DB' : '#6B7280',
                          backgroundColor: location.pathname === child.url ? theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.08)' : 'transparent',
                          fontWeight: location.pathname === child.url ? '600' : '500'
                        }}>
                          <child.icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{child.title}</span>
                          {child.badge && <Badge className="bg-purple-600 text-white text-xs ml-auto flex-shrink-0">{child.badge}</Badge>}
                        </Link>)}
                      </div>}
                    </div>}
                  </div>)}
                </div>
              </div>

              {isSidebarOpen && <div className="mx-3 p-2 relative flex w-full min-w-0 flex-col mt-4">
                <p className="px-3 text-xs font-medium uppercase" style={{
                  color: theme === 'dark' ? '#9CA3AF' : '#9CA3AF'
                }}>Lainnya</p>
                <div className="space-y-1">
                  {settingsNavItems.map((item) => item && <Link key={item.id} to={item.url} onClick={() => {
                    if (isMobile) setIsSidebarOpen(false);
                  }} className={`flex items-center gap-4 px-3 py-2 rounded-lg instant-transition mobile-safe`} style={{
                    color: location.pathname === item.url ? theme === 'dark' ? '#93C5FD' : '#2563EB' : theme === 'dark' ? '#E5E7EB' : '#6B7280',
                    backgroundColor: location.pathname === item.url ? theme === 'dark' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.08)' : 'transparent',
                    fontWeight: location.pathname === item.url ? '600' : '500'
                  }}>
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{item.title}</span>
                  </Link>)}
                </div>
              </div>}
            </div>
          </div>

          {isSidebarOpen && <div className="pt-3 pb-3 px-3 space-y-2 flex-shrink-0 border-t z-10" style={{
            backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.5)' : '#E5E7EB'
          }}>
            <div onClick={() => setShowAddonModal(true)} className="btn-mobile-optimized rounded-md px-3 py-2 text-center text-white font-medium text-xs cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-r from-teal-500 to-cyan-500 shadow-sm">
              <div className="flex items-center justify-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Beli Kuota AI</span>
              </div>
            </div>

            <Link to={createPageUrl("FeatureSuggestion")} onClick={closeSidebar}>
              <div className="btn-mobile-optimized rounded-md px-3 py-2 text-center text-white font-medium text-xs cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm">
                <div className="flex items-center justify-center gap-2">💡 <span>Beri Saran</span></div>
              </div>
            </Link>

            {eligibleTrial && <Link to={createPageUrl("Pricing")} onClick={closeSidebar}>
              <div className="pulse-glow btn-mobile-optimized rounded-md px-3 py-2 text-center text-white font-medium text-xs cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm">
                <div className="flex items-center justify-center gap-1.5">
                  <Star className="w-3.5 h-3.5" />
                  <span>Trial {eligibleTrial.name}</span>
                </div>
                <div className="text-[10px] opacity-90 mt-0.5">Gratis {eligibleTrial.duration} hari</div>
              </div>
            </Link>}

            {user && user.subscription_plan !== "enterprise" && !user.trial_plan && <Link to={createPageUrl("Pricing")} onClick={closeSidebar}>
              <div className="btn-mobile-optimized rounded-md px-3 py-2 text-center text-white font-medium text-xs cursor-pointer transition-all hover:scale-[1.02] bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm">
                <div className="flex items-center justify-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  <span>Upgrade</span>
                </div>
              </div>
            </Link>}

            <div className="text-center">
              <a href="https://snishop.com" target="_blank" rel="noopener noreferrer" className="text-xs hover:opacity-70" style={{
                color: '#6B7280'
              }}>
                Powered by SNISHOP
              </a>
            </div>

            {user && <div className="space-y-1">
              <div className="flex justify-between items-center text-xs" style={{
                color: theme === 'dark' ? '#9CA3AF' : '#6B7280'
              }}>
                <span>Penyimpanan</span>
                <span>{(user.storage_used || 0).toFixed(1)}MB / {storageLimits[user.subscription_plan || 'free']}MB</span>
              </div>
              <Progress value={Math.min(storageUsedPercentage, 100)} className="h-1" />
            </div>}
          </div>}

          <div className="border-t p-2 flex-shrink-0 z-10" style={{
            backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: theme === 'dark' ? 'rgba(75, 85, 99, 0.5)' : '#E5E7EB'
          }}>
            {user && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`w-full p-2 h-auto instant-transition mobile-safe ${!isSidebarOpen ? 'justify-center' : 'justify-start'}`} style={{
                  color: theme === 'dark' ? '#D1D5DB' : '#374151'
                }}>
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="bg-blue-600/20 !text-blue-400 text-xs">
                      {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isSidebarOpen && <div className="flex-1 min-w-0 text-left ml-3">
                    <p className="font-semibold text-xs truncate" style={{
                      color: theme === 'dark' ? '#E5E7EB' : '#111827'
                    }}>{user.full_name || user.email}</p>
                    <Badge variant="outline" className="text-xs mt-1" style={{
                      borderColor: theme === 'dark' ? '#4B5563' : '#D1D5DB',
                      color: theme === 'dark' ? '#9CA3AF' : '#6B7280'
                    }}>
                      {user.trial_plan ? `Trial ${subscriptionNames[user.trial_plan]}` : subscriptionNames[user.subscription_plan || 'free']}
                    </Badge>
                  </div>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mb-2" style={{
                backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.95)' : '#FFFFFF',
                borderColor: theme === 'dark' ? '#4B5563' : '#E5E7EB'
              }}>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl("Settings")} onClick={closeSidebar} className="cursor-pointer mobile-safe" style={{
                    color: theme === 'dark' ? '#D1D5DB' : '#374151'
                  }}>
                    <UserIcon className="w-4 h-4 mr-2" />Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl("Pricing")} onClick={closeSidebar} className="cursor-pointer mobile-safe" style={{
                    color: theme === 'dark' ? '#D1D5DB' : '#374151'
                  }}>
                    <Crown className="w-4 h-4 mr-2" />Upgrade
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator style={{
                  backgroundColor: theme === 'dark' ? '#4B5563' : '#E5E7EB'
                }} />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:!bg-red-500/10 mobile-safe">
                  <LogOut className="w-4 h-4 mr-2" />Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 full-height-mobile">
          <AnimatePresence>
            {isSearchOpen &&
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-0 w-full bg-background/95 backdrop-blur-sm p-4 sm:p-6 border-b z-50"
              style={{
                backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                borderColor: theme === 'dark' ? '#3F3F3F' : '#E5E7EB'
              }}>

                <div className="flex items-center gap-3">
                  <Input
                  type="text"
                  placeholder="Cari tugas, catatan, atau workspace..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  style={{
                    backgroundColor: theme === 'dark' ? '#3F3F3F' : '#F8F8F8',
                    borderColor: theme === 'dark' ? '#4B5563' : '#E5E7EB',
                    color: theme === 'dark' ? '#FFFFFF' : '#111827'
                  }} />

                  {isSearchLoading ?
                <Loader2 className="w-5 h-5 animate-spin text-primary" /> :

                <Button variant="ghost" size="icon" onClick={() => {setIsSearchOpen(false);setSearchQuery('');setSearchResults([]);}} style={{ color: theme === 'dark' ? '#D1D5DB' : '#4B5563' }}>
                      <X className="w-5 h-5" />
                    </Button>
                }
                </div>

                {searchQuery.length > 0 &&
              <div className="mt-4 max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar pr-2">
                    {searchResults.length > 0 ?
                <div className="space-y-2">
                        {searchResults.map((item) =>
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    style={{
                      backgroundColor: theme === 'dark' ? '#262626' : '#F8F8F8',
                      color: theme === 'dark' ? '#E5E7EB' : '#1F2937'
                    }}>

                            {item.type === 'Tugas' && <CheckSquare className="w-5 h-5 text-green-500" />}
                            {item.type === 'Catatan' && <FileText className="w-5 h-5 text-blue-500" />}
                            {item.type === 'Workspace' && <Users className="w-5 h-5 text-purple-500" />}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.title || item.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.type} {item.company_name ? `di ${item.company_name}` : ''}</p>
                            </div>
                          </div>
                  )}
                      </div> :

                !isSearchLoading &&
                <p className="text-center text-muted-foreground py-8">Tidak ada hasil ditemukan.</p>

                }
                  </div>
              }
              </motion.div>
            }
          </AnimatePresence>

          <header className="border-b px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 instant-render" style={{
            backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: theme === 'dark' ? '#3F3F3F' : '#E5E7EB',
            zIndex: 60,
            paddingTop: 'calc(12px + var(--safe-area-inset-top))',
            paddingLeft: 'calc(12px + var(--safe-area-inset-left))',
            paddingRight: 'calc(12px + var(--safe-area-inset-right))'
          }}>
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              {isMobile && <Button ref={hamburgerRef} variant="ghost" size="icon" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                justToggledRef.current = true;
                const newState = !isSidebarOpen;
                setIsSidebarOpen(newState);
                setTimeout(() => {
                  justToggledRef.current = false;
                }, 2000);
              }} onTouchStart={(e) => {
                e.stopPropagation();
              }} className="mr-2 ml-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 w-9 flex-shrink-0" style={{
                color: theme === 'dark' ? '#E5E7EB' : '#374151'
              }} data-sidebar-trigger>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </Button>}


              <div className="flex-1 min-w-0 max-w-[200px] sm:max-w-none">
                {user && <CompanySwitcher currentUser={user} selectedCompany={selectedCompany} onCompanyChange={handleCompanyChange} />}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {user && <ShoppingCartIcon user={user} />}

              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-lg transition-all hover:scale-105" style={{
                color: theme === 'dark' ? '#D1D5DB' : '#4B5563',
                backgroundColor: theme === 'dark' ? 'rgba(55, 65, 81, 0.3)' : 'rgba(229, 231, 235, 0.5)'
              }} title={theme === 'dark' ? 'Ganti ke Tema Terang' : 'Ganti ke Tema Gelap'}>
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              {user && <NotificationBell user={user} />}

              {user && <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full p-0 mobile-safe">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-blue-600 text-white text-xs sm:text-sm">
                        {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 sm:w-64" align="end" style={{
                  backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                  borderColor: theme === 'dark' ? '#4B5563' : '#E5E7EB'
                }}>
                  <DropdownMenuLabel style={{
                    color: theme === 'dark' ? '#FFFFFF' : '#111827'
                  }}>
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs sm:text-sm font-medium truncate">{user.full_name || user.email}</p>
                      <p className="text-xs truncate" style={{
                        color: theme === 'dark' ? '#9CA3AF' : '#6B7280'
                      }}>{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator style={{
                    backgroundColor: theme === 'dark' ? '#4B5563' : '#E5E7EB'
                  }} />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Settings')} onClick={closeSidebar} className="cursor-pointer mobile-safe" style={{
                      color: theme === 'dark' ? '#FFFFFF' : '#111827'
                    }}>
                      <Settings className="mr-2 h-4 w-4" />Pengaturan
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Pricing')} onClick={closeSidebar} className="cursor-pointer mobile-safe" style={{
                      color: theme === 'dark' ? '#FFFFFF' : '#111827'
                    }}>
                      <Crown className="mr-2 h-4 w-4" />Upgrade
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator style={{
                    backgroundColor: theme === 'dark' ? '#4B5563' : '#E5E7EB'
                  }} />
                  <DropdownMenuSeparator style={{
                    backgroundColor: theme === 'dark' ? '#4B5563' : '#E5E7EB'
                  }} />
                  <DropdownMenuItem
                    onClick={async () => {
                      if (confirm('⚠️ PERINGATAN: Hapus akun akan menghapus SEMUA data Anda secara permanen. Lanjutkan?')) {
                        try {
                          await base44.entities.User.delete(user.id);
                          toast.success('Akun berhasil dihapus');
                          await handleLogout();
                        } catch (error) {
                          toast.error('Gagal menghapus akun: ' + error.message);
                        }
                      }
                    }}
                    className="text-red-600 cursor-pointer mobile-safe font-bold">
                    <X className="mr-2 h-4 w-4" />Hapus Akun
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 cursor-pointer mobile-safe">
                    <LogOut className="mr-2 h-4 w-4" />Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>}
            </div>
          </header>

          <main className="flex-1 overflow-auto instant-render" style={{
            backgroundColor: theme === 'dark' ? '#171717' : '#FFFFFF',
            scrollBehavior: 'auto',
            paddingBottom: isMobile ? 'calc(64px + var(--safe-area-inset-bottom))' : '0'
          }}>
            





            {React.cloneElement(children, {
              selectedCompany,
              currentUser: user
            })}
          </main>
        </div>

        {user && <ExpiryNotificationModal currentUser={user} onClose={() => {}} />}
        {user && <AddonPurchaseModal isOpen={showAddonModal} onClose={() => setShowAddonModal(false)} user={user} />}
        {user && <ReferralCodeModal isOpen={showReferralPopup} onClose={() => setShowReferralPopup(false)} user={user} onSuccess={(updatedUser) => {
          setUser(updatedUser);
          setShowReferralPopup(false);
        }} />}

        {/* ✅ FIXED BOTTOM NAVIGATION - Google Play Requirement */}
        {isMobile && user &&
        <nav
          className="fixed bottom-0 left-0 right-0 border-t flex justify-around items-center z-50"
          style={{
            backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            borderColor: theme === 'dark' ? '#3F3F3F' : '#E5E7EB',
            height: 'calc(64px + var(--safe-area-inset-bottom))',
            paddingBottom: 'var(--safe-area-inset-bottom)',
            paddingLeft: 'var(--safe-area-inset-left)',
            paddingRight: 'var(--safe-area-inset-right)'
          }}>

            {/* Home - Always Same */}
            <Link
            to={createPageUrl("Dashboard")}
            className="flex flex-col items-center justify-center flex-1 py-2 mobile-safe"
            style={{ color: currentPageName === 'Dashboard' ? '#3B82F6' : theme === 'dark' ? '#9CA3AF' : '#6B7280' }}>

              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs mt-1">Home</span>
            </Link>

            {/* Second Button: Tasks (Personal) or Absen (Company) */}
            {selectedCompany ?
          <Link
            to={createPageUrl("CompanyAttendance")}
            className="flex flex-col items-center justify-center flex-1 py-2 mobile-safe"
            style={{ color: currentPageName === 'CompanyAttendance' ? '#3B82F6' : theme === 'dark' ? '#9CA3AF' : '#6B7280' }}>

                <Clock className="w-5 h-5" />
                <span className="text-xs mt-1">Absen</span>
              </Link> :

          <Link
            to={createPageUrl("Tasks")}
            className="flex flex-col items-center justify-center flex-1 py-2 mobile-safe"
            style={{ color: currentPageName === 'Tasks' ? '#3B82F6' : theme === 'dark' ? '#9CA3AF' : '#6B7280' }}>

                <CheckSquare className="w-5 h-5" />
                <span className="text-xs mt-1">Tasks</span>
              </Link>
          }

            {/* Third Button: Shop (Personal) or Kasir (Company) */}
            {selectedCompany ?
          <Link
            to={createPageUrl("CompanyPOSCashier")}
            className="flex flex-col items-center justify-center flex-1 py-2 mobile-safe"
            style={{ color: currentPageName === 'CompanyPOSCashier' ? '#3B82F6' : theme === 'dark' ? '#9CA3AF' : '#6B7280' }}>

                <CreditCard className="w-5 h-5" />
                <span className="text-xs mt-1">Kasir</span>
              </Link> :

          <Link
            to={createPageUrl("Shop")}
            className="flex flex-col items-center justify-center flex-1 py-2 mobile-safe"
            style={{ color: currentPageName === 'Shop' ? '#3B82F6' : theme === 'dark' ? '#9CA3AF' : '#6B7280' }}>

                <ShoppingCart className="w-5 h-5" />
                <span className="text-xs mt-1">Shop</span>
              </Link>
          }

            {/* Finance - Always Same */}
            <Link
            to={createPageUrl("Finance")}
            className="flex flex-col items-center justify-center flex-1 py-2 mobile-safe"
            style={{ color: currentPageName === 'Finance' ? '#3B82F6' : theme === 'dark' ? '#9CA3AF' : '#6B7280' }}>

              <Wallet className="w-5 h-5" />
              <span className="text-xs mt-1">Finance</span>
            </Link>

            {/* Settings - Always Same */}
            <Link
            to={createPageUrl("Settings")}
            className="flex flex-col items-center justify-center flex-1 py-2 mobile-safe"
            style={{ color: currentPageName === 'Settings' ? '#3B82F6' : theme === 'dark' ? '#9CA3AF' : '#6B7280' }}>

              <Settings className="w-5 h-5" />
              <span className="text-xs mt-1">Settings</span>
            </Link>
          </nav>
        }

      </div>
    </ErrorBoundary>);


}