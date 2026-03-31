import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FileText, CheckSquare } from "lucide-react";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

const WorkspaceCard = React.memo(({ workspace, userRole, taskCount = 0, noteCount = 0, memberCount = 0 }) => {
  const handleWorkspaceClick = () => {
    // Ensure proper URL format with workspace ID
    const url = `${createPageUrl("Workspace")}?id=${workspace.id}`;
    window.location.href = url;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'member': return 'bg-green-100 text-green-800 border-green-300';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'owner': return 'Pemilik';
      case 'admin': return 'Admin';
      case 'member': return 'Anggota';
      case 'viewer': return 'Penonton';
      default: return role;
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: workspace.color || '#3B82F6' }}
              >
                {workspace.icon || '📁'}
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                  {workspace.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {workspace.description || "Tidak ada deskripsi"}
                </p>
              </div>
            </div>
            <Badge className={`ml-2 flex-shrink-0 ${getRoleColor(userRole)}`}>
              {getRoleLabel(userRole)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                <CheckSquare className="w-4 h-4" />
                <span className="font-semibold">{taskCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Tugas</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                <FileText className="w-4 h-4" />
                <span className="font-semibold">{noteCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Catatan</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="font-semibold">{memberCount}</span>
              </div>
              <p className="text-xs text-muted-foreground">Anggota</p>
            </div>
          </div>

          <Button 
            className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
            variant="outline"
            onClick={handleWorkspaceClick}
          >
            Buka Workspace
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
});

WorkspaceCard.displayName = "WorkspaceCard";

export default WorkspaceCard;