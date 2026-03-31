import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, isToday, isTomorrow, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import { Plus, Loader2, X } from 'lucide-react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import TaskItem from '../TaskItem';

export default function Next7DaysView({ 
  tasks, 
  workspaces, 
  user, 
  onTaskSelect, 
  onTaskUpdate, 
  onTaskDelete,
  onTaskCreate
}) {
  const [addingForDay, setAddingForDay] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleAddTaskForDay = useCallback(async (date, dayIndex) => {
    const title = newTaskTitle.trim();
    if (!title) {
      toast.error('Masukkan judul tugas');
      return;
    }

    const workspaceId = workspaces?.[0]?.id || null;

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('📝 Next7DaysView - CREATING TASK');
    console.log('═══════════════════════════════════════════');
    console.log('   Title:', title);
    console.log('   Day Index:', dayIndex);
    console.log('   Workspace ID:', workspaceId || 'WILL AUTO CREATE');

    setIsCreating(true);
    try {
      const dueDate = new Date(date);
      dueDate.setHours(23, 59, 59, 999);

      const result = await onTaskCreate({
        title: title,
        due_date: dueDate.toISOString(),
        workspace_id: workspaceId,
        status: 'todo',
        priority: 'medium'
      });

      if (result) {
        console.log('✅ Next7DaysView - SUCCESS! Task ID:', result.id);
        toast.success('✅ Tugas berhasil dibuat!');
        setNewTaskTitle('');
        setAddingForDay(null);
      }
    } catch (error) {
      console.error('❌ Next7DaysView Error:', error);
      toast.error('Gagal menambah tugas: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  }, [newTaskTitle, workspaces, onTaskCreate]);

  const handleKeyDown = useCallback((e, date, dayIndex) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTaskForDay(date, dayIndex);
    }
    if (e.key === 'Escape') {
      setAddingForDay(null);
      setNewTaskTitle('');
    }
  }, [handleAddTaskForDay]);

  const generateDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      days.push(date);
    }
    return days;
  };

  const getTasksForDay = (date) => {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return taskDate >= dayStart && taskDate <= dayEnd && task.status !== 'done' && task.status !== 'completed';
    });
  };

  const getDayLabel = (date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE', { locale: id });
  };

  const days = generateDays();

  // ✅ REMOVED: Loading skeleton - Always instant render

  return (
    <div className="flex-1 overflow-auto bg-gray-900">
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
          {days.map((date, dayIndex) => {
            const dayTasks = getTasksForDay(date);
            const droppableId = `day-${dayIndex}`;
            
            return (
              <div key={dayIndex} className="flex flex-col">
                <div className="bg-gray-800 rounded-t-lg p-4 border-b border-gray-700">
                  <div className="text-center">
                    <h3 className="font-semibold text-white">
                      {getDayLabel(date)}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {format(date, 'dd MMM', { locale: id })}
                    </p>
                  </div>
                </div>

                <Droppable droppableId={droppableId}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 bg-gray-800 rounded-b-lg p-4 min-h-96 ${
                        snapshot.isDraggingOver ? 'bg-gray-700' : ''
                      }`}
                    >
                      <div className="space-y-3">
                        <AnimatePresence>
                          {dayTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <motion.div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className={`${
                                    snapshot.isDragging ? 'rotate-1 shadow-2xl' : ''
                                  }`}
                                  onClick={() => onTaskSelect(task)}
                                >
                                  <TaskItem
                                    task={task}
                                    workspace={workspaces.find(w => w.id === task.workspace_id)}
                                    onStatusChange={(task, status) => onTaskUpdate(task.id, { status })}
                                    onEdit={() => onTaskSelect(task)}
                                    onDelete={() => onTaskDelete(task.id)}
                                    onViewDetails={() => onTaskSelect(task)}
                                    variant="compact"
                                  />
                                </motion.div>
                              )}
                            </Draggable>
                          ))}
                        </AnimatePresence>
                        {provided.placeholder}
                      </div>

                      {/* ✅ COMPLETELY FIXED ADD TASK BUTTON */}
                      {addingForDay === dayIndex ? (
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAddTaskForDay(date, dayIndex);
                          }}
                          className="mt-3 space-y-2 bg-gray-700/50 rounded-lg p-3 border border-blue-500/50 relative z-50"
                        >
                          <Input
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, date, dayIndex)}
                            placeholder="Ketik judul tugas..."
                            disabled={isCreating}
                            autoFocus
                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-sm h-10"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddTaskForDay(date, dayIndex);
                              }}
                              disabled={!newTaskTitle.trim() || isCreating}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-9"
                            >
                              {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tambah'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setAddingForDay(null);
                                setNewTaskTitle('');
                              }}
                              className="text-gray-400 hover:text-white h-9 px-3"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 text-center">Enter = Tambah, Esc = Batal</p>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🖱️ Next7DaysView Add Task CLICKED for day', dayIndex);
                            setAddingForDay(dayIndex);
                            setNewTaskTitle('');
                          }}
                          className="w-full mt-3 text-gray-400 hover:text-white hover:bg-gray-700 border-dashed border border-gray-600 rounded-lg py-3 flex items-center justify-center gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 relative z-50"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-sm">Add Task</span>
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}