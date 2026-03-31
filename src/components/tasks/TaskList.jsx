import { AnimatePresence, motion } from 'framer-motion';
import TaskItem from './TaskItem'; // Assuming TaskItem exists
import { Inbox } from 'lucide-react';

const TaskList = ({ tasks, workspaces, onStatusChange, onEdit, onDelete, onViewDetails, viewMode, isLoading }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow animate-pulse loading-shimmer">
            <div className="flex justify-between items-center">
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <Inbox className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Tidak ada tugas</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Mulai dengan membuat tugas baru.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence>
        {tasks.map(task => (
          <motion.div key={task.id} variants={itemVariants} layout>
            <TaskItem
              task={task}
              workspace={workspaces.find(w => w.id === task.workspace_id)}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskList;