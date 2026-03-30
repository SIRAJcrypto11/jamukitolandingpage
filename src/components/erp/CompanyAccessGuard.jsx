import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, AlertCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  hasCompanyAccess, 
  getCompanyRole, 
  getCompanyPermissions,
  hasPermission 
} from '@/components/utils/companyAccessControl';

/**
 * Guard component to check company access and permissions
 * Wraps pages that require company access
 */
export default function CompanyAccessGuard({
  children,
  company,
  currentUser,
  requiredRole = null, // 'owner', 'admin', etc. If null, just check access
  requiredPermissions = [], // Array of permission keys required
  fallbackPage = 'Dashboard'
}) {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [denialReason, setDenialReason] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setIsLoading(true);

        // Check if user has access to company
        const access = await hasCompanyAccess(company.id, currentUser.email, company);
        
        if (!access) {
          setHasAccess(false);
          setDenialReason('Anda tidak memiliki akses ke perusahaan ini.');
          return;
        }

        // Get user's role
        const role = await getCompanyRole(company.id, currentUser.email, company);
        setUserRole(role);

        // Check required role
        if (requiredRole && role !== requiredRole) {
          const roleHierarchy = {
            owner: 5,
            admin: 4,
            supervisor: 3,
            store_admin: 3,
            stock_admin: 3,
            finance_admin: 3,
            hr_admin: 3,
            transaction_admin: 3,
            employee: 1
          };

          const userLevel = roleHierarchy[role] || 0;
          const requiredLevel = roleHierarchy[requiredRole] || 0;

          if (userLevel < requiredLevel) {
            setHasAccess(false);
            setDenialReason(`Anda membutuhkan role ${requiredRole} untuk mengakses halaman ini.`);
            return;
          }
        }

        // Check required permissions
        if (requiredPermissions.length > 0) {
          const permissions = await getCompanyPermissions(company.id, currentUser.email, company);
          const allPermissionsGranted = requiredPermissions.every(p => permissions?.[p] === true);

          if (!allPermissionsGranted) {
            setHasAccess(false);
            setDenialReason('Anda tidak memiliki izin untuk mengakses halaman ini.');
            return;
          }
        }

        setHasAccess(true);
        setDenialReason(null);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
        setDenialReason('Terjadi kesalahan saat memeriksa akses.');
      } finally {
        setIsLoading(false);
      }
    };

    if (company && currentUser) {
      checkAccess();
    } else {
      setIsLoading(false);
    }
  }, [company, currentUser, requiredRole, requiredPermissions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="mt-6 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <Lock className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Akses Ditolak</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {denialReason}
              </p>
              <Link to={createPageUrl(fallbackPage)}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Kembali ke {fallbackPage}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}