import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { CheckSquare, Calendar, Clock, Plus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import TaskItem from '../TaskItem';

export default function AllTasksView({ 
  tasks, 
  workspaces, 
  user, 
  onTaskSelect, 
  onTaskUpdate, 
  onTaskDelete,
  onTaskCreate,
  showCompleted = false 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleAddTask = useCallback(async () => {
    const title = newTaskTitle.trim();
    if (!title) {
      toast.error('Masukkan judul tugas');
      return;
    }

    // ✅ Allow creating even without workspace - parent will auto-create
    const workspaceId = workspaces?.[0]?.id || null;

    console.log('📝 AllTasksView - Creating task:', title);
    console.log('   - Workspace ID:', workspaceId || 'WILL AUTO CREATE');

    setIsCreating(true);
    try {
      const result = await onTaskCreate({
        title: title,
        workspace_id: workspaceId, // ✅ Allow null - parent will handle
        status: 'todo',
        priority: 'medium',
        due_date: null
      });

      if (result) {
        setNewTaskTitle('');
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Gagal menambah tugas');
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
  
  const groupedTasks = useMemo(() => {
    let filteredTasks = showCompleted 
      ? tasks.filter(task => task.status === 'done' || task.status === 'completed')
      : tasks.filter(task => task.status !== 'done' && task.status !== 'completed');
    
    const groups = {
      today: [],
      overdue: [],
      upcoming: [],
      noDate: []
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    filteredTasks.forEach(task => {
      if (!task.due_date) {
        groups.noDate.push(task);
      } else {
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate.getTime() === today.getTime()) {
          groups.today.push(task);
        } else if (dueDate < today) {
          groups.overdue.push(task);
        } else {
          groups.upcoming.push(task);
        }
      }
    });
    
    return groups;
  }, [tasks, showCompleted]);

  const TaskGroup = ({ title, tasks: groupTasks, droppableId, color = "gray" }) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h3 className={`font-semibold text-lg text-${color}-300`}>{title}</h3>
        <span className={`text-sm bg-${color}-800 text-${color}-200 px-2 py-1 rounded-full`}>
          {groupTasks.length}
        </span>
      </div>
      
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-2 ${snapshot.isDraggingOver ? 'bg-gray-700/20 rounded-lg p-2' : ''}`}
          >
            <AnimatePresence>
              {groupTasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <motion.div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.05 }}
                      className={`${
                        snapshot.isDragging ? 'rotate-1 shadow-2xl z-50' : ''
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
    </div>
  );

  // ✅ REMOVED: Loading skeleton - Always instant render

  return (
    <div className="flex-1 overflow-auto bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {showCompleted ? 'Completed Tasks' : 'All Tasks'}
          </h1>
          <p className="text-gray-400">
            {showCompleted 
              ? `${Object.values(groupedTasks).flat().length} completed tasks`
              : `${Object.values(groupedTasks).flat().length} active tasks`
            }
          </p>
        </div>

        {!showCompleted && (
          <>
            {groupedTasks.overdue.length > 0 && (
              <TaskGroup 
                title="Overdue" 
                tasks={groupedTasks.overdue} 
                droppableId="overdue"
                color="red"
              />
            )}
            
            {groupedTasks.today.length > 0 && (
              <TaskGroup 
                title="Today" 
                tasks={groupedTasks.today} 
                droppableId="today"
                color="blue"
              />
            )}
            
            {groupedTasks.upcoming.length > 0 && (
              <TaskGroup 
                title="Upcoming" 
                tasks={groupedTasks.upcoming} 
                droppableId="upcoming"
                color="green"
              />
            )}
            
            {groupedTasks.noDate.length > 0 && (
              <TaskGroup 
                title="No Date" 
                tasks={groupedTasks.noDate} 
                droppableId="no-date"
                color="gray"
              />
            )}
          </>
        )}
        
        {showCompleted && (
          <TaskGroup 
            title="Completed" 
            tasks={Object.values(groupedTasks).flat()} 
            droppableId="completed"
            color="green"
          />
        )}

        {Object.values(groupedTasks).flat().length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {showCompleted ? 'Belum ada tugas selesai' : 'Belum ada tugas'}
            </h3>
            <p className="text-gray-400">
              {showCompleted 
                ? 'Selesaikan beberapa tugas untuk melihatnya di sini.'
                : 'Buat tugas pertama Anda untuk memulai.'
              }
            </p>
          </motion.div>
        )}

        {/* ✅ ADD TASK FORM - FIXED BUTTONS */}
        {!showCompleted && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            {showAddForm ? (
              <div className="bg-gray-800 rounded-xl p-4 border-2 border-blue-500/50">
                <div className="flex items-center gap-3">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik judul tugas..."
                    disabled={isCreating}
                    autoFocus
                    className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-11"
                  />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-500">
                    Enter = Tambah, Esc = Batal
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewTaskTitle('');
                      }}
                      disabled={isCreating}
                      className="text-gray-400 hover:text-white h-9"
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim() || isCreating}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-9 min-w-[100px]"
                    >
                      {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tambah'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 border-2 border-gray-700 border-dashed py-5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Tambah Tugas Baru</span>
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}