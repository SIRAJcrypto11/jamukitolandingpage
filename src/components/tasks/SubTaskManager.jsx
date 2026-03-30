import React, { useState, useEffect } from 'react';
import { Task } from '@/entities/Task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function SubTaskManager({ parentTask, onUpdate }) {
  const [subTasks, setSubTasks] = useState([]);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSubTasks();
  }, [parentTask.id]);

  const loadSubTasks = async () => {
    if (!parentTask.sub_tasks || parentTask.sub_tasks.length === 0) {
      setSubTasks([]);
      return;
    }

    try {
      const tasks = await Task.filter({ id: { '$in': parentTask.sub_tasks } });
      setSubTasks(tasks || []);
    } catch (error) {
      console.error('Error loading subtasks:', error);
    }
  };

  const handleAddSubTask = async (e) => {
    e.preventDefault();
    if (!newSubTaskTitle.trim()) return;

    setIsLoading(true);
    try {
      const newSubTask = await Task.create({
        title: newSubTaskTitle,
        workspace_id: parentTask.workspace_id,
        parent_task_id: parentTask.id,
        status: 'todo',
        priority: parentTask.priority || 'medium'
      });

      const updatedSubTaskIds = [...(parentTask.sub_tasks || []), newSubTask.id];
      await Task.update(parentTask.id, { sub_tasks: updatedSubTaskIds });

      setNewSubTaskTitle('');
      loadSubTasks();
      if (onUpdate) onUpdate(parentTask.id, { sub_tasks: updatedSubTaskIds });
      toast.success('Sub-tugas berhasil ditambahkan');
    } catch (error) {
      console.error('Error adding subtask:', error);
      toast.error('Gagal menambahkan sub-tugas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSubTask = async (subTask) => {
    try {
      const newStatus = subTask.status === 'completed' ? 'todo' : 'completed';
      await Task.update(subTask.id, { status: newStatus });
      loadSubTasks();
      
      // Update parent task progress
      const completedCount = subTasks.filter(st => st.status === 'completed').length + (newStatus === 'completed' ? 1 : -1);
      const progress = (completedCount / subTasks.length) * 100;
      
      if (onUpdate) onUpdate(parentTask.id, {});
    } catch (error) {
      console.error('Error toggling subtask:', error);
      toast.error('Gagal memperbarui sub-tugas');
    }
  };

  const handleDeleteSubTask = async (subTaskId) => {
    if (!confirm('Yakin ingin menghapus sub-tugas ini?')) return;

    try {
      await Task.delete(subTaskId);
      const updatedSubTaskIds = (parentTask.sub_tasks || []).filter(id => id !== subTaskId);
      await Task.update(parentTask.id, { sub_tasks: updatedSubTaskIds });
      
      loadSubTasks();
      if (onUpdate) onUpdate(parentTask.id, { sub_tasks: updatedSubTaskIds });
      toast.success('Sub-tugas berhasil dihapus');
    } catch (error) {
      console.error('Error deleting subtask:', error);
      toast.error('Gagal menghapus sub-tugas');
    }
  };

  const completedCount = subTasks.filter(st => st.status === 'completed').length;
  const progress = subTasks.length > 0 ? (completedCount / subTasks.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium hover:text-blue-600"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Sub-Tugas ({completedCount}/{subTasks.length})
        </button>
        {subTasks.length > 0 && (
          <span className="text-xs text-gray-500">{progress.toFixed(0)}% selesai</span>
        )}
      </div>

      {isExpanded && (
        <>
          {subTasks.length > 0 && (
            <div className="space-y-2">
              {subTasks.map((subTask) => (
                <div key={subTask.id} className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Checkbox
                    checked={subTask.status === 'completed'}
                    onCheckedChange={() => handleToggleSubTask(subTask)}
                  />
                  <span className={`flex-1 text-sm ${subTask.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                    {subTask.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSubTask(subTask.id)}
                    className="h-6 w-6"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddSubTask} className="flex gap-2">
            <Input
              placeholder="Tambah sub-tugas..."
              value={newSubTaskTitle}
              onChange={(e) => setNewSubTaskTitle(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="sm" disabled={isLoading || !newSubTaskTitle.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </form>
        </>
      )}
    </div>
  );
}