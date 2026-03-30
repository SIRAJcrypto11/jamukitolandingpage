import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Crown, Star, Edit, Share2, ArrowLeft, CheckCircle2, Clock, FileText, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { createPageUrl } from '@/utils';

const roleColors = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 border border-red-300 dark:border-red-700',
  member: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700/60 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
};

const roleNames = { owner: 'Pemilik', admin: 'Admin', member: 'Anggota', viewer: 'Peninjau' };
const roleIcons = { owner: Crown, admin: Star, member: Edit, viewer: Share2 };

export default function WorkspaceHeader({ workspace, userRole, stats = { totalTasks: 0, completedTasks: 0, totalNotes: 0, totalMembers: 0, openComplaints: 0, pendingOffers: 0 }, onUpdate }) {
  const RoleIcon = roleIcons[userRole] || Edit;
  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  const getProgressColor = () => {
    if (completionRate >= 75) return 'bg-green-500';
    if (completionRate >= 40) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  return (
    <div className="space-y-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
        <button
          onClick={() => window.location.href = createPageUrl("Workspaces")}
          className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Daftar Workspace</span>
        </button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-gray-900 dark:text-gray-100 font-semibold truncate max-w-[200px]">{workspace.name}</span>
      </div>

      {/* Main Header Card */}
      <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Top Banner with gradient pattern */}
        <div
          className="relative h-28 md:h-36"
          style={{ background: `linear-gradient(135deg, ${workspace.color || '#2563eb'}, ${workspace.color || '#2563eb'}88, #1e1b4b55)` }}
        >
          <div className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%)' }}
          />
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,.3) 20px, rgba(255,255,255,.3) 21px)' }}
          />
        </div>

        {/* Profile Section */}
        <div className="bg-white dark:bg-gray-800 px-4 md:px-6 pb-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-12">
            <div className="flex items-end gap-4">
              {/* Workspace Icon */}
              <div
                className="w-20 h-20 rounded-2xl border-4 border-white dark:border-gray-800 shadow-xl flex items-center justify-center text-3xl font-bold text-white flex-shrink-0"
                style={{ backgroundColor: workspace.color || '#2563eb' }}
              >
                {workspace.icon || workspace.name?.charAt(0)}
              </div>
              <div className="mb-1 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">{workspace.name}</h1>
                  <Badge className={`${roleColors[userRole]} text-xs font-semibold px-2 py-0.5`}>
                    <RoleIcon className="w-3 h-3 mr-1" />
                    {roleNames[userRole]}
                  </Badge>
                  {workspace.is_personal && (
                    <Badge variant="secondary" className="text-xs">Pribadi</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>{workspace.description || 'Workspace Operasional'}</span>
                  {workspace.created_date && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span>Dibuat {format(new Date(workspace.created_date), 'dd MMM yyyy', { locale: id })}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pb-1 flex-shrink-0">
              <button
                onClick={() => window.location.href = createPageUrl("Workspaces")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all font-medium shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali
              </button>
            </div>
          </div>

          {/* Progress bar with label */}
          <div className="mt-5 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Progres Penyelesaian Tugas</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 dark:text-gray-500">{stats.completedTasks}/{stats.totalTasks} tugas</span>
                <span className={`font-bold text-sm ${completionRate >= 75 ? 'text-green-600' : completionRate >= 40 ? 'text-blue-600' : 'text-amber-600'}`}>
                  {completionRate}%
                </span>
              </div>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getProgressColor()}`}
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* KPI Stats Row */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 mt-5">
            <StatBox
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Total Tugas"
              value={stats.totalTasks}
              color="blue"
              onClick={() => {}}
            />
            <StatBox
              icon={<TrendingUp className="w-4 h-4" />}
              label="Selesai"
              value={stats.completedTasks}
              color="green"
            />
            <StatBox
              icon={<Clock className="w-4 h-4" />}
              label="Aktif"
              value={stats.totalTasks - stats.completedTasks}
              color="yellow"
            />
            <StatBox
              icon={<FileText className="w-4 h-4" />}
              label="Catatan"
              value={stats.totalNotes}
              color="purple"
            />
            <StatBox
              icon={<Users className="w-4 h-4" />}
              label="Anggota"
              value={stats.totalMembers}
              color="indigo"
            />
            <StatBox
              icon={<AlertCircle className="w-4 h-4" />}
              label="Keluhan"
              value={stats.openComplaints || 0}
              color="red"
              highlight={stats.openComplaints > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value, color, highlight = false }) {
  const bgMap = {
    blue: 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60',
    green: 'bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-950/60',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/40 hover:bg-yellow-100 dark:hover:bg-yellow-950/60',
    purple: 'bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-950/60',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60',
    red: 'bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60'
  };
  const iconColorMap = {
    blue: 'text-blue-500 dark:text-blue-400',
    green: 'text-green-500 dark:text-green-400',
    yellow: 'text-yellow-500 dark:text-yellow-400',
    purple: 'text-purple-500 dark:text-purple-400',
    indigo: 'text-indigo-500 dark:text-indigo-400',
    red: 'text-red-500 dark:text-red-400'
  };
  const textMap = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
    yellow: 'text-yellow-700 dark:text-yellow-300',
    purple: 'text-purple-700 dark:text-purple-300',
    indigo: 'text-indigo-700 dark:text-indigo-300',
    red: 'text-red-700 dark:text-red-300'
  };

  return (
    <div className={`${bgMap[color]} rounded-xl p-2.5 md:p-3 text-center transition-all duration-200 cursor-default ${highlight ? 'ring-2 ring-red-400 dark:ring-red-600 animate-pulse' : ''}`}>
      <div className={`flex justify-center mb-1 ${iconColorMap[color]}`}>{icon}</div>
      <div className={`text-lg md:text-2xl font-bold ${textMap[color]}`}>{value}</div>
      <div className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{label}</div>
    </div>
  );
}