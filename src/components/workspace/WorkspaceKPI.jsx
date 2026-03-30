import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Target, TrendingUp, TrendingDown, Minus, Award, RefreshCw, ExternalLink,
  CheckCircle2, Clock, Zap, Users, BarChart2, Star, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const RATING_CONFIG = {
  outstanding: { label: 'Outstanding', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', bar: 'bg-green-500', icon: '🏆', min: 90 },
  exceeds: { label: 'Exceeds', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', bar: 'bg-blue-500', icon: '⭐', min: 80 },
  meets: { label: 'Meets', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', bar: 'bg-purple-500', icon: '✅', min: 70 },
  needs_improvement: { label: 'Needs Improvement', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', bar: 'bg-yellow-500', icon: '⚠️', min: 50 },
  unsatisfactory: { label: 'Unsatisfactory', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', bar: 'bg-red-500', icon: '❌', min: 0 },
};

const KPI_ACTIVITY_LABELS = {
  task_completed: { label: 'Tugas Selesai', icon: '✅', score: 10 },
  task_completed_late: { label: 'Tugas Selesai (Terlambat)', icon: '⏰', score: 5 },
  briefing_log: { label: 'Briefing Dilakukan', icon: '📋', score: 5 },
  penawaran_log: { label: 'Penawaran Dibuat', icon: '🤝', score: 15 },
  penawaran_closing: { label: 'Penawaran Closing', icon: '🏆', score: 25 },
  live_streaming_log: { label: 'Live Session', icon: '🔴', score: 10 },
  complain_resolved: { label: 'Keluhan Diselesaikan', icon: '🎯', score: 12 },
  task_in_progress: { label: 'Mulai Mengerjakan', icon: '🔄', score: 2 },
};

const AVATAR_COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500'];
function getAvatarColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function KPICard({ kpi, companyMembers }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RATING_CONFIG[kpi.rating] || RATING_CONFIG.meets;
  const avatarColor = getAvatarColor(kpi.employee_name || '');

  // Activity summary from workspace_activities
  const activities = kpi.workspace_activities || [];
  const activitySummary = useMemo(() => {
    const summary = {};
    activities.forEach(a => {
      summary[a.type] = (summary[a.type] || 0) + 1;
    });
    return summary;
  }, [activities]);

  const member = companyMembers.find(m => m.user_email === kpi.employee_email || m.id === kpi.employee_id);

  return (
    <Card className="border dark:border-gray-700 hover:shadow-md transition-shadow overflow-hidden">
      {/* Score bar at top */}
      <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-full ${cfg.bar} transition-all duration-700`} style={{ width: `${kpi.overall_score || 0}%` }} />
      </div>

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarFallback className={`${avatarColor} text-white font-bold text-sm`}>
              {(kpi.employee_name || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{kpi.employee_name}</p>
              <Badge className={`text-xs ${cfg.color}`}>{cfg.icon} {cfg.label}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              <span>{member?.position || member?.role || 'Karyawan'}</span>
              {member?.department && <><span>•</span><span>{member.department}</span></>}
              <span>•</span>
              <span>
                {kpi.period ? (() => {
                  try { return format(new Date(kpi.period + '-01'), 'MMMM yyyy', { locale: localeId }); }
                  catch { return kpi.period; }
                })() : ''}
              </span>
            </div>
          </div>

          {/* Score display */}
          <div className="text-right flex-shrink-0">
            <div className={`text-2xl font-bold ${kpi.overall_score >= 90 ? 'text-green-600' : kpi.overall_score >= 70 ? 'text-blue-600' : kpi.overall_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {(kpi.overall_score || 0).toFixed(0)}
            </div>
            <div className="text-xs text-gray-400">/100</div>
          </div>
        </div>

        {/* Activity chips - from workspace sync */}
        {Object.keys(activitySummary).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(activitySummary).map(([type, count]) => {
              const actCfg = KPI_ACTIVITY_LABELS[type] || { label: type, icon: '•', score: 0 };
              return (
                <span key={type} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                  {actCfg.icon} {actCfg.label} <strong>×{count}</strong>
                </span>
              );
            })}
          </div>
        )}

        {/* Metrics preview */}
        {kpi.metrics && kpi.metrics.length > 0 && (
          <div className="space-y-2">
            {(expanded ? kpi.metrics : kpi.metrics.slice(0, 3)).map((metric, idx) => {
              const achievement = metric.target > 0 ? (metric.actual / metric.target) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1">
                      {achievement >= 100 ? <TrendingUp className="w-3 h-3 text-green-500" /> : achievement >= 70 ? <Minus className="w-3 h-3 text-yellow-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                      {metric.name}
                    </span>
                    <span className={`font-bold ${achievement >= 100 ? 'text-green-600' : achievement >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {achievement.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${achievement >= 100 ? 'bg-green-500' : achievement >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, achievement)}%` }}
                    />
                  </div>
                  {expanded && (
                    <div className="flex justify-between text-[10px] text-gray-400 px-0.5">
                      <span>Actual: <strong>{metric.actual} {metric.unit}</strong></span>
                      <span>Target: {metric.target} {metric.unit}</span>
                      <span>Bobot: {metric.weight}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Expand button */}
        {((kpi.metrics && kpi.metrics.length > 3) || kpi.reviewer_notes) && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 mt-2 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Sembunyikan' : 'Lihat detail'}
          </button>
        )}

        {/* Reviewer notes */}
        {expanded && kpi.reviewer_notes && (
          <div className="mt-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Catatan Reviewer</p>
            <p className="text-xs text-gray-700 dark:text-gray-300">{kpi.reviewer_notes}</p>
          </div>
        )}

        {/* Recent activities expanded */}
        {expanded && activities.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Riwayat Aktivitas Workspace</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {activities.slice(-8).reverse().map((act, i) => {
                const actCfg = KPI_ACTIVITY_LABELS[act.type] || { label: act.type, icon: '•', score: 0 };
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-sm">{actCfg.icon}</span>
                    <span className="flex-1 text-gray-700 dark:text-gray-300 truncate">{act.task_title || actCfg.label}</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold flex-shrink-0">+{act.score || actCfg.score}</span>
                    <span className="text-gray-400 flex-shrink-0">
                      {act.recorded_at ? format(new Date(act.recorded_at), 'dd/MM HH:mm') : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkspaceKPI({ workspace, companyId, currentUser, companyMembers = [] }) {
  const [kpis, setKpis] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [sortBy, setSortBy] = useState('score_desc');
  const syncedPeriodRef = React.useRef(null);

  // ── Helper: Calculate rating from score ─────────────────────────────────
  const getRating = (score) => {
    if (score >= 90) return 'outstanding';
    if (score >= 80) return 'exceeds';
    if (score >= 70) return 'meets';
    if (score >= 50) return 'needs_improvement';
    return 'unsatisfactory';
  };

  // ── CORE: Sync KPI with REAL company data ───────────────────────────────
  const syncKPIWithRealData = async () => {
    if (!companyId || companyMembers.length === 0) return;
    
    // Prevent duplicate syncs for the same period
    const syncKey = `${companyId}_${selectedPeriod}`;
    if (syncedPeriodRef.current === syncKey) return;
    
    setIsSyncing(true);
    try {
      const startDate = `${selectedPeriod}-01`;
      const endDate = `${selectedPeriod}-31`;

      // 🔄 Batch fetch ALL real data for the company in this period
      const [allAttendance, allTransactions, allTasks, existingKPIs] = await Promise.all([
        base44.entities.CompanyAttendance.filter({
          company_id: companyId
        }).catch(() => []),
        base44.entities.CompanyPOSTransaction.filter({
          company_id: companyId
        }).catch(() => []),
        workspace?.id ? base44.entities.Task.filter({
          workspace_id: workspace.id
        }).catch(() => []) : Promise.resolve([]),
        base44.entities.CompanyKPI.filter({
          company_id: companyId,
          period: selectedPeriod
        }).catch(() => [])
      ]);

      // Filter attendance and transactions by period date range
      const periodAttendance = (allAttendance || []).filter(a => {
        if (!a.date) return false;
        return a.date >= startDate && a.date <= endDate;
      });
      const periodTransactions = (allTransactions || []).filter(t => {
        const tDate = t.transaction_date || t.created_date;
        if (!tDate) return false;
        const dateStr = tDate.substring(0, 10);
        return dateStr >= startDate && dateStr <= endDate;
      });

      // Count working days in the period (exclude weekends)
      const year = parseInt(selectedPeriod.split('-')[0]);
      const month = parseInt(selectedPeriod.split('-')[1]) - 1;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let workingDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = new Date(year, month, d).getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
      }
      // Cap working days to today if period is current month
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      if (selectedPeriod === today.toISOString().slice(0, 7)) {
        let passedWorkingDays = 0;
        for (let d = 1; d <= today.getDate(); d++) {
          const dayOfWeek = new Date(year, month, d).getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) passedWorkingDays++;
        }
        workingDays = passedWorkingDays;
      }

      // Get total tasks in workspace
      const totalWorkspaceTasks = (allTasks || []).filter(t => 
        !t.task_type || t.task_type === '' // Only count regular tasks
      ).length;
      
      let updated = false;

      for (const member of companyMembers) {
        // ── Real Attendance Data ────────────────────────────────────
        const empAttendance = periodAttendance.filter(a => 
          a.employee_id === member.id || 
          a.employee_email === member.user_email
        );
        const presentDays = empAttendance.filter(a => 
          a.status === 'present' || a.status === 'late'
        ).length;
        const attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

        // ── Real POS Sales Data ─────────────────────────────────────
        const empTransactions = periodTransactions.filter(t =>
          t.cashier_id === member.id || 
          t.cashier_id === member.user_email ||
          t.cashier_name === member.user_name ||
          t.assigned_to_id === member.id ||
          t.assigned_to_id === member.user_email
        );
        const totalSales = empTransactions.reduce((sum, t) => sum + (t.total || t.total_amount || 0), 0);

        // ── Real Task Completion ────────────────────────────────────
        const empTasks = (allTasks || []).filter(t => 
          (t.assignee_id === member.user_email || t.assignee_id === member.id) &&
          (!t.task_type || t.task_type === '')
        );
        const completedTasks = empTasks.filter(t => 
          t.status === 'done' || t.status === 'completed'
        ).length;
        const taskTotal = empTasks.length || totalWorkspaceTasks || 1; // Avoid division by zero
        const taskCompletionRate = Math.round((completedTasks / taskTotal) * 100);

        // ── Build enriched metrics ──────────────────────────────────
        const existingKPI = (existingKPIs || []).find(k => 
          k.employee_id === member.id || k.employee_email === member.user_email
        );

        // Preserve existing workspace activities
        const existingActivities = existingKPI?.workspace_activities || [];
        const activityScore = existingActivities.reduce((s, a) => s + (a.score || 0), 0);
        const activityMax = 100; // Max score from activities
        const activityRate = Math.min(100, Math.round((activityScore / activityMax) * 100));

        // Define the target omset (use company-level or default 10M)
        const omsetTarget = 10000000; // 10 juta default target

        const enrichedMetrics = [
          { 
            name: 'Absensi Harian', 
            target: 100, 
            actual: attendanceRate, 
            unit: '%', 
            weight: 25,
            description: `${presentDays} hadir dari ${workingDays} hari kerja`
          },
          { 
            name: 'Omset Penjualan POS', 
            target: omsetTarget, 
            actual: totalSales, 
            unit: 'Rp', 
            weight: 25,
            description: `Total penjualan POS bulan ini`
          },
          { 
            name: 'Penyelesaian Tugas', 
            target: taskTotal, 
            actual: completedTasks, 
            unit: 'tugas', 
            weight: 30,
            description: `${completedTasks} selesai dari ${taskTotal} tugas`
          },
          { 
            name: 'Aktivitas Workspace', 
            target: activityMax, 
            actual: Math.min(activityMax, activityScore), 
            unit: 'poin', 
            weight: 20,
            description: `${existingActivities.length} aktivitas tercatat`
          }
        ];

        // Calculate overall score (weighted average of achievement %)
        const overallScore = Math.min(100, enrichedMetrics.reduce((total, m) => {
          const achievement = m.target > 0 ? Math.min(100, (m.actual / m.target) * 100) : 0;
          return total + (achievement * (m.weight / 100));
        }, 0));

        const rating = getRating(overallScore);

        if (existingKPI) {
          // Update existing KPI with real data
          await base44.entities.CompanyKPI.update(existingKPI.id, {
            metrics: enrichedMetrics,
            overall_score: Math.round(overallScore),
            rating,
            employee_name: member.user_name || member.user_email,
            employee_email: member.user_email
          });
          updated = true;
        } else {
          // Create new KPI with real data for this member
          await base44.entities.CompanyKPI.create({
            company_id: companyId,
            employee_id: member.id,
            employee_name: member.user_name || member.user_email,
            employee_email: member.user_email,
            period: selectedPeriod,
            overall_score: Math.round(overallScore),
            rating,
            status: 'draft',
            metrics: enrichedMetrics,
            workspace_activities: existingActivities,
            auto_generated: true
          });
          updated = true;
        }
      }

      if (updated) {
        syncedPeriodRef.current = syncKey;
        // Reload KPIs to reflect changes
        const freshKPIs = await base44.entities.CompanyKPI.filter({
          company_id: companyId,
          period: selectedPeriod
        });
        setKpis(freshKPIs || []);
        console.log('✅ KPI synced with real data for', companyMembers.length, 'members');
      }
    } catch (e) {
      console.error('KPI sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadKPIs = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const data = await base44.entities.CompanyKPI.filter({
        company_id: companyId,
        period: selectedPeriod
      });
      setKpis(data || []);
    } catch (e) {
      toast.error('Gagal memuat data KPI');
    } finally {
      setIsLoading(false);
    }
  };

  // Load KPIs and then auto-sync with real data
  useEffect(() => {
    if (!companyId) return;
    syncedPeriodRef.current = null; // Reset sync flag on period change
    loadKPIs();
  }, [companyId, selectedPeriod]);

  // Auto-sync after KPIs are loaded and members are available
  useEffect(() => {
    if (companyMembers.length > 0 && companyId && !isSyncing) {
      syncKPIWithRealData();
    }
  }, [companyMembers, companyId, selectedPeriod]);

  // Listen to realtime KPI updates from WorkspaceHRSync
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.companyId === companyId) {
        syncedPeriodRef.current = null; // Allow re-sync
        loadKPIs().then(() => syncKPIWithRealData());
      }
    };
    window.addEventListener('hrKPIUpdated', handler);
    window.addEventListener('kpiPageReload', handler);
    return () => {
      window.removeEventListener('hrKPIUpdated', handler);
      window.removeEventListener('kpiPageReload', handler);
    };
  }, [companyId]);

  // Manual refresh handler
  const handleRefresh = async () => {
    syncedPeriodRef.current = null;
    await loadKPIs();
    await syncKPIWithRealData();
    toast.success('🔄 KPI berhasil di-sync dengan data real!');
  };

  // Sorted & filtered KPIs
  const displayKPIs = useMemo(() => {
    let result = kpis;
    if (filterEmployee !== 'all') result = result.filter(k => k.employee_id === filterEmployee || k.employee_email === filterEmployee);

    switch (sortBy) {
      case 'score_desc': return [...result].sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
      case 'score_asc': return [...result].sort((a, b) => (a.overall_score || 0) - (b.overall_score || 0));
      case 'name': return [...result].sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''));
      default: return result;
    }
  }, [kpis, filterEmployee, sortBy]);

  // Stats
  const stats = useMemo(() => ({
    total: kpis.length,
    avg: kpis.length > 0 ? kpis.reduce((s, k) => s + (k.overall_score || 0), 0) / kpis.length : 0,
    outstanding: kpis.filter(k => k.rating === 'outstanding').length,
    needsImprovement: kpis.filter(k => k.rating === 'needs_improvement' || k.rating === 'unsatisfactory').length,
    autoSynced: kpis.filter(k => (k.workspace_activities || []).length > 0).length,
  }), [kpis]);

  if (!companyId) {
    return (
      <Card className="border-dashed border-2 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <Target className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500">KPI hanya tersedia untuk workspace yang terhubung dengan perusahaan</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            KPI Tracking
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time terintegrasi dengan aktivitas workspace — otomatis update saat tugas selesai
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-sm"
          />
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || isSyncing} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || isSyncing) ? 'animate-spin' : ''}`} />
          </Button>
          <a href={createPageUrl('KPI')} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              KPI Full Page
            </Button>
          </a>
        </div>
      </div>

      {/* Auto-sync info banner */}
      <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800 flex items-start gap-3">
        <Zap className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-teal-800 dark:text-teal-300 flex-1">
          <p className="font-semibold">KPI Terintegrasi Data Real Perusahaan</p>
          <p className="text-xs mt-0.5 opacity-80">
            Data KPI otomatis sinkron dengan: Absensi Harian, Omset Penjualan POS, Penyelesaian Tugas, dan Aktivitas Workspace
          </p>
        </div>
        {isSyncing && (
          <div className="flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 flex-shrink-0">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Sync...</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Review', value: stats.total, icon: Users, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/40' },
          { label: 'Rata-rata Score', value: `${stats.avg.toFixed(1)}`, icon: BarChart2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Outstanding', value: stats.outstanding, icon: Star, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30' },
          { label: 'Perlu Perbaikan', value: stats.needsImprovement, icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
          { label: 'Auto-Synced', value: stats.autoSynced, icon: Zap, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-950/30' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className={`border dark:border-gray-700 ${bg}`}>
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`p-1.5 rounded-lg bg-white/60 dark:bg-gray-800/60 ${color}`}><Icon className="w-4 h-4" /></div>
              <div><p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{label}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Avg progress bar */}
      {stats.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Rata-rata Performa Tim</span>
            <span className={`font-bold ${stats.avg >= 80 ? 'text-green-600' : stats.avg >= 60 ? 'text-blue-600' : 'text-yellow-600'}`}>{stats.avg.toFixed(1)}/100</span>
          </div>
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${stats.avg >= 80 ? 'bg-green-500' : stats.avg >= 60 ? 'bg-blue-500' : 'bg-yellow-500'}`}
              style={{ width: `${stats.avg}%` }}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-full sm:w-52 h-9 text-sm">
            <Users className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <SelectValue placeholder="Semua Karyawan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Karyawan</SelectItem>
            {companyMembers.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.user_name || m.user_email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score_desc">Score Tertinggi</SelectItem>
            <SelectItem value="score_asc">Score Terendah</SelectItem>
            <SelectItem value="name">Nama A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
          <span className="text-sm text-gray-500">Memuat data KPI...</span>
        </div>
      ) : displayKPIs.length === 0 ? (
        <Card className="border-dashed border-2 dark:border-gray-700">
          <CardContent className="text-center py-12">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-base font-semibold text-gray-500 dark:text-gray-400 mb-1">Belum ada data KPI</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              KPI akan otomatis muncul saat anggota workspace menyelesaikan tugas, briefing, penawaran, atau live streaming
            </p>
            <a href={createPageUrl('KPI')} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                Buat KPI Manual di KPI Page
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayKPIs.map(kpi => (
            <KPICard key={kpi.id} kpi={kpi} companyMembers={companyMembers} />
          ))}
        </div>
      )}

      {/* Rating legend */}
      {displayKPIs.length > 0 && (
        <Card className="border dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Skala Penilaian</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(RATING_CONFIG).map(([key, cfg]) => (
                <span key={key} className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
                  {cfg.icon} {cfg.label} ({cfg.min}+)
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}