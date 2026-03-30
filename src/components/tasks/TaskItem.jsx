import React, { useState } from 'react';
import { Task } from '@/entities/Task';
import { User } from '@/entities/User';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, Calendar, Flag, Trash2, Edit2, MoreVertical } from 'lucide-react';
import { format, isPast, isToday, isValid, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { onTaskCompleted } from '../helpers/gamificationHelper';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
};

const priorityLabels = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  urgent: 'Mendesak'
};

const statusIcons = {
  todo: <Circle className="w-5 h-5" />,
  in_progress: <Clock className="w-5 h-5 text-blue-500" />,
  completed: <CheckCircle2 className="w-5 h-5 text-green-500" />
};

// Helper function to safely parse and validate dates
function parseDateSafely(dateString) {
  if (!dateString) return null;
  
  try {
    const parsed = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
    return isValid(parsed) ? parsed : null;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
}

export default function TaskItem({ task, onClick, onUpdate, onDelete }) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    try {
      const updateData = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      await Task.update(task.id, updateData);
      
      // Trigger gamification for completed tasks
      if (newStatus === 'completed') {
        console.log('TaskItem: Task completed, triggering gamification...');
        try {
          const currentUser = await User.me();
          if (currentUser && currentUser.email) {
            console.log('TaskItem: Calling onTaskCompleted with user:', currentUser.email);
            await onTaskCompleted(currentUser.email, task);
          }
        } catch (gamError) {
          console.error('TaskItem: Gamification error:', gamError);
        }
      }
      
      toast.success(`Status berhasil diubah`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Gagal mengubah status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Yakin ingin menghapus tugas ini?')) return;
    
    try {
      await Task.delete(task.id);
      toast.success('Tugas berhasil dihapus');
      if (onDelete) onDelete();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Gagal menghapus tugas');
    }
  };

  // Safely parse due date
  const dueDate = parseDateSafely(task.due_date);
  const isOverdue = dueDate && isPast(dueDate) && task.status !== 'completed';
  const isDueToday = dueDate && isToday(dueDate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        task.status === 'completed' ? 'opacity-60' : ''
      } ${isOverdue ? 'border-red-400' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Status Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextStatus = 
                  task.status === 'todo' ? 'in_progress' :
                  task.status === 'in_progress' ? 'completed' : 'todo';
                handleStatusChange(nextStatus);
              }}
              disabled={isUpdating}
              className="mt-1 hover:scale-110 transition-transform"
            >
              {statusIcons[task.status]}
            </button>

            {/* Task Content */}
            <div className="flex-1 min-w-0" onClick={onClick}>
              <h3 className={`font-semibold text-base mb-1 ${
                task.status === 'completed' ? 'line-through text-gray-500' : ''
              }`}>
                {task.title}
              </h3>
              
              {task.content && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {task.content}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge className={priorityColors[task.priority || 'medium']}>
                  <Flag className="w-3 h-3 mr-1" />
                  {priorityLabels[task.priority || 'medium']}
                </Badge>

                {dueDate && (
                  <Badge 
                    variant="outline"
                    className={`flex items-center gap-1 ${
                      isOverdue ? 'border-red-500 text-red-600 dark:text-red-400' :
                      isDueToday ? 'border-blue-500 text-blue-600 dark:text-blue-400' :
                      'border-gray-300'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    {format(dueDate, 'dd MMM yyyy')}
                  </Badge>
                )}

                {task.tags && task.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  if (onClick) onClick();
                }}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}