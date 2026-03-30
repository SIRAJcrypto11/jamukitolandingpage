import React, { useState, useEffect } from 'react';
import { Task } from '@/entities/Task';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  MapPin, Clock, User, Calendar, Save, X, ExternalLink, Navigation,
  Loader2, CheckCircle, AlertCircle, RefreshCw, MessageSquare, Edit3,
  TrendingUp, Star, ChevronRight, Phone, Home, Hourglass
} from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse'
};
const statusColors = {
  todo: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
};
const statusLabels = {
  todo: '📋 Belum Dikerjakan',
  in_progress: '🔄 Sedang Dikerjakan',
  review: '🔍 Menunggu Review',
  completed: '✅ Selesai',
  done: '🏁 Tuntas'
};
const priorityLabels = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi', urgent: '🚨 Mendesak' };

export default function TaskDetailModal({ task, onClose, onUpdate, canAdminEdit = false, companyMembers = [], currentUser = null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [locationInput, setLocationInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [hrSyncStatus, setHrSyncStatus] = useState(null);
  const [employeeNote, setEmployeeNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [activeMapTab, setActiveMapTab] = useState('map');

  // Determine if current user is the assignee (employee view)
  const isAssignee = currentUser && task &&
    (task.assignee_id === currentUser.email || task.assignee_id === currentUser.id);
  const canEmployeeUpdate = isAssignee; // employee can update status & add notes
  const canFullEdit = canAdminEdit; // only admin/owner can edit all fields

  useEffect(() => {
    if (task) {
      setEditData({
        title: task.title || '',
        content: task.content || '',
        location_pin: task.location_pin || null,
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assignee_id: task.assignee_id || '',
        due_date: task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd'T'HH:mm") : '',
        estimated_time: task.estimated_time || ''
      });
      if (task.location_pin?.address) setLocationInput(task.location_pin.label || task.location_pin.address);
    }
  }, [task]);

  if (!task) return null;

  const assignee = companyMembers.find(m =>
    m.user_id === task.assignee_id || m.user_email === task.assignee_id
  );

  const handleSearchLocation = async () => {
    if (!locationInput.trim()) return;
    setIsSearchingLocation(true);
    try {
      const parts = locationInput.split(',');
      if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
        setEditData(prev => ({
          ...prev,
          location_pin: { latitude: parseFloat(parts[0].trim()), longitude: parseFloat(parts[1].trim()), address: locationInput, label: 'Pin Manual' }
        }));
        toast.success('Koordinat berhasil ditambahkan!');
        return;
      }
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}&limit=1`);
      const data = await response.json();
      if (data?.length > 0) {
        const { lat, lon, display_name } = data[0];
        setEditData(prev => ({
          ...prev,
          location_pin: { latitude: parseFloat(lat), longitude: parseFloat(lon), address: display_name, label: locationInput }
        }));
        toast.success('Lokasi ditemukan!');
      } else {
        toast.error('Lokasi tidak ditemukan. Coba lebih spesifik.');
      }
    } catch (e) {
      toast.error('Gagal mencari lokasi');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const triggerHRSync = async (taskData, newStatus) => {
    if (!task.workspace_id) return;
    setHrSyncStatus('syncing');

    try {
      // Update KPI for assignee
      if (task.assignee_id && (newStatus === 'done' || newStatus === 'completed')) {
        const today = new Date().toISOString().split('T')[0];
        const existingKPIs = await base44.entities.CompanyKPI.filter({
          user_id: task.assignee_id,
          date: today
        });

        if (existingKPIs?.length > 0) {
          const kpi = existingKPIs[0];
          await base44.entities.CompanyKPI.update(kpi.id, {
            tasks_completed: (kpi.tasks_completed || 0) + 1,
            performance_score: Math.min(100, (kpi.performance_score || 70) + 5)
          });
        } else {
          await base44.entities.CompanyKPI.create({
            user_id: task.assignee_id,
            company_id: task.company_id || '',
            date: today,
            tasks_completed: 1,
            performance_score: 75,
            notes: `Tugas selesai: ${task.title}`
          });
        }
      }

      // Mark task as hr_synced
      await Task.update(task.id, { hr_synced: true });

      window.dispatchEvent(new CustomEvent('taskStatusChanged', {
        detail: { workspaceId: task.workspace_id, taskId: task.id, newStatus }
      }));

      setTimeout(() => setHrSyncStatus('synced'), 1500);
    } catch (e) {
      console.warn('HR sync error:', e);
      setHrSyncStatus(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saveData = { ...editData };
      if (saveData.due_date) saveData.due_date = new Date(saveData.due_date).toISOString();
      if (saveData.estimated_time) saveData.estimated_time = parseFloat(saveData.estimated_time);
      await Task.update(task.id, saveData);
      toast.success('Tugas berhasil diperbarui!');

      window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { workspaceId: task.workspace_id, taskId: task.id } }));

      if (saveData.status !== task.status) {
        await triggerHRSync(saveData, saveData.status);
      }

      onUpdate();
      setIsEditing(false);
    } catch (e) {
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickStatusChange = async (newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        completed_at: (newStatus === 'done' || newStatus === 'completed') ? new Date().toISOString() : null,
        actual_time: (newStatus === 'done' || newStatus === 'completed') && task.estimated_time ? task.estimated_time : task.actual_time
      };
      await Task.update(task.id, updateData);
      toast.success(`Status diubah ke: ${statusLabels[newStatus]}`);
      await triggerHRSync(updateData, newStatus);
      onUpdate();
    } catch (e) {
      toast.error('Gagal mengubah status');
    }
  };

  const handleSaveEmployeeNote = async () => {
    if (!employeeNote.trim()) return;
    setIsSavingNote(true);
    try {
      const existingNotes = task.content || '';
      const timestamp = format(new Date(), "dd MMM yyyy HH:mm", { locale: idLocale });
      const noteEntry = `\n\n📝 [Update ${timestamp} - ${currentUser?.full_name || currentUser?.email || 'Karyawan'}]:\n${employeeNote}`;
      await Task.update(task.id, { content: existingNotes + noteEntry });
      toast.success('Catatan berhasil ditambahkan!');
      setEmployeeNote('');
      window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { workspaceId: task.workspace_id, taskId: task.id } }));
      onUpdate();
    } catch (e) {
      toast.error('Gagal menyimpan catatan');
    } finally {
      setIsSavingNote(false);
    }
  };

  const pin = isEditing ? editData.location_pin : task.location_pin;
  const mapsEmbedUrl = pin
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${pin.longitude - 0.008},${pin.latitude - 0.008},${pin.longitude + 0.008},${pin.latitude + 0.008}&layer=mapnik&marker=${pin.latitude},${pin.longitude}`
    : null;
  const mapsDirectUrl = pin ? `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}` : null;
  const mapsNavUrl = pin ? `https://www.google.com/maps/dir/?api=1&destination=${pin.latitude},${pin.longitude}` : null;

  return (
    <Dialog open={!!task} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-0">

        {/* Header with gradient */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {isEditing && canFullEdit ? (
                <Input
                  value={editData.title}
                  onChange={e => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  className="text-lg font-bold border-0 border-b border-white/50 rounded-none px-0 bg-transparent text-white placeholder-white/60 focus-visible:ring-0"
                  placeholder="Judul tugas..."
                />
              ) : (
                <h2 className="text-lg font-bold leading-tight">{task.title}</h2>
              )}
              {assignee && (
                <div className="flex items-center gap-1 mt-1 text-sm text-white/80">
                  <User className="w-3.5 h-3.5" />
                  <span>Ditugaskan ke: <strong>{assignee.user_name || assignee.user_email}</strong></span>
                  {assignee.position && <span>· {assignee.position}</span>}
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* HR Sync indicator */}
          {hrSyncStatus && (
            <div className={`mt-2 inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full ${hrSyncStatus === 'syncing' ? 'bg-white/20 text-white' : 'bg-green-400/30 text-white'}`}>
              {hrSyncStatus === 'syncing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              {hrSyncStatus === 'syncing' ? '⚡ Sinkronisasi KPI & HR...' : '✅ KPI & HR ter-update!'}
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Status & Priority Badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className={priorityColors[task.priority] || 'bg-gray-100 text-gray-800'}>
              {priorityLabels[task.priority] || task.priority}
            </Badge>
            <Badge className={statusColors[task.status] || 'bg-gray-100 text-gray-800'}>
              {statusLabels[task.status] || task.status}
            </Badge>
            {task.task_type && (
              <Badge variant="outline" className="capitalize text-xs">
                {task.task_type.replace('_log', '').replace(/_/g, ' ')}
              </Badge>
            )}
            {task.hr_synced && (
              <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" /> HR Synced
              </Badge>
            )}
          </div>

          {/* ✅ QUICK STATUS CHANGE - For both admin and employee */}
          {(canFullEdit || canEmployeeUpdate) && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Update Status Pekerjaan
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusLabels).map(([s, label]) => (
                  <button
                    key={s}
                    onClick={() => handleQuickStatusChange(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg border-2 font-medium transition-all hover:scale-105 ${task.status === s
                      ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Meta Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {isEditing && canFullEdit ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Prioritas</label>
                  <Select value={editData.priority} onValueChange={v => setEditData(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Rendah</SelectItem>
                      <SelectItem value="medium">Sedang</SelectItem>
                      <SelectItem value="high">Tinggi</SelectItem>
                      <SelectItem value="urgent">🚨 Mendesak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Status</label>
                  <Select value={editData.status} onValueChange={v => setEditData(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Belum Dikerjakan</SelectItem>
                      <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
                      <SelectItem value="review">Menunggu Review</SelectItem>
                      <SelectItem value="done">Tuntas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Ditugaskan kepada</label>
                  <Select value={editData.assignee_id} onValueChange={v => setEditData(prev => ({ ...prev, assignee_id: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>-- Tanpa Assignee --</SelectItem>
                      {companyMembers.map(m => (
                        <SelectItem key={m.id} value={m.user_id || m.user_email}>
                          {m.user_name || m.user_email} {m.position ? `(${m.position})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Deadline</label>
                  <Input type="datetime-local" value={editData.due_date} onChange={e => setEditData(prev => ({ ...prev, due_date: e.target.value }))} className="h-9 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Estimasi Durasi (menit)</label>
                  <Input type="number" value={editData.estimated_time} onChange={e => setEditData(prev => ({ ...prev, estimated_time: e.target.value }))} className="h-9 text-sm" placeholder="Contoh: 120 (2 jam)" />
                </div>
              </>
            ) : (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                {assignee && (
                  <InfoRow icon={<User className="w-4 h-4 text-blue-500" />} label="Terapis / Karyawan" value={assignee.user_name || assignee.user_email} />
                )}
                {task.due_date && (
                  <InfoRow icon={<Calendar className="w-4 h-4 text-orange-500" />} label="Deadline" value={format(new Date(task.due_date), 'd MMM yyyy HH:mm', { locale: idLocale })} />
                )}
                {task.estimated_time && (
                  <InfoRow icon={<Hourglass className="w-4 h-4 text-purple-500" />} label="Durasi" value={`${task.estimated_time} menit ${task.estimated_time >= 60 ? `(${Math.floor(task.estimated_time / 60)} jam${task.estimated_time % 60 ? ` ${task.estimated_time % 60} mnt` : ''})` : ''}`} />
                )}
                {task.completed_at && (
                  <InfoRow icon={<CheckCircle className="w-4 h-4 text-green-500" />} label="Selesai pada" value={format(new Date(task.completed_at), 'd MMM yyyy HH:mm', { locale: idLocale })} />
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Detail Tugas & Catatan
            </p>
            {isEditing && canFullEdit ? (
              <Textarea
                value={editData.content}
                onChange={e => setEditData(prev => ({ ...prev, content: e.target.value }))}
                rows={5}
                placeholder="Tambahkan deskripsi, instruksi detail, atau catatan tugas..."
                className="text-sm"
              />
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 min-h-[80px] whitespace-pre-wrap border border-gray-100 dark:border-gray-700 font-mono text-xs leading-relaxed">
                {task.content || <span className="italic text-gray-400 font-sans">Belum ada deskripsi</span>}
              </div>
            )}
          </div>

          {/* ✅ EMPLOYEE NOTE INPUT */}
          {(canEmployeeUpdate || canFullEdit) && !isEditing && (
            <div className="border border-blue-200 dark:border-blue-700 rounded-xl p-4 bg-blue-50 dark:bg-blue-950/20 space-y-3">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4" /> Tambah Catatan / Laporan Progress
              </p>
              <Textarea
                value={employeeNote}
                onChange={e => setEmployeeNote(e.target.value)}
                rows={3}
                placeholder="Tulis laporan progress, kendala, atau catatan pekerjaan Anda..."
                className="text-sm bg-white dark:bg-gray-800"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSaveEmployeeNote}
                  disabled={isSavingNote || !employeeNote.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSavingNote ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-1" />}
                  Kirim Laporan
                </Button>
              </div>
            </div>
          )}

          {/* ✅ LOCATION MAP SECTION - Full Featured */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                Titik Lokasi Pelanggan
              </p>
              <div className="flex items-center gap-2">
                {mapsNavUrl && (
                  <a href={mapsNavUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-green-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-green-700 transition-colors">
                    <Navigation className="w-3 h-3" /> Navigasi
                  </a>
                )}
                {mapsDirectUrl && (
                  <a href={mapsDirectUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Google Maps
                  </a>
                )}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {pin && mapsEmbedUrl && (
                <>
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm">
                    <iframe
                      src={mapsEmbedUrl}
                      width="100%"
                      height="280"
                      style={{ border: 0 }}
                      loading="lazy"
                      title="Lokasi Tugas"
                    />
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-100 dark:border-red-800">
                    <Navigation className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-700 dark:text-red-300">{pin.label || 'Lokasi Tujuan'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{pin.address}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Koordinat: {pin.latitude?.toFixed(5)}, {pin.longitude?.toFixed(5)}</p>
                    </div>
                  </div>
                </>
              )}

              {canFullEdit && isEditing && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Cari alamat atau masukkan koordinat (lat, lng):
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={locationInput}
                      onChange={e => setLocationInput(e.target.value)}
                      placeholder="Contoh: Jl. Sudirman Jakarta atau -6.2088, 106.8456"
                      className="text-sm"
                      onKeyDown={e => e.key === 'Enter' && handleSearchLocation()}
                    />
                    <Button size="sm" variant="outline" onClick={handleSearchLocation} disabled={isSearchingLocation}>
                      {isSearchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    </Button>
                  </div>
                  {editData.location_pin && (
                    <div className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Lokasi: {editData.location_pin.latitude?.toFixed(4)}, {editData.location_pin.longitude?.toFixed(4)}
                      <button className="text-red-400 ml-2 hover:underline" onClick={() => setEditData(prev => ({ ...prev, location_pin: null }))}>hapus</button>
                    </div>
                  )}
                </div>
              )}

              {!pin && (
                <div className="text-center py-6 text-gray-400">
                  <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    {canFullEdit ? 'Belum ada titik lokasi. Klik Edit Detail untuk menambahkan.' : 'Belum ada titik lokasi yang ditandai.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* HR Integration Panel */}
          <div className={`rounded-xl p-4 text-sm flex items-start gap-3 ${task.hr_synced ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-700' : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${task.hr_synced ? 'bg-purple-100 dark:bg-purple-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
              <Star className={`w-4 h-4 ${task.hr_synced ? 'text-purple-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`font-semibold text-xs uppercase tracking-wider ${task.hr_synced ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500'}`}>
                {task.hr_synced ? '✅ Terintegrasi HR & KPI' : '⏳ Belum Tersinkron ke HR'}
              </p>
              <p className={`text-xs mt-1 ${task.hr_synced ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                {task.hr_synced
                  ? 'Data performa, KPI, dan kehadiran karyawan telah diperbarui otomatis. HR dapat memantau keaktifan karyawan ini.'
                  : 'Ketika status tugas diubah ke Selesai atau Tuntas, data KPI dan performa karyawan akan otomatis diperbarui ke modul HR.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex gap-2">
              {canFullEdit && !isEditing && (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> Edit Detail
                </Button>
              )}
              {isEditing && canFullEdit && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-1" /> Batal
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                    {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </Button>
                </>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={onClose} className="text-gray-500">Tutup</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{value}</p>
      </div>
    </div>
  );
}