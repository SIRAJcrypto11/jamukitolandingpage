import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Paperclip, Upload, X, Calendar as CalendarIcon, User, Clock,
  Edit, Save, MessageSquare, History, Plus } from
'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { UploadFile } from '@/integrations/Core';
import { Task } from '@/entities/Task';
import { WorkspaceMember } from '@/entities/WorkspaceMember';
import { toast } from 'sonner';

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-purple-100 text-purple-800',
  urgent: 'bg-red-100 text-red-800'
};

const statusColors = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-yellow-100 text-yellow-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function TaskDetailModal({ task, isOpen, onClose, onUpdate, workspaces }) {
  const [editMode, setEditMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [members, setMembers] = useState([]);
  const [taskData, setTaskData] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (task) {
      setTaskData({ ...task });
      loadMembers();
    }
  }, [task]);

  const loadMembers = async () => {
    if (!task?.workspace_id) return;
    try {
      const workspaceMembers = await WorkspaceMember.filter({ workspace_id: task.workspace_id });
      setMembers(workspaceMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleSave = async () => {
    if (!taskData) return;
    try {
      await Task.update(task.id, taskData);
      setEditMode(false);
      onUpdate();
      toast.success('Tugas berhasil diperbarui!');
    } catch (error) {
      toast.error('Gagal memperbarui tugas');
      console.error(error);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      const newAttachment = {
        url: file_url,
        name: file.name,
        type: file.type,
        size: file.size,
        uploaded_at: new Date().toISOString()
      };

      const updatedAttachments = [...(taskData.attachments || []), newAttachment];
      const updatedTask = { ...taskData, attachments: updatedAttachments };

      await Task.update(task.id, { attachments: updatedAttachments });
      setTaskData(updatedTask);
      onUpdate();
      toast.success('File berhasil diunggah!');
    } catch (error) {
      toast.error('Gagal mengunggah file');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async (attachmentUrl) => {
    const updatedAttachments = taskData.attachments.filter((att) => att.url !== attachmentUrl);
    try {
      await Task.update(task.id, { attachments: updatedAttachments });
      setTaskData({ ...taskData, attachments: updatedAttachments });
      onUpdate();
      toast.success('Lampiran berhasil dihapus');
    } catch (error) {
      toast.error('Gagal menghapus lampiran');
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    // Note: Implement comment system here
    toast.success('Komentar ditambahkan!');
    setNewComment('');
  };

  if (!task || !taskData) return null;

  const workspace = workspaces?.find((w) => w.id === task.workspace_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-950 p-6 fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            {editMode ?
            <Input
              value={taskData.title}
              onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
              className="text-2xl font-bold border-none p-0 focus-visible:ring-0" /> :


            <DialogTitle className="text-2xl">{taskData.title}</DialogTitle>
            }
          </div>
          <div className="flex items-center gap-2">
            {editMode ?
            <>
                <Button onClick={handleSave} size="sm">
                  <Save className="w-4 h-4 mr-2" />
                  Simpan
                </Button>
                <Button variant="outline" onClick={() => setEditMode(false)} size="sm">
                  Batal
                </Button>
              </> :

            <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            }
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="bg-slate-800 text-slate-50 p-1 h-10 items-center justify-center rounded-md grid w-full grid-cols-4">
            <TabsTrigger value="details">Detail</TabsTrigger>
            <TabsTrigger value="attachments">Lampiran</TabsTrigger>
            <TabsTrigger value="comments">Komentar</TabsTrigger>
            <TabsTrigger value="activity">Aktivitas</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  {editMode ?
                  <Select
                    value={taskData.status}
                    onValueChange={(value) => setTaskData({ ...taskData, status: value })}>

                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">Belum Mulai</SelectItem>
                        <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="done">Selesai</SelectItem>
                        <SelectItem value="cancelled">Dibatalkan</SelectItem>
                      </SelectContent>
                    </Select> :

                  <Badge className="bg-slate-500 text-gray-800 px-2.5 py-0.5 text-xs font-semibold inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-primary/80">
                      {taskData.status === 'todo' && 'Belum Mulai'}
                      {taskData.status === 'in_progress' && 'Sedang Dikerjakan'}
                      {taskData.status === 'review' && 'Review'}
                      {taskData.status === 'done' && 'Selesai'}
                      {taskData.status === 'cancelled' && 'Dibatalkan'}
                    </Badge>
                  }
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Prioritas</label>
                  {editMode ?
                  <Select
                    value={taskData.priority}
                    onValueChange={(value) => setTaskData({ ...taskData, priority: value })}>

                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Rendah</SelectItem>
                        <SelectItem value="medium">Sedang</SelectItem>
                        <SelectItem value="high">Tinggi</SelectItem>
                        <SelectItem value="urgent">Mendesak</SelectItem>
                      </SelectContent>
                    </Select> :

                  <Badge className={priorityColors[taskData.priority]}>
                      {taskData.priority === 'low' && 'Rendah'}
                      {taskData.priority === 'medium' && 'Sedang'}
                      {taskData.priority === 'high' && 'Tinggi'}
                      {taskData.priority === 'urgent' && 'Mendesak'}
                    </Badge>
                  }
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Ditugaskan ke</label>
                  {editMode ?
                  <Select
                    value={taskData.assignee_id || ''}
                    onValueChange={(value) => setTaskData({ ...taskData, assignee_id: value })}>

                      <SelectTrigger>
                        <SelectValue placeholder="Pilih anggota" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) =>
                      <SelectItem key={member.user_id} value={member.user_id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {member.user_id}
                            </div>
                          </SelectItem>
                      )}
                      </SelectContent>
                    </Select> :

                  <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>{taskData.assignee_id || 'Tidak ada'}</span>
                    </div>
                  }
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tanggal Jatuh Tempo</label>
                  {editMode ?
                  <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {taskData.due_date ? format(new Date(taskData.due_date), 'PPP', { locale: id }) : 'Pilih tanggal'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={taskData.due_date ? new Date(taskData.due_date) : undefined}
                        onSelect={(date) => setTaskData({ ...taskData, due_date: date?.toISOString() })}
                        initialFocus />

                      </PopoverContent>
                    </Popover> :

                  <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-gray-500" />
                      <span>
                        {taskData.due_date ? format(new Date(taskData.due_date), 'PPP', { locale: id }) : 'Tidak ada'}
                      </span>
                    </div>
                  }
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Estimasi Waktu</label>
                  {editMode ?
                  <div className="flex items-center gap-2">
                      <Input
                      type="number"
                      value={taskData.estimated_hours || ''}
                      onChange={(e) => setTaskData({ ...taskData, estimated_hours: parseFloat(e.target.value) })}
                      className="w-20" />

                      <span className="text-sm text-gray-500">jam</span>
                    </div> :

                  <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{taskData.estimated_hours || 0} jam</span>
                    </div>
                  }
                </div>

                {workspace &&
                <div>
                    <label className="text-sm font-medium mb-2 block">Workspace</label>
                    <div className="flex items-center gap-2">
                      <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: workspace.color }} />

                      <span>{workspace.name}</span>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Deskripsi</label>
              {editMode ?
              <Textarea
                value={taskData.content || ''}
                onChange={(e) => setTaskData({ ...taskData, content: e.target.value })}
                placeholder="Tambahkan deskripsi tugas..."
                rows={4} /> :


              <div className="bg-slate-100 p-3 dark:bg-gray-800 rounded-md min-h-[100px]">
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {taskData.content || 'Tidak ada deskripsi'}
                  </p>
                </div>
              }
            </div>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Lampiran</h3>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple />

                <Button onClick={handleFileSelect} disabled={isUploading} size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'Mengunggah...' : 'Tambah File'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(taskData.attachments || []).map((attachment, index) =>
              <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Paperclip className="w-5 h-5 text-gray-400" />
                      <div>
                        <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline font-medium">

                          {attachment.name}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          {attachment.size && `${(attachment.size / 1024 / 1024).toFixed(2)} MB`}
                          {attachment.uploaded_at && ` • ${format(new Date(attachment.uploaded_at), 'dd MMM yyyy')}`}
                        </p>
                      </div>
                    </div>
                    {editMode &&
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAttachment(attachment.url)}
                    className="text-red-500 hover:text-red-700">

                        <X className="w-4 h-4" />
                      </Button>
                  }
                  </div>
                </div>
              )}
            </div>

            {(!taskData.attachments || taskData.attachments.length === 0) &&
            <div className="text-center py-8 text-gray-500">
                <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Belum ada lampiran</p>
              </div>
            }
          </TabsContent>

          <TabsContent value="comments" className="space-y-4 mt-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Tambahkan komentar..."
                    rows={3} />

                </div>
                <Button onClick={addComment} disabled={!newComment.trim()}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Kirim
                </Button>
              </div>

              <div className="space-y-3">
                {comments.length === 0 ?
                <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Belum ada komentar</p>
                  </div> :

                comments.map((comment, index) =>
                <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{comment.user}</span>
                        <span className="text-sm text-gray-500">{comment.time}</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{comment.text}</p>
                    </div>
                )
                }
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4 mt-6">
            <div className="text-center py-8 text-gray-500">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Riwayat aktivitas akan ditampilkan di sini</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>);

}