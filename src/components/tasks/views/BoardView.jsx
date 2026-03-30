import React, { useState, useMemo, useCallback, memo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import TaskItem from '../TaskItem';

const defaultColumns = [
  { id: 'todo', title: 'Untuk dilakukan', color: 'gray' },
  { id: 'in_progress', title: 'Dalam proses', color: 'blue' },
  { id: 'review', title: 'Review', color: 'yellow' },
  { id: 'done', title: 'Selesai', color: 'green' }
];

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isTouchDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Mobile-optimized TaskCard dengan enhanced touch handling
const MobileOptimizedTaskCard = memo(({ 
  task, 
  index, 
  workspace, 
  onTaskSelect, 
  onTaskUpdate, 
  onTaskDelete, 
  onStatusChange, 
  isDraggingAny,
  draggedTaskId,
  isJustDropped,
  isMobile 
}) => (
  <Draggable key={task.id} draggableId={task.id} index={index}>
    {(provided, snapshot) => {
      const isDragging = snapshot.isDragging;
      const isBeingDragged = draggedTaskId === task.id;
      const isDropping = isJustDropped === task.id;

      return (
        <motion.div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          layout
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            scale: isDragging ? (isMobile ? 1.05 : 1.08) : isDropping ? 1.05 : 1,
            rotateZ: isDragging ? (isMobile ? 2 : 3) : 0,
          }}
          exit={{ 
            opacity: 0, 
            y: -10, 
            scale: 0.95,
            transition: { duration: 0.2 }
          }}
          transition={{
            type: "spring",
            stiffness: isDragging ? (isMobile ? 300 : 400) : 300,
            damping: isDragging ? (isMobile ? 20 : 25) : 30,
            mass: isMobile ? 0.6 : 0.8,
            layout: { 
              duration: isMobile ? 0.2 : 0.25,
              ease: [0.25, 0.46, 0.45, 0.94]
            }
          }}
          style={{
            ...provided.draggableProps.style,
            // Mobile-optimized transforms
            transform: isDragging 
              ? `${provided.draggableProps.style?.transform || ''} rotate(${isMobile ? 2 : 3}deg) scale(${isMobile ? 1.05 : 1.08})` 
              : provided.draggableProps.style?.transform || 'none',

            // Mobile-optimized GPU acceleration
            willChange: 'transform, box-shadow, filter',
            backfaceVisibility: 'hidden',
            perspective: 1000,
            transformStyle: 'preserve-3d',

            // Mobile-specific z-index management
            zIndex: isDragging ? 1000 : isDraggingAny ? (isBeingDragged ? 999 : 1) : 'auto',

            // Mobile-optimized shadow effects
            boxShadow: isDragging 
              ? isMobile
                ? '0 15px 30px rgba(0,0,0,0.3), 0 0 0 2px rgba(59,130,246,0.7), 0 0 20px rgba(59,130,246,0.3)' 
                : '0 25px 50px rgba(0,0,0,0.4), 0 0 0 2px rgba(59,130,246,0.8), 0 0 30px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
              : isDropping
              ? '0 15px 30px rgba(0,0,0,0.2), 0 0 0 1px rgba(34,197,94,0.6), 0 0 20px rgba(34,197,94,0.3)'
              : '0 2px 8px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',

            // Mobile-optimized visual feedback
            filter: isDragging 
              ? isMobile 
                ? 'brightness(1.08) contrast(1.03) saturate(1.08)' 
                : 'brightness(1.1) contrast(1.05) saturate(1.1)'
              : isDropping 
              ? 'brightness(1.05) saturate(1.05)'
              : 'none',

            // Mobile touch optimization
            position: 'relative',
            borderRadius: '8px',
            border: isDragging 
              ? '2px solid rgba(59,130,246,0.6)' 
              : isDropping
              ? '2px solid rgba(34,197,94,0.6)'
              : '2px solid transparent',

            // Mobile-specific touch handling
            touchAction: isDragging ? 'none' : 'auto',
            userSelect: isDragging ? 'none' : 'auto',
            WebkitUserSelect: isDragging ? 'none' : 'auto',
            WebkitTouchCallout: isDragging ? 'none' : 'default',
            WebkitTapHighlightColor: 'transparent',
          }}
          onClick={() => !isDragging && onTaskSelect(task)}
          whileHover={!isDragging && !isMobile ? { 
            scale: 1.02,
            y: -2,
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            transition: { duration: 0.15 }
          } : {}}
          // Mobile-optimized tap handling
          whileTap={isMobile && !isDragging ? { 
            scale: 0.98,
            transition: { duration: 0.1 }
          } : {}}
          // Enhanced drop animation for mobile
          animate={{
            ...({ 
              opacity: 1, 
              y: 0,
              scale: isDragging ? (isMobile ? 1.05 : 1.08) : isDropping ? 1.05 : 1,
              rotateZ: isDragging ? (isMobile ? 2 : 3) : 0,
            }),
            ...(isDropping && {
              scale: isMobile ? [1.05, 1.12, 1] : [1.05, 1.15, 1],
              transition: {
                scale: {
                  duration: isMobile ? 0.3 : 0.4,
                  times: [0, 0.3, 1],
                  ease: [0.25, 0.46, 0.45, 0.94]
                }
              }
            })
          }}
          // Mobile touch event optimization
          onTouchStart={(e) => {
            if (isMobile && !isDragging) {
              e.currentTarget.style.transform = 'scale(0.98)';
              setTimeout(() => {
                if (e.currentTarget) {
                  e.currentTarget.style.transform = '';
                }
              }, 150);
            }
          }}
        >
          <TaskItem
            task={task}
            workspace={workspace}
            onStatusChange={onStatusChange}
            onEdit={() => onTaskSelect(task)}
            onDelete={() => onTaskDelete(task.id)}
            onViewDetails={() => onTaskSelect(task)}
            variant="board"
          />

          {/* Mobile-optimized drag indicator overlay */}
          {isDragging && (
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: isMobile 
                  ? 'linear-gradient(45deg, rgba(59,130,246,0.08), rgba(147,51,234,0.08))'
                  : 'linear-gradient(45deg, rgba(59,130,246,0.1), rgba(147,51,234,0.1))',
                border: '2px dashed rgba(59,130,246,0.6)',
                borderRadius: '8px',
              }}
            />
          )}

          {/* Mobile-optimized drop success indicator */}
          {isDropping && (
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-lg"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [1, 0],
                scale: isMobile ? [0.8, 1.15] : [0.8, 1.2],
              }}
              transition={{ 
                duration: isMobile ? 0.4 : 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              style={{
                background: 'radial-gradient(circle, rgba(34,197,94,0.2), transparent)',
                border: '2px solid rgba(34,197,94,0.6)',
                borderRadius: '8px',
              }}
            />
          )}

          {/* Mobile haptic feedback indicator */}
          {isMobile && isDragging && (
            <motion.div
              className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center pointer-events-none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1],
                opacity: [0, 1, 0.8]
              }}
              transition={{ 
                duration: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <motion.div
                className="w-2 h-2 bg-white rounded-full"
                animate={{
                  scale: [1, 0.8, 1],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          )}
        </motion.div>
      );
    }}
  </Draggable>
));

// Mobile-optimized BoardColumn
const MobileOptimizedBoardColumn = memo(({ 
  column, 
  columnTasks, 
  workspaces, 
  onTaskSelect, 
  onTaskUpdate, 
  onTaskDelete, 
  onTaskCreate,
  onDeleteSection,
  isDraggingAny,
  draggedTaskId,
  isJustDropped,
  dragOverColumn,
  isMobile
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isDropZone = dragOverColumn === column.id;

  // Memoized event handlers
  const handleStatusChange = useCallback((task, status) => {
    onTaskUpdate(task.id, { status });
  }, [onTaskUpdate]);

  const handleAddTask = useCallback(() => {
    onTaskCreate({
      title: '',
      status: column.id,
      workspace_id: workspaces[0]?.id
    });
  }, [column.id, workspaces, onTaskCreate]);

  const handleDeleteColumn = useCallback(() => {
    onDeleteSection(column.id);
  }, [column.id, onDeleteSection]);

  const isDefaultColumn = useMemo(() => 
    defaultColumns.some(col => col.id === column.id), 
    [column.id]
  );

  return (
    <motion.div 
      className={`flex-shrink-0 ${isMobile ? 'w-72' : 'w-80'}`}
      layout
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      animate={{
        scale: isDropZone ? (isMobile ? 1.01 : 1.02) : 1,
        y: isDropZone ? (isMobile ? -1 : -2) : 0,
      }}
    >
      <motion.div 
        className="bg-gray-800 rounded-lg h-full flex flex-col relative overflow-hidden"
        animate={{
          borderColor: isDropZone 
            ? 'rgba(59,130,246,0.8)' 
            : 'transparent',
          boxShadow: isDropZone 
            ? isMobile
              ? '0 0 0 1px rgba(59,130,246,0.6), 0 4px 15px rgba(59,130,246,0.15)' 
              : '0 0 0 2px rgba(59,130,246,0.6), 0 8px 25px rgba(59,130,246,0.2)'
            : '0 2px 8px rgba(0,0,0,0.1)',
        }}
        transition={{ duration: 0.15 }}
        style={{
          border: '2px solid',
          borderColor: isDropZone ? 'rgba(59,130,246,0.8)' : 'transparent',
        }}
      >
        {/* Mobile-optimized drop zone glow effect */}
        {isDropZone && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: isMobile 
                ? 'linear-gradient(135deg, rgba(59,130,246,0.03), rgba(147,51,234,0.03))'
                : 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(147,51,234,0.05))',
              borderRadius: '6px',
            }}
          />
        )}

        <div className={`${isMobile ? 'p-3' : 'p-4'} border-b border-gray-700 relative z-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className={`font-medium text-white ${isMobile ? 'text-sm' : ''}`}>
                {column.title}
              </h3>
              <motion.div
                animate={{
                  scale: isDropZone ? (isMobile ? 1.05 : 1.1) : 1,
                }}
                transition={{ duration: 0.15 }}
              >
                <Badge className={`bg-${column.color}-600 text-white ${isMobile ? 'text-xs' : 'text-xs'}`}>
                  {columnTasks.length}
                </Badge>
              </motion.div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-gray-400`}>
                <MoreHorizontal className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
              </Button>
              {!isDefaultColumn && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-gray-400 hover:text-red-400`}
                  onClick={handleDeleteColumn}
                >
                  <X className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                </Button>
              )}
            </div>
          </div>
        </div>

        <Droppable 
          droppableId={column.id}
          type="TASK"
          mode="standard"
          ignoreContainerClipping={false}
          isDropDisabled={false}
          isCombineEnabled={false}
        >
          {(provided, snapshot) => (
            <motion.div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 ${isMobile ? 'p-3' : 'p-4'} space-y-3 custom-scrollbar overflow-y-auto relative z-10`}
              animate={{
                backgroundColor: snapshot.isDraggingOver 
                  ? 'rgba(59, 130, 246, 0.08)' 
                  : 'transparent',
              }}
              transition={{ duration: 0.1 }}
              style={{
                // Mobile-optimized GPU acceleration
                transform: 'translate3d(0, 0, 0)',
                willChange: snapshot.isDraggingOver ? 'background-color' : 'auto',
                // Mobile-optimized scroll behavior
                overscrollBehavior: 'contain',
                scrollBehavior: 'auto',
                WebkitOverflowScrolling: 'touch',
                // Mobile touch handling
                touchAction: isDraggingAny ? 'none' : 'pan-y',
                userSelect: isDraggingAny ? 'none' : 'auto',
                WebkitUserSelect: isDraggingAny ? 'none' : 'auto',
                WebkitTouchCallout: isDraggingAny ? 'none' : 'default',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseEnter={() => !isMobile && setIsHovered(true)}
              onMouseLeave={() => !isMobile && setIsHovered(false)}
            >
              {/* Mobile-optimized drop zone indicator */}
              <AnimatePresence>
                {snapshot.isDraggingOver && (
                  <motion.div
                    className={`absolute ${isMobile ? 'inset-1' : 'inset-2'} border-2 border-dashed border-blue-400 rounded-lg pointer-events-none z-0`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      borderColor: ['rgba(59,130,246,0.4)', 'rgba(59,130,246,0.8)', 'rgba(59,130,246,0.4)']
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ 
                      duration: 0.2,
                      borderColor: { 
                        duration: isMobile ? 1.2 : 1.5, 
                        repeat: Infinity 
                      }
                    }}
                    style={{
                      background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.05), transparent)',
                    }}
                  />
                )}
              </AnimatePresence>

              <div className="relative z-10">
                <AnimatePresence mode="popLayout">
                  {columnTasks.map((task, index) => {
                    const workspace = workspaces.find(w => w.id === task.workspace_id);
                    return (
                      <MobileOptimizedTaskCard
                        key={task.id}
                        task={task}
                        index={index}
                        workspace={workspace}
                        onTaskSelect={onTaskSelect}
                        onTaskUpdate={onTaskUpdate}
                        onTaskDelete={onTaskDelete}
                        onStatusChange={handleStatusChange}
                        isDraggingAny={isDraggingAny}
                        draggedTaskId={draggedTaskId}
                        isJustDropped={isJustDropped}
                        isMobile={isMobile}
                      />
                    );
                  })}
                </AnimatePresence>
                {provided.placeholder}

                <motion.div
                  initial={{ opacity: 0.7 }}
                  animate={{ 
                    opacity: (isHovered || snapshot.isDraggingOver) ? 1 : 0.7,
                    scale: snapshot.isDraggingOver ? (isMobile ? 1.01 : 1.02) : 1
                  }}
                  transition={{ duration: 0.1 }}
                >
                  <Button
                    variant="ghost"
                    className={`w-full text-gray-400 hover:text-white hover:bg-gray-700 border-dashed border border-gray-600 mt-3 transition-all duration-100 ${isMobile ? 'text-sm py-2' : ''}`}
                    onClick={handleAddTask}
                  >
                    <Plus className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-2`} />
                    Add Task
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </Droppable>
      </motion.div>
    </motion.div>
  );
});

export default function BoardView({ 
  tasks, 
  workspaces, 
  user, 
  onTaskSelect, 
  onTaskUpdate, 
  onTaskDelete,
  onTaskCreate,
  isLoading 
}) {
  const [columns, setColumns] = useState(defaultColumns);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [isJustDropped, setIsJustDropped] = useState(null);
  const [optimisticTasks, setOptimisticTasks] = useState([]);

  // Mobile detection
  const isMobile = useIsMobile();

  // Use ref for immediate updates
  const tasksRef = useRef(tasks);
  const dragStateRef = useRef({ 
    draggedId: null, 
    sourceColumn: null, 
    destinationColumn: null 
  });

  // Sync tasks with ref for instant access
  useEffect(() => {
    tasksRef.current = tasks;
    if (optimisticTasks.length === 0) {
      setOptimisticTasks(tasks);
    }
  }, [tasks, optimisticTasks.length]);

  // Mobile-specific setup
  useEffect(() => {
    if (isMobile) {
      // Prevent default touch behaviors
      const preventDefault = (e) => {
        if (isDragging) {
          e.preventDefault();
        }
      };

      document.addEventListener('touchmove', preventDefault, { passive: false });
      document.addEventListener('touchstart', preventDefault, { passive: false });

      return () => {
        document.removeEventListener('touchmove', preventDefault);
        document.removeEventListener('touchstart', preventDefault);
      };
    }
  }, [isDragging, isMobile]);

  // Use optimistic tasks for instant UI updates
  const currentTasks = isDragging ? optimisticTasks : tasks;

  // Ultra-optimized task grouping dengan instant updates
  const tasksByColumn = useMemo(() => {
    const grouped = {};

    // Pre-initialize semua columns
    columns.forEach(col => {
      grouped[col.id] = [];
    });

    // Group tasks dengan efisien
    currentTasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [currentTasks, columns]);

  // Mobile-enhanced onDragStart
  const handleDragStart = useCallback((start) => {
    setIsDragging(true);
    setDraggedTaskId(start.draggableId);
    setOptimisticTasks([...tasksRef.current]);

    dragStateRef.current = {
      draggedId: start.draggableId,
      sourceColumn: start.source.droppableId,
      destinationColumn: null
    };

    // Mobile-enhanced visual feedback
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.classList.add('dragging');

    // Mobile-specific body styles
    const style = document.createElement('style');
    style.id = 'mobile-drag-styles';
    style.textContent = `
      .dragging * { cursor: grabbing !important; }
      .dragging { 
        overflow: hidden; 
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
      }
      ${isMobile ? `
        .dragging {
          touch-action: none !important;
          -webkit-overflow-scrolling: auto !important;
        }
        .dragging * {
          touch-action: none !important;
          pointer-events: ${isDragging ? 'none' : 'auto'} !important;
        }
      ` : ''}
    `;
    document.head.appendChild(style);

    // Mobile haptic feedback simulation
    if (isMobile && navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [isMobile, isDragging]);

  // Mobile-enhanced onDragUpdate
  const handleDragUpdate = useCallback((update) => {
    if (update.destination) {
      setDragOverColumn(update.destination.droppableId);
      dragStateRef.current.destinationColumn = update.destination.droppableId;

      // Mobile haptic feedback on column change
      if (isMobile && navigator.vibrate && 
          dragStateRef.current.destinationColumn !== update.destination.droppableId) {
        navigator.vibrate(30);
      }

      // Real-time optimistic update
      if (update.destination.droppableId !== dragStateRef.current.sourceColumn) {
        const newTasks = [...tasksRef.current];
        const taskIndex = newTasks.findIndex(t => t.id === update.draggableId);

        if (taskIndex !== -1) {
          newTasks[taskIndex] = {
            ...newTasks[taskIndex],
            status: update.destination.droppableId
          };
          setOptimisticTasks(newTasks);
        }
      }
    } else {
      setDragOverColumn(null);
    }
  }, [isMobile]);

  // Mobile-enhanced onDragEnd
  const handleDragEnd = useCallback((result) => {
    // Clean up drag state
    setIsDragging(false);
    setDraggedTaskId(null);
    setDragOverColumn(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.classList.remove('dragging');

    // Remove drag styles
    const dragStyles = document.getElementById('mobile-drag-styles');
    if (dragStyles) {
      dragStyles.remove();
    }

    const { destination, source, draggableId } = result;

    // Mobile haptic feedback on completion
    if (isMobile && navigator.vibrate) {
      if (destination) {
        navigator.vibrate([100, 50, 100]); // Success pattern
      } else {
        navigator.vibrate(200); // Cancel pattern
      }
    }

    // Reset jika tidak ada destination
    if (!destination) {
      setOptimisticTasks([]);
      return;
    }

    // Skip jika posisi sama
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      setOptimisticTasks([]);
      return;
    }

    // ENHANCED DROP ANIMATION
    if (destination.droppableId !== source.droppableId) {
      // Show drop success animation
      setIsJustDropped(draggableId);

      // Clear drop animation after duration (mobile-optimized)
      setTimeout(() => {
        setIsJustDropped(null);
      }, isMobile ? 400 : 500);

      // INSTANT UPDATE: Update task status immediately
      const taskToUpdate = tasksRef.current.find(task => task.id === draggableId);
      if (taskToUpdate) {
        // Instant optimistic update
        const updatedTask = {
          ...taskToUpdate,
          status: destination.droppableId
        };

        // Update optimistic state immediately
        const newOptimisticTasks = tasksRef.current.map(task => 
          task.id === draggableId ? updatedTask : task
        );
        setOptimisticTasks(newOptimisticTasks);

        // Call parent update handler
        onTaskUpdate(draggableId, { status: destination.droppableId });

        // Clear optimistic state after brief moment
        setTimeout(() => {
          setOptimisticTasks([]);
        }, 100);
      }
    } else {
      setOptimisticTasks([]);
    }
  }, [onTaskUpdate, isMobile]);

  // Memoized event handlers
  const handleAddSection = useCallback(() => {
    if (newSectionTitle.trim()) {
      const newColumn = {
        id: `custom_${Date.now()}`,
        title: newSectionTitle.trim(),
        color: 'purple'
      };
      setColumns(prev => [...prev, newColumn]);
      setNewSectionTitle('');
      setShowAddSection(false);
    }
  }, [newSectionTitle]);

  const handleDeleteSection = useCallback((columnId) => {
    if (defaultColumns.some(col => col.id === columnId)) {
      return;
    }
    setColumns(prev => prev.filter(col => col.id !== columnId));
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleAddSection();
    }
  }, [handleAddSection]);

  const handleInputChange = useCallback((e) => {
    setNewSectionTitle(e.target.value);
  }, []);

  const handleShowAddSection = useCallback(() => {
    setShowAddSection(true);
  }, []);

  const handleCancelAddSection = useCallback(() => {
    setShowAddSection(false);
    setNewSectionTitle('');
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex gap-6 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className={`flex-shrink-0 ${isMobile ? 'w-72' : 'w-80'} h-96 bg-gray-700 rounded-lg animate-pulse`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <DragDropContext 
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-auto bg-gray-900 custom-scrollbar">
        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className={`font-bold text-white mb-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                Board View
              </h1>
              <p className={`text-gray-400 ${isMobile ? 'text-sm' : ''}`}>
                Organize tasks in columns by status
              </p>
            </div>
            <Button
              onClick={handleShowAddSection}
              className={`bg-blue-600 hover:bg-blue-700 transition-colors duration-100 ${isMobile ? 'text-sm px-3 py-2' : ''}`}
            >
              <Plus className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} mr-2`} />
              Add Section
            </Button>
          </div>

          <motion.div 
            className={`flex gap-${isMobile ? '4' : '6'} overflow-x-auto pb-6 custom-scrollbar`}
            style={{
              // Mobile-optimized horizontal scrolling
              overscrollBehavior: 'contain',
              scrollBehavior: 'auto',
              WebkitOverflowScrolling: 'touch',
              // Mobile touch optimization
              touchAction: isDragging ? 'none' : 'pan-x',
            }}
            layout
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {columns.map(column => (
              <MobileOptimizedBoardColumn 
                key={column.id} 
                column={column}
                columnTasks={tasksByColumn[column.id] || []}
                workspaces={workspaces}
                onTaskSelect={onTaskSelect}
                onTaskUpdate={onTaskUpdate}
                onTaskDelete={onTaskDelete}
                onTaskCreate={onTaskCreate}
                onDeleteSection={handleDeleteSection}
                isDraggingAny={isDragging}
                draggedTaskId={draggedTaskId}
                isJustDropped={isJustDropped}
                dragOverColumn={dragOverColumn}
                isMobile={isMobile}
              />
            ))}

            <AnimatePresence mode="wait">
              {showAddSection && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: 20 }}
                  transition={{
                    type: "tween",
                    duration: 0.15,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }}
                  className={`flex-shrink-0 ${isMobile ? 'w-72' : 'w-80'}`}
                >
                  <div className="bg-gray-800 rounded-lg p-4">
                    <Input
                      value={newSectionTitle}
                      onChange={handleInputChange}
                      placeholder="Section title"
                      className={`mb-3 bg-gray-700 border-gray-600 text-white transition-colors duration-100 ${isMobile ? 'text-sm' : ''}`}
                      onKeyPress={handleKeyPress}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleAddSection} 
                        size="sm"
                        className="transition-colors duration-100"
                      >
                        Add
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleCancelAddSection}
                        className="transition-colors duration-100"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </DragDropContext>
  );
}