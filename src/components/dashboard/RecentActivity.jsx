import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, FileText, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

export default function RecentActivity({ tasks, notes }) {
  // Combine and sort activities by date
  const activities = [
    ...tasks.map(task => ({
      id: task.id,
      type: "task",
      title: task.title,
      status: task.status,
      priority: task.priority,
      updated_date: task.updated_date,
      created_by: task.created_by
    })),
    ...notes.map(note => ({
      id: note.id,
      type: "note",
      title: note.title,
      updated_date: note.updated_date,
      created_by: note.created_by
    }))
  ].sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)).slice(0, 8);

  const getActivityIcon = (type, status) => {
    if (type === "task") {
      return status === "done" 
        ? <CheckSquare className="w-4 h-4 text-green-600" />
        : <CheckSquare className="w-4 h-4 text-blue-600" />;
    }
    return <FileText className="w-4 h-4 text-purple-600" />;
  };

  const getActivityLabel = (type, status) => {
    if (type === "task") {
      const statusLabels = {
        todo: "Tugas baru",
        in_progress: "Sedang dikerjakan",
        review: "Dalam review",
        done: "Selesai",
        cancelled: "Dibatalkan"
      };
      return statusLabels[status] || "Tugas";
    }
    return "Catatan";
  };

  const getActivityColor = (type, status) => {
    if (type === "task") {
      const colors = {
        todo: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
        in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        review: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
        done: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
        cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
      };
      return colors[status] || colors.todo;
    }
    return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="shadow-lg hover:shadow-xl transition-all duration-500 card-interactive bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Clock className="w-5 h-5 text-blue-600" />
            </motion.div>
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {activities.length > 0 ? (
              <motion.div 
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {activities.map((activity, index) => (
                  <motion.div
                    key={`${activity.type}-${activity.id}`}
                    variants={itemVariants}
                    whileHover={{ 
                      scale: 1.02, 
                      x: 4,
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 17
                      }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Link 
                      to={createPageUrl(activity.type === "task" ? `Tasks?id=${activity.id}` : `Notes?id=${activity.id}`)}
                      className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 group relative overflow-hidden"
                    >
                      {/* Subtle gradient overlay */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-purple-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                      />
                      
                      <div className="flex items-start gap-3 relative z-10">
                        <motion.div 
                          className="mt-1"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          {getActivityIcon(activity.type, activity.status)}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <motion.h4 
                              className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300"
                              whileHover={{ x: 2 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                            >
                              {activity.title}
                            </motion.h4>
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.1 + index * 0.02, type: "spring", stiffness: 400, damping: 17 }}
                            >
                              <Badge className={`text-xs ${getActivityColor(activity.type, activity.status)}`}>
                                {getActivityLabel(activity.type, activity.status)}
                              </Badge>
                            </motion.div>
                          </div>
                          <motion.div 
                            className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + index * 0.02, duration: 0.3 }}
                          >
                            <User className="w-3 h-3" />
                            <span>{activity.created_by}</span>
                            <span>•</span>
                            <span>{format(new Date(activity.updated_date), "dd MMM, HH:mm", { locale: id })}</span>
                          </motion.div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                className="text-center py-8"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                </motion.div>
                <p className="text-gray-500 dark:text-gray-400">Belum ada aktivitas terbaru</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}