/**
 * WorkspaceHRSync - Full real-time integration between Workspace tasks and HR modules
 * Triggers on: task completion, status change, briefing, penawaran, live, keluhan
 * Updates: CompanyKPI, CompanyAttendance, CompanyPayroll signals, AuditLog
 */
import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Task } from '@/entities/Task';
import { format } from 'date-fns';
import { toast } from 'sonner';

const KPI_WEIGHTS = {
  task_completed:      { score: 10, metric: 'Task Completion',   label: '✅ Tugas Selesai' },
  task_completed_late: { score: 5,  metric: 'Task Completion',   label: '⏰ Tugas Selesai (Terlambat)' },
  briefing_log:        { score: 5,  metric: 'Briefing & Training', label: '📋 Briefing Dilakukan' },
  penawaran_log:       { score: 15, metric: 'Sales / Penawaran',  label: '🤝 Penawaran Dibuat' },
  penawaran_closing:   { score: 25, metric: 'Sales / Penawaran',  label: '🏆 Penawaran Closing' },
  live_streaming_log:  { score: 10, metric: 'Live Streaming',     label: '🔴 Live Session' },
  complain_resolved:   { score: 12, metric: 'Customer Service',   label: '🎯 Keluhan Diselesaikan' },
  task_in_progress:    { score: 2,  metric: 'Task Completion',    label: '🔄 Mulai Mengerjakan Tugas' },
};

export default function WorkspaceHRSync({ workspace, currentUser, companyId }) {
  const syncedRef = useRef(new Set());

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getMemberByEmail = async (email, compId) => {
    try {
      const members = await base44.entities.CompanyMember.filter({
        company_id: compId,
        user_email: email,
        status: 'active'
      });
      return members?.[0] || null;
    } catch { return null; }
  };

  // ── Auto Attendance ────────────────────────────────────────────────────────

  const autoMarkAttendance = async (assigneeEmail, compId) => {
    if (!assigneeEmail || !compId) return;
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const member = await getMemberByEmail(assigneeEmail, compId);
      if (!member) return;

      const existing = await base44.entities.CompanyAttendance.filter({
        company_id: compId,
        employee_id: member.id,
        date: today
      });

      if (!existing || existing.length === 0) {
        await base44.entities.CompanyAttendance.create({
          company_id: compId,
          employee_id: member.id,
          employee_name: member.user_name || member.user_email,
          employee_email: member.user_email,
          date: today,
          clock_in_time: new Date().toISOString(),
          status: 'present',
          notes: 'Auto-recorded dari Workspace task start',
          total_hours: 0
        });

        window.dispatchEvent(new CustomEvent('hrAttendanceUpdated', {
          detail: { employeeEmail: assigneeEmail, companyId: compId, date: today }
        }));
        console.log('✅ HR Sync: Attendance auto-recorded for', assigneeEmail);
      }
    } catch (e) {
      console.warn('HR Sync attendance error:', e);
    }
  };

  // ── KPI Update ─────────────────────────────────────────────────────────────

  const updateKPI = async (assigneeEmail, compId, kpiType, taskTitle, taskId) => {
    if (!assigneeEmail || !compId) return;
    const config = KPI_WEIGHTS[kpiType];
    if (!config) return;

    try {
      const member = await getMemberByEmail(assigneeEmail, compId);
      if (!member) return;

      const period = format(new Date(), 'yyyy-MM');

      const existingKPIs = await base44.entities.CompanyKPI.filter({
        company_id: compId,
        employee_id: member.id,
        period
      });

      let kpi = existingKPIs?.[0];

      if (!kpi) {
        // Create fresh KPI record — enrich with REAL data
        const period_start = `${period}-01`;
        const period_end = `${period}-31`;

        // Fetch real attendance for this employee in this period
        let attendanceRate = 0;
        let presentDays = 0;
        let workingDays = 1;
        try {
          const attendance = await base44.entities.CompanyAttendance.filter({
            company_id: compId,
            employee_id: member.id
          });
          const periodAtt = (attendance || []).filter(a => a.date >= period_start && a.date <= period_end);
          presentDays = periodAtt.filter(a => a.status === 'present' || a.status === 'late').length;
          // Calculate working days in period
          const [yr, mo] = period.split('-').map(Number);
          const daysInMonth = new Date(yr, mo, 0).getDate();
          workingDays = 0;
          for (let d = 1; d <= daysInMonth; d++) {
            const dow = new Date(yr, mo - 1, d).getDay();
            if (dow !== 0 && dow !== 6) workingDays++;
          }
          // Cap to today if current month
          const today = new Date();
          if (period === format(today, 'yyyy-MM')) {
            let passed = 0;
            for (let d = 1; d <= today.getDate(); d++) {
              const dow = new Date(yr, mo - 1, d).getDay();
              if (dow !== 0 && dow !== 6) passed++;
            }
            workingDays = passed || 1;
          }
          attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
        } catch (e) { /* silent */ }

        // Fetch real POS sales for this employee
        let totalSales = 0;
        try {
          const transactions = await base44.entities.CompanyPOSTransaction.filter({
            company_id: compId
          });
          const empTx = (transactions || []).filter(t => {
            const tDate = (t.transaction_date || t.created_date || '').substring(0, 10);
            const isInPeriod = tDate >= period_start && tDate <= period_end;
            const isEmp = t.cashier_id === member.id || t.cashier_id === member.user_email || t.cashier_name === (member.user_name || '');
            return isInPeriod && isEmp;
          });
          totalSales = empTx.reduce((s, t) => s + (t.total || t.total_amount || 0), 0);
        } catch (e) { /* silent */ }

        const omsetTarget = 10000000; // 10M default

        await base44.entities.CompanyKPI.create({
          company_id: compId,
          employee_id: member.id,
          employee_name: member.user_name || member.user_email,
          employee_email: member.user_email,
          period,
          overall_score: config.score,
          status: 'draft',
          workspace_activities: [{
            type: kpiType,
            task_id: taskId,
            task_title: taskTitle,
            score: config.score,
            label: config.label,
            recorded_at: new Date().toISOString()
          }],
          metrics: [
            { name: 'Absensi Harian', target: 100, actual: attendanceRate, unit: '%', weight: 25, description: `${presentDays} hadir dari ${workingDays} hari kerja` },
            { name: 'Omset Penjualan POS', target: omsetTarget, actual: totalSales, unit: 'Rp', weight: 25, description: 'Total penjualan POS bulan ini' },
            { name: 'Penyelesaian Tugas', target: 100, actual: kpiType.includes('task') ? config.score : 0, unit: 'poin', weight: 30 },
            { name: 'Aktivitas Workspace', target: 100, actual: config.score, unit: 'poin', weight: 20 },
          ]
        });
      } else {
        // Update existing KPI
        const activities = kpi.workspace_activities || [];
        activities.push({
          type: kpiType,
          task_id: taskId,
          task_title: taskTitle,
          score: config.score,
          label: config.label,
          recorded_at: new Date().toISOString()
        });

        // Update metrics — use new metric names with fallback
        const metrics = kpi.metrics || [];
        // For task-related activities, update "Penyelesaian Tugas" or "Aktivitas Workspace"
        let targetMetricName = 'Aktivitas Workspace';
        if (kpiType.includes('task')) {
          targetMetricName = 'Penyelesaian Tugas';
        }
        
        // Try new metric name first, then fall back to old config.metric name
        let targetMetric = metrics.find(m => m.name === targetMetricName) || metrics.find(m => m.name === config.metric);
        if (targetMetric) {
          targetMetric.actual = Math.min(targetMetric.target, (targetMetric.actual || 0) + config.score);
        }

        // Also update Aktivitas Workspace score (cumulative activity points)
        const activityMetric = metrics.find(m => m.name === 'Aktivitas Workspace');
        if (activityMetric && targetMetricName !== 'Aktivitas Workspace') {
          activityMetric.actual = Math.min(activityMetric.target, (activityMetric.actual || 0) + config.score);
        }

        // Recalculate overall
        const totalWeight = metrics.reduce((s, m) => s + (m.weight || 0), 0);
        const newScore = totalWeight > 0
          ? Math.min(100, metrics.reduce((s, m) => s + Math.min(m.target, m.actual || 0) / m.target * 100 * ((m.weight || 0) / 100), 0))
          : Math.min(100, (kpi.overall_score || 0) + config.score);

        await base44.entities.CompanyKPI.update(kpi.id, {
          metrics,
          overall_score: Math.round(newScore),
          workspace_activities: activities
        });
      }

      console.log(`✅ HR Sync: KPI updated (${kpiType}) for`, assigneeEmail, '+ score', config.score);

      // Broadcast to KPI page for live reload
      window.dispatchEvent(new CustomEvent('hrKPIUpdated', {
        detail: { employeeEmail: assigneeEmail, companyId: compId, period, kpiType, score: config.score }
      }));

      // Payroll signal
      window.dispatchEvent(new CustomEvent('hrPayrollSignal', {
        detail: { employeeEmail: assigneeEmail, companyId: compId, reason: kpiType, taskId, period }
      }));

    } catch (e) {
      console.warn('HR Sync KPI error:', e);
    }
  };

  // ── Audit Log ──────────────────────────────────────────────────────────────

  const logActivity = async (assigneeEmail, compId, action, taskTitle, detail) => {
    try {
      await base44.entities.AuditLog.create({
        company_id: compId,
        user_email: assigneeEmail,
        action,
        entity_type: 'Task',
        entity_name: taskTitle,
        detail,
        recorded_at: new Date().toISOString()
      });
    } catch (e) { /* silent - AuditLog is optional */ }
  };

  // ── Main Event Handler ─────────────────────────────────────────────────────

  const handleTaskStatusChanged = async (event) => {
    const { taskId, newStatus, workspaceId } = event.detail || {};
    if (!workspaceId || workspaceId !== workspace?.id) return;
    if (!companyId) return;

    const dedupKey = `${taskId}-${newStatus}`;
    if (syncedRef.current.has(dedupKey)) return;
    syncedRef.current.add(dedupKey);

    try {
      const task = await Task.get(taskId);
      if (!task || !task.assignee_id) return;

      const assigneeEmail = task.assignee_id;
      const taskType = task.task_type || '';
      const isLate = task.due_date && new Date() > new Date(task.due_date);

      // ── When task starts → auto attendance
      if (newStatus === 'in_progress') {
        await autoMarkAttendance(assigneeEmail, companyId);
        await updateKPI(assigneeEmail, companyId, 'task_in_progress', task.title, taskId);
        await logActivity(assigneeEmail, companyId, 'TASK_STARTED', task.title, `Status berubah ke In Progress`);
      }

      // ── When task completes
      if (newStatus === 'done' || newStatus === 'completed') {
        // Determine KPI type based on task type
        let kpiType = isLate ? 'task_completed_late' : 'task_completed';

        if (taskType === 'briefing_log') kpiType = 'briefing_log';
        else if (taskType === 'live_streaming_log') kpiType = 'live_streaming_log';
        else if (taskType === 'complain_log') kpiType = 'complain_resolved';
        else if (taskType === 'penawaran_log') {
          // Check if it's a closing (content contains "closing" or "deal")
          const content = (task.content || '').toLowerCase();
          kpiType = (content.includes('closing') || content.includes('deal') || content.includes('setuju'))
            ? 'penawaran_closing' : 'penawaran_log';
        }

        await updateKPI(assigneeEmail, companyId, kpiType, task.title, taskId);
        await logActivity(assigneeEmail, companyId, 'TASK_COMPLETED', task.title, `${KPI_WEIGHTS[kpiType]?.label} | +${KPI_WEIGHTS[kpiType]?.score} poin KPI`);

        // Mark task as HR synced
        await Task.update(taskId, { hr_synced: true });

        // Show toast confirmation if the current user is admin/owner
        if (currentUser && (currentUser.email !== assigneeEmail)) {
          toast.success(`✅ KPI ${task.assignee_id} diperbarui otomatis`, { duration: 3000 });
        }
      }

    } catch (e) {
      console.warn('HR Sync task status handler error:', e);
    }
  };

  const handleTaskCreated = async (event) => {
    const { taskId, assigneeId, workspaceId } = event.detail || {};
    if (!workspaceId || workspaceId !== workspace?.id) return;
    if (!companyId || !assigneeId) return;
    // Auto-mark attendance on task assignment
    await autoMarkAttendance(assigneeId, companyId);
  };

  // ── KPI Page live reload listener ──────────────────────────────────────────
  const handleHrKPIUpdated = (event) => {
    const { companyId: updatedCompId } = event.detail || {};
    if (updatedCompId !== companyId) return;
    // Trigger KPI page reload if open
    window.dispatchEvent(new CustomEvent('kpiPageReload', { detail: { companyId } }));
  };

  useEffect(() => {
    if (!workspace?.id || !companyId) return;

    window.addEventListener('taskStatusChanged', handleTaskStatusChanged);
    window.addEventListener('taskCreated', handleTaskCreated);
    window.addEventListener('hrKPIUpdated', handleHrKPIUpdated);

    return () => {
      window.removeEventListener('taskStatusChanged', handleTaskStatusChanged);
      window.removeEventListener('taskCreated', handleTaskCreated);
      window.removeEventListener('hrKPIUpdated', handleHrKPIUpdated);
    };
  }, [workspace?.id, companyId]);

  return null; // Headless sync component
}