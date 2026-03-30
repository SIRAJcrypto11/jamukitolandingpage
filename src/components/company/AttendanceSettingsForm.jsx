import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Settings as SettingsIcon, Save, Loader2, Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AttendanceSettingsForm({ company, onSuccess }) {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);

  useEffect(() => {
    if (company?.id) {
      loadSettings();
    }
  }, [company?.id]); // Only reload when company ID changes

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading settings for company:', company.id);
      
      const data = await base44.entities.CompanyAttendanceSettings.filter({
        company_id: company.id
      });

      console.log('📦 Loaded data from DB:', data);

      if (data && data.length > 0) {
        const loadedSettings = data[0];
        console.log('✅ Settings loaded, shifts count:', loadedSettings.shifts?.length || 0);
        setSettings(loadedSettings);
      } else {
        console.log('⚠️ No settings found, using defaults');
        // Default settings
        setSettings({
          company_id: company.id,
          office_location: null,
          office_radius_meters: 100,
          require_office_location: false,
          use_multiple_shifts: false,
          working_hours: {
            start_time: '09:00',
            end_time: '17:00',
            break_duration_minutes: 60
          },
          shifts: [],
          overtime_settings: {
            enabled: true,
            start_after_hours: 8,
            max_overtime_hours_per_day: 4
          },
          late_tolerance_minutes: 15,
          working_days: [1, 2, 3, 4, 5],
          auto_clock_out_enabled: false,
          auto_clock_out_time: '18:00',
          require_photo: true,
          require_notes: false
        });
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      toast.error('Gagal memuat pengaturan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCurrentLocation = async () => {
    try {
      setIsSettingLocation(true);

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        address: 'Lokasi kantor'
      };

      setSettings({
        ...settings,
        office_location: location
      });

      toast.success('📍 Lokasi kantor berhasil diset!');
    } catch (error) {
      console.error('Error getting location:', error);
      toast.error('❌ Gagal mendapatkan lokasi. Aktifkan GPS dan izinkan akses lokasi.');
    } finally {
      setIsSettingLocation(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // ✅ CRITICAL: Ensure shifts are preserved
      const settingsToSave = {
        ...settings,
        shifts: settings.shifts || [] // Ensure shifts array exists
      };
      
      console.log('💾 Saving ALL settings to database...');
      console.log('📊 Current shifts in state:', settingsToSave.shifts?.length || 0);
      console.log('📦 Full settings object:', settingsToSave);

      let savedSettings;
      if (settings.id) {
        console.log('🔄 Updating existing settings with ID:', settings.id);
        savedSettings = await base44.entities.CompanyAttendanceSettings.update(settings.id, settingsToSave);
        console.log('✅ Settings updated successfully');
        console.log('✅ Saved shifts count:', savedSettings.shifts?.length || 0);
      } else {
        console.log('➕ Creating new settings...');
        savedSettings = await base44.entities.CompanyAttendanceSettings.create(settingsToSave);
        console.log('✅ Settings created successfully');
        // Update state with new ID
        setSettings({ ...settingsToSave, id: savedSettings.id });
      }

      // ✅ BROADCAST: Notify all attendance pages
      try {
        const channel = new BroadcastChannel('snishop_attendance_settings_updates');
        channel.postMessage({
          type: 'SETTINGS_UPDATED',
          companyId: company.id,
          shifts: settingsToSave.shifts,
          timestamp: Date.now()
        });
        channel.close();
        console.log('📡 Settings broadcasted to all pages');
      } catch (e) {
        console.warn('Broadcast error:', e);
      }

      toast.success('✅ Pengaturan berhasil disimpan!', {
        description: `${settingsToSave.shifts?.length || 0} shift tersimpan`
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      toast.error(`Gagal menyimpan pengaturan: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading spinner
  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Office Location */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Lokasi Kantor & Radius
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Lokasi Kantor</Label>
            {settings.office_location ? (
              <div className="mt-2 p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-300">
                  📍 Lat: {settings.office_location.latitude?.toFixed(6)},
                  Lng: {settings.office_location.longitude?.toFixed(6)}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${settings.office_location.latitude},${settings.office_location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm mt-1 block"
                >
                  Lihat di Google Maps →
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-2">Belum diset</p>
            )}
            <Button
              onClick={handleSetCurrentLocation}
              disabled={isSettingLocation}
              className="mt-3 bg-blue-600 hover:bg-blue-700"
            >
              {isSettingLocation ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Getting...</>
              ) : (
                <><MapPin className="w-4 h-4 mr-2" /> Set Lokasi Saat Ini</>
              )}
            </Button>
          </div>

          <div>
            <Label className="text-white">Radius Kantor (meter)</Label>
            <Input
              type="number"
              value={settings.office_radius_meters}
              onChange={(e) => setSettings({
                ...settings,
                office_radius_meters: Number(e.target.value)
              })}
              className="mt-2 bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Karyawan harus dalam radius {settings.office_radius_meters}m dari kantor untuk absen
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Wajib Absen dari Kantor</Label>
              <p className="text-xs text-gray-400">Validasi lokasi saat absen</p>
            </div>
            <Switch
              checked={settings.require_office_location}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                require_office_location: checked
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Working Hours / Shift System Selection */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Sistem Jam Kerja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle Multi-Shift */}
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div>
              <Label className="text-white text-base">Gunakan Sistem Multi-Shift</Label>
              <p className="text-xs text-gray-400 mt-1">
                Aktifkan jika perusahaan memiliki beberapa shift kerja (Pagi, Siang, Malam, dll)
              </p>
            </div>
            <Switch
              checked={settings.use_multiple_shifts || false}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                use_multiple_shifts: checked
              })}
            />
          </div>

          {/* Single Working Hours (if multi-shift is OFF) */}
          {!settings.use_multiple_shifts && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Jam Mulai</Label>
                  <Input
                    type="time"
                    value={settings.working_hours.start_time}
                    onChange={(e) => setSettings({
                      ...settings,
                      working_hours: {
                        ...settings.working_hours,
                        start_time: e.target.value
                      }
                    })}
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Jam Selesai</Label>
                  <Input
                    type="time"
                    value={settings.working_hours.end_time}
                    onChange={(e) => setSettings({
                      ...settings,
                      working_hours: {
                        ...settings.working_hours,
                        end_time: e.target.value
                      }
                    })}
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Durasi Istirahat (menit)</Label>
                <Input
                  type="number"
                  value={settings.working_hours.break_duration_minutes}
                  onChange={(e) => setSettings({
                    ...settings,
                    working_hours: {
                      ...settings.working_hours,
                      break_duration_minutes: Number(e.target.value)
                    }
                  })}
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </>
          )}

          <div>
            <Label className="text-white">Toleransi Terlambat (menit)</Label>
            <Input
              type="number"
              value={settings.late_tolerance_minutes}
              onChange={(e) => setSettings({
                ...settings,
                late_tolerance_minutes: Number(e.target.value)
              })}
              className="mt-2 bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Karyawan dianggap terlambat jika clock in lebih dari {settings.late_tolerance_minutes} menit
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Overtime Settings */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Pengaturan Lembur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Aktifkan Lembur</Label>
              <p className="text-xs text-gray-400">Hitung jam lembur otomatis</p>
            </div>
            <Switch
              checked={settings.overtime_settings.enabled}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                overtime_settings: {
                  ...settings.overtime_settings,
                  enabled: checked
                }
              })}
            />
          </div>

          {settings.overtime_settings.enabled && (
            <>
              <div>
                <Label className="text-white">Lembur Dimulai Setelah (jam kerja)</Label>
                <Input
                  type="number"
                  value={settings.overtime_settings.start_after_hours}
                  onChange={(e) => setSettings({
                    ...settings,
                    overtime_settings: {
                      ...settings.overtime_settings,
                      start_after_hours: Number(e.target.value)
                    }
                  })}
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Lembur dihitung setelah {settings.overtime_settings.start_after_hours} jam kerja
                </p>
              </div>

              <div>
                <Label className="text-white">Maksimal Lembur per Hari (jam)</Label>
                <Input
                  type="number"
                  value={settings.overtime_settings.max_overtime_hours_per_day}
                  onChange={(e) => setSettings({
                    ...settings,
                    overtime_settings: {
                      ...settings.overtime_settings,
                      max_overtime_hours_per_day: Number(e.target.value)
                    }
                  })}
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Shift Management (only show if multi-shift is enabled) */}
      {settings.use_multiple_shifts && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pengaturan Shift Kerja
              </CardTitle>
              <Button
                onClick={() => {
                  setEditingShift({
                    id: `shift_${Date.now()}`,
                    name: '',
                    start_time: '07:00',
                    end_time: '15:00',
                    break_duration_minutes: 60,
                    is_active: true
                  });
                  setShowShiftDialog(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Shift
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.shifts && settings.shifts.length > 0 ? (
              settings.shifts.map((shift, index) => (
              <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{shift.name}</p>
                    <Badge className={shift.is_active ? 'bg-green-600' : 'bg-gray-600'}>
                      {shift.is_active ? 'Aktif' : 'Non-aktif'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {shift.start_time} - {shift.end_time} • Istirahat: {shift.break_duration_minutes} menit
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingShift(shift);
                      setShowShiftDialog(true);
                    }}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (confirm(`Hapus shift "${shift.name}"?`)) {
                        const updatedSettings = {
                          ...settings,
                          shifts: settings.shifts.filter(s => s.id !== shift.id)
                        };
                        setSettings(updatedSettings);
                        
                        // Auto-save deletion
                        try {
                          setIsSaving(true);
                          if (updatedSettings.id) {
                            await base44.entities.CompanyAttendanceSettings.update(updatedSettings.id, updatedSettings);
                          } else {
                            const created = await base44.entities.CompanyAttendanceSettings.create(updatedSettings);
                            setSettings({ ...updatedSettings, id: created.id });
                          }
                          
                          // Broadcast
                          try {
                            const channel = new BroadcastChannel('snishop_attendance_settings_updates');
                            channel.postMessage({
                              type: 'SETTINGS_UPDATED',
                              companyId: company.id,
                              shifts: updatedSettings.shifts || [],
                              timestamp: Date.now()
                            });
                            channel.close();
                          } catch (e) {}
                          
                          toast.success('✅ Shift berhasil dihapus!');
                          // ❌ REMOVED: await loadSettings() - no need to reload
                        } catch (error) {
                          console.error('Error deleting shift:', error);
                          toast.error('Gagal menghapus shift');
                        } finally {
                          setIsSaving(false);
                        }
                      }
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
            ) : (
              <p className="text-gray-400 text-sm">Belum ada shift. Klik "Tambah Shift" untuk membuat shift baru.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Settings */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Pengaturan Tambahan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Wajib Foto Selfie</Label>
              <p className="text-xs text-gray-400">Karyawan harus foto saat absen</p>
            </div>
            <Switch
              checked={settings.require_photo}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                require_photo: checked
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-white">Auto Clock Out</Label>
              <p className="text-xs text-gray-400">Otomatis clock out jika lupa</p>
            </div>
            <Switch
              checked={settings.auto_clock_out_enabled}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                auto_clock_out_enabled: checked
              })}
            />
          </div>

          {settings.auto_clock_out_enabled && (
            <div>
              <Label className="text-white">Jam Auto Clock Out</Label>
              <Input
                type="time"
                value={settings.auto_clock_out_time}
                onChange={(e) => setSettings({
                  ...settings,
                  auto_clock_out_time: e.target.value
                })}
                className="mt-2 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Simpan Pengaturan</>
          )}
        </Button>
      </div>

      {/* Shift Dialog */}
      {showShiftDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="bg-gray-900 border-gray-700 max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-white">{editingShift?.name ? 'Edit Shift' : 'Tambah Shift Baru'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white">Nama Shift</Label>
                <Input
                  value={editingShift?.name || ''}
                  onChange={(e) => setEditingShift({ ...editingShift, name: e.target.value })}
                  placeholder="Contoh: Shift Pagi, Shift Siang"
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Jam Mulai</Label>
                  <Input
                    type="time"
                    value={editingShift?.start_time || '07:00'}
                    onChange={(e) => setEditingShift({ ...editingShift, start_time: e.target.value })}
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white">Jam Selesai</Label>
                  <Input
                    type="time"
                    value={editingShift?.end_time || '15:00'}
                    onChange={(e) => setEditingShift({ ...editingShift, end_time: e.target.value })}
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white">Durasi Istirahat (menit)</Label>
                <Input
                  type="number"
                  value={editingShift?.break_duration_minutes || 60}
                  onChange={(e) => setEditingShift({ ...editingShift, break_duration_minutes: Number(e.target.value) })}
                  className="mt-2 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-white">Status Aktif</Label>
                <Switch
                  checked={editingShift?.is_active !== false}
                  onCheckedChange={(checked) => setEditingShift({ ...editingShift, is_active: checked })}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowShiftDialog(false);
                    setEditingShift(null);
                  }}
                  className="border-gray-600 text-white"
                >
                  Batal
                </Button>
                <Button
                  onClick={async () => {
                    if (!editingShift?.name) {
                      toast.error('Nama shift wajib diisi');
                      return;
                    }
                    
                    try {
                      setIsSaving(true);
                      console.log('💾 SAVING SHIFT:', editingShift);
                      console.log('📦 Current settings:', settings);
                      
                      // Prepare shifts array
                      const currentShifts = settings.shifts || [];
                      const existingIndex = currentShifts.findIndex(s => s.id === editingShift.id);
                      
                      let updatedShifts;
                      if (existingIndex >= 0) {
                        updatedShifts = [...currentShifts];
                        updatedShifts[existingIndex] = editingShift;
                        console.log('🔄 Updating existing shift at index', existingIndex);
                      } else {
                        updatedShifts = [...currentShifts, editingShift];
                        console.log('➕ Adding new shift');
                      }
                      
                      console.log('📋 Updated shifts array:', updatedShifts);
                      
                      // Prepare full settings object
                      const settingsToSave = {
                        company_id: company.id,
                        office_location: settings.office_location,
                        office_radius_meters: settings.office_radius_meters || 100,
                        require_office_location: settings.require_office_location || false,
                        use_multiple_shifts: settings.use_multiple_shifts || false,
                        working_hours: settings.working_hours || {
                          start_time: '09:00',
                          end_time: '17:00',
                          break_duration_minutes: 60
                        },
                        shifts: updatedShifts,
                        overtime_settings: settings.overtime_settings || {
                          enabled: true,
                          start_after_hours: 8,
                          max_overtime_hours_per_day: 4
                        },
                        late_tolerance_minutes: settings.late_tolerance_minutes || 15,
                        working_days: settings.working_days || [1, 2, 3, 4, 5],
                        auto_clock_out_enabled: settings.auto_clock_out_enabled || false,
                        auto_clock_out_time: settings.auto_clock_out_time || '18:00',
                        require_photo: settings.require_photo !== false,
                        require_notes: settings.require_notes || false
                      };
                      
                      let savedData;
                      if (settings.id) {
                        console.log('🔄 Updating settings with ID:', settings.id);
                        savedData = await base44.entities.CompanyAttendanceSettings.update(settings.id, settingsToSave);
                        console.log('✅ Update response:', savedData);
                      } else {
                        console.log('➕ Creating new settings...');
                        savedData = await base44.entities.CompanyAttendanceSettings.create(settingsToSave);
                        console.log('✅ Create response:', savedData);
                      }
                      
                      // ✅ Update local state immediately (no reload needed)
                      const finalSettings = { 
                        ...settingsToSave, 
                        id: savedData.id || settings.id 
                      };
                      setSettings(finalSettings);
                      console.log('✅ Local state updated:', finalSettings);
                      
                      // Close dialog FIRST
                      setShowShiftDialog(false);
                      setEditingShift(null);
                      
                      // Broadcast to all pages
                      try {
                        const channel = new BroadcastChannel('snishop_attendance_settings_updates');
                        channel.postMessage({
                          type: 'SETTINGS_UPDATED',
                          companyId: company.id,
                          shifts: updatedShifts,
                          timestamp: Date.now()
                        });
                        channel.close();
                        console.log('📡 Broadcast sent successfully');
                      } catch (e) {
                        console.warn('Broadcast error:', e);
                      }
                      
                      toast.success('✅ Shift berhasil disimpan!', {
                        description: `Total: ${updatedShifts.length} shift aktif`
                      });
                      
                    } catch (error) {
                      console.error('❌ ERROR saving shift:', error);
                      toast.error(`Gagal menyimpan: ${error.message}`);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                  ) : (
                    '💾 Simpan Shift'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}