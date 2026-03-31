import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckSquare, FileText, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Workspace } from "@/entities/Workspace";

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
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

export default function QuickActions({ user, onUpdateData }) {
  const [isLoading, setIsLoading] = useState(false);

  const navigateToPersonalWorkspace = async () => {
    try {
      setIsLoading(true);
      // Ensure user object and email exist before proceeding
      if (!user || !user.email) {
        toast.error("Informasi pengguna tidak lengkap.");
        setIsLoading(false);
        return;
      }

      const workspaces = await Workspace.filter({ owner_id: user.email, is_personal: true });
      
      if (workspaces && workspaces.length > 0) {
        const personalWorkspace = workspaces[0];
        // Ensure proper URL format with query parameter for ID
        const url = `${createPageUrl("Workspace")}?id=${personalWorkspace.id}`;
        window.location.href = url;
      } else {
        toast.error("Workspace pribadi tidak ditemukan");
      }
    } catch (error) {
      console.error("Error navigating to personal workspace:", error);
      toast.error("Gagal membuka workspace pribadi");
    } finally {
      setIsLoading(false);
    }
  };

  const actions = [
    {
      title: "Tugas Baru",
      description: "Buat tugas untuk meningkatkan produktivitas",
      icon: CheckSquare,
      href: createPageUrl("Tasks?new=true"),
      color: "bg-blue-500 hover:bg-blue-600",
      textColor: "text-blue-600",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      title: "Catatan Baru", 
      description: "Tulis ide dan dokumentasi baru",
      icon: FileText,
      href: createPageUrl("Notes?new=true"),
      color: "bg-purple-500 hover:bg-purple-600",
      textColor: "text-purple-600",
      gradient: "from-purple-500 to-purple-600"
    },
    {
      title: "Workspace Baru",
      description: "Buat ruang kolaborasi untuk tim",
      icon: Users,
      href: createPageUrl("Workspaces?new=true"),
      color: "bg-green-500 hover:bg-green-600",
      textColor: "text-green-600",
      gradient: "from-green-500 to-green-600"
    },
    {
      title: "AI Assistant",
      description: "Gunakan AI untuk meningkatkan produktivitas",
      icon: Zap,
      href: createPageUrl("AI"),
      color: "bg-indigo-500 hover:bg-indigo-600",
      textColor: "text-indigo-600",
      gradient: "from-indigo-500 to-indigo-600"
    }
  ];

  const handleActionClick = (action, e) => {
    // Trigger a custom event to notify dashboard to refresh data
    window.dispatchEvent(new CustomEvent('dashboardRefresh'));
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
              <Zap className="w-5 h-5 text-blue-600" />
            </motion.div>
            Aksi Cepat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.title}
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.02, 
                  y: -4,
                  transition: {
                    type: "spring",
                    stiffness: 400,
                    damping: 17
                  }
                }}
                whileTap={{ 
                  scale: 0.98,
                  transition: {
                    type: "spring",
                    stiffness: 600,
                    damping: 30
                  }
                }}
              >
                <Link to={action.href} onClick={(e) => handleActionClick(action, e)}>
                  <div className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800 relative overflow-hidden">
                    {/* Gradient overlay on hover */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 0.05 }}
                    />
                    
                    <div className="flex items-start gap-3 relative z-10">
                      <motion.div 
                        className={`p-2 rounded-lg ${action.color} text-white transition-all duration-300`}
                        whileHover={{
                          scale: 1.1,
                          rotate: [0, -5, 5, 0],
                          transition: {
                            type: "spring",
                            stiffness: 400,
                            damping: 17
                          }
                        }}
                      >
                        <action.icon className="w-5 h-5" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <motion.h3 
                          className={`font-semibold ${action.textColor} group-hover:text-opacity-80 transition-colors duration-300`}
                          whileHover={{ x: 2 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          {action.title}
                        </motion.h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}