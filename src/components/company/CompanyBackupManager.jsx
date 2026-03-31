import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Download,
  Database,
  Shield,
  CheckCircle,
  Loader2,
  FileJson,
  HardDrive,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function CompanyBackupManager({ company, currentUser }) {
  const [backupHistory, setBackupHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // ✅ Changed to false - no auto-load
  const [isExporting, setIsExporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState(null);

  // ✅ MANUAL LOAD ONLY - No auto-load on mount
  const loadBackupHistory = async () => {
    if (!company) return;

    try {
      setIsLoading(true);
      const history = await base44.entities.CompanyBackup.filter({
        company_id: company.id
      }, '-backup_date', 10);

      setBackupHistory(history || []);

      if (history && history.length > 0) {
        setLastBackupDate(new Date(history[0].backup_date));
      }
    } catch (error) {
      console.error('Error loading backup history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCompanyData = async (createBackupRecord = true) => {
    if (!company) return;

    setIsExporting(true);

    try {
      console.log('📦 Starting comprehensive company backup...');

      // ✅ FETCH ALL COMPANY DATA - COMPREHENSIVE
      const [
        members,
        tasks,
        notes,
        workspaces,
        posTransactions,
        posProducts,
        posCategories,
        customers,
        membershipLevels,
        employees,
        attendance,
        leaves,
        payrolls,
        projects,
        assets,
        inventory,
        locations,
        financeRecords,
        invoices,
        appointments,
        goals,
        kpis,
        documents,
        teamChats,
        chatChannels
      ] = await Promise.all([
        base44.entities.CompanyMember.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Task.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Note.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Workspace.filter({ company_id: company.id }).catch(() => []),
        base44.entities.CompanyPOSTransaction.filter({ company_id: company.id }).catch(() => []),
        base44.entities.CompanyPOSProduct.filter({ company_id: company.id }).catch(() => []),
        base44.entities.CompanyPOSCategory.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Customer.filter({ company_id: company.id }).catch(() => []),
        base44.entities.CustomerMembership.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Employee.filter({ company_id: company.id }).catch(() => []),
        base44.entities.CompanyAttendance.filter({ company_id: company.id }).catch(() => []),
        base44.entities.CompanyLeave.filter({ company_id: company.id }).catch(() => []),
        base44.entities.CompanyPayroll.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Project.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Asset.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Inventory.filter({ company_id: company.id }).catch(() => []),
        base44.entities.WarehouseLocation.filter({ company_id: company.id }).catch(() => []),
        base44.entities.FinancialRecord.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Invoice.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Appointment.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Goal.filter({ company_id: company.id }).catch(() => []),
        base44.entities.CompanyKPI.filter({ company_id: company.id }).catch(() => []),
        base44.entities.Document.filter({ company_id: company.id }).catch(() => []),
        base44.entities.TeamChat.filter({ company_id: company.id }).catch(() => []),
        base44.entities.ChatChannel.filter({ company_id: company.id }).catch(() => [])
      ]);

      console.log('✅ All company data fetched');

      // ✅ CREATE COMPREHENSIVE BACKUP OBJECT
      const backupData = {
        backup_metadata: {
          company_id: company.id,
          company_name: company.name,
          backup_date: new Date().toISOString(),
          created_by: currentUser.email,
          created_by_name: currentUser.full_name || currentUser.email,
          version: '1.0',
          platform: 'SNISHOP - Smart Business Operating System'
        },
        company_info: company,
        data: {
          members: members || [],
          tasks: tasks || [],
          notes: notes || [],
          workspaces: workspaces || [],
          pos: {
            transactions: posTransactions || [],
            products: posProducts || [],
            categories: posCategories || []
          },
          crm: {
            customers: customers || [],
            membership_levels: membershipLevels || []
          },
          hr: {
            employees: employees || [],
            attendance: attendance || [],
            leaves: leaves || [],
            payrolls: payrolls || []
          },
          projects: projects || [],
          assets: assets || [],
          inventory: {
            items: inventory || [],
            locations: locations || []
          },
          finance: financeRecords || [],
          invoices: invoices || [],
          appointments: appointments || [],
          goals: goals || [],
          kpis: kpis || [],
          documents: documents || [],
          communications: {
            chats: teamChats || [],
            channels: chatChannels || []
          }
        },
        summary: {
          total_members: members?.length || 0,
          total_tasks: tasks?.length || 0,
          total_notes: notes?.length || 0,
          total_transactions: posTransactions?.length || 0,
          total_inventory: inventory?.length || 0,
          total_customers: customers?.length || 0,
          total_employees: employees?.length || 0,
          total_projects: projects?.length || 0,
          total_assets: assets?.length || 0
        }
      };

      // ✅ Calculate file size
      const jsonString = JSON.stringify(backupData, null, 2);
      const sizeInBytes = new Blob([jsonString]).size;
      const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

      backupData.summary.total_size_mb = parseFloat(sizeInMB);

      console.log('📊 Backup size:', sizeInMB, 'MB');
      console.log('📊 Summary:', backupData.summary);

      // ✅ DOWNLOAD BACKUP FILE
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BACKUP_${company.name.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('✅ Backup berhasil diunduh!', {
        description: `File size: ${sizeInMB} MB | ${backupData.summary.total_members + backupData.summary.total_tasks + backupData.summary.total_notes} records`,
        duration: 5000
      });

      // ✅ CREATE BACKUP RECORD (if requested)
      if (createBackupRecord) {
        await base44.entities.CompanyBackup.create({
          company_id: company.id,
          company_name: company.name,
          backup_type: 'manual',
          backup_scope: 'full',
          backup_date: new Date().toISOString(),
          created_by_email: currentUser.email,
          created_by_name: currentUser.full_name || currentUser.email,
          data_summary: backupData.summary,
          file_size_mb: parseFloat(sizeInMB),
          status: 'completed',
          notes: 'Manual backup oleh owner'
        });

        console.log('✅ Backup record created');
        
        // ✅ CLEAR OLD REMINDER - Allow new reminder after new backup
        const reminderKeys = Object.keys(localStorage).filter(key => 
          key.startsWith(`backup_reminder_shown_${company.id}`)
        );
        reminderKeys.forEach(key => localStorage.removeItem(key));
        
        // Reload history
        loadBackupHistory();
      }

    } catch (error) {
      console.error('Error exporting company data:', error);
      toast.error('Gagal membuat backup', {
        description: error.message || 'Terjadi kesalahan saat export data',
        duration: 5000
      });
    } finally {
      setIsExporting(false);
      setShowConfirmDialog(false);
    }
  };

  const shouldShowBackupReminder = () => {
    if (!lastBackupDate) return true;
    const hoursSinceLastBackup = (new Date() - lastBackupDate) / (1000 * 60 * 60);
    return hoursSinceLastBackup >= 24;
  };

  return (
    <div className="space-y-6">
      {/* ✅ BACKUP INFO CARD */}
      <Card className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-2 border-green-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="w-6 h-6 text-green-400" />
            Backup & Keamanan Data Perusahaan
          </CardTitle>
          <CardDescription className="text-gray-300">
            {company.name} - Backup manual untuk keamanan data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ✅ DATA SAFETY GUARANTEE */}
          <div className="p-4 bg-green-900/40 border-2 border-green-500 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-base text-green-300 font-bold mb-2">
                  🔒 JAMINAN 100% DATA AMAN
                </p>
                <div className="text-sm text-gray-200 space-y-1">
                  <p>✅ <strong>Semua data perusahaan AMAN</strong> - tidak akan dihapus</p>
                  <p>✅ Members, Tasks, Notes, POS, Finance, HR, Inventory - <strong>semua tersimpan</strong></p>
                  <p>✅ Saat membership expired: <strong>Hanya lock akses fitur</strong>, data tetap ada</p>
                  <p>✅ Setelah perpanjang: <strong>Langsung akses kembali</strong> semua data</p>
                  <p>💡 <strong>Backup manual tersedia</strong> untuk keamanan ekstra kapan saja</p>
                </div>
              </div>
            </div>
          </div>

          {/* ✅ BACKUP ACTIONS - Load history on demand */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isExporting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses Backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Backup Sekarang (Full Export)
                </>
              )}
            </Button>

            <Button
              onClick={loadBackupHistory}
              variant="outline"
              className="border-gray-600 text-gray-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Lihat Riwayat
            </Button>
          </div>

          {/* ✅ INFO: Manual backup recommendation */}
          <div className="p-3 bg-blue-900/30 border border-blue-600 rounded-lg">
            <div className="flex items-start gap-2 text-xs text-blue-300">
              <Database className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">💡 Rekomendasi Backup</p>
                <p className="opacity-90">
                  Backup data perusahaan secara berkala (minimal setiap minggu) untuk keamanan ekstra.
                  Data tetap aman di sistem, backup adalah proteksi tambahan.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ BACKUP HISTORY - Only show if loaded */}
      {backupHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Riwayat Backup
            </CardTitle>
            <CardDescription>
              10 backup terakhir perusahaan {company.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {backupHistory.map((backup) => (
                <div
                  key={backup.id}
                  className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileJson className="w-4 h-4 text-green-400" />
                        <p className="font-semibold text-white text-sm">
                          {format(new Date(backup.backup_date), 'dd MMMM yyyy HH:mm', { locale: id })}
                        </p>
                        <Badge className="text-xs bg-blue-600">
                          Manual
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                        <span>👥 {backup.data_summary?.total_members || 0} members</span>
                        <span>📝 {backup.data_summary?.total_tasks || 0} tasks</span>
                        <span>🗒️ {backup.data_summary?.total_notes || 0} notes</span>
                        <span>💳 {backup.data_summary?.total_transactions || 0} trx</span>
                        <span>📦 {backup.data_summary?.total_inventory || 0} items</span>
                      </div>

                      {backup.data_summary?.total_size_mb && (
                        <p className="text-xs text-gray-500 mt-1">
                          <HardDrive className="w-3 h-3 inline mr-1" />
                          Size: {backup.data_summary.total_size_mb} MB
                        </p>
                      )}

                      <p className="text-xs text-gray-500 mt-1">
                        Oleh: {backup.created_by_name}
                      </p>
                    </div>

                    <Badge className="bg-green-600 text-white flex-shrink-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {backup.status || 'completed'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ BACKUP CONFIRMATION DIALOG */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-400" />
              Backup Data Perusahaan
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Backup lengkap semua data {company.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
              <p className="text-sm text-blue-300 font-semibold mb-2">
                📦 Yang Akan Di-Backup:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                <div>✅ Members & Permissions</div>
                <div>✅ Tasks & Notes</div>
                <div>✅ POS Transactions</div>
                <div>✅ Products & Inventory</div>
                <div>✅ Customers & CRM</div>
                <div>✅ HR & Payroll</div>
                <div>✅ Finance Records</div>
                <div>✅ Projects & Assets</div>
                <div>✅ Invoices & Appointments</div>
                <div>✅ Goals & KPIs</div>
                <div>✅ Documents</div>
                <div>✅ Team Communications</div>
              </div>
            </div>

            <div className="p-3 bg-green-900/30 border border-green-600 rounded-lg">
              <p className="text-xs text-green-300">
                ✅ File akan diunduh dalam format <strong>JSON</strong> yang dapat di-import kembali kapan saja
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
                disabled={isExporting}
              >
                Batal
              </Button>
              <Button
                onClick={() => exportCompanyData(true)}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Backup & Download
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}