import React, { useState, useMemo } from 'react';
import { Task } from '@/entities/Task';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, CheckSquare, ListFilter, SortAsc } from 'lucide-react';
import { Input } from '@/components/ui/input';
import TaskItem from '../tasks/TaskItem';
import TaskForm from '../tasks/TaskForm';
import TaskDetailModal from './TaskDetailModal';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function WorkspaceTasks({ workspaceId, tasks, userRole, onUpdate, currentUser, companyMembers = [], filterByAssignee = false, showCreateButton = true }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('created');

  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'member';
  const canAdminEdit = userRole === 'owner' || userRole === 'admin';

  const handleSubmit = async (taskData) => {
    try {
      const submitData = { ...taskData, workspace_id: workspaceId };
      if (editingTask) {
        await Task.update(editingTask.id, submitData);
        toast.success('Tugas berhasil diperbarui!');
        window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { workspaceId, taskId: editingTask.id } }));
      } else {
        const newTask = await Task.create(submitData);
        toast.success('Tugas berhasil dibuat!');
        window.dispatchEvent(new CustomEvent('taskCreated', { detail: { workspaceId, taskId: newTask.id, assigneeId: submitData.assignee_id } }));
        if (submitData.assignee_id) {
          window.dispatchEvent(new CustomEvent('taskAssigned', { detail: { taskId: newTask.id, assigneeEmail: submitData.assignee_id, taskTitle: submitData.title, workspaceId } }));
        }
      }
      setShowForm(false);
      setEditingTask(null);
      onUpdate();
    } catch (error) {
      toast.error('Gagal menyimpan tugas');
    }
  };

  const handleStatusChange = async (task, newStatus) => {
    if (!canEdit) { toast.error('Anda tidak memiliki izin'); return; }
    try {
      await Task.update(task.id, { ...task, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null });
      toast.success('Status tugas berhasil diubah!');
      window.dispatchEvent(new CustomEvent('taskStatusChanged', { detail: { workspaceId, taskId: task.id, newStatus } }));
      onUpdate();
    } catch (error) { toast.error('Gagal mengubah status tugas'); }
  };

  const handleEdit = (task) => {
    if (!canEdit) { toast.error('Anda tidak memiliki izin'); return; }
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = async (taskId) => {
    if (!canEdit) { toast.error('Anda tidak memiliki izin'); return; }
    if (confirm('Apakah Anda yakin ingin menghapus tugas ini?')) {
      try {
        await Task.delete(taskId);
        toast.success('Tugas berhasil dihapus!');
        onUpdate();
      } catch (error) { toast.error('Gagal menghapus tugas'); }
    }
  };

  const visibleTasks = filterByAssignee && currentUser
    ? tasks.filter(t => t.assignee_id === currentUser.email || t.created_by === currentUser.email)
    : tasks;

  // Only show regular tasks (not log types)
  const regularTasks = visibleTasks.filter(t => !['briefing_log', 'penawaran_log', 'live_streaming_log', 'complain_log'].includes(t.task_type));

  const filteredTasks = useMemo(() => {
    let result = regularTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.content?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });

    if (sortBy === 'priority') result = [...result].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
    else if (sortBy === 'due_date') result = [...result].sort((a, b) => (a.due_date ? new Date(a.due_date) : Infinity) - (b.due_date ? new Date(b.due_date) : Infinity));
    else result = [...result].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

    return result;
  }, [regularTasks, searchQuery, filterStatus, filterPriority, sortBy]);

  // Counts for filter badges
  const counts = {
    todo: regularTasks.filter(t => t.status === 'todo').length,
    in_progress: regularTasks.filter(t => t.status === 'in_progress').length,
    done: regularTasks.filter(t => t.status === 'done' || t.status === 'completed').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-500" />
            Tugas Workspace
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {regularTasks.length} total · {counts.done} selesai · {counts.in_progress} aktif
          </p>
        </div>
        {canEdit && showCreateButton !== false && (
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 shadow-sm gap-2">
            <Plus className="w-4 h-4" />
            Tugas Baru
          </Button>
        )}
      </div>

      {/* Status Quick Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { val: 'all', label: 'Semua', count: regularTasks.length },
          { val: 'todo', label: 'Belum Mulai', count: counts.todo },
          { val: 'in_progress', label: 'Berlangsung', count: counts.in_progress },
          { val: 'done', label: 'Selesai', count: counts.done },
        ].map(f => (
          <button
            key={f.val}
            onClick={() => setFilterStatus(f.val)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filterStatus === f.val
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-blue-400'
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 py-0 text-[10px] ${filterStatus === f.val ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Filters Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input placeholder="Cari tugas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
            <ListFilter className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <SelectValue placeholder="Prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Prioritas</SelectItem>
            <SelectItem value="urgent">🔴 Urgent</SelectItem>
            <SelectItem value="high">🟠 Tinggi</SelectItem>
            <SelectItem value="medium">🟡 Sedang</SelectItem>
            <SelectItem value="low">🟢 Rendah</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
            <SortAsc className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Terbaru</SelectItem>
            <SelectItem value="priority">Prioritas</SelectItem>
            <SelectItem value="due_date">Deadline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task Form */}
      <AnimatePresence>
        {showForm && (
          <TaskForm
            task={editingTask}
            workspaces={[{ id: workspaceId, name: 'Current Workspace' }]}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingTask(null); }}
          />
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => { setSelectedTask(null); onUpdate(); }}
          canAdminEdit={canAdminEdit}
          companyMembers={companyMembers}
          currentUser={currentUser}
        />
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
              <TaskItem
                task={task}
                workspaces={[]}
                onStatusChange={handleStatusChange}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </motion.div>
          ))
        ) : (
          <Card className="border-dashed border-2 dark:border-gray-700">
            <CardContent className="text-center py-14">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {searchQuery || filterStatus !== 'all' || filterPriority !== 'all' ? 'Tidak ada tugas yang cocok' : 'Belum ada tugas'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'Coba ubah filter atau kata kunci pencarian'
                  : 'Buat tugas pertama untuk workspace ini'}
              </p>
              {canEdit && !searchQuery && filterStatus === 'all' && filterPriority === 'all' && (
                <Button onClick={() => setShowForm(true)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" /> Buat Tugas Baru
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results summary */}
      {filteredTasks.length > 0 && (searchQuery || filterStatus !== 'all' || filterPriority !== 'all') && (
        <p className="text-xs text-center text-gray-400">
          Menampilkan {filteredTasks.length} dari {regularTasks.length} tugas
        </p>
      )}
    </div>
  );
}