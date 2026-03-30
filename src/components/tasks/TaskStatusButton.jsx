import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, Loader2 } from 'lucide-react';
import { Task } from '@/entities/Task';
import { User } from '@/entities/User';
import { toast } from 'sonner';
import { onTaskCompleted } from '../helpers/gamificationHelper';

export default function TaskStatusButton({ task, onUpdate }) {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (newStatus) => {
        setIsUpdating(true);
        try {
            const updateData = {
                status: newStatus
            };
            
            // If marking as completed, add completed_at timestamp
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
                    // Don't show error to user, just log it
                }
            }
            
            toast.success(`Status tugas diubah menjadi: ${getStatusLabel(newStatus)}`);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error updating task status:', error);
            toast.error('Gagal mengubah status tugas');
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'todo': return 'Belum Dikerjakan';
            case 'in_progress': return 'Sedang Dikerjakan';
            case 'completed': return 'Selesai';
            default: return status;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'todo': return <Circle className="w-4 h-4" />;
            case 'in_progress': return <Clock className="w-4 h-4" />;
            case 'completed': return <CheckCircle2 className="w-4 h-4" />;
            default: return <Circle className="w-4 h-4" />;
        }
    };

    const getNextStatus = (currentStatus) => {
        switch (currentStatus) {
            case 'todo': return 'in_progress';
            case 'in_progress': return 'completed';
            case 'completed': return 'todo';
            default: return 'todo';
        }
    };

    const nextStatus = getNextStatus(task.status);

    return (
        <Button
            onClick={() => handleStatusChange(nextStatus)}
            disabled={isUpdating}
            variant={task.status === 'completed' ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
        >
            {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                getStatusIcon(nextStatus)
            )}
            {isUpdating ? 'Memperbarui...' : `Tandai: ${getStatusLabel(nextStatus)}`}
        </Button>
    );
}