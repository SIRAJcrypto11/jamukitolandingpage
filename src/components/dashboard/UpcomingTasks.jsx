import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, Calendar } from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const priorityColors = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  high: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
};

const priorityNames = {
  low: "Rendah",
  medium: "Sedang", 
  high: "Tinggi",
  urgent: "Mendesak"
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
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

export default function UpcomingTasks({ tasks }) {
  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Hari ini";
    if (isTomorrow(date)) return "Besok";
    if (isThisWeek(date)) return format(date, "EEEE", { locale: id });
    return format(date, "dd MMM yyyy", { locale: id });
  };

  const isOverdue = (dateString) => {
    return new Date(dateString) < new Date() && !isToday(new Date(dateString));
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
            Tugas Mendatang
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {tasks.length > 0 ? (
              <motion.div 
                className="space-y-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
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
                      to={createPageUrl(`Tasks?id=${task.id}`)}
                      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all duration-300 bg-white dark:bg-gray-800 relative overflow-hidden group"
                    >
                      {/* Subtle gradient overlay */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                      />
                      
                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex-1 min-w-0">
                          <motion.h4 
                            className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300"
                            whileHover={{ x: 2 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            {task.title}
                          </motion.h4>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.1 + index * 0.05, type: "spring", stiffness: 400, damping: 17 }}
                            >
                              <Badge className={priorityColors[task.priority]}>
                                {priorityNames[task.priority]}
                              </Badge>
                            </motion.div>
                            <motion.div 
                              className={`flex items-center gap-1 text-sm ${
                                isOverdue(task.due_date) 
                                  ? "text-red-600 dark:text-red-400" 
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
                            >
                              {isOverdue(task.due_date) && (
                                <motion.div
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </motion.div>
                              )}
                              <Calendar className="w-4 h-4" />
                              <span>{getDateLabel(task.due_date)}</span>
                            </motion.div>
                          </div>
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
                <p className="text-gray-500 dark:text-gray-400">Tidak ada tugas mendatang</p>
                <Link to={createPageUrl("Tasks?new=true")}>
                  <motion.button 
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Buat tugas baru
                  </motion.button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}