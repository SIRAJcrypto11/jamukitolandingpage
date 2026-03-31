import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function NoteTaker({ workspaces = [], user, onNoteCreated }) {
  const [isFocused, setIsFocused] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const personalWorkspace = workspaces.find((w) => w.is_personal);
    if (personalWorkspace) {
      setSelectedWorkspace(personalWorkspace.id);
    } else if (workspaces.length > 0) {
      setSelectedWorkspace(workspaces[0].id);
    }
  }, [workspaces]);

  const handleSaveAndOpen = useCallback(() => {
    if (!title.trim() && !content.trim()) return;

    if (!selectedWorkspace) {
      toast.error("Silakan pilih workspace terlebih dahulu.");
      return;
    }

    // The onNoteCreated prop will now handle the creation and navigation
    onNoteCreated({
      title: title || "Tanpa Judul",
      content: content,
      workspace_id: selectedWorkspace
    });

    // Reset fields after initiating creation
    setTitle('');
    setContent('');
    setIsFocused(false);
  }, [title, content, selectedWorkspace, onNoteCreated]);

  const handleClickOutside = useCallback((event) => {
    if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
      if (title || content) {
        handleSaveAndOpen();
      }
      setIsFocused(false);
    }
  }, [title, content, handleSaveAndOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <div
      ref={wrapperRef}
      className="max-w-xl mx-auto shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300">

      <div className="pt-4 pr-4 pb-4 pl-4">
        {isFocused &&
        <Input
          placeholder="Judul"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-semibold border-none focus:ring-0 shadow-none px-2 mb-2 bg-transparent" />

        }
        <Textarea
          placeholder="Buat catatan..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="border-none focus:ring-0 shadow-none px-2 resize-none bg-transparent"
          rows={isFocused ? 3 : 1} />

        {isFocused &&
        <div className="flex justify-between items-center mt-4">
            <select
            value={selectedWorkspace}
            onChange={(e) => setSelectedWorkspace(e.target.value)} className="bg-slate-800 px-2 py-1 text-sm dark:bg-gray-700 border-none rounded-md focus:ring-2 focus:ring-blue-500">


              {workspaces.map((ws) =>
            <option key={ws.id} value={ws.id}>{ws.icon} {ws.name}</option>
            )}
            </select>
            <Button onClick={handleSaveAndOpen} size="sm">Buat & Buka</Button>
          </div>
        }
      </div>
    </div>);

}