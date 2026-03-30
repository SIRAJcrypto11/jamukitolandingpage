import React from 'react';
import { Task } from '@/entities/Task';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { onTaskCompleted } from '../helpers/gamificationHelper';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TaskStatusUpdater({ task, onUpdate }) {
  const handleStatusChange = async (newStatus) => {
    try {
      const updateData = {
        status: newStatus
      };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      await Task.update(task.id, updateData);
      
      // Trigger gamification if completed
      if (newStatus === 'completed') {
        try {
          const currentUser = await User.me();
          if (currentUser && currentUser.email) {
            await onTaskCompleted(currentUser.email, task);
          }
        } catch (gamError) {
          console.log('Gamification update skipped:', gamError);
        }
      }
      
      toast.success('Status berhasil diperbarui');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Gagal memperbarui status');
    }
  };

  const statusConfig = {
    todo: { label: 'Belum Dikerjakan', icon: Circle, color: 'text-gray-500' },
    in_progress: { label: 'Sedang Dikerjakan', icon: Clock, color: 'text-blue-500' },
    completed: { label: 'Selesai', icon: CheckCircle2, color: 'text-green-500' },
  };

  const currentConfig = statusConfig[task.status] || statusConfig.todo;
  const Icon = currentConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Icon className={`w-4 h-4 ${currentConfig.color}`} />
          {currentConfig.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.entries(statusConfig).map(([status, config]) => {
          const StatusIcon = config.icon;
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className="gap-2"
            >
              <StatusIcon className={`w-4 h-4 ${config.color}`} />
              {config.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}