
import { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Label } from '@/entities/Label';
import { Note } from '@/entities/Note';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as UILabel } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Calendar as CalendarIcon, Bell, Tag, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './NoteFormDark.css'; // Import custom CSS for dark theme

import { onNoteCreated } from '../helpers/gamificationHelper';

const icons = ['📝', '📚', '💡', '🔥', '⚡', '🎯', '📈', '🚀', '💼', '🏠'];

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'align': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    ['blockquote', 'code-block'],
    [{ 'color': [] }, { 'background': [] }],
    ['link', 'image'],
    ['clean']
  ],
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'align', 'list', 'bullet', 'indent',
  'blockquote', 'code-block', 'color', 'background',
  'link', 'image'
];

export default function NoteForm({ note, workspaces, onSave, onCancel }) {
  const [user, setUser] = useState(null);
  const [labels, setLabels] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    workspace_id: '',
    parent_id: '',
    icon: '📝',
    is_template: false,
    is_public: false,
    tags: [],
    labels: [],
    pinned: false,
    reminder_time: null
  });
  const [newTag, setNewTag] = useState('');
  const [reminderDate, setReminderDate] = useState(null);
  const [reminderTime, setReminderTime] = useState('09:00');

  useEffect(() => {
    loadUserAndLabels();
    if (note) {
      setFormData({
        ...note,
        tags: note.tags || [],
        labels: note.labels || []
      });
      if (note.reminder_time) {
        const reminderDate = new Date(note.reminder_time);
        setReminderDate(reminderDate);
        setReminderTime(format(reminderDate, 'HH:mm'));
      }
    } else if (workspaces.length > 0) {
      setFormData(prev => ({
        ...prev,
        workspace_id: workspaces.find(w => w.is_personal)?.id || workspaces[0].id
      }));
    }
  }, [note, workspaces]);

  const loadUserAndLabels = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
      
      const userLabels = await Label.filter({ user_id: userData.email });
      setLabels(userLabels);
    } catch (error) {
      console.error("Error loading user and labels:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let finalReminderTime = null;
      if (reminderDate && reminderTime) {
        const [hours, minutes] = reminderTime.split(':');
        const reminderDateTime = new Date(reminderDate);
        reminderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        finalReminderTime = reminderDateTime.toISOString();
      }

      const noteData = {
        ...formData,
        reminder_time: finalReminderTime
      };

      if (note) {
        await Note.update(note.id, noteData);
        toast.success('Catatan berhasil diperbarui!');
      } else {
        await Note.create(noteData);
        toast.success('Catatan berhasil dibuat!');
        
        // Trigger gamification for new note
        console.log('NoteForm: New note created, triggering gamification...');
        try {
          const currentUser = await User.me();
          if (currentUser && currentUser.email) {
            console.log('NoteForm: Calling onNoteCreated with user:', currentUser.email);
            await onNoteCreated(currentUser.email);
          }
        } catch (gamError) {
          console.error('NoteForm: Gamification error:', gamError);
        }
      }
      
      onSave();
    } catch (error) {
      toast.error('Gagal menyimpan catatan');
      console.error(error);
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
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleLabel = (labelId) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.includes(labelId)
        ? prev.labels.filter(id => id !== labelId)
        : [...prev.labels, labelId]
    }));
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${formData.title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          .header { border-bottom: 2px solid #eee; margin-bottom: 20px; padding-bottom: 10px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .meta { color: #666; font-size: 14px; }
          .content { margin-top: 20px; line-height: 1.8; }
          .tags { margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; }
          .tag { display: inline-block; background: #f0f0f0; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${formData.title}</div>
          <div class="meta">
            Dibuat: ${new Date().toLocaleDateString('id-ID')} | 
            Oleh: ${user?.full_name || user?.email || 'User'}
          </div>
        </div>
        <div class="content">${formData.content || '<p>Tidak ada konten</p>'}</div>
        ${formData.tags.length > 0 ? `<div class="tags"><strong>Tags:</strong><br>${formData.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}</div>` : ''}
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
    toast.success('File PDF berhasil digenerate!');
  };

  const exportToWord = () => {
    const htmlContent = `
      <html>
      <head><meta charset="utf-8"><title>${formData.title}</title></head>
      <body>
        <h1>${formData.title}</h1>
        <p><em>Dibuat: ${new Date().toLocaleDateString('id-ID')} | Oleh: ${user?.full_name || user?.email || 'User'}</em></p>
        <hr>
        <div>${formData.content || '<p>Tidak ada konten</p>'}</div>
        ${formData.tags.length > 0 ? `<hr><p><strong>Tags:</strong> ${formData.tags.map(tag => `#${tag}`).join(', ')}</p>` : ''}
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${formData.title || 'catatan'}.doc`;
    link.click();
    toast.success('File Word berhasil didownload!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <Card className="shadow-lg mb-6 w-full max-w-4xl mx-auto bg-gray-800 border-gray-700 text-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-base md:text-lg text-gray-100">{note ? 'Edit Catatan' : 'Buat Catatan Baru'}</span>
            <div className="flex items-center gap-2">
              {formData.content && (
                <>
                  <Button variant="ghost" size="sm" onClick={exportToPDF} title="Export PDF" className="text-gray-400 hover:text-white">
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={exportToWord} title="Export Word" className="text-gray-400 hover:text-white">
                    <Download className="w-4 h-4" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={onCancel}>
                <X className="w-4 h-4"/>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <UILabel htmlFor="title" className="sr-only">Judul Catatan</UILabel>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                placeholder="Judul Catatan"
                required
                className="text-base font-semibold border-none focus-visible:ring-0 bg-transparent text-gray-100 placeholder-gray-400"
              />
            </div>

            <div className="space-y-2">
              <UILabel htmlFor="content" className="text-gray-300">Konten</UILabel>
              <div className="bg-gray-900 rounded-lg border border-gray-700 note-editor-dark">
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={(content) => setFormData(prev => ({...prev, content}))}
                  modules={quillModules}
                  formats={quillFormats}
                  placeholder="Tulis konten catatan Anda di sini..."
                  style={{ minHeight: '200px' }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <UILabel className="text-gray-300">Workspace</UILabel>
                <Select 
                  value={formData.workspace_id} 
                  onValueChange={(value) => setFormData(prev => ({...prev, workspace_id: value}))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-200">
                    <SelectValue placeholder="Pilih workspace" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                    {workspaces.map(workspace => (
                      <SelectItem key={workspace.id} value={workspace.id} className="focus:bg-gray-700">
                        {workspace.icon} {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <UILabel className="text-gray-300">Icon</UILabel>
                <div className="flex flex-wrap gap-2">
                  {icons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`p-2 text-xl border rounded-lg ${formData.icon === icon ? 'border-blue-500 bg-blue-900/50' : 'border-gray-600'}`}
                      onClick={() => setFormData(prev => ({...prev, icon}))}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <UILabel className="flex items-center gap-2 text-gray-300">
                <Tag className="w-4 h-4" />
                Label
              </UILabel>
              <div className="flex flex-wrap gap-2">
                {labels.map(label => {
                  const isSelected = formData.labels.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all ${
                        isSelected 
                          ? 'border-2 scale-105' 
                          : 'border hover:border-gray-300'
                      }`}
                      style={{
                        backgroundColor: isSelected ? label.color + '30' : 'transparent',
                        borderColor: label.color,
                      }}
                    >
                      <span style={{color: label.color}}>{label.icon}</span>
                      <span className="text-sm" style={{color: label.color}}>{label.name}</span>
                      {isSelected && <X className="w-3 h-3" style={{color: label.color}} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <UILabel className="flex items-center gap-2 text-gray-300">
                <Bell className="w-4 h-4" />
                Pengingat
              </UILabel>
              <div className="flex flex-wrap gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start bg-gray-700 border-gray-600 text-gray-200">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reminderDate ? format(reminderDate, 'dd MMM yyyy', { locale: id }) : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700 text-gray-200">
                    <Calendar
                      mode="single"
                      selected={reminderDate}
                      onSelect={setReminderDate}
                      initialFocus
                      className="dark"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-32 bg-gray-700 border-gray-600 text-gray-200"
                  disabled={!reminderDate}
                />
                {reminderDate && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setReminderDate(null);
                      setReminderTime('09:00');
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="pinned"
                  checked={formData.pinned}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, pinned: checked}))}
                />
                <UILabel htmlFor="pinned" className="text-gray-300">Pin catatan</UILabel>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_template"
                  checked={formData.is_template}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, is_template: checked}))}
                />
                <UILabel htmlFor="is_template" className="text-gray-300">Jadikan sebagai template</UILabel>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData(prev => ({...prev, is_public: checked}))}
                />
                <UILabel htmlFor="is_public" className="text-gray-300">Bagikan secara publik</UILabel>
              </div>
            </div>

            <div className="space-y-2">
              <UILabel className="text-gray-300">Tags</UILabel>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Tambah tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="bg-gray-700 border-gray-600 text-gray-200"
                />
                <Button type="button" onClick={addTag} variant="outline" className="bg-gray-700 border-gray-600 text-gray-200">
                  Tambah
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <div key={tag} className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-purple-400 hover:text-purple-200">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={onCancel} className="text-gray-400 hover:text-white">
              Batal
            </Button>
            <Button type="submit">
              {note ? 'Update' : 'Buat'} Catatan
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
