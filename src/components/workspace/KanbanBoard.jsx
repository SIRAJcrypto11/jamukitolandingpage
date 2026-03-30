import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskDetailModal from './TaskDetailModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Calendar, GripVertical, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Task } from '@/entities/Task';
import { User as UserEntity } from '@/entities/User';
import { toast } from 'sonner';
import { isAfter, isPast } from 'date-fns';

const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300', dot: 'bg-gray-400', label: 'Rendah' },
  medium: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-400', label: 'Sedang' },
  high: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-400', label: 'Tinggi' },
  urgent: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-500', label: 'Urgent' }
};

const columns = [
  { id: 'todo', title: 'Belum Mulai', color: '#64748b', bgClass: 'bg-slate-50 dark:bg-slate-900/30', borderClass: 'border-slate-200 dark:border-slate-700', dotClass: 'bg-slate-400' },
  { id: 'in_progress', title: 'Sedang Dikerjakan', color: '#3b82f6', bgClass: 'bg-blue-50 dark:bg-blue-950/30', borderClass: 'border-blue-200 dark:border-blue-800', dotClass: 'bg-blue-500' },
  { id: 'review', title: 'Review', color: '#f59e0b', bgClass: 'bg-amber-50 dark:bg-amber-950/30', borderClass: 'border-amber-200 dark:border-amber-800', dotClass: 'bg-amber-500' },
  { id: 'done', title: 'Selesai', color: '#10b981', bgClass: 'bg-green-50 dark:bg-green-950/30', borderClass: 'border-green-200 dark:border-green-800', dotClass: 'bg-green-500' }
];

function TaskCard({ task, onClick, companyMembers = [] }) {
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
  const assignee = companyMembers.find(m => m.user_id === task.assignee_id || m.user_email === task.assignee_id);
  const assigneeName = assignee?.user_name || task.assignee_id?.split('@')[0] || '';

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3.5 mb-2.5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
      onClick={() => onClick(task)}
    >
      {/* Priority + Overdue indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${priority.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
          {priority.label}
        </span>
        <GripVertical className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Title */}
      <h4 className={`font-semibold text-sm leading-snug mb-2 ${task.status === 'done' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
        {task.title}
      </h4>

      {/* Content preview */}
      {task.content && !['briefing_log', 'penawaran_log', 'live_streaming_log', 'complain_log'].includes(task.task_type) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5 line-clamp-2 leading-relaxed">{task.content}</p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {task.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
          {task.tags.length > 2 && <span className="text-[10px] text-gray-400">+{task.tags.length - 2}</span>}
        </div>
      )}

      {/* Footer: due date + assignee */}
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-100 dark:border-gray-700">
        {task.due_date ? (
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(task.due_date), 'dd MMM', { locale: id })}</span>
            {isOverdue && <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1 rounded">Terlambat</span>}
          </div>
        ) : (
          <span />
        )}

        {task.assignee_id && (
          <div className="flex items-center gap-1">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-[9px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold">
                {assigneeName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {assigneeName && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 max-w-[60px] truncate">{assigneeName.split(' ')[0]}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks, onTaskClick, onCreateTask, onTaskCompleted, onTaskUpdate, onUpdate, workspaceId, companyMembers = [], userRole }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const handleUpdate = onTaskUpdate || onUpdate || (() => {});
  const canAdminEdit = userRole === 'owner' || userRole === 'admin';
  const handleTaskClick = onTaskClick || ((task) => setSelectedTask(task));
  const handleCreateTask = onCreateTask || (() => {});

  // Filter out special log tasks from kanban
  const regularTasks = (tasks || []).filter(t =>
    !['briefing_log', 'penawaran_log', 'live_streaming_log', 'complain_log'].includes(t.task_type)
  );

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    try {
      const taskToUpdate = regularTasks.find(t => t.id === draggableId);
      const updateData = {
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null
      };
      await Task.update(draggableId, updateData);

      if (newStatus === 'done' && taskToUpdate && onTaskCompleted) {
        try {
          const currentUser = await UserEntity.me();
          if (currentUser?.email) await onTaskCompleted(currentUser.email, taskToUpdate);
        } catch (e) { console.error('Gamification error:', e); }
      }

      toast.success('Status tugas berhasil diubah');
      window.dispatchEvent(new CustomEvent('taskStatusChanged', { detail: { workspaceId, taskId: draggableId, newStatus } }));
      handleUpdate();
    } catch (error) {
      toast.error('Gagal mengubah status');
    }
  };

  const getTasksByStatus = (status) => regularTasks.filter(task => task.status === status);

  return (
    <div className="h-full">
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => { setSelectedTask(null); handleUpdate(); }}
          canAdminEdit={canAdminEdit}
          companyMembers={companyMembers}
        />
      )}

      {/* Board summary */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 dark:text-gray-400">
        <span>{regularTasks.length} total tugas</span>
        {columns.map(col => {
          const count = getTasksByStatus(col.id).length;
          if (count === 0) return null;
          return (
            <span key={col.id} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${col.dotClass}`} />
              {col.title}: <strong className="text-gray-700 dark:text-gray-300">{count}</strong>
            </span>
          );
        })}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id);
            return (
              <div key={column.id} className="flex-shrink-0 w-72 md:w-80">
                {/* Column Header */}
                <div className={`rounded-t-xl px-3.5 py-3 border-t border-x ${column.borderClass} ${column.bgClass} flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${column.dotClass}`} />
                    <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">{column.title}</h3>
                    <span className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0 rounded-full font-semibold">
                      {columnTasks.length}
                    </span>
                  </div>
                  {canAdminEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-white/60 dark:hover:bg-gray-700/60"
                      onClick={() => handleCreateTask(column.id)}
                      title="Tambah tugas"
                    >
                      <Plus className="w-3.5 h-3.5 text-gray-500" />
                    </Button>
                  )}
                </div>

                {/* Column Body */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[300px] p-2.5 rounded-b-xl border-b border-x ${column.borderClass} transition-colors duration-150 ${
                        snapshot.isDraggingOver
                          ? `${column.bgClass} border-2 border-dashed`
                          : 'bg-gray-50 dark:bg-gray-900/20'
                      }`}
                    >
                      {columnTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`transition-all ${snapshot.isDragging ? 'rotate-1 scale-105 shadow-2xl opacity-95 z-50' : ''}`}
                              style={provided.draggableProps.style}
                            >
                              <TaskCard task={task} onClick={handleTaskClick} companyMembers={companyMembers} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center py-10 px-4">
                          <div className={`w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center ${column.bgClass} border ${column.borderClass}`}>
                            <span className="text-lg">📋</span>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Tidak ada tugas</p>
                          {canAdminEdit && (
                            <button
                              onClick={() => handleCreateTask(column.id)}
                              className="mt-2 text-xs text-blue-500 hover:text-blue-600 hover:underline"
                            >
                              + Tambah tugas
                            </button>
                          )}
                        </div>
                      )}

                      {snapshot.isDraggingOver && (
                        <div className={`border-2 border-dashed rounded-xl p-4 text-center text-xs text-gray-400 ${column.borderClass}`}>
                          Lepaskan di sini
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}