import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Calendar, FileText, Paperclip, Trash2, CheckCircle, Circle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import _ from 'lodash';
import SubTaskManager from './SubTaskManager';
import { User } from '@/entities/User';
import { onTaskCompleted } from '../helpers/gamificationHelper';

export default function TaskDetailPanel({
  task,
  workspaces,
  onClose,
  onUpdate,
  onDelete,
  onFileUpload
}) {
  const [editedTask, setEditedTask] = useState(task);
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  const debouncedSave = useMemo(
    () => _.debounce((newEditedTask) => {
      onUpdate(task.id, newEditedTask);
    }, 1000),
    [onUpdate, task.id]
  );

  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  const handleChange = (field, value) => {
    const newEditedTask = { ...editedTask, [field]: value };
    setEditedTask(newEditedTask);
    debouncedSave(newEditedTask);
  };

  const handleInstantUpdate = (updates) => {
    debouncedSave.cancel();
    const newEditedTask = { ...editedTask, ...updates };
    setEditedTask(newEditedTask);
    onUpdate(task.id, newEditedTask);
  };

  const handleStatusChange = async () => {
    console.log('');
    console.log('🎯 TaskDetailPanel: Status change clicked');
    console.log('Current status:', editedTask.status);
    
    const newStatus = editedTask.status === 'completed' ? 'todo' : 'completed';
    console.log('New status will be:', newStatus);
    
    const updates = {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    };

    try {
      console.log('📤 Calling onUpdate with:', updates);
      await onUpdate(task.id, updates);
      setEditedTask((prev) => ({ ...prev, ...updates }));
      
      // Trigger gamification if completed
      if (newStatus === 'completed') {
        console.log('✅ Task completed - triggering gamification...');
        try {
          const currentUser = await User.me();
          if (currentUser && currentUser.email) {
            console.log('👤 User found:', currentUser.email);
            console.log('🎮 Calling onTaskCompleted...');
            await onTaskCompleted(currentUser.email, task);
            console.log('✅ Gamification completed successfully');
          } else {
            console.warn('⚠️ User not found or no email');
          }
        } catch (gamError) {
          console.error('❌ Gamification error:', gamError);
        }
      }
      
      toast.success('Status berhasil diperbarui');
    } catch (error) {
      console.error('❌ Error updating task status:', error);
      toast.error('Gagal memperbarui status');
    }
  };

  const addTag = () => {
    if (newTag.trim() && !(editedTask.tags || []).includes(newTag.trim())) {
      handleInstantUpdate({ tags: [...(editedTask.tags || []), newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    handleInstantUpdate({ tags: editedTask.tags.filter((t) => t !== tagToRemove) });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setIsUploading(true);
    const uploads = await Promise.all(files.map((file) => onFileUpload(file)));
    const successfulUploads = uploads.filter(Boolean);
    if (successfulUploads.length > 0) {
      handleInstantUpdate({ attachments: [...(editedTask.attachments || []), ...successfulUploads] });
    }
    setIsUploading(false);
  };

  const removeAttachment = (urlToRemove) => {
    handleInstantUpdate({ attachments: editedTask.attachments.filter((att) => att.url !== urlToRemove) });
  };

  if (!editedTask) return null;

  const workspace = workspaces.find((w) => w.id === editedTask.workspace_id);

  return (
    <div className="bg-gray-800 flex flex-col h-full text-white">
      <header className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <button
          onClick={handleStatusChange}
          className="flex items-center gap-3 text-gray-300 hover:text-white"
        >
          {editedTask.status === 'completed' ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Circle className="w-5 h-5" />}
          <span>Mark as complete</span>
        </button>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Input
          value={editedTask.title}
          onChange={(e) => handleChange('title', e.target.value)}
          className="text-2xl font-bold bg-transparent border-none p-0 focus:ring-0 h-auto"
          placeholder="Nama Tugas" />

        {workspace && <Badge className="bg-blue-500 text-primary-foreground px-2.5 py-0.5 text-xs font-semibold inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-primary/80">{workspace.icon} {workspace.name}</Badge>}

        <div>
          <label className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2"><Calendar className="w-4 h-4" /> Due Date</label>
          <Input
            type="datetime-local"
            value={editedTask.due_date ? format(parseISO(editedTask.due_date), "yyyy-MM-dd'T'HH:mm") : ''}
            onChange={(e) => handleChange('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
            className="bg-gray-700 border-gray-600" />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2"><FileText className="w-4 h-4" /> Notes</label>
          <Textarea
            value={editedTask.content || ''}
            onChange={(e) => handleChange('content', e.target.value)}
            placeholder="Tulis catatan di sini..."
            className="bg-gray-700 border-gray-600 resize-none"
            rows={5} />
        </div>

        <div className="border-t pt-4">
            <SubTaskManager parentTask={task} onUpdate={onUpdate} />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-400 flex items-center gap-2 mb-2"><Paperclip className="w-4 h-4" /> Attachments</label>
          <div className="space-y-2">
              {editedTask.attachments?.map((att) =>
            <div key={att.url} className="flex items-center justify-between bg-gray-700 p-2 rounded-md">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm hover:underline">{att.name}</a>
                      <button onClick={() => removeAttachment(att.url)} className="text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
            )}
          </div>
          <div onClick={() => fileInputRef.current.click()} className="mt-2 border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-700/50">
            {isUploading ? <p>Uploading...</p> : <p className="text-sm text-gray-400">Click to add / drop your files here</p>}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
        </div>
      </div>

      <footer className="p-4 border-t border-gray-700 flex-shrink-0">
        <Button variant="ghost" onClick={() => onDelete(task.id)} className="w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"><Trash2 className="w-4 h-4 mr-2" /> Delete Task</Button>
      </footer>
    </div>
  );
}