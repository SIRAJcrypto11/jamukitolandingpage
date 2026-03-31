
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sun, CalendarDays, CheckSquare, Calendar, Kanban, Timer, Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { isToday, addDays, startOfDay, endOfDay } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
'@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';
import { toast } from 'sonner'; // Assuming sonner is used for toast notifications

export default function TaskSidebar({
  selectedView,
  onViewChange,
  workspaces = [],
  selectedWorkspace,
  onWorkspaceChange,
  user,
  tasks = [],
  onWorkspaceDelete
}) {
  const [deletingWorkspace, setDeletingWorkspace] = useState(null);

  const getTaskCount = (viewType, workspaceId = null) => {
    let filtered = workspaceId ? tasks.filter((t) => t.workspace_id === workspaceId) : tasks;
    filtered = filtered.filter((t) => t.status !== 'done');

    switch (viewType) {
      case 'my-day':
        return filtered.filter((t) => t.due_date && isToday(new Date(t.due_date))).length;
      case 'next-7-days':
        const nextWeek = addDays(new Date(), 7);
        return filtered.filter((t) => t.due_date && new Date(t.due_date) >= startOfDay(new Date()) && new Date(t.due_date) <= endOfDay(nextWeek)).length;
      case 'all-tasks':
        return filtered.length;
      case 'completed':
        const allTasks = workspaceId ? tasks.filter((t) => t.workspace_id === workspaceId) : tasks;
        return allTasks.filter((t) => t.status === 'done').length;
      default:
        return 0;
    }
  };

  const mainViews = [
  { id: 'my-day', name: 'My Day', icon: Sun, count: getTaskCount('my-day'), color: 'text-orange-400' },
  { id: 'next-7-days', name: 'Next 7 Days', icon: CalendarDays, count: getTaskCount('next-7-days'), color: 'text-blue-400' },
  { id: 'all-tasks', name: 'All Tasks', icon: CheckSquare, count: getTaskCount('all-tasks'), color: 'text-green-400' }];


  const secondaryViews = [
  { id: 'calendar', name: 'My Calendar', icon: Calendar, color: 'text-purple-400' },
  { id: 'board', name: 'Board', icon: Kanban, color: 'text-indigo-400' },
  { id: 'time-tracking', name: 'Time Tracking', icon: Timer, color: 'text-pink-400' },
  { id: 'completed', name: 'Completed', icon: CheckSquare, color: 'text-gray-400', count: getTaskCount('completed') }];


  const ViewButton = ({ view, isSelected }) =>
  <Button
    variant={isSelected ? "secondary" : "ghost"}
    className="w-full justify-start gap-3"
    onClick={() => onViewChange(view.id)}>

      <view.icon className={`w-4 h-4 ${isSelected ? 'text-blue-500' : view.color}`} />
      <span className="flex-1 text-left">{view.name}</span>
      {view.count > 0 && <Badge variant={isSelected ? "default" : "secondary"} className="bg-blue-500 text-slate-800 px-2.5 py-0.5 text-xs font-semibold inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-primary/80">{view.count}</Badge>}
    </Button>;


  const handleDeleteClick = (workspace) => {
    if (workspace.is_personal) {
      toast.error("Workspace pribadi tidak dapat dihapus.");
      return;
    }
    setDeletingWorkspace(workspace);
  };

  return (
    <div className="h-full flex flex-col bg-gray-800 text-white">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold">{user?.full_name?.charAt(0) || 'U'}</span>
          </div>
          <p className="font-semibold truncate">{user?.full_name || 'User'}'s Workspace</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        <div className="space-y-1">
          {mainViews.map((view) => <ViewButton key={view.id} view={view} isSelected={selectedView === view.id} />)}
        </div>
        <div className="border-t border-gray-700 pt-4 space-y-1">
          {secondaryViews.map((view) => <ViewButton key={view.id} view={view} isSelected={selectedView === view.id} />)}
        </div>
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-400">My Lists</h3>
            <Button variant="ghost" size="icon" className="w-6 h-6"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-1">
            {workspaces.map((ws) =>
            <div key={ws.id} className="group flex items-center w-full">
                <Button
                variant={selectedWorkspace === ws.id ? "secondary" : "ghost"}
                className="flex-1 justify-start gap-3"
                onClick={() => onWorkspaceChange(selectedWorkspace === ws.id ? null : ws.id)}>

                  <span>{ws.icon || '📁'}</span>
                  <span className="flex-1 text-left truncate">{ws.name}</span>
                  <Badge variant={selectedWorkspace === ws.id ? "default" : "secondary"}>{getTaskCount('all-tasks', ws.id)}</Badge>
                </Button>
                {!ws.is_personal &&
              <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleDeleteClick(ws)} className="text-red-500">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Hapus Workspace
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              }
              </div>
            )}
          </div>
        </div>
      </div>
      
      <AlertDialog open={!!deletingWorkspace} onOpenChange={() => setDeletingWorkspace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus workspace <strong>{deletingWorkspace?.name}</strong> secara permanen, termasuk <strong>semua tugas</strong> di dalamnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onWorkspaceDelete(deletingWorkspace.id);
              setDeletingWorkspace(null);
            }}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

}