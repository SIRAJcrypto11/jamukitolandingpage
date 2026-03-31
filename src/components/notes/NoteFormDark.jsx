import { useState } from 'react';
import { Note } from '@/entities/Note';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { onNoteCreated } from '../helpers/gamificationHelper';

const icons = ['📝', '📚', '💡', '🔥', '⚡', '🎯', '📈', '🚀', '💼', '🏠'];
const colors = [
  '#374151', '#7C3AED', '#2563EB', '#DC2626', '#059669', 
  '#D97706', '#EC4899', '#8B5CF6', '#10B981', '#F59E0B'
];

export default function NoteFormDark({ note, workspaceId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: note?.title || '',
    content: note?.content || '',
    icon: note?.icon || '📝',
    tags: note?.tags || [],
    color: note?.color || '#374151',
    pinned: note?.pinned || false
  });
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const noteData = {
        title: formData.title,
        content: formData.content,
        workspace_id: workspaceId,
        icon: formData.icon,
        tags: formData.tags,
        color: formData.color,
        pinned: formData.pinned
      };

      if (note) {
        await Note.update(note.id, noteData);
        toast.success('Catatan berhasil diperbarui');
      } else {
        await Note.create(noteData);
        toast.success('Catatan berhasil dibuat');
        
        // Trigger gamification for new note
        console.log('NoteFormDark: New note created, triggering gamification...');
        try {
          const currentUser = await User.me();
          if (currentUser && currentUser.email) {
            console.log('NoteFormDark: Calling onNoteCreated with user:', currentUser.email);
            await onNoteCreated(currentUser.email);
          }
        } catch (gamError) {
          console.error('NoteFormDark: Gamification error:', gamError);
        }
      }

      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Gagal menyimpan catatan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-gray-800 rounded-lg p-6 border border-gray-700"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            {note ? 'Edit Catatan' : 'Catatan Baru'}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div>
          <Input
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Judul catatan..."
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            required
          />
        </div>

        <div>
          <Textarea
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Tulis catatan Anda di sini..."
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[200px]"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Icon</label>
          <div className="flex flex-wrap gap-2">
            {icons.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, icon }))}
                className={`p-2 text-xl border rounded-lg transition-colors ${
                  formData.icon === icon 
                    ? 'border-blue-500 bg-blue-900/50' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Warna</label>
          <div className="flex flex-wrap gap-2">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  formData.color === color 
                    ? 'border-white scale-110' 
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Tags</label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Tambah tag..."
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" onClick={addTag} variant="outline" size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map(tag => (
              <Badge key={tag} className="bg-purple-900/50 text-purple-300 flex items-center gap-1">
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-purple-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="pinned"
            checked={formData.pinned}
            onChange={(e) => setFormData(prev => ({ ...prev, pinned: e.target.checked }))}
            className="w-4 h-4"
          />
          <label htmlFor="pinned" className="text-sm text-gray-300">
            Pin catatan
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : (note ? 'Update' : 'Simpan')}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}