import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Bell, CalendarDays } from 'lucide-react';
import { format, parseISO, setHours, setMinutes, setSeconds } from 'date-fns';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const priorityOptions = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
  { value: 'urgent', label: 'Mendesak' }
];

const statusOptions = [
  { value: 'todo', label: 'Belum Mulai' },
  { value: 'in_progress', label: 'Sedang Dikerjakan' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' }
];

export default function TaskForm({ task, workspaces, onSubmit, onCancel }) {
  const [currentTask, setCurrentTask] = useState(null);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const initialDate = task?.due_date ? parseISO(task.due_date) : null;

    setCurrentTask({
      title: task?.title || '',
      content: task?.content || '',
      status: task?.status || 'todo',
      priority: task?.priority || 'medium',
      due_date: initialDate,
      time: initialDate ? format(initialDate, 'HH:mm') : '09:00',
      workspace_id: task?.workspace_id || (workspaces.length > 0 ? workspaces.find((w) => w.is_personal)?.id || workspaces[0].id : ''),
      assignee_id: task?.assignee_id || '',
      tags: task?.tags || [],
      estimated_hours: task?.estimated_hours || 0,
      reminder_config: task?.reminder_config || { value: 30, unit: 'minutes' }
    });
  }, [task, workspaces]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentTask.title.trim()) {
      toast.error("Judul tugas tidak boleh kosong");
      return;
    }

    let finalDueDate = null;
    if (currentTask.due_date) {
      const [hours, minutes] = currentTask.time.split(':').map(Number);
      let date = new Date(currentTask.due_date);
      date = setHours(date, hours);
      date = setMinutes(date, minutes);
      date = setSeconds(date, 0);
      finalDueDate = date.toISOString();
    }

    const taskData = {
      ...currentTask,
      due_date: finalDueDate
    };
    delete taskData.time;

    // Show notification scheduling confirmation
    if (finalDueDate && currentTask.reminder_config.value) {
      const reminderDate = new Date(finalDueDate);
      const reminderMs = currentTask.reminder_config.value * (
        currentTask.reminder_config.unit === 'hours' ? 60 * 60 * 1000 :
        currentTask.reminder_config.unit === 'days' ? 24 * 60 * 60 * 1000 :
        60 * 1000 // minutes
      );
      const reminderTime = new Date(reminderDate.getTime() - reminderMs);
      
      toast.success(
        `Tugas akan diingatkan pada ${reminderTime.toLocaleString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })}`,
        { duration: 5000 }
      );
      
      // Request notification permission if not granted
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            toast.info('Notifikasi browser telah diaktifkan untuk pengingat tugas!');
          }
        });
      }
    }

    onSubmit(taskData);
  };

  const addTag = () => {
    if (newTag.trim() && !currentTask.tags.includes(newTag.trim())) {
      setCurrentTask((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setCurrentTask((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove)
    }));
  };

  if (!currentTask) {
    return <div className="text-center py-8">Loading form...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">

      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        {task ? 'Edit Tugas' : 'Buat Tugas Baru'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Judul Tugas</Label>
          <Input
            id="title"
            value={currentTask.title}
            onChange={(e) => setCurrentTask((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Masukkan judul tugas"
            required />

        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Deskripsi</Label>
          <ReactQuill
            theme="snow"
            value={currentTask.content}
            onChange={(value) => setCurrentTask((prev) => ({ ...prev, content: value }))}
            placeholder="Deskripsi detail tugas..." />

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Workspace</Label>
            <Select
              value={currentTask.workspace_id}
              onValueChange={(value) => setCurrentTask((prev) => ({ ...prev, workspace_id: value }))}>

              <SelectTrigger>
                <SelectValue placeholder="Pilih workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((workspace) =>
                <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.icon} {workspace.name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Prioritas</Label>
            <Select
              value={currentTask.priority}
              onValueChange={(value) => setCurrentTask((prev) => ({ ...prev, priority: value }))}>

              <SelectTrigger>
                <SelectValue placeholder="Pilih prioritas" />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) =>
                <SelectItem key={option.value} value={option.value}>
                    <span>{option.label}</span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={currentTask.status}
              onValueChange={(value) => setCurrentTask((prev) => ({ ...prev, status: value }))}>

              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) =>
                <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Tenggat Waktu</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {currentTask.due_date ? format(currentTask.due_date, 'dd MMM yyyy') : <span>Pilih Tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={currentTask.due_date}
                    onSelect={(date) => setCurrentTask((prev) => ({ ...prev, due_date: date }))}
                    initialFocus />

                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={currentTask.time}
                onChange={(e) => setCurrentTask((prev) => ({ ...prev, time: e.target.value }))}
                className="w-[120px]"
                disabled={!currentTask.due_date} />

            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 mb-1"><Bell className="w-4 h-4" /> Pengingat</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="15"
                className="w-1/3"
                value={currentTask.reminder_config.value}
                onChange={(e) => setCurrentTask((p) => ({ ...p, reminder_config: { ...p.reminder_config, value: e.target.value ? parseInt(e.target.value, 10) : '' } }))} />

              <Select
                value={currentTask.reminder_config.unit}
                onValueChange={(val) => setCurrentTask((p) => ({ ...p, reminder_config: { ...p.reminder_config, unit: val } }))}>

                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Menit sebelum</SelectItem>
                  <SelectItem value="hours">Jam sebelum</SelectItem>
                  <SelectItem value="days">Hari sebelum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Ditugaskan ke (Email)</Label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={currentTask.assignee_id || ''}
              onChange={(e) => setCurrentTask((prev) => ({ ...prev, assignee_id: e.target.value }))}
            />
            <p className="text-xs text-gray-500">Masukkan email anggota workspace untuk menugaskan</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Estimasi Jam</Label>
          <Input
            type="number"
            min="0"
            step="0.5"
            value={currentTask.estimated_hours}
            onChange={(e) => setCurrentTask((prev) => ({ ...prev, estimated_hours: parseFloat(e.target.value) || 0 }))}
            placeholder="0" />

        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Tambah tag"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }} />

            <Button type="button" onClick={addTag} variant="outline">
              Tambah
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[28px]">
            {currentTask.tags.map((tag) =>
            <div key={tag} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-blue-600 hover:text-blue-800">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Batal
          </Button>
          <Button type="submit">
            {task ? 'Update Tugas' : 'Buat Tugas'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}