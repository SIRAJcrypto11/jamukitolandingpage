import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle, Plus, Loader2 } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import TaskItem from '../TaskItem';

export default function MyDayView({ 
  tasks, 
  workspaces, 
  user, 
  onTaskSelect, 
  onTaskUpdate, 
  onTaskDelete,
  onTaskCreate
}) {
  const today = new Date();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 18) return "Selamat Siang";
    return "Selamat Malam";
  };

  const todayTasks = tasks.filter(task => 
    (task.due_date && isToday(new Date(task.due_date))) && task.status !== 'done' && task.status !== 'completed'
  );

  const handleAddTask = useCallback(async () => {
    const title = newTaskTitle.trim();
    if (!title) {
      toast.error('Masukkan judul tugas');
      return;
    }

    const workspaceId = workspaces?.[0]?.id || null;

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('📝 MyDayView - CREATING TASK');
    console.log('═══════════════════════════════════════════');
    console.log('   Title:', title);
    console.log('   Workspace ID:', workspaceId || 'WILL AUTO CREATE');

    setIsCreating(true);
    try {
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const result = await onTaskCreate({
        title: title,
        due_date: todayEnd.toISOString(),
        workspace_id: workspaceId,
        status: 'todo',
        priority: 'medium'
      });

      if (result) {
        console.log('✅ MyDayView - SUCCESS! Task ID:', result.id);
        toast.success('✅ Tugas hari ini berhasil dibuat!');
        setNewTaskTitle('');
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('❌ MyDayView Error:', error);
      toast.error('Gagal menambah tugas: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  }, [newTaskTitle, workspaces, onTaskCreate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
    if (e.key === 'Escape') {
      setShowAddForm(false);
      setNewTaskTitle('');
    }
  }, [handleAddTask]);

  return (
    <div className="h-full overflow-auto custom-scrollbar" style={{background: 'radial-gradient(circle at top left, #0c2a4d, #1a1a2e)'}}>
      <div className="max-w-4xl mx-auto p-8 text-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold">{greeting()}, {user?.full_name?.split(' ')[0] || 'User'}</h1>
          <p className="text-blue-200 text-lg">Run your day or your day will run you</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10 flex items-center gap-6">
          <div>
            <div className="text-5xl font-bold">{format(today, 'dd')}</div>
            <div className="text-blue-200">{format(today, 'EEEE', { locale: id })}</div>
            <div className="text-blue-300 text-sm">{format(today, 'MMMM', { locale: id })}</div>
          </div>
        </motion.div>

        <Droppable droppableId="my-day">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              <AnimatePresence>
                {todayTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided) => (
                      <motion.div
                        ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                        layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      >
                        <TaskItem
                          task={task}
                          workspace={workspaces.find(w => w.id === task.workspace_id)}
                          onStatusChange={(task, status) => onTaskUpdate(task.id, { status: status, completed_at: status === 'done' ? new Date().toISOString() : null })}
                          onViewDetails={() => onTaskSelect(task)}
                          variant="list"
                        />
                      </motion.div>
                    )}
                  </Draggable>
                ))}
              </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        {todayTasks.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold">Semua tugas hari ini selesai!</h3>
            <p className="text-blue-200">Nikmati sisa harimu.</p>
          </motion.div>
        )}

        {/* ✅ ADD TASK BUTTON/FORM - COMPLETELY FIXED */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mt-6 relative z-50"
        >
          {showAddForm ? (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddTask();
              }}
              className="bg-black/30 backdrop-blur-sm rounded-xl p-4 border-2 border-blue-500/50"
            >
              <div className="flex items-center gap-3">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ketik judul tugas untuk hari ini..."
                  disabled={isCreating}
                  autoFocus
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 h-11"
                />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-white/50">
                  Enter = Tambah, Esc = Batal
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAddForm(false);
                      setNewTaskTitle('');
                    }}
                    disabled={isCreating}
                    className="text-white/70 hover:text-white hover:bg-white/10 h-9"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddTask();
                    }}
                    disabled={!newTaskTitle.trim() || isCreating}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-9 min-w-[100px]"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tambah'}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ MyDayView Add Task CLICKED');
                setShowAddForm(true);
              }}
              className="w-full bg-white/10 hover:bg-white/20 text-white border-2 border-white/20 border-dashed py-5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Tambah Tugas Hari Ini</span>
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}