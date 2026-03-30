import React, { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TaskQuickAdd({
  workspaces,
  onTaskCreate,
  selectedWorkspace
}) {
  const [taskTitle, setTaskTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef(null);

  const doCreateTask = useCallback(async () => {
    const title = taskTitle.trim();
    if (!title) {
      toast.error("Masukkan judul tugas");
      return;
    }

    const defaultWorkspaceId = selectedWorkspace || workspaces?.find((ws) => ws.is_personal)?.id || workspaces?.[0]?.id;

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('📝 TaskQuickAdd - CREATING TASK');
    console.log('═══════════════════════════════════════════');
    console.log('   Title:', title);
    console.log('   Workspace ID:', defaultWorkspaceId || 'WILL AUTO CREATE');

    setIsCreating(true);
    
    try {
      const result = await onTaskCreate({
        title: title,
        workspace_id: defaultWorkspaceId || null,
        status: 'todo',
        priority: 'medium',
        due_date: null
      });
      
      if (result) {
        console.log('✅ TaskQuickAdd - SUCCESS! Task ID:', result.id);
        toast.success('✅ Tugas berhasil dibuat!');
        setTaskTitle('');
        setIsExpanded(false);
      }
    } catch (error) {
      console.error('❌ TaskQuickAdd - Error:', error);
      toast.error("Gagal membuat tugas: " + error.message);
    } finally {
      setIsCreating(false);
    }
  }, [taskTitle, selectedWorkspace, workspaces, onTaskCreate]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    doCreateTask();
  };

  const handleButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    doCreateTask();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      doCreateTask();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setTaskTitle('');
    }
  };

  const handleExpandClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('🖱️ TaskQuickAdd CLICKED - Expanding...');
    setIsExpanded(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCancelClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsExpanded(false);
    setTaskTitle('');
  };

  // ✅ COMPACT VIEW when not expanded
  if (!isExpanded) {
    return (
      <div className="bg-white dark:bg-gray-900 px-4 py-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-700 relative z-50">
        <button
          type="button"
          onClick={handleExpandClick}
          className="w-full flex items-center gap-3 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg p-4 text-left transition-all cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">Tambah tugas baru...</span>
        </button>
      </div>
    );
  }

  // ✅ EXPANDED VIEW with input
  return (
    <div className="bg-white dark:bg-gray-900 px-4 py-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-700 relative z-50">
      <form onSubmit={handleFormSubmit} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border-2 border-blue-500 shadow-lg">
        <div className="flex items-center gap-3">
          <Plus className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <Input
            ref={inputRef}
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik judul tugas lalu tekan Enter..."
            disabled={isCreating}
            autoFocus
            className="flex-1 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm h-11"
          />
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter = Tambah, Esc = Batal
          </p>
          <div className="flex items-center gap-2">
            <Button 
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleCancelClick}
              disabled={isCreating}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white h-9 px-4"
            >
              Batal
            </Button>
            <Button 
              type="button"
              size="sm" 
              disabled={!taskTitle.trim() || isCreating}
              onClick={handleButtonClick}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-6 min-w-[100px] font-medium"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Tambah'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}